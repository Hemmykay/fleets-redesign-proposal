'use client';

import LineChart from '@/components/LineChart';
import { PageHeader, Card, Badge } from '@/components/ui';
import { kFromCoverageAndSeverity, coverageOf, severityOf, severityCeilingOutstanding } from '@/lib/model';

const F = 400000;
const Y = 600000;

function buildSeries() {
  const xs = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.42, 0.44, 0.46, 0.48, 0.5, 0.52, 0.54];
  return xs.map((x) => {
    const reserveNet = (1 - x) * 29750;
    const loanNet = x * 127500;
    const P = x * 1000000;
    const coveragePct = coverageOf(P, F) * 100;
    const severity = severityOf(P, F, Y);
    const k = kFromCoverageAndSeverity(coveragePct, severity);
    const ffcSharePct = (k * F) / (Y + k * F);
    const fycDollar = reserveNet * 0.6 + loanNet * (1 - ffcSharePct);
    const ffcDollar = reserveNet * 0.4 + loanNet * ffcSharePct;
    return { x: x * 100, fyc: (fycDollar / Y) * 100, ffc: (ffcDollar / F) * 100 };
  });
}

export default function ValidationPage() {
  const points = buildSeries();
  const newGateX = (severityCeilingOutstanding(F, Y) / 1000000) * 100;
  const gatePt = points.reduce((best, p) => (Math.abs(p.x - newGateX) < Math.abs(best.x - newGateX) ? p : best), points[0]);

  return (
    <>
      <PageHeader
        eyebrow="pinochio / src / helpers / waterfall.rs"
        title="Validation against a realistic scenario"
        lede="FYC $600K / FFC $400K, 15% loan APR, 3.5% reserve/yield-token APY, loan book swept from $0 past the new gate. Both series below are exact — reserve yield and loan interest both net of the unchanged 85/15 fee split, reserve pro-rata by tranche size, loan interest through the severity-scaled premium curve. The two lines touch only at zero deployment, where there's no loan interest yet to carry a premium — everywhere loans exist, FFC sits strictly above FYC."
      />

      <Card>
        <div className="chart-legend">
          <span>
            <i style={{ background: 'var(--fyc)' }} /> FYC blended APY
          </span>
          <span>
            <i style={{ background: 'var(--ffc)' }} /> FFC blended APY
          </span>
        </div>
        <LineChart
          xDomain={[0, 54]}
          yDomain={[0, 12]}
          xTicks={[0, 10, 20, 30, 40, 50]}
          yTicks={[0, 2, 4, 6, 8, 10, 12]}
          formatX={(v) => Math.round(v) + '%'}
          formatY={(v) => v.toFixed(1) + '%'}
          xLabel="loan book as % of pool value (deployment)"
          hLines={[{ y: 2.97, label: '2.97% reserve-only baseline' }]}
          vLines={[
            { x: 40, color: 'var(--text-muted)' },
            { x: 50, label: 'old gate (80% cov.)', color: 'var(--text-muted)' },
            { x: newGateX, label: `new gate — severity 20% (${newGateX.toFixed(0)}%)`, color: 'var(--warning)' },
          ]}
          series={[
            { name: 'FYC', color: 'var(--fyc)', points: points.map((p) => ({ x: p.x, y: p.fyc })) },
            { name: 'FFC', color: 'var(--ffc)', points: points.map((p) => ({ x: p.x, y: p.ffc })) },
          ]}
        />
        <p className="section-dek" style={{ fontSize: 12.5, marginTop: 10 }}>
          At the new gate ({newGateX.toFixed(0)}% deployment): FYC <b style={{ color: 'var(--fyc)' }}>{gatePt.fyc.toFixed(2)}%</b>,
          FFC <b style={{ color: 'var(--ffc)' }}>{gatePt.ffc.toFixed(2)}%</b>. Notice the old gate (50%) sits comfortably
          inside the new one (52%) — this pool&rsquo;s FYC is large enough that the severity-based gate is strictly more
          permissive here.
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3>Four iterations, in order</h3>
        <p className="section-dek" style={{ fontSize: 11.5, marginBottom: 12 }}>
          The specific percentages below (3.64%, 2.04%, 2.38% → 4.15%) are a historical record from the design
          session that first compared these four approaches, captured under that session&rsquo;s own 8% loan
          APR / 2.8% reserve APY scenario — not recomputed against the current default above. The point they
          illustrate (each iteration&rsquo;s failure mode, and how the current one fixes it) holds regardless of
          which rate assumptions generated them.
        </p>
        <div className="grid-2">
          <div>
            <Badge tone="critical">1. Early draft — fixed 20% FFC share anchor</Badge>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 10 }}>
              FYC&rsquo;s blended APY peaked around <b style={{ color: 'var(--text-primary)' }}>3.64%</b>, then{' '}
              <b style={{ color: 'var(--critical)' }}>fell to 2.04%</b> at full utilization — below its own
              2.38% reserve-only baseline. A tranche marketed as &ldquo;protected&rdquo; ended up worse off than
              not lending at all.
            </p>
          </div>
          <div>
            <Badge tone="warn">2. Written proposal — pool-share parity anchor (§5.1)</Badge>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 10 }}>
              Fixed the floor breach, but FYC and FFC now earned{' '}
              <b style={{ color: 'var(--text-primary)' }}>identical APY</b> whenever coverage sat at 100%
              (both 2.38% → 4.15% as deployment ran 0→40%) — no premium at all in the &ldquo;healthy&rdquo; zone,
              just pro-rata.
            </p>
          </div>
        </div>
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div>
            <Badge>3. Market-calibrated, coverage-only premium</Badge>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 10 }}>
              FFC&rsquo;s rate pinned to <b style={{ color: 'var(--text-primary)' }}>k × FYC&rsquo;s rate</b> (k ≥
              1.33) at every coverage level. Fixed the parity problem, but coverage alone can&rsquo;t tell
              FYC&rsquo;s actual size apart from FFC&rsquo;s — a large FYC and a tiny one at the same coverage
              got the same premium, even though the real risk to each is completely different.
            </p>
          </div>
          <div>
            <Badge tone="good">4. Current — severity-scaled premium, severity-based gates</Badge>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 10 }}>
              Coverage still sets the base curve; <b style={{ color: 'var(--text-primary)' }}>severity</b> now
              scales it to how much of FYC&rsquo;s own TVL is actually exposed. At the new gate:{' '}
              FYC <b style={{ color: 'var(--fyc)' }}>{gatePt.fyc.toFixed(2)}%</b>, FFC{' '}
              <b style={{ color: 'var(--ffc)' }}>{gatePt.ffc.toFixed(2)}%</b> — plus the origination gate and a
              new FFC-minting ceiling both run off severity too.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}
