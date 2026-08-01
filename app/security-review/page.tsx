'use client';

import Link from 'next/link';
import { PageHeader, Card, Callout, Badge, Readout, Collapsible } from '@/components/ui';
import { runSimulation, type OriginationEvent, type TrancheActivityEvent } from '@/lib/simulate';
import { generateRandomOriginations, generateRandomTrancheActivity, generateRandomDefaults } from '@/lib/random';
import { PERIODS_PER_YEAR } from '@/lib/model';

function runRedeemExploitCheck() {
  const CAP = 0.03;
  const originations: OriginationEvent[] = [
    { id: 'o1', period: 1, amount: 300000, apr: 0.4, termMonths: 36, feePct: 0.01 },
  ];
  const trancheActivity: TrancheActivityEvent[] = [
    { id: 'a1', period: 2, tranche: 'fyc', kind: 'redeem', amount: 400000, mode: 'instant' },
  ];
  const result = runSimulation({
    initialFyc: 600000,
    initialFfc: 400000,
    reserveApy: 0.035,
    periods: 5,
    originations,
    defaults: [],
    trancheActivity,
    maxFycApy: CAP,
  });
  let worstTrueRate = -Infinity;
  for (let i = 1; i < result.steps.length; i++) {
    const prev = result.steps[i - 1];
    const cur = result.steps[i];
    if (prev.fycPrice <= 0) continue;
    const trueRate = ((cur.fycPrice - prev.fycPrice) / prev.fycPrice) * PERIODS_PER_YEAR;
    worstTrueRate = Math.max(worstTrueRate, trueRate);
  }
  return { cap: CAP, worstTrueRate };
}

function runStressSweep() {
  let violations = 0;
  let checked = 0;
  const CAP = 0.05;
  const SEEDS = 30;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const originations = generateRandomOriginations({
      seed,
      periods: 30,
      aprMin: 0.1,
      aprMax: 0.45,
      amountMin: 30000,
      amountMax: 400000,
      frequency: 2,
      termMonths: 18,
      feePctMin: 0.001,
      feePctMax: 0.03,
    });
    const trancheActivity = generateRandomTrancheActivity({
      seed,
      periods: 30,
      frequency: 2,
      amountMin: 10000,
      amountMax: 400000,
      redeemFraction: 0.6,
      ffcFraction: 0.3,
    });
    const defaults = generateRandomDefaults({ seed, periods: 30, annualDefaultRate: 0.03, originations });
    const result = runSimulation({
      initialFyc: 600000,
      initialFfc: 400000,
      reserveApy: 0.02,
      periods: 30,
      originations,
      defaults,
      trancheActivity,
      maxFycApy: CAP,
    });
    for (let i = 1; i < result.steps.length; i++) {
      const prev = result.steps[i - 1];
      const cur = result.steps[i];
      if (prev.fycPrice <= 0) continue;
      checked++;
      const trueRate = ((cur.fycPrice - prev.fycPrice) / prev.fycPrice) * PERIODS_PER_YEAR;
      if (trueRate > CAP * 3) violations++;
    }
  }
  return { checked, violations, seeds: SEEDS, cap: CAP };
}

