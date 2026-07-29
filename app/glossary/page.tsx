import { PageHeader } from '@/components/ui';
import {
  coverageOf,
  severityOf,
  kBase,
  kFromCoverageAndSeverity,
  splitBaseYieldTokenYield,
  levelizedInterest,
  monthlyPayment,
  fmtUSD,
  fmtUSD2,
} from '@/lib/model';

// Running example used throughout the app.
const FYC = 600000;
const FFC = 400000;
const OUT = 450000;

const coveragePct = coverageOf(OUT, FFC) * 100;
const severity = severityOf(OUT, FFC, FYC);
const kb = kBase(coveragePct);
const k = kFromCoverageAndSeverity(coveragePct, severity);
const reserveSplit = splitBaseYieldTokenYield(10000, FYC, FFC);
const levInt = levelizedInterest(100000, 0.15, 36);
const mp = monthlyPayment(100000, 0.15, 36);

interface Entry {
  term: string;
  symbol?: string;
  def: React.ReactNode;
  formula?: React.ReactNode;
  example?: React.ReactNode;
}

function Entry({ e }: { e: Entry }) {
  return (
    <div className="gloss-entry">
      <div className="gloss-term">
        {e.term}
        {e.symbol && <span className="gloss-symbol">{e.symbol}</span>}
      </div>
      <div className="gloss-def">{e.def}</div>
      {e.formula && <div className="formula" style={{ fontSize: 12.5, padding: '12px 16px' }}>{e.formula}</div>}
      {e.example && <div className="gloss-example">{e.example}</div>}
    </div>
  );
}

