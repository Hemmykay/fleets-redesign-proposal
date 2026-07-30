import { PageHeader, Card } from '@/components/ui';
import Latex from '@/components/Latex';

interface Eq {
  label: string;
  tex: string;
  note?: string;
}

function EqBlock({ e }: { e: Eq }) {
  return (
    <div className="gloss-entry">
      <div className="gloss-term">{e.label}</div>
      <Latex tex={e.tex} />
      {e.note && <div className="gloss-def">{e.note}</div>}
    </div>
  );
}

const ROUND_1: Eq[] = [
  {
    label: 'Coverage — the attachment point',
    tex: '\\text{Coverage} = \\min\\!\\left(\\frac{\\text{FFC}}{\\text{Outstanding}},\\; 1\\right)',
  },
  {
    label: 'Severity — impact on FYC in the worst case',
    tex: '\\text{Severity} = \\frac{\\max(0,\\; \\text{Outstanding} - \\text{FFC})}{\\text{FYC}}',
  },
  {
    label: 'Premium multiplier k',
    tex: 'k = K_{\\text{MIN}} + \\left(k_{\\text{base}}(\\text{Coverage}) - K_{\\text{MIN}}\\right) \\times w',
    note: 'where the severity-driven weight w is:',
  },
  {
    label: 'Coverage weight',
    tex: 'w = \\text{COVERAGE\\_WEIGHT\\_FLOOR} + \\left(1 - \\text{COVERAGE\\_WEIGHT\\_FLOOR}\\right) \\times \\min\\!\\left(1,\\; \\frac{\\text{Severity}}{\\text{SEVERITY\\_REF}}\\right)',
  },
  {
    label: 'FFC share of net loan interest',
    tex: '\\text{FFC}_{\\text{share}} = \\frac{k \\times \\text{FFC}}{\\text{FYC} + k \\times \\text{FFC}}',
  },
  {
    label: 'Origination gate',
    tex: '\\text{allowed} \\iff \\text{Severity}(P_{\\text{outstanding}} + \\text{new\\_loan},\\, \\text{FFC},\\, \\text{FYC}) \\le \\text{SEVERITY\\_GATE\\_MAX}',
  },
  {
    label: 'FFC mint floor',
    tex: '\\text{allowed} \\iff \\text{Severity}(\\text{Outstanding},\\, \\text{FFC},\\, \\text{FYC}) > \\text{SEVERITY\\_MINT\\_FLOOR}',
  },
  {
    label: 'Reserve / yield-token yield split (flat pro-rata)',
    tex: '\\text{FYC}_{\\text{share}} = \\text{NetYield} \\times \\frac{\\text{FYC}}{\\text{FYC} + \\text{FFC}}, \\qquad \\text{FFC}_{\\text{share}} = \\text{NetYield} - \\text{FYC}_{\\text{share}}',
  },
  {
    label: 'Net / gross yield (85/15 protocol fee)',
    tex: '\\text{NetYield} = 0.85 \\times \\text{GrossYield}',
  },
  {
    label: 'True amortization — level payment per period',
    tex: 'M = \\frac{P \\cdot r}{1 - (1+r)^{-n}}, \\qquad r = \\text{APR} \\times \\frac{\\text{SECONDS\\_PER\\_PERIOD}}{\\text{SECONDS\\_PER\\_YEAR}},\\;\\; n = \\text{term (periods)}',
    note: 'Fixed in round 2 from r = APR/12 (a 30/360 day-count, since a period is 30 days, not a calendar month) to this exact fraction — see PERIODS_PER_YEAR in the round 2 group below.',
  },
  {
    label: 'Levelized interest',
    tex: '\\text{LevelizedInterest} = \\frac{M \\times n - P}{n}',
  },
];

