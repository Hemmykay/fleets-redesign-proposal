'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, Card, Callout, Readout, Collapsible } from '@/components/ui';
import { NumberInput } from '@/components/NumberInput';
import {
  levelizedInterest,
  ZERO_LOAN_ACCRUAL,
  addLoanToAccrual,
  rollupLoanAccrual,
  blendedApy,
  totalReserveCapital,
  totalReserveGrossYieldThisPeriod,
  capFycLoanShare,
  splitBaseYieldTokenYield,
  NET_YIELD_FRACTION,
  PERIODS_PER_YEAR,
  SECONDS_PER_DAY,
  SECONDS_PER_PERIOD,
  DEFAULT_MAX_FYC_APY,
  fmtUSD,
  fmtUSD2,
  fmtPct,
} from '@/lib/model';
import { runSimulation, type OriginationEvent, type TrancheActivityEvent } from '@/lib/simulate';
import { generateRandomOriginations, generateRandomTrancheActivity, generateRandomDefaults } from '@/lib/random';

// Running example used throughout the app.
const FYC = 600000;
const FFC = 400000;

interface LoanRow {
  id: string;
  label: string;
  principal: number;
  aprPct: number;
  termMonths: number;
  originDay: number;
}

interface SourceRow {
  id: string;
  label: string;
  capitalUsd: number;
  apyPct: number;
}

function MiniField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
      {label}
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <NumberInput
          step={step}
          value={value}
          onChange={onChange}
          style={{
            width: '100%',
            padding: '5px 7px',
            borderRadius: 5,
            border: '1px solid var(--border-strong)',
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12.5,
          }}
        />
        {suffix && <span>{suffix}</span>}
      </span>
    </label>
  );
}