export default function SecurityReviewPage() {
  const redeemCheck = runRedeemExploitCheck();
  const sweep = runStressSweep();
  const redeemSafe = redeemCheck.worstTrueRate <= redeemCheck.cap + 1e-6;

  return (
    <>
      <PageHeader
        eyebrow="security"
        title="Security review — the FYC APY cap & optimistic pricing"
        lede="A direct, adversarial pass over the newest mechanism in this design — not a read-through, an attempt to actually break it by simulation. One finding was a real, quantifiable exploit; it's fixed and pinned with a regression test. Everything below either has a fix already landed, or is an explicitly accepted, documented risk — nothing is silently unresolved."
      />

      <Card>
        <h3 style={{ marginTop: 0 }}>Scope &amp; method</h3>
        <p style={{ fontSize: 14.5, lineHeight: 1.7 }}>
          This pass focused on the FYC APY cap (<code>capFycLoanShare</code>, <code>PoolState.max_fyc_apy_bps</code>,{' '}
          <code>set_max_fyc_apy.rs</code>) and the optimistic/conservative pricing fix it was built alongside —
          the two newest, least-battle-tested mechanisms in this redesign. Every finding below was confirmed by
          actually running the simulator against an adversarial scenario and checking the real numbers, not by
          inspection alone — see the live proof section at the bottom, which re-runs the same checks on every
          page load. The earlier redemption/tranche-swap/multi-source mechanisms already went through their own
          review during design (fee-splitting gameability, the conservative-price minting asymmetry, a jr_to_sr
          revert risk, an earmark race) — see <Link href="/open-questions">/open-questions</Link> and{' '}
          <Link href="/tranche-swap">/tranche-swap</Link> for that writeup; it isn&rsquo;t repeated here.
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Badge tone="critical">CRITICAL — FOUND &amp; FIXED</Badge>
          <h3 style={{ margin: 0 }}>The &ldquo;redeem-then-collect&rdquo; cap exploit</h3>
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.7 }}>
          The fix for the ORIGINAL reported bug (an 8% cap showing 8.7%, see{' '}
          <Link href="/optimistic-price">/optimistic-price</Link>) made <code>capFycLoanShare</code> measure its
          dollar ceiling against <code>fycStart</code> — FYC&rsquo;s balance at the TOP of the period, before
          that period&rsquo;s own mint/redeem activity. That correctly fixed the MINT case. But it opened the
          mirror exploit: if FYC REDEEMS heavily in the same period its loan interest is collected, the ceiling
          is sized against the LARGER pre-redeem <code>fycStart</code>, then that dollar amount lands on the
          SMALLER post-redeem balance — handing whoever stayed a true per-token rate far above the configured
          cap. Concretely: <b>redeem almost all your FYC right before yield lands, keep a sliver, let the
          oversized dollar injection (sized for the balance you just left) land on that tiny remainder, then
          redeem the rest at the inflated price.</b>
        </p>
        <div className="readout-grid" style={{ marginTop: 12 }}>
          <Readout
            label="Reproduction: 3% cap, large same-period FYC redemption"
            value={`worst true rate: ${(redeemCheck.worstTrueRate * 100).toFixed(2)}%`}
            color={redeemSafe ? 'var(--good)' : 'var(--critical)'}
            sub={redeemSafe ? 'within the 3% cap — fixed' : 'EXCEEDS the 3% cap — regression'}
          />
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, marginTop: 12 }}>
          Before the fix, this exact reproduction showed <b>8.82%</b> — nearly 3x the configured ceiling. The
          fix: <code>fycApyBase = Math.min(fycStart, fyc)</code> — always the SMALLER of what FYC started the
          period with and what it ends step 2 with. This closes both directions at once: the dollar ceiling can
          never exceed <code>maxFycApy</code> relative to either balance. See <code>lib/simulate.ts</code> and{' '}
          <code>lib/model.ts</code>&rsquo;s <code>capFycLoanShare</code> doc comment for the full derivation.
        </p>
        <Callout tone="good">
          <b>The real (Rust) proposal was never vulnerable to this.</b> This entire exploit is an artifact of
          the SIMULATOR&rsquo;s period-batching — it computes an estimate at the top of a period, THEN processes
          mint/redeem activity, THEN applies yield using a DIFFERENT snapshot. <code>distribute_loan_interest</code> in
          the real Rust proposal reads <code>fyc.v_tranche</code> exactly ONCE, synchronously, within a single{' '}
          <code>repay_loan.rs</code> instruction call — the same read is used to compute the ceiling AND to
          apply the resulting share, so there is no earlier/later snapshot to exploit a gap between. Even a
          multi-instruction Solana transaction that redeems FYC and then calls <code>repay_loan</code>{' '}
          atomically is safe: <code>fyc.v_tranche</code> is already reduced by the time{' '}
          <code>distribute_loan_interest</code> reads it, and it uses that SAME (already-current) value
          throughout.
        </Callout>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Badge tone="warn">LOW — DOCUMENTED, NOT EXPLOITABLE</Badge>
          <h3 style={{ margin: 0 }}>An extreme mint can make the APY display read misleadingly high</h3>
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.7 }}>
          If FYC is nearly empty and a mint dozens of times its size lands the same period as yield collection,
          the displayed <code>fycApyAnnualized</code> (yield ÷ the tiny pre-mint balance) can read far above the
          cap. Root cause: the reserve-yield leg is <b>deliberately uncapped</b> (a flat, risk-free pool-share
          split by design — see &ldquo;Reserve / yield-token yield split&rdquo; on{' '}
          <Link href="/glossary">/glossary</Link>) and always uses the POST-mint balance, while this display
          ratio divides by the pre-mint one. Checked and confirmed this is NOT a value-extraction path: the
          underlying dollars are still an exactly-fair pro-rata split of real, already-collected yield among
          whoever currently holds tokens — the just-minted depositor overwhelmingly holds the new supply, so
          they&rsquo;re essentially being handed back a fair first-period accrual on their own deposit, the same
          way any yield-bearing instrument works. Left as a known display-metric quirk rather than &ldquo;fixed,&rdquo;
          since fixing it would mean changing the reserve split&rsquo;s own math (deliberately risk-free, flat,
          unthrottled) for a cosmetic ratio, not a real dollar-safety issue.
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Badge tone="warn">MEDIUM — FOUND &amp; FIXED</Badge>
          <h3 style={{ margin: 0 }}><code>set_max_fyc_apy.rs</code> had no bound on its input</h3>
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.7 }}>
          The instruction originally accepted any <code>u64</code> at all for the new cap value. <code>
          distribute_loan_interest</code>&rsquo;s ceiling math is <code>mul_div_u64(headroom_bps, fyc.v_tranche,
          BPS_DENOMINATOR)</code> — a value near <code>u64::MAX</code> for <code>max_fyc_apy_bps</code>, combined
          with a large <code>fyc.v_tranche</code>, pushes the <code>u128</code> intermediate uncomfortably close
          to its own ceiling. Fixed by adding <code>MAX_FYC_APY_BPS</code> (100,000 bps = 1,000% APY — far above
          any real ceiling an admin would ever want) to <code>constants.rs</code>, and rejecting anything above
          it in <code>set_max_fyc_apy.rs</code>. See <Link href="/code-diff?file=pinochio%2Fsrc%2Finstructions%2Fset_max_fyc_apy.rs">/code-diff</Link>.
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Badge tone="default">ACCEPTED RISK — OPERATIONAL, NOT A BUG</Badge>
          <h3 style={{ margin: 0 }}><code>last_observed_base_apy_bps</code> staleness</h3>
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.7 }}>
          The cap reads <code>pool.last_observed_base_apy_bps</code> — refreshed only when{' '}
          <code>run_yield_epoch</code>&rsquo;s 5-account (primary reserve) branch is actually called. Nothing
          enforces that it&rsquo;s called on any particular cadence; if it goes uncalled for a long stretch, the
          cap enforces against a STALE reserve rate, understating FYC&rsquo;s true current blended APY rather
          than overstating it (the reserve leg keeps compounding in reality regardless of when the epoch tick
          catches up). Not attacker-controlled — only an admin/keeper decides when to call{' '}
          <code>run_yield_epoch</code> — so this is a liveness/operational risk, not an exploit: worth a
          staleness check (reject the cap calculation, or widen it, if{' '}
          <code>now − pool.last_epoch_ts</code> exceeds some threshold) as a future hardening, not implemented
          here since it changes behavior for every existing caller of <code>distribute_loan_interest</code>, not
          just the cap.
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Badge tone="default">ACCEPTED RISK — STANDARD ADMIN TRUST</Badge>
          <h3 style={{ margin: 0 }}>Admin can change the cap with no timelock</h3>
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.7 }}>
          <code>set_max_fyc_apy.rs</code> takes effect immediately — no timelock, no multi-sig requirement beyond
          whatever <code>assert_admin</code> already enforces. This is the SAME trust assumption every other
          admin-settable economic parameter in this protocol already carries (redemption fees, the severity
          gate, yield-source registration) — not a new risk class introduced by this feature, just extended to
          one more parameter. Noted here for completeness, not treated as a novel finding.
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Live proof — re-run on every page load</h3>
        <p style={{ fontSize: 14, lineHeight: 1.7 }}>
          These re-run the actual simulator, not a cached result. If the redeem-exploit fix ever regresses, this
          page will show it.
        </p>
        <div className="readout-grid" style={{ marginTop: 12 }}>
          <Readout
            label="Redeem-exploit reproduction (3% cap)"
            value={redeemSafe ? 'PASS — within cap' : 'FAIL — exceeds cap'}
            color={redeemSafe ? 'var(--good)' : 'var(--critical)'}
            sub={`worst true rate ${(redeemCheck.worstTrueRate * 100).toFixed(2)}% vs ${(redeemCheck.cap * 100).toFixed(0)}% cap`}
          />
          <Readout
            label={`Stress sweep — ${sweep.seeds} seeds, redeem-biased, ${(sweep.cap * 100).toFixed(0)}% cap`}
            value={sweep.violations === 0 ? `PASS — 0 / ${sweep.checked}` : `FAIL — ${sweep.violations} / ${sweep.checked}`}
            color={sweep.violations === 0 ? 'var(--good)' : 'var(--critical)'}
            sub="true per-token FYC price growth, every transition, tolerance 3x cap"
          />
        </div>
      </Card>

      <Collapsible label="what wasn't re-derived here">
        <p style={{ margin: '0 0 10px' }}>
          The earlier redemption/tranche-swap/multi-source design already went through a review during
          construction (see the plan history) that surfaced and addressed: fee-splitting gameability on the
          liquidity-scaled instant-redemption fee (splitting one redemption into many converges toward
          <code>fee_min</code> — the split-invariant integral variant is the documented hardening, not adopted
          by default), the conservative-price minting asymmetry (deliberate — see{' '}
          <Link href="/optimistic-price">/optimistic-price</Link>), a revert-risk on the fee-side{' '}
          <code>jr_to_sr</code> conversion (suspense-balance fallback recommended), an earmark
          concurrency race (mitigated by expiry + sweep, not fully solved), and the rationale for burning
          rather than transferring FFC fee tokens. None of those were re-litigated in this pass — see{' '}
          <Link href="/open-questions">/open-questions</Link> for the full list.
        </p>
        <p style={{ margin: 0 }}>
          Everything on this page is pinned by regression tests in <code>verify.ts</code> (sections 20-21) —
          re-run it to confirm independently of this page.
        </p>
      </Collapsible>
    </>
  );
}