const ROUND_2: Eq[] = [
  {
    label: 'PERIODS_PER_YEAR (the day-count fix)',
    tex: '\\text{PERIODS\\_PER\\_YEAR} = \\frac{\\text{SECONDS\\_PER\\_YEAR}}{\\text{SECONDS\\_PER\\_PERIOD}} = \\frac{365}{30} \\approx 12.1667',
    note: 'Not 12 — a 30-day period is not 1/12 of a 365-day year. Used everywhere a rate crosses between "per period" and "per year": amortization (above) and every APY below.',
  },
  {
    label: 'Reserve target (the "20% always stays as reserve" floor)',
    tex: '\\text{ReserveTargetFraction} = 1 - \\text{AllocationCeilingFraction} = 1 - 0.80 = 0.20',
    note: 'Not an independent gate — the algebraic complement of the existing 80% loan-allocation ceiling.',
  },
  {
    label: 'ELB — Excess Liquidity Balance',
    tex: '\\text{ELB}_{\\text{total}} = (\\text{FYC} + \\text{FFC}) - \\text{Outstanding} - \\text{Earmarked}',
  },
  {
    label: 'ELB tranche split (pro-rata by pool share)',
    tex: '\\text{ELB}_{\\text{FYC}} = \\text{ELB}_{\\text{total}} \\times \\frac{\\text{FYC}}{\\text{FYC}+\\text{FFC}}, \\qquad \\text{ELB}_{\\text{FFC}} = \\text{ELB}_{\\text{total}} - \\text{ELB}_{\\text{FYC}}',
  },
  {
    label: 'Instant-redemption fee (endpoint-rate formula)',
    tex: '\\text{fee}_{\\text{bps}} = \\text{fee}_{\\min} + \\frac{\\text{amount}}{\\text{ELB}_{\\text{tranche}}} \\times \\left(\\text{fee}_{\\max} - \\text{fee}_{\\min}\\right)',
    note: 'FYC: [10, 50] bps. FFC: [50, 100] bps. Undefined (instant path unavailable) for amount > ELB_tranche.',
  },
  {
    label: 'Split-invariant variant (recommended hardening, not adopted by default)',
    tex: '\\text{fee} = \\text{fee}_{\\min}\\cdot\\text{amount} + \\left(\\text{fee}_{\\max}-\\text{fee}_{\\min}\\right) \\cdot \\frac{\\text{amount}^2}{2 \\cdot \\text{ELB}_{\\text{tranche}}}',
    note: 'The closed-form integral of the marginal fee rate over [0, amount] — exactly half the quadratic term of the endpoint-rate formula above, and immune to splitting one redemption into many.',
  },
  {
    label: 'jr_to_sr conversion (burns FFC, mints FYC — mirrors sr_to_jr)',
    tex: '\\text{value} = \\text{tokens}_{\\text{in}} \\times \\text{FFC}_{\\text{price}}^{\\text{cons}}, \\qquad \\text{tokens}_{\\text{out}} = \\frac{\\text{value}}{\\text{FYC}_{\\text{price}}^{\\text{cons}}}',
    note: 'Both legs at conservative price — value moves between tranches, V_pool = V_FYC + V_FFC is unchanged.',
  },
  {
    label: 'Redemption-fee settlement (always as FYC, 50/50)',
    tex: '\\text{Protocol}_{\\text{FYC}} = \\text{Insurance}_{\\text{FYC}} = \\frac{\\text{fee}_{\\text{value}}}{2}',
  },
  {
    label: 'Loan-origination liquidity gate',
    tex: '\\text{ELB}_{\\text{total}} - \\text{Pending}_{\\text{FYC}} - \\text{Pending}_{\\text{FFC}} - \\text{Earmarked} \\;\\ge\\; \\text{new\\_loan\\_amount}',
  },
  {
    label: 'Per-source observed APY (the building block blended APY is made of)',
    tex: '\\text{APY}_i = \\frac{\\text{price}_{i,\\text{now}} - \\text{price}_{i,\\text{last}}}{\\text{price}_{i,\\text{last}}} \\times \\frac{\\text{SECONDS\\_PER\\_YEAR}}{\\text{elapsed}_i}',
    note: 'Computed once per yield source, every epoch tick (run_yield_epoch) — the exact same price-delta method the pool already used for its one original reserve, just applied per-source now. This is what feeds Capital_i × APY_i below, not a separate estimate.',
  },
  {
    label: 'Blended portfolio APY across yield sources',
    tex: '\\overline{\\text{APY}} = \\frac{\\sum_{i} \\text{Capital}_i \\times \\text{APY}_i}{\\sum_{i} \\text{Capital}_i}',
    note: 'Structurally identical to Hylo’s published "Average SOL Reserve Yield" equation. Only ENABLED sources are summed — a disabled source contributes zero weight, not just zero yield.',
  },
  {
    label: 'Target-range rebalance selection',
    tex: '\\text{choice} = \\begin{cases} \\displaystyle\\arg\\min_i \\left|\\overline{\\text{APY}}_i - \\text{target}\\right| & \\text{if } \\exists\\, i : \\overline{\\text{APY}}_i \\in [\\text{min}, \\text{max}] \\\\[8pt] \\displaystyle\\arg\\max_i \\overline{\\text{APY}}_i & \\text{otherwise} \\end{cases}',
    note: '[min, target, max] = [3%, 3.5%, 7%]. The "otherwise" branch is why min exists — a soft reference, never a hard failure.',
  },
];

export default function LatexPage() {
  return (
    <>
      <PageHeader
        eyebrow="reference"
        title="LaTeX equations"
        lede={
          <>
            Every formula from both design rounds, typeset the way{' '}
            <a href="https://docs.hylo.so/technical-addendum/hylo-equations" target="_blank" rel="noopener noreferrer">
              Hylo&rsquo;s technical addendum ↗
            </a>{' '}
            does — display-mode KaTeX, <code>\text{'{'}...{'}'}</code> labels, explicit fractions — rendered
            server-side via <code>katex.renderToString</code>, no client JS required. The plain-English version
            of every one of these lives on <a href="/glossary">/glossary</a>.
          </>
        }
      />

      <h2 style={{ fontSize: 18 }}>Round 1 — coverage &amp; severity premium curve</h2>
      <Card>
        {ROUND_1.map((e) => (
          <EqBlock key={e.label} e={e} />
        ))}
      </Card>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>Round 2 — redemption, tranche conversion &amp; yield routing</h2>
      <Card>
        {ROUND_2.map((e) => (
          <EqBlock key={e.label} e={e} />
        ))}
      </Card>
    </>
  );
}
