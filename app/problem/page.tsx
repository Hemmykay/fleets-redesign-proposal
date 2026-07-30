'use client';

import { useMemo, useState } from 'react';
import LineChart from '@/components/LineChart';
import { PageHeader, SectionHead, Card, Readout, Callout } from '@/components/ui';
import { NET_YIELD_FRACTION, PERIODS_PER_YEAR, periodInterest, monthlyPayment, fmtUSD2 } from '@/lib/model';

const LOAN_P = 100000;
const LOAN_APR = 0.15;
const LOAN_N = 36;

function buildRows(target: number) {
  const m = monthlyPayment(LOAN_P, LOAN_APR, LOAN_N);
  let bal = LOAN_P;
  const rows: { month: number; netYield: number; fycShare: number; ffcShare: number }[] = [];
  for (let k = 1; k <= LOAN_N; k++) {
    const interest = periodInterest(bal, LOAN_APR);
    bal = bal * (1 + LOAN_APR / PERIODS_PER_YEAR) - m;
    const netYield = interest * NET_YIELD_FRACTION;
    const fycShare = Math.min(target, netYield);
    const ffcShare = Math.max(0, netYield - fycShare);
    rows.push({ month: k, netYield, fycShare, ffcShare });
  }
  return rows;
}

export default function ProblemPage() {
  const [target, setTarget] = useState(562);
  const rows = useMemo(() => buildRows(target), [target]);

  const firstZero = rows.find((r) => r.ffcShare <= 0.005);
  const zeroCount = rows.filter((r) => r.ffcShare <= 0.005).length;

  return (
    <>
      <PageHeader
        eyebrow="pinochio / src / helpers / waterfall.rs"
        title="What&rsquo;s wrong with the current split"
        lede={
          <>
            <code>distribute_loan_interest</code> gives FYC an absolute monthly dollar target and gives FFC
            whatever net interest is left over. Two failure modes fall out of that, demonstrated on a single
            ordinary loan — no defaults required.
          </>
        }
      />

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card" style={{ borderLeft: '3px solid var(--critical)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--critical)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
            Failure mode 1 — timing
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>
            <strong style={{ color: 'var(--text-primary)' }}>FFC can earn exactly $0.</strong> Loan interest
            declines every month under standard amortization. Once net interest drops below FYC&rsquo;s fixed
            target, FYC takes all of it and FFC&rsquo;s residual share hits zero — and stays there.
          </p>
        </div>
        <div className="card" style={{ borderLeft: '3px solid var(--critical)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--critical)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
            Failure mode 2 — magnitude
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>
            <strong style={{ color: 'var(--text-primary)' }}>No link between FFC&rsquo;s yield and its risk.</strong> FFC
            is first-loss — thinner coverage should mean a bigger premium. The fixed-target model gives FFC
            &ldquo;whatever&rsquo;s left,&rdquo; with no relationship to coverage at all.
          </p>
        </div>
      </div>

      <Card>
        <h3>Live amortization — a $100,000 loan, 15% APR, 36 months</h3>
        <p className="section-dek" style={{ marginBottom: 16 }}>
          Real amortization math, computed live. Drag FYC&rsquo;s fixed monthly target and watch the crossover
          month move — this is the exact mechanism in <code>fyc_target.min(net_yield)</code> /{' '}
          <code>net_yield − fyc_share</code>.
        </p>
        <div className="controls" style={{ marginBottom: 18, maxWidth: 460 }}>
          <div className="control">
            <div className="row">
              <span className="name">FYC fixed monthly target</span>
              <span className="val">${target}/mo</span>
            </div>
            <input
              type="range"
              className="fyc-slide"
              min={300}
              max={750}
              step={1}
              value={target}
              onChange={(e) => setTarget(+e.target.value)}
            />
          </div>
        </div>
        <div className="readout-grid" style={{ marginBottom: 18, maxWidth: 620 }}>
          <Readout
            label="First $0 month for FFC"
            value={firstZero ? `Month ${firstZero.month}` : 'None'}
            sub={firstZero ? `net interest (${fmtUSD2(firstZero.netYield)}) falls below target` : 'FFC never hits $0 at this target'}
            color={firstZero ? 'var(--critical)' : 'var(--good)'}
          />
          <Readout label="Months FFC earns $0" value={zeroCount} sub="out of 36 total months" color={zeroCount > 0 ? 'var(--critical)' : 'var(--good)'} />
        </div>
        <div className="chart-legend">
          <span>
            <i style={{ background: 'var(--text-muted)' }} /> Net loan interest (85% of gross)
          </span>
          <span>
            <i style={{ background: 'var(--fyc)' }} /> FYC share
          </span>
          <span>
            <i style={{ background: 'var(--ffc)' }} /> FFC share
          </span>
        </div>
        <LineChart
          xDomain={[1, 36]}
          yDomain={[0, Math.max(...rows.map((r) => r.netYield)) * 1.12]}
          xTicks={[1, 6, 12, 18, 24, 30, 36]}
          yTicks={Array.from({ length: 6 }, (_, i) => (Math.max(...rows.map((r) => r.netYield)) * 1.12 * i) / 5)}
          formatX={(v) => `mo ${Math.round(v)}`}
          formatY={(v) => '$' + Math.round(v)}
          series={[
            { name: 'Net interest', color: 'var(--text-muted)', points: rows.map((r) => ({ x: r.month, y: r.netYield })), dashed: true, width: 1.5 },
            { name: 'FFC share', color: 'var(--ffc)', points: rows.map((r) => ({ x: r.month, y: r.ffcShare })), area: true },
            { name: 'FYC share', color: 'var(--fyc)', points: rows.map((r) => ({ x: r.month, y: r.fycShare })) },
          ]}
        />
        <p className="section-dek" style={{ marginTop: 14, fontSize: 12.5 }}>
          Illustrative: the real target is derived on-chain from <code>cap_diff_bps</code> (a separate
          interest-rate-cap subsystem), not a flat constant. The value above is calibrated to reproduce the
          documented outcome — FFC&rsquo;s share cliffs to exactly $0 starting month 20 and stays there for the
          remaining 16 months.
        </p>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Callout tone="amber">
          The fix — a coverage-and-severity curve that replaces this fixed target entirely — is covered in{' '}
          <a href="/explorer">Coverage &amp; curve</a>. The timing half of this problem (the cliff itself,
          independent of magnitude) is fixed separately by levelized interest — see{' '}
          <a href="/accounting">Internal accounting</a>.
        </Callout>
      </div>
    </>
  );
}
