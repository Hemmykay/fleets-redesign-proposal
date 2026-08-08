'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import LineChart from '@/components/LineChart';
import { PageHeader, Card, Callout, Collapsible } from '@/components/ui';
import {
  coverageOf,
  severityOf,
  kBase,
  curveAtActual,
  K_MIN,
  K_BREAKPOINTS,
  SEVERITY_REF,
  COVERAGE_WEIGHT_FLOOR,
  ALLOCATION_CEILING_FRACTION,
  fmtUSD,
} from '@/lib/model';

/** Fixed at the same $600K/$400K running example every other page in this
 * tool uses — only the "money lent out" dial moves here. Two numbers to
 * turn at once (this page's whole point is teaching what ONE dial does)
 * would work against the "explain it simply" ask. */
const FYC = 600000;
const FFC = 400000;

/** Illustrative severity checkpoints for the w-scale table below — not measured
 * data like k_base's breakpoints, just enough points to make the floor →
 * SEVERITY_REF ramp → cap shape concrete. SEVERITY_REF itself is included
 * so the table shows exactly where w hits 1.00. */
const W_SCALE_ROWS = [0, 0.02, 0.04, 0.06, SEVERITY_REF, 0.12, 0.2, 0.4].map((severity) => ({ severity }));

export default function CoverageSeverityKPage() {
  const [out, setOut] = useState(450000);

  const coverageFraction = coverageOf(out, FFC);
  const coveragePct = coverageFraction * 100;
  const severity = severityOf(out, FFC, FYC);
  const curve = curveAtActual(out, FFC, FYC);
  const base = kBase(coveragePct);
  const severityFactor = Math.min(1, severity / SEVERITY_REF);
  const weight = COVERAGE_WEIGHT_FLOOR + (1 - COVERAGE_WEIGHT_FLOOR) * severityFactor;

  // k_base is coverage-only — connect-the-dots straight lines between the
  // five stored breakpoints, nothing more. No component state as an input,
  // so this only ever needs to compute once.
  const kBaseCurvePoints = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let c = 0; c <= 100; c += 1) pts.push({ x: c, y: kBase(c) });
    return pts;
  }, []);
  const kBaseChartMax = Math.max(5, Math.ceil(K_BREAKPOINTS[0].k / 2) * 2);

  const total = FYC + FFC;
  const ffcPctOfTotal = (FFC / total) * 100;
  const waterPctOfTotal = Math.min(100, (out / total) * 100);
  const spillsIntoFyc = out > FFC;

  const coverageStory =
    coveragePct >= 100
      ? "Jamie's jar alone could cover every single dollar lent out, with some left over. Sam's jar is never touched — the water line doesn't even reach it."
      : coveragePct >= 60
        ? "Jamie's jar could cover most of what's lent out on its own. Only a little would spill into Sam's jar."
        : coveragePct >= 20
          ? "Jamie's jar can only cover a small slice of what's lent out. A lot would spill into Sam's jar if things went bad."
          : "Jamie's jar barely covers anything here — almost all the risk would land on Sam's jar instead.";

  const severityStory =
    severity <= 0.02
      ? "Basically none of Sam's jar is at risk. Sam is very safe right now."
      : severity <= SEVERITY_REF
        ? "A small splash lands in Sam's jar — nothing serious yet."
        : severity <= 0.2
          ? "A real chunk of Sam's jar would get eaten if every borrower stopped paying at once."
          : "A LOT of Sam's jar would be at risk. This is the danger zone.";

  const netMonthlyProfit = 10000;
  const ffcDollars = netMonthlyProfit * curve.share;
  const fycDollars = netMonthlyProfit - ffcDollars;
  const ffcRatePerDollar = FFC > 0 ? (ffcDollars / FFC) * 100 : 0;
  const fycRatePerDollar = FYC > 0 ? (fycDollars / FYC) * 100 : 0;

  return (
    <>
      <PageHeader
        eyebrow="the simple version"
        title="Coverage, severity & k — explained so anyone can follow it"
        lede="No formulas up front. Just two jars, a water line, and one dial that decides who gets paid more for taking the bigger risk. The real math is at the very bottom, for whoever wants it — Coverage & curve has it in full."
      />

      <Card>
        <h3 style={{ marginTop: 0 }}>Meet Sam and Jamie</h3>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Sam and Jamie put money into the same jar together, then lend it out to borrowers who promise to pay
          it back with a little extra (that extra is the &ldquo;profit&rdquo; everyone&rsquo;s here for). But
          they made a deal up front: <b>Jamie agreed to be the one who loses money FIRST</b>{' '}
          if a borrower doesn&rsquo;t pay back. Sam only loses money if things get so bad that Jamie&rsquo;s whole share is
          wiped out and there&rsquo;s still more owed.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 0 }}>
          Because Jamie is taking the scarier job, Jamie deserves a bigger slice of the profit when things go
          well — that&rsquo;s only fair. <b>Coverage</b>, <b>severity</b>, and <b>k</b>{' '}
          are just the three words for &ldquo;how scary is Jamie&rsquo;s job right now, and how much extra does that earn her.&rdquo;
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>First, with cookies (way easier than dollars)</h3>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Say Jamie put in 4 cookies and Sam put in 6 cookies — 10 cookies total. They lend cookies to kids at
          school.
        </p>
        <div className="grid-2" style={{ marginTop: 12 }}>
          <div style={{ padding: 14, background: 'var(--good-wash)', borderRadius: 10 }}>
            <b>Only 3 cookies lent out:</b>
            <p style={{ margin: '6px 0 0', fontSize: 14 }}>
              If none of it comes back, Jamie&rsquo;s 4 cookies cover all 3 by herself, with 1 to spare. Sam&rsquo;s
              6 cookies are never touched. Jamie&rsquo;s job looks very safe right now.
            </p>
          </div>
          <div style={{ padding: 14, background: 'var(--critical-wash)', borderRadius: 10 }}>
            <b>7 cookies lent out:</b>
            <p style={{ margin: '6px 0 0', fontSize: 14 }}>
              Jamie&rsquo;s 4 cookies cover the first 4 — but the other 3 have to come out of Sam&rsquo;s jar.
              Half of Sam&rsquo;s 6 cookies are now on the line. Jamie&rsquo;s job just got scarier.
            </p>
          </div>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 12, marginBottom: 0 }}>
          That&rsquo;s the whole idea. Everything below is the exact same picture, with real dollars, and a
          dial you can move yourself.
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Now try it — how much has been lent out?</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Jamie has <b style={{ color: 'var(--ffc)' }}>{fmtUSD(FFC)}</b> in her jar, Sam has{' '}
          <b style={{ color: 'var(--fyc)' }}>{fmtUSD(FYC)}</b> in his. Drag the slider to see what happens as
          more (or less) gets lent out to borrowers.
        </p>

        <div style={{ margin: '20px 0 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 8 }}>
            <span>Money lent out to borrowers</span>
            <span style={{ fontWeight: 700 }}>{fmtUSD(out)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={total}
            step={5000}
            value={out}
            onChange={(e) => setOut(+e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div
          style={{
            position: 'relative',
            height: 64,
            borderRadius: 10,
            overflow: 'hidden',
            display: 'flex',
            border: '1px solid var(--border)',
            marginTop: 16,
          }}
        >
          <div
            style={{
              width: `${ffcPctOfTotal}%`,
              background: 'var(--ffc-wash)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 12.5,
              color: 'var(--ffc)',
              fontWeight: 700,
            }}
          >
            Jamie&rsquo;s jar — {fmtUSD(FFC)}
          </div>
          <div
            style={{
              width: `${100 - ffcPctOfTotal}%`,
              background: 'var(--fyc-wash)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 12.5,
              color: 'var(--fyc)',
              fontWeight: 700,
            }}
          >
            Sam&rsquo;s jar — {fmtUSD(FYC)}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${waterPctOfTotal}%`,
              background: 'var(--critical-wash)',
              borderRight: '3px solid var(--critical)',
              transition: 'width 0.15s ease',
            }}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--critical)', marginTop: 6, marginBottom: 0 }}>
          the red water line = {fmtUSD(out)} lent out — {spillsIntoFyc ? 'it has spilled past Jamie’s jar and into Sam’s' : 'it stays inside Jamie’s jar'}
        </p>

        <div className="grid-2" style={{ marginTop: 20, gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              COVERAGE — could Jamie&rsquo;s jar alone cover it?
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ffc)' }}>{coveragePct.toFixed(0)}%</div>
            <p style={{ fontSize: 13.5, margin: '6px 0 0', lineHeight: 1.6 }}>{coverageStory}</p>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              SEVERITY — how much of Sam&rsquo;s jar is at risk?
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--fyc)' }}>{(severity * 100).toFixed(1)}%</div>
            <p style={{ fontSize: 13.5, margin: '6px 0 0', lineHeight: 1.6 }}>{severityStory}</p>
          </div>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>The dial: k</h3>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Coverage and severity are the two readings. <b>k</b>{' '}
          is what they get turned into — one dial that says &ldquo;how much bigger is Jamie&rsquo;s paycheck rate than Sam&rsquo;s, this month.&rdquo; Bad
          readings (low coverage, high severity) turn the dial UP. Good readings turn it back down — but never
          all the way to 1×, because Jamie is always the one taking the first hit, even when things look calm.
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '16px 0' }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            {curve.k.toFixed(2)}×
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Jamie&rsquo;s rate is <b>{curve.k.toFixed(2)} times</b>{' '}
            Sam&rsquo;s rate this month
          </div>
        </div>
        <div
          style={{
            height: 14,
            borderRadius: 7,
            background: 'var(--surface-2)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.min(100, (curve.k / 12) * 100)}%`,
              background: 'linear-gradient(90deg, var(--good), var(--warning), var(--critical))',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
          <span>{K_MIN.toFixed(2)}× floor — Jamie is never paid LESS than this multiple</span>
          <span>{K_BREAKPOINTS[0].k.toFixed(0)}× — the scariest it ever gets</span>
        </div>
        <Callout tone="default" >
          <b>How the dial actually turns:</b> coverage decides the STARTING point (a big lookup table, going
          from {K_BREAKPOINTS[0].k.toFixed(1)}× at 0% coverage down to {K_BREAKPOINTS[K_BREAKPOINTS.length - 1].k.toFixed(2)}× at 100%
          coverage — right now that starting point is <b>{base.toFixed(2)}×</b>). Severity then decides how
          much of that starting point actually counts: at 0% severity only half of it applies (coverage still
          gets the other half, no matter what — that&rsquo;s the guaranteed floor), and by the time severity
          reaches {(SEVERITY_REF * 100).toFixed(0)}% the ENTIRE starting point applies. Right now severity
          is letting <b>{(weight * 100).toFixed(0)}%</b> of the starting point through.
        </Callout>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Where do those numbers actually come from?</h3>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Not made up. Three of the five stops on that starting-point lookup table are real, measured numbers
          — somebody watched an actual live market with the same kind of &ldquo;Jamie takes the first
          loss&rdquo; deal, at three different coverage levels, and wrote down what junior investors and senior
          investors were actually earning there. k_base is just <em>defined</em>{' '}
          as &ldquo;how many times more junior earned than senior&rdquo; — so the formula for it is exactly
          that: divide one by the other.
        </p>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="impl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Coverage observed</th>
                <th>Junior earned</th>
                <th>Senior earned</th>
                <th>k_base = junior ÷ senior</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>20.41%</td>
                <td className="tabular">34.18%</td>
                <td className="tabular">4.87%</td>
                <td className="tabular">34.18 ÷ 4.87 = <b>7.02×</b></td>
              </tr>
              <tr>
                <td>40.78%</td>
                <td className="tabular">15.91%</td>
                <td className="tabular">8.22%</td>
                <td className="tabular">15.91 ÷ 8.22 = <b>1.94×</b></td>
              </tr>
              <tr>
                <td>99.90%</td>
                <td className="tabular">11.67%</td>
                <td className="tabular">8.75%</td>
                <td className="tabular">11.67 ÷ 8.75 = <b>1.33×</b></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, marginTop: 14 }}>
          That&rsquo;s only 3 points, but the table has 5. The other two are honest, labeled guesses, not
          measurements:
        </p>
        <ul style={{ fontSize: 14, lineHeight: 1.8, paddingLeft: 20, marginTop: 0 }}>
          <li>
            <b>Coverage 80% → 1.85×.</b>{' '}
            Drawing a straight line between the 41% point and the 100% point would land here around 1.50× —
            but that was deliberately pushed up to 1.85×, so the &ldquo;everything looks fine&rdquo; zone (most
            pools sit at 80&ndash;100% coverage most of the time) still pays a real premium instead of a token
            one.
          </li>
          <li>
            <b>Coverage 0% → 12.00×.</b>{' '}
            Nobody has real data at 0% coverage — that would mean Jamie&rsquo;s jar is completely empty. This
            is a deliberate, extreme placeholder for a situation that should never actually happen, not a
            measurement.
          </li>
        </ul>
        <p style={{ fontSize: 14, lineHeight: 1.7 }}>
          Between any two of those five dots, the dial just draws a straight line — that&rsquo;s the whole
          &ldquo;starting point&rdquo; lookup table. Nothing fancier than connect-the-dots on real data, plus
          two clearly-labeled guesses at the edges.
        </p>

        <h3 style={{ marginTop: 28 }}>The full k_base curve</h3>
        <Collapsible label="what does this chart show?">
          The same connect-the-dots table above, drawn out — coverage on the x-axis, k_base&rsquo;s
          starting-point multiplier on the y-axis. Steep near 0% coverage, flattening out toward 100%. The{' '}
          <b>live</b> marker tracks the slider up top.
        </Collapsible>
        <div style={{ marginTop: 10 }} />
        <LineChart
          xDomain={[0, 100]}
          yDomain={[0, kBaseChartMax]}
          xTicks={[0, 20, 41, 80, 100]}
          yTicks={Array.from({ length: 6 }, (_, i) => Math.round((kBaseChartMax / 5) * i))}
          formatX={(v) => Math.round(v) + '%'}
          formatY={(v) => v.toFixed(1) + '×'}
          xLabel="coverage →"
          height={300}
          vLines={[{ x: coveragePct, label: 'live', color: 'var(--text-primary)', dashed: true }]}
          series={[{ name: 'k_base', color: 'var(--accent)', points: kBaseCurvePoints, width: 2.5 }]}
        />
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 10 }}>
          Right now, at {coveragePct.toFixed(1)}% coverage, k_base = <b>{base.toFixed(2)}×</b>.
        </p>

        <h3 style={{ marginTop: 28 }}>Stored k breakpoints (k_base)</h3>
        <table className="impl">
          <thead>
            <tr>
              <th>Coverage</th>
              <th>k_base</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {K_BREAKPOINTS.slice()
              .reverse()
              .map((b) => (
                <tr key={b.cov}>
                  <td>{b.cov}%</td>
                  <td className="tabular">{b.k.toFixed(2)}×</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{b.note}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="section-dek" style={{ fontSize: 12, marginTop: 10 }}>
          80% allocation ceiling (unchanged, independent of the severity gate): {(ALLOCATION_CEILING_FRACTION * 100).toFixed(0)}% of total pool value.
        </p>

        <h3 style={{ marginTop: 28 }}>And the weight (w) scale — how much of that starting point severity lets through</h3>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          k_base is only the STARTING point. Severity then decides how much of it actually counts, through the
          weight, <b>w</b>. Unlike k_base&rsquo;s table above, w isn&rsquo;t measured from anywhere — it&rsquo;s
          a deliberately simple, designed straight line between two anchors: at 0% severity, w ={' '}
          {COVERAGE_WEIGHT_FLOOR.toFixed(2)} (coverage&rsquo;s starting point always counts at least half, even
          when Sam&rsquo;s jar looks perfectly safe — that&rsquo;s the guaranteed floor). At{' '}
          {(SEVERITY_REF * 100).toFixed(0)}% severity, w reaches 1.00 — the ENTIRE starting point counts. Past
          that point, w is capped at 1.00; severity climbing higher doesn&rsquo;t push the multiplier any
          further, only coverage&rsquo;s own five-point table can still move it.
        </p>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="impl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Severity</th>
                <th>severity ÷ {(SEVERITY_REF * 100).toFixed(0)}% (capped at 1)</th>
                <th>w = {COVERAGE_WEIGHT_FLOOR.toFixed(2)} + {(1 - COVERAGE_WEIGHT_FLOOR).toFixed(2)} × that</th>
              </tr>
            </thead>
            <tbody>
              {W_SCALE_ROWS.map((row) => {
                const isLive = Math.abs(severity - row.severity) < 0.01 && Math.abs(severity - row.severity) === Math.min(...W_SCALE_ROWS.map((r) => Math.abs(severity - r.severity)));
                return (
                  <tr key={row.severity} style={isLive ? { background: 'var(--accent-wash)' } : undefined}>
                    <td>
                      {(row.severity * 100).toFixed(0)}%{row.severity === SEVERITY_REF ? ' (SEVERITY_REF)' : ''}
                      {isLive ? <span style={{ color: 'var(--accent)', fontSize: 11.5, marginLeft: 6 }}>← dial is here now</span> : null}
                    </td>
                    <td className="tabular">{Math.min(1, row.severity / SEVERITY_REF).toFixed(3)}</td>
                    <td className="tabular">
                      <b>{(COVERAGE_WEIGHT_FLOOR + (1 - COVERAGE_WEIGHT_FLOOR) * Math.min(1, row.severity / SEVERITY_REF)).toFixed(3)}</b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
          Right now, at {(severity * 100).toFixed(1)}% severity, w = <b>{weight.toFixed(3)}</b> — letting{' '}
          <b>{(weight * 100).toFixed(0)}%</b> of k_base&rsquo;s {base.toFixed(2)}× starting point through.
        </p>

        <Callout tone="default">
          <b>Why the chart on Coverage &amp; curve looks &ldquo;kinked,&rdquo; not smooth:</b>{' '}
          two things are bending at once, not one. First, the connect-the-dots table above has a different
          slope in each of its four segments — steep near 0% coverage, almost flat between 41% and 80%. Second,
          that chart&rsquo;s x-axis is coverage, but severity is quietly moving underneath it too: at every
          point along the axis, the chart first asks &ldquo;if coverage were exactly this, what would severity
          have to be, holding Jamie and Sam&rsquo;s jars at their current sizes?&rdquo; and only then runs the
          full dial. Severity rises fast as coverage drops toward 0% (a smaller jar means a bigger spillover),
          and its effect on the dial completely stops changing once it passes {(SEVERITY_REF * 100).toFixed(0)}%
          — a second kink, at a different spot on the axis than any of the table&rsquo;s own four. Layer both
          on top of each other and you get the exact shape on that chart — see it live on{' '}
          <Link href="/explorer">Coverage &amp; curve</Link>, and the raw lookup table plus this same
          derivation, in code-adjacent form, on <Link href="/formula">Formula</Link>.
        </Callout>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>What k actually buys Jamie</h3>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Say the loans earn <b>{fmtUSD(netMonthlyProfit)}</b>{' '}
          in profit this month. Without any deal at all, &ldquo;fair shares&rdquo; would just split it by how much each person put in — Jamie put in 40% of
          the jar, so she&rsquo;d get 40% of the profit. But k changes that split, because Jamie&rsquo;s
          dollars are working harder (they&rsquo;re the ones on the hook first):
        </p>
        <div className="grid-2" style={{ marginTop: 12, gap: 16 }}>
          <div style={{ padding: 16, background: 'var(--ffc-wash)', borderRadius: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ffc)' }}>JAMIE GETS</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ffc)' }}>{fmtUSD(ffcDollars)}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              {ffcRatePerDollar.toFixed(3)}¢ back for every $1 she put in, this month
            </div>
          </div>
          <div style={{ padding: 16, background: 'var(--fyc-wash)', borderRadius: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fyc)' }}>SAM GETS</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--fyc)' }}>{fmtUSD(fycDollars)}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              {fycRatePerDollar.toFixed(3)}¢ back for every $1 he put in, this month
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 14, marginBottom: 0 }}>
          Per dollar invested, Jamie is earning{' '}
          <b>{fycRatePerDollar > 0 ? (ffcRatePerDollar / fycRatePerDollar).toFixed(2) : '—'}×</b> what Sam
          earns — that ratio moves in lockstep with k above. Slide the dial back up top and watch both numbers
          here move with it.
        </p>
      </Card>

      <Collapsible label="for grown-ups: the real formulas, spelled out">
        <p style={{ margin: '0 0 10px' }}>
          <b>Coverage</b>{' '}
          = min(1, FFC ÷ outstanding) — Jamie&rsquo;s jar divided by what&rsquo;s lent out, capped at 100%.
        </p>
        <p style={{ margin: '0 0 10px' }}>
          <b>Severity</b>{' '}
          = max(0, outstanding − FFC) ÷ FYC — whatever spills past Jamie&rsquo;s jar, as a fraction of
          Sam&rsquo;s jar.
        </p>
        <p style={{ margin: '0 0 10px' }}>
          <b>k</b> = K_MIN + (k_base(coverage) − K_MIN) × weight, where weight = {COVERAGE_WEIGHT_FLOOR} + (1 −{' '}
          {COVERAGE_WEIGHT_FLOOR}) × min(1, severity ÷ {SEVERITY_REF}).
        </p>
        <p style={{ margin: '0 0 10px' }}>
          <b>Jamie&rsquo;s share of profit</b> = (k × FFC) ÷ (FYC + k × FFC).
        </p>
        <p style={{ margin: 0 }}>
          Full derivations, the stored breakpoint table, live charts, and every edge case:{' '}
          <Link href="/explorer">Coverage &amp; curve</Link>, <Link href="/glossary">Glossary</Link>, and{' '}
          <Link href="/latex">LaTeX equations</Link> (with an editable worked example for every formula above).
        </p>
      </Collapsible>
    </>
  );
}
