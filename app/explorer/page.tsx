'use client';

import { useMemo, useState } from 'react';
import { useSeverityGate } from '@/components/SeverityGateContext';
import LineChart from '@/components/LineChart';
import { PageHeader, Card, Readout, Callout, Pill, Meter, Collapsible } from '@/components/ui';
import {
  SEVERITY_MINT_FLOOR,
  SEVERITY_REF,
  ALLOCATION_CEILING_FRACTION,
  NET_YIELD_FRACTION,
  PERIODS_PER_YEAR,
  coverageOf,
  severityOf,
  curveAtActual,
  curveAtSwept,
  assertOriginationAllowed,
  assertMintAllowed,
  bindingConstraint,
  severityCeilingOutstanding,
  splitBaseYieldTokenYield,
  distributeLoanInterest,
  levelizedInterest,
  fmtUSD,
  fmtPct,
} from '@/lib/model';

/** Loans on this page are assumed to be a representative 3-year (36-month)
 * term — interest is the flat, levelized figure over that life, matching
 * how the protocol books it (see /formula), not true declining-balance. */
const TERM_MONTHS = 36;

export default function ExplorerPage() {
  const [tab, setTab] = useState<'curve' | 'allocation'>('curve');
  const [fyc, setFyc] = useState(600000);
  const [ffc, setFfc] = useState(400000);
  const [out, setOut] = useState(450000);
  const [reserveApy, setReserveApy] = useState(3.5);
  const [loanApr, setLoanApr] = useState(15);
  // Shared override of SEVERITY_GATE_MAX — set here, but also read by the
  // simulator (via SeverityGateProvider in the root layout), so exploring a
  // different threshold on this page carries through to a scenario run too.
  // The app-wide default in lib/model.ts stays untouched either way.
  const { severityGateMax, setSeverityGateMax } = useSeverityGate();
  const gateMax = severityGateMax / 100;

  // These ceilings only cap how far you can drag FFC/outstanding UP — they
  // gate new minting and new origination, which the protocol genuinely can
  // block. They do NOT reduce the current ffc/out values when the ceiling
  // shrinks (e.g. outstanding shrinking pushes severity below the mint
  // floor): the protocol can refuse to mint more FFC, but it has no
  // mechanism to force existing FFC holders to redeem, and a loan already
  // outstanding doesn't unwind itself just because a fresh origination of
  // that size wouldn't clear the gate anymore. So ffc/out are plain,
  // independently-settable state — only the sliders' max (and the
  // origination/mint gate checks below, which already read live ffc/out/fyc)
  // react to the other dials.
  const ffcSliderMax = Math.max(50000, Math.min(1000000, out - SEVERITY_MINT_FLOOR * fyc));
  const outSliderMax = Math.max(0, Math.min(1000000, Math.min(severityCeilingOutstanding(ffc, fyc, gateMax), (fyc + ffc) * ALLOCATION_CEILING_FRACTION)));

  const coveragePct = coverageOf(out, ffc) * 100;
  const severity = severityOf(out, ffc, fyc);
  const curve = curveAtActual(out, ffc, fyc);
  const origination = assertOriginationAllowed({ fyc, ffc, outstanding: out }, 0, gateMax);
  const mint = assertMintAllowed({ fyc, ffc, outstanding: out });
  const binding = bindingConstraint(fyc, ffc, gateMax);
  const gateCovPct = fyc > 0 ? (ffc / (ffc + gateMax * fyc)) * 100 : 100;

  // Blended APY — reserve yield (pro-rata, unaffected by the curve) plus loan
  // interest (curve-split), combined and annualized, exactly like one period
  // of the time-stepped simulator but computed instantly off the sliders.
  const reserve = Math.max(0, fyc + ffc - out);
  // Divides/re-multiplies by PERIODS_PER_YEAR (≈12.1667), not a flat 12 — a
  // period is 30 days, not a calendar month, so this now matches both the
  // fixed amortization math above (see monthlyPayment) and the simulator's
  // own annualization, instead of quietly disagreeing with both by ~1.4%.
  const reserveGrossYield = (reserve * (reserveApy / 100)) / PERIODS_PER_YEAR;
  const reserveNetYield = reserveGrossYield * NET_YIELD_FRACTION;
  const reserveSplit = splitBaseYieldTokenYield(reserveNetYield, fyc, ffc);
  const loanGrossInterest = levelizedInterest(out, loanApr / 100, TERM_MONTHS);
  const loanDist = distributeLoanInterest({ fyc, ffc, outstanding: out }, loanGrossInterest);
  const fycMonthlyYield = reserveSplit.fycShare + loanDist.fycShare;
  const ffcMonthlyYield = reserveSplit.ffcShare + loanDist.ffcShare;
  const fycApy = fyc > 0 ? (fycMonthlyYield / fyc) * PERIODS_PER_YEAR * 100 : 0;
  const ffcApy = ffc > 0 ? (ffcMonthlyYield / ffc) * PERIODS_PER_YEAR * 100 : 0;
  // Platform APY — the same combined reserve + loan yield, but relative to the
  // whole pool (FYC + FFC) rather than either tranche alone. This is just
  // the size-weighted average of the two APYs above — the split moves money
  // between tranches, it doesn't create or destroy any of it.
  const totalTvl = fyc + ffc;
  const platformMonthlyYield = fycMonthlyYield + ffcMonthlyYield;
  const platformApy = totalTvl > 0 ? (platformMonthlyYield / totalTvl) * PERIODS_PER_YEAR * 100 : 0;

  // Max loan allowed right now — whichever of the two independent ceilings
  // (severity gate, 80% allocation ceiling) leaves less headroom above the
  // current outstanding balance.
  const severityCeiling = severityCeilingOutstanding(ffc, fyc, gateMax);
  const allocationCeiling = (fyc + ffc) * ALLOCATION_CEILING_FRACTION;
  const maxLoanBySeverity = Math.max(0, severityCeiling - out);
  const maxLoanByAllocation = Math.max(0, allocationCeiling - out);
  const maxLoanAllowed = Math.min(maxLoanBySeverity, maxLoanByAllocation);
  const maxLoanBinding: 'severity' | 'allocation' = maxLoanBySeverity <= maxLoanByAllocation ? 'severity' : 'allocation';

  // Deployment — how much of total TVL sits in the loan book vs. idle
  // reserve, against the 20% reserve minimum (the complement of the 80%
  // allocation ceiling) and how much of the *lendable* 80% is actually used.
  const deployedPct = totalTvl > 0 ? (out / totalTvl) * 100 : 0;
  const reservePct = 100 - deployedPct;
  const lendableUtilizationPct = allocationCeiling > 0 ? (out / allocationCeiling) * 100 : 0;

  // A $10K-a-month hypothetical, used only to express curve.share as a rate
  // per $1 invested — feeds the "Premium, not parity" callout below.
  const NET = 10000;
  const ffcDollar = NET * curve.share;
  const fycDollar = NET - ffcDollar;
  const ffcRate = ffc > 0 ? (ffcDollar / ffc) * 100 : 0;
  const fycRate = fyc > 0 ? (fycDollar / fyc) * 100 : 0;

  const curvePoints = useMemo(() => {
    const ffcPts: { x: number; y: number }[] = [];
    const fycPts: { x: number; y: number }[] = [];
    for (let c = 0; c <= 100; c += 1) {
      const share = curveAtSwept(c, ffc, fyc).share * 100;
      ffcPts.push({ x: c, y: share });
      fycPts.push({ x: c, y: 100 - share });
    }
    return { ffcPts, fycPts };
  }, [ffc, fyc]);

  // Loan-interest-only APY, swept across coverage — same curve as above, but
  // expressed as the annualized rate each tranche actually earns rather than
  // a share of net interest. Outstanding is implied from coverage (P =
  // FFC / coverage), and interest on that implied loan is levelized over
  // TERM_MONTHS, same assumption as the live loanGrossInterest above.
  const apyCurvePoints = useMemo(() => {
    const fycPts: { x: number; y: number }[] = [];
    const ffcPts: { x: number; y: number }[] = [];
    // Starts at 20%, not 0% — below that the implied loan size (FFC / coverage)
    // blows up and so does the APY, which would squash the rest of the chart
    // into an unreadable sliver near the axis. That extreme-premium zone is
    // already covered by the share-based curve above.
    for (let c = 20; c <= 100; c += 1) {
      const impliedP = ffc > 0 ? ffc / (c / 100) : 0;
      const gross = levelizedInterest(impliedP, loanApr / 100, TERM_MONTHS);
      const net = gross * NET_YIELD_FRACTION;
      const sweptCurve = curveAtSwept(c, ffc, fyc);
      const ffcShare = net * sweptCurve.share;
      const fycShare = net - ffcShare;
      fycPts.push({ x: c, y: fyc > 0 ? (fycShare / fyc) * PERIODS_PER_YEAR * 100 : 0 });
      ffcPts.push({ x: c, y: ffc > 0 ? (ffcShare / ffc) * PERIODS_PER_YEAR * 100 : 0 });
    }
    return { fycPts, ffcPts };
  }, [ffc, fyc, loanApr]);
  const apyChartMax = Math.max(
    5,
    Math.ceil(Math.max(...apyCurvePoints.fycPts.map((p) => p.y), ...apyCurvePoints.ffcPts.map((p) => p.y)) / 5) * 5,
  );

  // Severity meter's display ceiling scales with the gate itself — always
  // shows the gate mark at the halfway point, with headroom above it.
  const sevMeterMax = Math.max(40, severityGateMax * 2);
  const sevDisplay = Math.min(sevMeterMax, severity * 100);

  return (
    <>
      <PageHeader
        eyebrow="pinochio / src / helpers / coverage.rs, curve.rs (new)"
        title="Coverage, severity & the new curve"
        lede={
          <>
            Two dials, not one. <b>Coverage</b> (FFC / outstanding) is the attachment point — how much of the
            loan book has to go bad before FYC is touched at all. <b>Severity</b> ((outstanding − FFC) / FYC)
            is the impact — how much of FYC&rsquo;s own TVL is actually at risk if that happens. FYC&rsquo;s
            size is a free variable here, so severity is real, independent information on top of coverage —
            two pools at the same coverage can carry very different severity depending on how large FYC is.
            Coverage sets the base premium curve; severity scales how much of it applies on top of a
            guaranteed floor, so coverage always keeps at least half its say even when severity is low. The
            same severity number also drives two new gates below.
          </>
        }
      />

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'curve' ? 'active' : ''}`} onClick={() => setTab('curve')}>
          Coverage &amp; curve
        </button>
        <button className={`tab-btn ${tab === 'allocation' ? 'active' : ''}`} onClick={() => setTab('allocation')}>
          Max loan allocation
        </button>
      </div>

      {tab === 'curve' && (
      <>
      <Card>
        <div className="grid-2">
          <div>
            <div className="live-strip">
              <div className="readout-grid dense">
                <Readout compact label="Total TVL" value={fmtUSD(totalTvl)} />
                <Readout compact label="Coverage" value={coveragePct.toFixed(1) + '%'} />
                <Readout compact label="Severity" value={isFinite(severity) ? (severity * 100).toFixed(1) + '%' : 'n/a'} />
                <Readout compact label="k" value={curve.k.toFixed(2) + '×'} />
                <Readout compact label="Platform APY" value={fmtPct(platformApy / 100)} color="var(--accent)" />
                <Readout compact label="FYC APY" value={fmtPct(fycApy / 100)} color="var(--fyc)" />
                <Readout compact label="FFC APY" value={fmtPct(ffcApy / 100)} color="var(--ffc)" />
                <Readout compact label="Max new loan" value={fmtUSD(maxLoanAllowed)} color="var(--accent)" />
              </div>
              <Collapsible label="what am I looking at?" defaultOpen={false}>
                <p style={{ margin: '0 0 8px' }}>
                  <b>Total TVL</b> — FYC + FFC combined. Everything below is a function of this and how it&rsquo;s
                  split between the two sliders.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <b>Coverage / Severity / k</b> — the two risk dials and the resulting premium multiplier, live
                  off the sliders below.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <b>Platform APY</b> — the same reserve + loan yield, but relative to the whole pool (FYC +
                  FFC) instead of either tranche alone: what the platform earns on total TVL, before the
                  curve splits it up. It&rsquo;s just the size-weighted average of FYC and FFC APY — the split
                  moves money between tranches, it doesn&rsquo;t create or destroy any of it.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <b>FYC / FFC APY</b> — reserve yield (pro-rata) plus loan interest (curve-split) at the
                  representative loan APR, levelized over an assumed 3-year term, combined and annualized.
                  FFC earns <b style={{ color: 'var(--ffc)' }}>{fycApy > 0 ? (ffcApy / fycApy).toFixed(2) : '—'}×</b>{' '}
                  FYC&rsquo;s blended rate here — diluted below the raw {curve.k.toFixed(2)}× loan-interest
                  premium because reserve yield (unaffected by the curve) is part of the blend too.
                </p>
                <p style={{ margin: 0 }}>
                  <b>Max new loan</b> — the largest additional loan this pool could originate before hitting
                  whichever ceiling binds first: the severity gate at {severityGateMax}% ({fmtUSD(maxLoanBySeverity)}{' '}
                  of headroom) or the 80% allocation ceiling ({fmtUSD(maxLoanByAllocation)} of headroom) —
                  binding: <b>{maxLoanBinding === 'severity' ? 'severity gate' : '80% allocation ceiling'}</b>.
                </p>
              </Collapsible>
            </div>

            <h3>Pool inputs</h3>
            <div className="controls">
              <Slider label="FYC (senior) value" cls="fyc-slide" value={fyc} min={50000} max={1000000} step={100} onChange={setFyc} />
              <Slider
                label="FFC (junior) value"
                cls="ffc-slide"
                value={ffc}
                min={50000}
                max={Math.max(ffcSliderMax, ffc)}
                step={100}
                onChange={setFfc}
                caption={
                  ffc >= ffcSliderMax
                    ? 'no further minting from here — severity would already drop to ≤2%. Existing FFC isn’t forced to redeem, though — you can still drag this down freely.'
                    : `new minting capped at ${fmtUSD(ffcSliderMax)} — a floor on future mints, not a ceiling forced onto what’s already held`
                }
                captionTone={ffc >= ffcSliderMax ? 'warning' : 'muted'}
              />
              <Slider
                label="Outstanding loan principal"
                value={out}
                min={0}
                max={Math.max(outSliderMax, out)}
                step={100}
                onChange={setOut}
                caption={
                  out >= outSliderMax
                    ? `no further origination from here (${binding.kind === 'severity' ? 'severity gate' : '80% allocation ceiling'}) — existing loans aren’t called just because a fresh one wouldn’t clear the gate`
                    : `new origination capped at ${fmtUSD(outSliderMax)} (${binding.kind === 'severity' ? 'severity gate' : '80% allocation ceiling'})`
                }
                captionTone={out >= outSliderMax ? 'warning' : 'muted'}
              />
              <PercentSlider
                label="Severity gate (origination)"
                value={severityGateMax}
                min={5}
                max={60}
                step={1}
                onChange={setSeverityGateMax}
              />
              <PercentSlider label="Reserve/yield-token APY" value={reserveApy} min={0} max={10} step={0.1} onChange={setReserveApy} />
              <PercentSlider label="Representative loan APR (3-yr term)" value={loanApr} min={1} max={30} step={0.5} onChange={setLoanApr} />
            </div>

            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Coverage = min(1, FFC / outstanding)</span>
                  <span className="tabular" style={{ fontWeight: 600 }}>{coveragePct.toFixed(1)}%</span>
                </div>
                <Meter fillPct={coveragePct} color={severity <= gateMax ? 'var(--good)' : 'var(--critical)'} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>0%</span>
                  <span>informational only — see severity for the gates</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Severity = max(0, outstanding − FFC) / FYC</span>
                  <span className="tabular" style={{ fontWeight: 600 }}>{isFinite(severity) ? (severity * 100).toFixed(2) + '%' : 'n/a'}</span>
                </div>
                <Meter
                  fillPct={(sevDisplay / sevMeterMax) * 100}
                  color={severity <= SEVERITY_MINT_FLOOR ? 'var(--text-muted)' : severity > gateMax ? 'var(--critical)' : 'var(--good)'}
                  gateMarks={[
                    { pct: (SEVERITY_MINT_FLOOR * 100 / sevMeterMax) * 100, title: 'mint floor 2%' },
                    { pct: (severityGateMax / sevMeterMax) * 100, title: `gate max ${severityGateMax}%` },
                  ]}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>0%</span>
                  <span>2% mint floor</span>
                  <span>{severityGateMax}% gate max</span>
                  <span>{sevMeterMax}%+</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Deployment = outstanding / total TVL</span>
                  <span className="tabular" style={{ fontWeight: 600 }}>{deployedPct.toFixed(1)}%</span>
                </div>
                <Meter
                  fillPct={deployedPct}
                  color={out <= allocationCeiling ? 'var(--good)' : 'var(--critical)'}
                  gateMarks={[{ pct: ALLOCATION_CEILING_FRACTION * 100, title: '80% allocation ceiling — 20% reserve minimum' }]}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>0%</span>
                  <span>reserve ≥ 20%</span>
                  <span>80% max lendable</span>
                  <span>100%</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                  {fmtUSD(reserve)} reserve ({reservePct.toFixed(1)}% of pool) · {fmtUSD(out)} deployed (
                  {lendableUtilizationPct.toFixed(1)}% of the 80% lendable cap used)
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                  Max new loan <b style={{ color: 'var(--text-primary)' }}>{fmtUSD(maxLoanAllowed)}</b> — binding:{' '}
                  <b style={{ color: 'var(--text-primary)' }}>
                    {maxLoanBinding === 'severity' ? `severity gate (${severityGateMax}%)` : '80% allocation ceiling'}
                  </b>{' '}
                  (severity headroom {fmtUSD(maxLoanBySeverity)} / allocation headroom {fmtUSD(maxLoanByAllocation)})
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Pill tone={origination.allowed ? 'good' : 'bad'}>
                  {origination.allowed ? '✓ origination allowed' : `✕ severity > ${severityGateMax}% — origination blocked`}
                </Pill>
                <Pill tone={mint.allowed ? 'good' : 'bad'}>
                  {mint.allowed ? '✓ FFC minting open' : '✕ FFC minting blocked — already more than enough'}
                </Pill>
              </div>
              <div>
                <Pill tone="neutral">
                  binding constraint: {binding.kind === 'severity' ? 'severity gate' : '80% allocation ceiling'} ({fmtUSD(binding.value)})
                </Pill>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <Callout>
                <strong>Premium, not parity:</strong> FFC&rsquo;s rate on this month&rsquo;s loan interest is{' '}
                <b>{curve.k.toFixed(2)}×</b> FYC&rsquo;s — <b style={{ color: 'var(--ffc)' }}>{ffcRate.toFixed(3)}%</b> vs{' '}
                <b style={{ color: 'var(--fyc)' }}>{fycRate.toFixed(3)}%</b> (per $1 invested, this slice only).
                Severity is <b>{isFinite(severity) ? (severity * 100).toFixed(1) + '%' : '—'}</b> —{' '}
                {severity <= SEVERITY_MINT_FLOOR
                  ? 'negligible — at or past the minting ceiling'
                  : severity >= SEVERITY_REF
                    ? 'at or above the reference point — full coverage-driven premium applies'
                    : 'below the reference point — coverage still keeps its guaranteed floor share, severity is scaling the rest'}
                .
              </Callout>
            </div>
          </div>

          <div>
            <h3>The kinked curve</h3>
            <Collapsible label="what does this chart show?">
              Each tranche&rsquo;s share of net loan interest for <em>this</em> pool&rsquo;s FYC/FFC sizes, keyed
              on coverage and bent by severity. The gate marker moves with FYC&rsquo;s size now — it&rsquo;s no
              longer a fixed coverage line. Try shrinking FYC and watch it slide left. Ticks mark the five
              stored k_base breakpoints.
            </Collapsible>
            <div style={{ marginTop: 10 }} />
            <LineChart
              xDomain={[0, 100]}
              yDomain={[0, 100]}
              xTicks={[0, 20, 41, 80, 100]}
              yTicks={[0, 20, 40, 60, 80, 100]}
              formatX={(v) => Math.round(v) + '%'}
              formatY={(v) => Math.round(v) + '%'}
              xLabel="coverage →"
              height={300}
              vLines={[{ x: gateCovPct, label: 'gate', color: 'var(--warning)' }, { x: coveragePct, label: 'live', color: 'var(--text-primary)', dashed: true }]}
              series={[
                { name: 'FFC share', color: 'var(--ffc)', points: curvePoints.ffcPts, width: 2.5 },
                { name: 'FYC share', color: 'var(--fyc)', points: curvePoints.fycPts, width: 2.5, dashed: true },
              ]}
            />

            <h3 style={{ marginTop: 20 }}>APY across coverage — assumes 3-year loan term</h3>
            <Collapsible label="what does this chart show?">
              Same curve, in real terms: the annualized loan-interest-only rate each tranche earns as coverage
              moves, at the representative loan APR above, levelized over a 36-month term (see /formula — flat,
              not declining-balance). Clipped below 20% coverage, where the implied loan size relative to FFC
              — and the APY with it — grows very large.
            </Collapsible>
            <div style={{ marginTop: 10 }} />
            <LineChart
              xDomain={[20, 100]}
              yDomain={[0, apyChartMax]}
              xTicks={[20, 41, 60, 80, 100]}
              yTicks={Array.from({ length: 6 }, (_, i) => Math.round((apyChartMax / 5) * i))}
              formatX={(v) => Math.round(v) + '%'}
              formatY={(v) => v.toFixed(1) + '%'}
              xLabel="coverage →"
              height={280}
              vLines={[{ x: gateCovPct, label: 'gate', color: 'var(--warning)' }, { x: coveragePct, label: 'live', color: 'var(--text-primary)', dashed: true }]}
              series={[
                { name: 'FFC APY', color: 'var(--ffc)', points: apyCurvePoints.ffcPts, width: 2.5 },
                { name: 'FYC APY', color: 'var(--fyc)', points: apyCurvePoints.fycPts, width: 2.5, dashed: true },
              ]}
            />
            <GateLiveLegend />
          </div>
        </div>
      </Card>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <Collapsible label="origination gate — why severity-based now?">
          Reopened and replaced: the old rule blocked new loans whenever coverage dropped below a flat 80%,
          regardless of how large FYC actually was — which meant origination capacity was bottlenecked by
          FFC&rsquo;s size alone, even when FYC could easily absorb the real risk. The new rule blocks a loan
          only if it would push severity above the gate threshold above ({severityGateMax}%, adjustable — 50%
          in the current design), measured against FYC&rsquo;s actual size instead of assumed to be 1:1 with
          it. Try it: at $600K/$400K, growing FYC to $2M raises the origination ceiling from{' '}
          {fmtUSD(severityCeilingOutstanding(400000, 600000, gateMax))} to{' '}
          {fmtUSD(severityCeilingOutstanding(400000, 2000000, gateMax))} with FFC untouched.
        </Collapsible>
        <Collapsible label="FFC minting ceiling — why new?">
          Blocks new FFC deposits once severity drops to 2% or below — the point where FFC is already
          covering the book so thoroughly that more junior capital isn&rsquo;t buying any real additional
          protection, just diluting existing FFC holders&rsquo; yield. Unlike the origination gate, this one{' '}
          <em>does</em> use severity&rsquo;s low end deliberately: the whole point is to stop minting once the
          marginal protection is negligible, which is exactly what a severity floor measures.
        </Collapsible>
      </div>
      </>
      )}

      {tab === 'allocation' && (
        <MaxAllocationTab fyc={fyc} ffc={ffc} gateMax={gateMax} severityGateMax={severityGateMax} />
      )}
    </>
  );
}

/** Sweeps every possible FYC:FFC split at a fixed total TVL and asks: what's
 * the largest loan (as % of TVL) the severity gate would ever allow at THIS
 * split, before the flat 80% allocation ceiling (independent of the split)
 * takes over as the binding constraint instead? Closed-form, not numerically
 * searched — see severityCeilingOutstanding/bindingConstraint in lib/model.ts,
 * the same two functions every other gate check on this page already uses.
 *
 * severity ceiling, as a fraction of TVL, at FFC share x = FFC/TVL:
 *   outstanding/TVL ≤ x + gateMax·(1 − x)  =  gateMax + (1 − gateMax)·x
 * increasing in x, so more FFC always raises the severity-side ceiling —
 * until it crosses the flat allocation ceiling, where more FFC stops buying
 * any additional capacity at all.
 */
function MaxAllocationTab({ fyc, ffc, gateMax, severityGateMax }: { fyc: number; ffc: number; gateMax: number; severityGateMax: number }) {
  const totalTvl = fyc + ffc;
  const yourFfcSharePct = totalTvl > 0 ? (ffc / totalTvl) * 100 : 0;

  // Where the two lines cross: gateMax + (1-gateMax)*x = ALLOCATION_CEILING_FRACTION.
  // If the gate is already at or above the allocation ceiling, the flat 80%
  // line binds everywhere, even at FFC share 0 — crossover collapses to 0%.
  const crossoverFfcSharePct =
    gateMax >= ALLOCATION_CEILING_FRACTION
      ? 0
      : Math.max(0, Math.min(100, ((ALLOCATION_CEILING_FRACTION - gateMax) / (1 - gateMax)) * 100));

  const points = useMemo(() => {
    const severityLine: { x: number; y: number }[] = [];
    const maxLine: { x: number; y: number }[] = [];
    for (let x = 0; x <= 100; x += 1) {
      const frac = x / 100;
      const severityRatioPct = (gateMax + (1 - gateMax) * frac) * 100;
      severityLine.push({ x, y: Math.min(100, severityRatioPct) });
      maxLine.push({ x, y: Math.min(severityRatioPct, ALLOCATION_CEILING_FRACTION * 100) });
    }
    return { severityLine, maxLine };
  }, [gateMax]);

  const yourMaxLoanPct = Math.min(
    gateMax * 100 + (100 - gateMax * 100) * (yourFfcSharePct / 100),
    ALLOCATION_CEILING_FRACTION * 100,
  );

  return (
    <>
      <Card>
        <h3 style={{ marginTop: 0 }}>The highest possible loan, as a % of total pool value</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Sweeping every possible FYC:FFC split at a fixed total pool value — not just this page&rsquo;s current
          sliders — answers a different question than the live dashboard on the other tab: not &ldquo;what can{' '}
          <em>this</em>{' '}
          pool originate right now,&rdquo; but &ldquo;what&rsquo;s the largest loan book ANY pool,
          at ANY split, could ever get to.&rdquo; Two independent ceilings apply at every split — whichever is
          smaller wins:
        </p>
        <ul style={{ fontSize: 14, lineHeight: 1.9, paddingLeft: 20 }}>
          <li>
            <b>Severity gate</b> — rises with FFC&rsquo;s share of the pool: <code>outstanding/TVL ≤{' '}
            {severityGateMax}% + {(100 - severityGateMax).toFixed(0)}% × (FFC ÷ TVL)</code>. More FFC always
            buys more room, on this constraint alone.
          </li>
          <li>
            <b>80% allocation ceiling</b> — flat, {(ALLOCATION_CEILING_FRACTION * 100).toFixed(0)}% of TVL
            regardless of split. Doesn&rsquo;t care how the pool is divided at all.
          </li>
        </ul>
        <Callout>
          <strong>The answer: {(ALLOCATION_CEILING_FRACTION * 100).toFixed(0)}%, always</strong> — no split ever
          lets the pool originate more than the flat allocation ceiling. At the current {severityGateMax}%
          severity gate, that ceiling is reached once FFC alone is{' '}
          <b>{crossoverFfcSharePct.toFixed(1)}%</b>{' '}
          of total pool value — past that point, adding MORE FFC buys
          zero additional loan capacity, since the allocation ceiling (not severity) is already what&rsquo;s
          binding.
        </Callout>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Max loan ceiling vs. FFC&rsquo;s share of the pool</h3>
        <Collapsible label="what does this chart show?">
          The solid line is the actual binding ceiling at each possible split — the smaller of the two
          constraints above. The dashed line is the severity gate alone, uncapped, so you can see where it
          WOULD go if the allocation ceiling weren&rsquo;t there. Where they diverge is the crossover point.
        </Collapsible>
        <div style={{ marginTop: 10 }} />
        <LineChart
          xDomain={[0, 100]}
          yDomain={[0, 100]}
          xTicks={[0, 20, 40, 60, 80, 100]}
          yTicks={[0, 20, 40, 60, 80, 100]}
          formatX={(v) => Math.round(v) + '%'}
          formatY={(v) => Math.round(v) + '%'}
          xLabel="FFC's share of total pool value →"
          height={320}
          vLines={[
            { x: crossoverFfcSharePct, label: `crossover ${crossoverFfcSharePct.toFixed(0)}%`, color: 'var(--warning)' },
            { x: yourFfcSharePct, label: 'your pool', color: 'var(--text-primary)', dashed: true },
          ]}
          hLines={[{ y: ALLOCATION_CEILING_FRACTION * 100, label: `${(ALLOCATION_CEILING_FRACTION * 100).toFixed(0)}% allocation ceiling`, color: 'var(--text-muted)' }]}
          series={[
            { name: 'Max loan (% of TVL)', color: 'var(--accent)', points: points.maxLine, width: 2.5 },
            { name: 'Severity gate alone (uncapped)', color: 'var(--fyc)', points: points.severityLine, width: 1.5, dashed: true },
          ]}
        />
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 10 }}>
          Your pool right now: FFC is <b>{yourFfcSharePct.toFixed(1)}%</b> of total value ({fmtUSD(ffc)} of{' '}
          {fmtUSD(totalTvl)}), max loan ceiling <b>{yourMaxLoanPct.toFixed(1)}%</b> of TVL — switch to the{' '}
          <b>Coverage &amp; curve</b> tab to move the sliders and watch this marker move.
        </p>
      </Card>
    </>
  );
}

/** Always-visible (not collapsed) key for the two vertical marker lines that
 * show up on every coverage-axis chart on this page — meant to be readable
 * by someone outside the team glancing at the dashboard, not just whoever
 * built it. */
function GateLiveLegend() {
  return (
    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '8px 0 4px', fontSize: 11.5, color: 'var(--text-secondary)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 14, height: 2, background: 'var(--warning)', display: 'inline-block' }} />
        <b style={{ color: 'var(--text-primary)' }}>gate</b> — the severity-gate threshold, at this pool&rsquo;s current FYC size. Origination stops past this line.
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 14, height: 0, borderTop: '2px dashed var(--text-primary)', display: 'inline-block' }} />
        <b style={{ color: 'var(--text-primary)' }}>live</b> — this pool&rsquo;s coverage right now, from the sliders above.
      </span>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  cls,
  caption,
  captionTone = 'warning',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  cls?: string;
  caption?: string;
  captionTone?: 'warning' | 'muted';
}) {
  return (
    <div className="control">
      <div className="row">
        <span className="name">{label}</span>
        <span className="val">{fmtUSD(value)}</span>
      </div>
      <input
        type="range"
        className={cls}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      {caption && (
        <div style={{ fontSize: 10.5, color: captionTone === 'warning' ? 'var(--warning)' : 'var(--text-muted)', marginTop: 4 }}>
          {caption}
        </div>
      )}
    </div>
  );
}

function PercentSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="control">
      <div className="row">
        <span className="name">{label}</span>
        <span className="val">{value.toFixed(1)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </div>
  );
}