export default function OptimisticPricePage() {
  const [outstanding, setOutstanding] = useState(450000);
  const [queryDay, setQueryDay] = useState(30);
  const [loans, setLoans] = useState<LoanRow[]>([
    { id: 'l1', label: 'Loan A', principal: 250000, aprPct: 15, termMonths: 36, originDay: 0 },
    { id: 'l2', label: 'Loan B', principal: 120000, aprPct: 18, termMonths: 24, originDay: 12 },
    { id: 'l3', label: 'Loan C', principal: 80000, aprPct: 22, termMonths: 18, originDay: 20 },
  ]);
  const [sources, setSources] = useState<SourceRow[]>([
    { id: 's1', label: 'USDY', capitalUsd: 300000, apyPct: 4.2 },
    { id: 's2', label: 'syrupUSDC', capitalUsd: 150000, apyPct: 2.8 },
    { id: 's3', label: 'sDAI', capitalUsd: 100000, apyPct: 3.5 },
  ]);
  const [totalSupply, setTotalSupply] = useState(FYC);
  const [maxFycApyPct, setMaxFycApyPct] = useState(DEFAULT_MAX_FYC_APY * 100);

  function updateLoan(id: string, patch: Partial<LoanRow>) {
    setLoans((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function updateSource(id: string, patch: Partial<SourceRow>) {
    setSources((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // ---------------------------------------------------------------------
  // Loan estimate — the reward-per-second accrual, across every loan row.
  // ---------------------------------------------------------------------
  const queryTs = queryDay * SECONDS_PER_DAY;
  const enrichedLoans = loans
    .map((l) => ({
      ...l,
      levelized: levelizedInterest(l.principal, l.aprPct / 100, l.termMonths),
      originTs: l.originDay * SECONDS_PER_DAY,
    }))
    .filter((l) => l.originTs <= queryTs)
    .sort((a, b) => a.originTs - b.originTs);

  let accrualState = ZERO_LOAN_ACCRUAL;
  for (const l of enrichedLoans) accrualState = addLoanToAccrual(accrualState, l.originTs, l.levelized);
  const loanEstimateAccumulator = rollupLoanAccrual(accrualState, queryTs);

  // Independent cross-check: sum each loan's OWN elapsed-time-into-its-own-
  // cycle accrual, computed with no shared state at all — must match the
  // accumulator above exactly (within floating-point noise), or the
  // accumulator itself would be lying about what multiple staggered loans
  // add up to. Same proof as /latex's loan-accrual formula, reused here.
  const loanEstimateIndependent = enrichedLoans.reduce((sum, l) => {
    const elapsed = Math.max(0, queryTs - l.originTs);
    return sum + (l.levelized / SECONDS_PER_PERIOD) * elapsed;
  }, 0);
  const accrualMatches = Math.abs(loanEstimateAccumulator - loanEstimateIndependent) < 0.01;

  // ---------------------------------------------------------------------
  // Reserve/yield-token estimate — blended across every registered source.
  // totalSourceCapital / totalReserveGrossThisPeriod now come from
  // lib/model.ts (totalReserveCapital / totalReserveGrossYieldThisPeriod) —
  // the shared TS mirror of the round-6 pricing.rs "pass all accounts" fix,
  // rather than duplicated inline here. See those functions' own doc
  // comments for why realized_losses double-counting (the OTHER round-6 fix,
  // pricing.rs Decision 1) has no TS-side equivalent to begin with.
  // ---------------------------------------------------------------------
  const sourcesWithApy = sources.map((s) => ({ id: s.id, capitalUsd: s.capitalUsd, apy: s.apyPct / 100, enabled: true }));
  const totalSourceCapital = totalReserveCapital(sourcesWithApy);
  const blendedSourceApy = blendedApy(sourcesWithApy);
  const perSourcePeriodYield = sources.map((s) => ({
    ...s,
    grossThisPeriod: (s.capitalUsd * (s.apyPct / 100)) / PERIODS_PER_YEAR,
  }));
  const totalReserveGrossThisPeriod = totalReserveGrossYieldThisPeriod(sourcesWithApy);

  // ---------------------------------------------------------------------
  // Putting it together — the exact pipeline compute_optimistic_price runs:
  // gross estimates -> 85/15 fee -> severity-curve / pool-share splits ->
  // FYC's two shares -> optimistic price. Conservative never sees any of
  // this — it's v_tranche alone.
  // ---------------------------------------------------------------------
  const reserveNetThisPeriod = totalReserveGrossThisPeriod * NET_YIELD_FRACTION;
  const reserveSplit = splitBaseYieldTokenYield(reserveNetThisPeriod, FYC, FFC);
  const loanDist = capFycLoanShare(
    { fyc: FYC, ffc: FFC, outstanding },
    loanEstimateAccumulator,
    reserveSplit.fycShare,
    maxFycApyPct / 100,
  );
  const fycYieldEstimate = reserveSplit.fycShare + loanDist.fycShare;
  const optimisticPrice = totalSupply > 0 ? (FYC + fycYieldEstimate) / totalSupply : 1;
  const conservativePrice = totalSupply > 0 ? FYC / totalSupply : 1;
  const spread = optimisticPrice - conservativePrice;
  const invariantHolds = spread >= -1e-9;

  // ---------------------------------------------------------------------
  // The bug we found and fixed — live proof against the actual simulator,
  // not just this page's static formula. Re-runs on every render (cheap:
  // a handful of periods, deterministic), so the numbers are always live,
  // never a stale screenshot.
  // ---------------------------------------------------------------------
  const originations: OriginationEvent[] = [
    { id: 'o1', period: 1, amount: 500000, apr: 0.3, termMonths: 36, feePct: 0.01 },
  ];
  const trancheActivity: TrancheActivityEvent[] = [
    { id: 'a1', period: 2, tranche: 'fyc', kind: 'mint', amount: 300000 },
  ];
  const proofResult = runSimulation({
    initialFyc: 600000,
    initialFfc: 400000,
    reserveApy: 0.035,
    periods: 24,
    originations,
    defaults: [],
    trancheActivity,
  });
  const proofViolations = proofResult.steps.filter(
    (s) => s.fycOptimisticPrice < s.fycPrice - 1e-9 || s.ffcOptimisticPrice < s.ffcPrice - 1e-9,
  );

  let sweepViolations = 0;
  let sweepChecked = 0;
  const SWEEP_SEEDS = 12;
  for (let seed = 1; seed <= SWEEP_SEEDS; seed++) {
    const sweepOriginations = generateRandomOriginations({
      seed,
      periods: 30,
      aprMin: 0.1,
      aprMax: 0.3,
      amountMin: 40000,
      amountMax: 300000,
      frequency: 2,
      termMonths: 18,
      feePctMin: 0.005,
      feePctMax: 0.02,
    });
    const sweepActivity = generateRandomTrancheActivity({
      seed,
      periods: 30,
      frequency: 2,
      amountMin: 15000,
      amountMax: 200000,
      redeemFraction: 0.4,
      ffcFraction: 0.5,
    });
    const sweepDefaults = generateRandomDefaults({ seed, periods: 30, annualDefaultRate: 0.04, originations: sweepOriginations });
    const sweepResult = runSimulation({
      initialFyc: 600000,
      initialFfc: 400000,
      reserveApy: 0.045,
      periods: 30,
      originations: sweepOriginations,
      defaults: sweepDefaults,
      trancheActivity: sweepActivity,
      maxFycApy: 0.07,
    });
    for (const s of sweepResult.steps) {
      sweepChecked++;
      if (s.fycOptimisticPrice < s.fycPrice - 1e-9) sweepViolations++;
      if (s.ffcOptimisticPrice < s.ffcPrice - 1e-9) sweepViolations++;
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="pricing correctness"
        title="Optimistic vs. conservative price — proving the invariant"
        lede="A mint should never cost less than a redeem pays out, at the same instant — otherwise a same-block deposit-then-withdraw would extract value nobody actually earned. This page derives the optimistic (mint) price step by step, across several active loans and several yield-bearing sources, and proves — live, not just by inspection — that it can never read below the conservative (redeem) price."
      />

      <Card>
        <h3 style={{ marginTop: 0 }}>The promise, in one line</h3>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          <b>conservative_price = v_tranche / total_supply</b> — only counts value that&rsquo;s actually been
          collected. <b>optimistic_price = (v_tranche + loan_estimate + yield_estimate) / total_supply</b> — the
          same thing, plus a non-negative estimate of what THIS period is already known to be generating but
          hasn&rsquo;t been swept in yet. As long as both estimates stay ≥ 0 — and they always do, since neither
          a loan accruing interest nor a reserve token appreciating can run backwards — optimistic can never
          read below conservative <em>at the same instant</em>. The two sections below build each estimate up
          from scratch, then a third puts them together and checks the promise live.
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>1. Loan estimate — across several active loans</h3>
        <p style={{ fontSize: 14.5, lineHeight: 1.7 }}>
          Real loans originate on different days and run on their own independent clocks — there&rsquo;s no
          single shared &ldquo;start of period&rdquo; to measure from. The pool tracks ONE running rate (the sum of every
          currently-accruing loan&rsquo;s own <code>levelized_interest ÷ period_length</code>) plus a
          checkpoint, both re-banked the instant a loan originates — see{' '}
          <Link href="/latex">/latex</Link> for the full single-loan derivation. Below: three loans, staggered
          origination days, queried at any day you choose — the accumulator&rsquo;s answer is cross-checked
          against independently summing each loan&rsquo;s own elapsed-time-into-its-own-cycle accrual, computed
          with no shared state at all.
        </p>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="impl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Loan</th>
                <th>Principal</th>
                <th>APR</th>
                <th>Term (mo)</th>
                <th>Origin day</th>
                <th>Levelized interest / period</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => {
                const lev = levelizedInterest(l.principal, l.aprPct / 100, l.termMonths);
                return (
                  <tr key={l.id}>
                    <td>{l.label}</td>
                    <td>
                      <MiniField label="" value={l.principal} step={10000} onChange={(v) => updateLoan(l.id, { principal: v })} />
                    </td>
                    <td>
                      <MiniField label="" value={l.aprPct} step={0.5} suffix="%" onChange={(v) => updateLoan(l.id, { aprPct: v })} />
                    </td>
                    <td>
                      <MiniField label="" value={l.termMonths} step={1} onChange={(v) => updateLoan(l.id, { termMonths: Math.round(v) })} />
                    </td>
                    <td>
                      <MiniField label="" value={l.originDay} step={1} suffix="d" onChange={(v) => updateLoan(l.id, { originDay: Math.round(v) })} />
                    </td>
                    <td className="tabular">{fmtUSD2(lev)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 14 }}>
          <MiniField label="query day" value={queryDay} step={1} suffix="d" onChange={(v) => setQueryDay(Math.max(0, Math.round(v)))} />
        </div>
        <div className="readout-grid" style={{ marginTop: 14 }}>
          <Readout label="Accumulator's answer" value={fmtUSD2(loanEstimateAccumulator)} color="var(--fyc)" />
          <Readout label="Independent per-loan cross-check" value={fmtUSD2(loanEstimateIndependent)} />
          <Readout
            label="Match?"
            value={accrualMatches ? 'Yes — exact' : 'MISMATCH'}
            color={accrualMatches ? 'var(--good)' : 'var(--critical)'}
            sub={`${enrichedLoans.length} of ${loans.length} loans active at day ${queryDay}`}
          />
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>2. Reserve/yield-token estimate — across several sources</h3>
        <p style={{ fontSize: 14.5, lineHeight: 1.7 }}>
          Each registered yield source (USDY, syrupUSDC, or any future addition — see{' '}
          <Link href="/yield-sources">/yield-sources</Link>) ticks its own observed APY independently. The
          pool&rsquo;s not-yet-collected reserve yield THIS period is the capital-weighted blend across every
          one, de-annualized back down to one period&rsquo;s worth (<code>capital × apy ÷ PERIODS_PER_YEAR</code>{' '}
          per source, summed), then the same 85/15 fee and flat pool-share split every other reserve-yield
          dollar goes through.
        </p>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="impl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Source</th>
                <th>Capital</th>
                <th>APY</th>
                <th>Gross yield this period</th>
              </tr>
            </thead>
            <tbody>
              {perSourcePeriodYield.map((s) => (
                <tr key={s.id}>
                  <td>{s.label}</td>
                  <td>
                    <MiniField label="" value={s.capitalUsd} step={10000} onChange={(v) => updateSource(s.id, { capitalUsd: v })} />
                  </td>
                  <td>
                    <MiniField label="" value={s.apyPct} step={0.1} suffix="%" onChange={(v) => updateSource(s.id, { apyPct: v })} />
                  </td>
                  <td className="tabular">{fmtUSD2(s.grossThisPeriod)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="readout-grid" style={{ marginTop: 14 }}>
          <Readout label="Total capital across sources" value={fmtUSD(totalSourceCapital)} />
          <Readout label="Blended APY" value={fmtPct(blendedSourceApy, 2)} color="var(--good)" />
          <Readout label="Gross yield this period (all sources)" value={fmtUSD2(totalReserveGrossThisPeriod)} color="var(--fyc)" />
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>3. Putting it together</h3>
        <p style={{ fontSize: 14.5, lineHeight: 1.7 }}>
          Both estimates from above feed the SAME pipeline every other yield dollar in this design goes
          through: the 85/15 fee, then a split (flat pool-share for reserve yield, the severity-scaled curve
          for loan interest — capped at <b>{maxFycApyPct.toFixed(1)}%</b> total blended APY, see{' '}
          <Link href="/simulator">/simulator</Link>). FYC&rsquo;s two resulting shares are what optimistic
          pricing assumes is already &ldquo;as good as collected.&rdquo;
        </p>
        <div className="grid-2" style={{ marginTop: 12 }}>
          <MiniField label="Outstanding principal" value={outstanding} step={10000} onChange={setOutstanding} />
          <MiniField label="FYC total supply (tokens)" value={totalSupply} step={10000} onChange={setTotalSupply} />
          <MiniField label="Max FYC APY (cap)" value={maxFycApyPct} step={0.5} suffix="%" onChange={setMaxFycApyPct} />
        </div>
        <div className="readout-grid" style={{ marginTop: 14 }}>
          <Readout label="FYC's reserve-yield share" value={fmtUSD2(reserveSplit.fycShare)} />
          <Readout
            label="FYC's loan-interest share"
            value={fmtUSD2(loanDist.fycShare)}
            sub={loanDist.capped ? `capped — $${loanDist.redirectedToFfc.toFixed(2)} redirected to FFC` : 'not capped'}
          />
          <Readout label="FYC's total yield estimate" value={fmtUSD2(fycYieldEstimate)} color="var(--fyc)" />
        </div>
        <div className="grid-2" style={{ marginTop: 14, gap: 16 }}>
          <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>CONSERVATIVE (redeem now)</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>${conservativePrice.toFixed(4)}</div>
          </div>
          <div style={{ padding: 16, background: 'var(--fyc-wash)', borderRadius: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fyc)' }}>OPTIMISTIC (mint now)</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--fyc)' }}>${optimisticPrice.toFixed(4)}</div>
          </div>
        </div>
        <Callout tone={invariantHolds ? 'good' : 'amber'} >
          <b>spread = optimistic − conservative = ${spread.toFixed(6)}</b> —{' '}
          {invariantHolds ? 'holds ✓ (never negative, by construction: both estimates are ≥ 0)' : 'VIOLATED — this should never happen; see below.'}
        </Callout>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>The bug this page was built to catch</h3>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          The formula above always holds — the two estimates are non-negative by construction, full stop. But{' '}
          <Link href="/simulator">/simulator</Link>&rsquo;s &ldquo;Token price over time&rdquo; chart plots one point per
          period for EACH price, and until recently it could still show conservative reading above optimistic.
          Not a formula bug — a <b>timing bug</b>: the chart&rsquo;s optimistic point for period P was a stale
          snapshot from the very TOP of period P (before that period&rsquo;s own mint/redeem activity, using an
          ESTIMATE), while its conservative point was measured at the END of period P (after that period&rsquo;s
          yield had already landed for real). Whenever a mid-period mint enlarged the reserve or loan base the
          ACTUAL collection used beyond what the stale estimate anticipated, the two numbers being compared
          weren&rsquo;t actually the same moment — confirmed by direct simulation, dozens of violations across
          20 random seeds, before the fix.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Fixed by always comparing the SAME instant: each period&rsquo;s optimistic price is now backfilled
          from the following period&rsquo;s pre-activity estimate — the same moment that period&rsquo;s
          conservative price was measured at — instead of using its own, now-stale one. See{' '}
          <code>lib/simulate.ts</code> for the exact fix.
        </p>
        <div className="readout-grid" style={{ marginTop: 12 }}>
          <Readout
            label="Reported scenario, re-run live (same-period FYC mint + high-APR loan)"
            value={proofViolations.length === 0 ? 'PASS — 0 violations' : `FAIL — ${proofViolations.length} violation(s)`}
            color={proofViolations.length === 0 ? 'var(--good)' : 'var(--critical)'}
            sub={proofViolations.length > 0 ? proofViolations.map((s) => `p${s.period}`).join(', ') : '24 periods checked'}
          />
          <Readout
            label={`Random stress sweep (${SWEEP_SEEDS} seeds, mints + redeems + defaults + an active APY cap)`}
            value={sweepViolations === 0 ? `PASS — 0 / ${sweepChecked}` : `FAIL — ${sweepViolations} / ${sweepChecked}`}
            color={sweepViolations === 0 ? 'var(--good)' : 'var(--critical)'}
            sub="both tranches, every period, checked live on every page load"
          />
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12, marginBottom: 0 }}>
          These two readouts re-run the actual simulator on every page load — not a cached screenshot. If this
          regresses, this page will show it.
        </p>
      </Card>

      <Collapsible label="for grown-ups: the exact formulas, spelled out">
        <p style={{ margin: '0 0 10px' }}>
          <b>rollup(state, now)</b> = state.checkpoint + state.rate × (now − state.updatedAt) — the loan-side
          accumulator, summed across every active loan&rsquo;s own contribution to <code>state.rate</code>.
        </p>
        <p style={{ margin: '0 0 10px' }}>
          <b>blended_apy</b> = Σ(capital_i × apy_i) ÷ Σ capital_i — the reserve-side blend across every
          registered source.
        </p>
        <p style={{ margin: '0 0 10px' }}>
          <b>optimistic_price</b> = (v_tranche + loan_estimate + yield_estimate) ÷ total_supply.{' '}
          <b>conservative_price</b> = v_tranche ÷ total_supply.
        </p>
        <p style={{ margin: 0 }}>
          Full derivations and editable worked examples for every piece: <Link href="/latex">/latex</Link>,{' '}
          <Link href="/glossary">/glossary</Link>, and the real simulation at{' '}
          <Link href="/simulator">/simulator</Link>.
        </p>
      </Collapsible>
    </>
  );
}