const entries: { group: string; items: Entry[] }[] = [
  {
    group: 'The tranches',
    items: [
      {
        term: 'FYC',
        symbol: 'senior tranche',
        def: 'The protected, senior claim on the pool. FYC holders get paid first out of loan interest and reserve yield, but only after FFC has taken its share of the risk premium. FYC only takes a loss once FFC is fully exhausted.',
      },
      {
        term: 'FFC',
        symbol: 'junior, first-loss tranche',
        def: 'The junior claim. FFC absorbs every dollar of loan default first, up to its own value, before FYC feels anything. In exchange, this redesign pays FFC a premium on loan interest that scales with how much protection it’s actually providing.',
      },
      {
        term: 'Outstanding principal',
        symbol: 'P, or outstanding',
        def: 'The sum of every currently-active loan’s remaining balance — the loan book. Not the same as the pool’s total value: some of the pool sits as idle reserve (USDY), which is not exposed to loan-default risk at all.',
        example: <>In the running example: <code>{fmtUSD(OUT)}</code> outstanding, out of a <code>{fmtUSD(FYC + FFC)}</code> pool — the rest, <code>{fmtUSD(FYC + FFC - OUT)}</code>, sits as reserve.</>,
      },
    ],
  },
  {
    group: 'The two dials',
    items: [
      {
        term: 'Coverage',
        symbol: 'the attachment point',
        def: 'What fraction of the outstanding loan book can default before FFC is exhausted and FYC starts taking losses. Deliberately NOT FFC / (FYC + FFC) — that formula fits a design where 100% of the pool sits in one price-moving asset. Our risk event is a loan defaulting, which only threatens the loan book, not the idle reserve — so the denominator is the loan book alone.',
        formula: (
          <>
            {'coverage = min( FFC / P, 1 )'}
          </>
        ),
        example: <>FFC {fmtUSD(FFC)} / outstanding {fmtUSD(OUT)} = <b>{coveragePct.toFixed(1)}%</b> coverage.</>,
      },
      {
        term: 'Severity',
        symbol: 'the impact',
        def: 'If FFC’s protection is exhausted, what fraction of FYC’s own TVL is still at risk in the worst case — the entire loan book defaulting. Coverage alone can’t answer this, because FYC’s size is a free variable in our system: two pools with identical coverage can have wildly different severity if one has a much larger FYC than the other.',
        formula: <>{'severity = max(0, P − FFC) / FYC'}</>,
        example: <>max(0, {fmtUSD(OUT)} − {fmtUSD(FFC)}) / {fmtUSD(FYC)} = <b>{(severity * 100).toFixed(2)}%</b> — even in the worst case, FYC would lose only {(severity * 100).toFixed(1)}% of its own value.</>,
      },
    ],
  },
  {
    group: 'The premium curve',
    items: [
      {
        term: 'k (premium multiplier)',
        symbol: 'a.k.a. "k"',
        def: 'The number of times greater FFC’s per-dollar rate is than FYC’s, on loan interest specifically. k is always strictly greater than 1, so the two tranches’ rates can never be equal (except the trivial case where there’s no loan interest to split at all).',
        formula: <>{'ffc_share / FFC  =  k × (fyc_share / FYC)'}</>,
        example: <>At the running example&rsquo;s state, k = <b>{k.toFixed(2)}×</b> — FFC earns {k.toFixed(2)} times FYC&rsquo;s rate on this month&rsquo;s loan interest.</>,
      },
      {
        term: 'k_base',
        def: 'The part of k that depends only on coverage — a piecewise-linear lookup over five stored breakpoints, calibrated against real observed Junior/Senior spreads on a comparable live tranche market. This is the curve before severity scales it.',
        example: <>At {coveragePct.toFixed(1)}% coverage, k_base = <b>{kb.toFixed(2)}×</b>.</>,
      },
      {
        term: 'K_MIN',
        def: 'The absolute floor on k — currently 1.25 (raised from an initial 1.10, which made the FYC/FFC spread nearly invisible whenever severity was near zero). Even when severity is negligible, FFC’s own capital is still first-loss on its own size, so it never earns a rate exactly equal to FYC’s.',
      },
      {
        term: 'SEVERITY_REF',
        def: 'The severity level at which the full k_base premium applies — above this, more severity doesn’t increase k any further, it’s already fully engaged. Set to 8% (lowered from an initial 20%, which was pinned to SEVERITY_GATE_MAX and meant full premium only ever engaged right at the edge of the origination gate). Deliberately decoupled from SEVERITY_GATE_MAX now — this is a "how fast does the premium ramp in" knob, the gate is a separate safety cap.',
      },
      {
        term: 'COVERAGE_WEIGHT_FLOOR',
        def: 'The minimum share of k_base that always applies, even at zero severity. Without it, a pool with a very large FYC could have low, risky-looking coverage but still earn almost no premium, because severity (which depends on FYC’s size) stays tiny — severity’s scaling would crush coverage’s own signal down to nearly nothing. Set to 0.5: coverage always keeps at least half its say over k, severity only controls the other half.',
      },
    ],
  },
  {
    group: 'The two gates',
    items: [
      {
        term: 'SEVERITY_GATE_MAX — origination gate',
        def: 'Loan origination is blocked once the projected severity from adding a new loan would exceed this threshold (20%). Replaces the old flat 80%-coverage floor. Because it’s keyed on severity rather than coverage, origination capacity scales with FYC’s actual size, not FFC’s alone.',
        formula: <>{'assert_origination_allowed: require(severity(P + new_loan, FFC, FYC) ≤ 20%)'}</>,
      },
      {
        term: 'SEVERITY_MINT_FLOOR — minting ceiling',
        def: 'New this design round. Blocks new FFC deposits once severity drops to 2% or below — the point at which FFC is already covering the loan book so thoroughly that more junior capital buys no further real protection, and would only dilute existing FFC holders’ yield.',
        formula: <>{'assert_mint_allowed: require(severity(P, FFC, FYC) > 2%)'}</>,
      },
      {
        term: 'Binding constraint',
        def: 'Loan origination is actually limited by whichever of two independent checks trips first: the severity gate, or the (unchanged) 80% allocation ceiling on total pool value. Under the new severity gate, the severity check binds first whenever FFC < 3× FYC — true for essentially any real junior tranche.',
      },
    ],
  },
  {
    group: 'Mint & redeem pricing',
    items: [
      {
        term: 'Optimistic price',
        symbol: 'used to mint',
        def: 'The price charged when MINTING new FYC/FFC — deliberately assumes yield that has genuinely accrued but hasn’t been formally collected yet is already in the tranche’s value. Two sources feed it: the reserve token’s own unrealized price appreciation since its last epoch tick, and a real per-active-loan interest accrual (see Reward-per-second accrual below). Pricing new tokens higher this way protects existing holders from being diluted by yield that’s real but just hasn’t been swept into v_tranche yet.',
        formula: <>{'optimistic_price = (v_tranche + yield_estimate + loan_estimate) / total_supply'}</>,
      },
      {
        term: 'Conservative price',
        symbol: 'used to redeem',
        def: 'The price paid out when REDEEMING — counts only value that has actually been collected and recorded in v_tranche, none of the optimistic assumptions above. Minting high and redeeming low, never the reverse, is what keeps the two prices from ever letting someone extract yield that was only ever assumed, not real.',
        formula: <>{'conservative_price = v_tranche / total_supply'}</>,
      },
      {
        term: 'Reward-per-second accrual',
        def: 'How the optimistic price estimates loan interest without iterating every loan on-chain. The pool tracks one running rate — the sum of every currently-accruing loan’s own levelized_interest ÷ its period length — plus a checkpoint, both kept current the instant a loan originates, repays, or is flagged pending-default. Reading "rate × time since last update" at any moment gives the same answer as summing every individual loan’s own elapsed-time-into-period, the actual per-loan accrual the design calls for, at O(1) cost instead of iterating the whole loan book.',
      },
      {
        term: 'Yield source',
        symbol: 'YieldSourceState',
        def: 'A registered yield-bearing reserve token the pool holds alongside — or instead of — its original primary reserve: USDY, syrupUSDC, or any future addition. Each gets its own PDA tracking its own token balance and epoch price history, so optimistic pricing and yield accrual work correctly per-source instead of only for whichever reserve token was there first.',
      },
    ],
  },
  {
    group: 'Amortization & accounting',
    items: [
      {
        term: 'True amortization',
        def: 'The borrower’s real, contractual repayment schedule — one level monthly payment, with the interest portion declining and the principal portion rising every period, exactly as a standard loan works. This never changes; it’s what the fleet operator sees on their own dashboard.',
        formula: <>{'M = P·r / (1 − (1+r)^−n),  r = APR/12,  n = term in months'}</>,
        example: <>A $100,000 loan at 15% APR over 36 months: M = <b>{fmtUSD(mp)}</b>/month.</>,
      },
      {
        term: 'Levelized interest',
        def: 'The protocol’s own, separate internal figure: instead of recognizing the true declining interest each period, it recognizes one flat number every period, computed once at origination from the loan’s total lifetime interest. This is what feeds the yield curve, and what current_balance/outstanding_principal now pay down against too — not just the yield split.',
        formula: <>{'levelized_interest = (M × term_months − principal) / term_months'}</>,
        example: <>Same $100K/15%/36mo loan: total interest over its life ÷ 36 = <b>{fmtUSD2(levInt)}</b>/period, flat.</>,
      },
      {
        term: 'Net yield / gross yield',
        symbol: 'the 85/15 fee split',
        def: 'Every yield stream — loan interest and reserve/USDY appreciation alike — has a 15% protocol fee taken off the top before any tranche split happens. The remaining 85% ("net yield") is what actually gets divided between FYC and FFC. The 15% fee mints new FYC tokens, split 2:1 protocol:insurance. Unchanged throughout every iteration of this redesign.',
      },
      {
        term: 'Reserve / USDY yield split',
        def: 'The pool’s idle capital (not deployed as loans) earns yield from holding USDY. This yield is split flat pro-rata by tranche size — each tranche gets exactly its share of the combined pool, no curve, no coverage or severity involved. This is the ONE place a simple "your share of the pool" split still applies directly — everywhere else in this redesign, the split is risk-adjusted. The reason: reserve appreciation carries no loan-specific risk, so there is nothing for a first-loss premium to compensate for.',
        formula: <>{'fyc_share = net_yield × FYC / (FYC + FFC)\nffc_share = net_yield − fyc_share'}</>,
        example: <>A $10,000 net reserve-yield month, FYC $600K / FFC $400K: FYC gets <b style={{ color: 'var(--fyc)' }}>{fmtUSD(reserveSplit.fycShare)}</b> (60%), FFC gets <b style={{ color: 'var(--ffc)' }}>{fmtUSD(reserveSplit.ffcShare)}</b> (40%) — exactly their pool share, nothing more.</>,
      },
    ],
  },
];

export default function GlossaryPage() {
  return (
    <>
      <PageHeader
        eyebrow="reference"
        title="Glossary & formulas"
        lede="Every term used across this app, defined in full — plain-English meaning, the formula, and a worked example using the same $600K FYC / $400K FFC / $450K outstanding running scenario used everywhere else."
      />
      {entries.map((g) => (
        <div key={g.group} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18 }}>{g.group}</h2>
          {g.items.map((e) => (
            <Entry key={e.term} e={e} />
          ))}
        </div>
      ))}
    </>
  );
}
