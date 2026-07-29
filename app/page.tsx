import Link from 'next/link';
import { Badge, Callout, Kpi, PageFooter } from '@/components/ui';

export default function HomePage() {
  return (
    <>
      <header style={{ marginBottom: 32 }}>
        <div className="page-eyebrow">
          <span className="dot" /> pinochio / src / instructions <span className="dot" /> repay_loan.rs
        </div>
        <h1 className="page-title">FYC / FFC Yield Distribution — Redesign</h1>
        <p className="page-lede">
          How loan interest splits between the senior tranche (FYC) and junior, first-loss tranche
          (FFC) is moving from a fixed monthly target with a residual leftover, to a coverage-and-severity
          curve that pays FFC a premium proportional to the risk it&rsquo;s actually absorbing.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <Badge tone="warn">Design proposal — nothing here is live in the program yet</Badge>
          <Badge>
            Scope: <code style={{ background: 'none', padding: 0, fontFamily: 'inherit', color: 'inherit' }}>distribute_loan_interest</code> and its gates
          </Badge>
          <Badge>Source: docs/yield-distribution-redesign.md</Badge>
        </div>
        <Callout tone="amber">
          <strong>This app is several steps past the written proposal now.</strong> The doc&rsquo;s own §5.1
          anchor paid FFC exactly its pool share at 100% coverage — pro-rata, identical APY to FYC. That&rsquo;s
          gone, replaced by a premium multiplier keeping FFC strictly above FYC always (<Link href="/validation">Validation</Link> walks
          through all four iterations). Since then: <strong>severity</strong> now scales the premium and drives two
          new hard gates, and the 80% origination gate itself has been replaced with a severity-based one — see{' '}
          <Link href="/explorer">Coverage &amp; curve</Link>. New this pass: a <Link href="/glossary">glossary</Link>,
          a full <Link href="/simulator">scenario simulator</Link>, and <Link href="/implementation">concrete code-update
          suggestions</Link> with an architecture diagram. Latest round, on <Link href="/code-diff">the code diff</Link>:
          Titan as a second swap aggregator, support for more than one yield-bearing reserve token, a real
          per-loan interest accrual behind optimistic pricing (replacing a proxy that never matched any real
          loan&rsquo;s schedule), a three-tier default waterfall, and — as a separate, exploratory suggestion,
          not a code proposal — <Link href="/ffc-reset">resetting FFC</Link> after a catastrophic loss.
        </Callout>
      </header>

      <div className="kpi-grid">
        <Kpi
          label="FFC $0 months, 36mo loan"
          oldValue="17"
          newValue="0"
          note="of 36 months, pure amortization decline — no defaults"
        />
        <Kpi
          label="FYC / FFC ever equal APY?"
          oldValue="yes, at 100% cov."
          newValue="never"
          note="k ≥ 1.33× at every stored breakpoint"
        />
        <Kpi
          label="FYC / FFC blended APY at the gate"
          single
          newValue={
            <>
              <span style={{ color: 'var(--fyc)' }}>3.78%</span>{' '}
              <span className="arrow">/</span> <span style={{ color: 'var(--ffc)' }}>6.03%</span>
            </>
          }
          note="at the new severity gate (52% deployment) — k ≈ 1.86×, severity-scaled"
        />
        <Kpi
          label="Origination gate"
          oldValue="80% coverage"
          newValue="20% severity"
          note="decouples origination capacity from FFC's size alone"
        />
      </div>

      <div className="grid-2">
        <NavCard href="/problem" num="01" title="The problem" desc="Two failure modes in the current fixed-target/residual split, with a live amortization chart." />
        <NavCard href="/accounting" num="02" title="Internal accounting" desc="Two schedules, one loan — the borrower's true amortization vs. the protocol's levelized books." />
        <NavCard href="/explorer" num="03" title="Coverage & curve" desc="Live explorer: coverage, severity, the premium curve, and both new gates, driven by one set of sliders." />
        <NavCard href="/validation" num="04" title="Validation" desc="A realistic scenario swept end to end, plus all four design iterations side by side." />
        <NavCard href="/changes" num="05" title="What changes" desc="Everything touched vs. everything left alone, file by file." />
        <NavCard href="/formula" num="06" title="Formula" desc="The end-to-end pipeline, origination through repayment through the yield split." />
        <NavCard href="/implementation" num="07" title="Implementation" desc="Concrete code-update suggestions grounded in a real reference SDK, plus a system flow diagram." />
        <NavCard href="/open-questions" num="08" title="Open questions" desc="What's illustrative, what's deferred, what still needs a sign-off." />
        <NavCard href="/ffc-reset" num="09" title="FFC reset (exploratory)" desc="A suggestion, not a spec: re-denominating FFC's claim after a catastrophic loss, and the open questions it raises." />
        <NavCard href="/glossary" num="§" title="Glossary" desc="Every term and formula, defined in full — coverage, severity, k, levelized interest, and more." />
        <NavCard href="/simulator" num="▶" title="Scenario simulator" desc="Set every variable and run a real multi-period simulation — originations, defaults, and all." />
      </div>

      <div style={{ marginTop: 32 }}>
        <PageFooter />
      </div>
    </>
  );
}

function NavCard({ href, num, title, desc }: { href: string; num: string; title: string; desc: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card" style={{ height: '100%' }}>
        <div className="section-num">{num}</div>
        <h3 style={{ fontSize: 16, marginTop: 4 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{desc}</p>
      </div>
    </Link>
  );
}
