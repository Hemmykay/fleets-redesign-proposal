import { PageHeader, Card } from '@/components/ui';
import CodeBlock from '@/components/CodeBlock';

export default function FormulaPage() {
  return (
    <>
      <PageHeader
        eyebrow="pinochio / src"
        title="End-to-end formula"
        lede="From origination to each repayment to the yield split. Everything downstream of net_yield — fee minting, cumulative_yield bookkeeping — is unchanged."
      />
      <Card>
        <CodeBlock
          fontSize={12.8}
          code={`// at origination (once) — instructions/originate_loan.rs
// monthly_payment is unchanged: the borrower's real, level payment
monthly_payment    = compute_monthly_payment(principal, apr_bps, term_months)
// new — stored on LoanAccount, drives the pool's own books from here on
levelized_interest = (monthly_payment × term_months − principal) / term_months

// every ~30 days, at repayment — instructions/repay_loan.rs
// old: interest = period_interest(current_balance, apr_bps)   <- declining, dropped
interest           = levelized_interest                         // flat, replaces the line above
principal_portion  = monthly_payment − interest
principal_paid     = min(principal_portion, current_balance)
current_balance    = current_balance − principal_paid           // = outstanding_principal, pool-side

// borrower's own dashboard still computes/shows the true amortized figures separately —
// this block only changes the protocol's internal books, never what's collected

// then, the yield curve — helpers/waterfall.rs, gross_loan_interest's source changed as above
gross_loan_interest = interest   (the levelized figure above, not true period interest)
coverage        = min(1, effective_ffc / outstanding_principal)          // attachment point — unchanged definition
severity        = max(0, outstanding_principal − effective_ffc) / fyc.v_tranche   // new — impact on FYC's own TVL

// new — premium multiplier, replaces fyc_target/residual AND the §5.1 parity anchor
k_base          = interpolate(coverage, k_breakpoints)          // coverage sets the base curve
severity_factor = min(1, severity / SEVERITY_REF)                 // severity scales it — SEVERITY_REF = 8%, decoupled from the 20% gate
weight          = COVERAGE_WEIGHT_FLOOR + (1 − COVERAGE_WEIGHT_FLOOR) × severity_factor  // coverage always keeps ≥ half its say
k               = K_MIN + (k_base − K_MIN) × weight                // K_MIN = 1.25, COVERAGE_WEIGHT_FLOOR = 0.50, k > 1 always
ffc_share_pct   = (k × ffc.v_tranche) / (fyc.v_tranche + k × ffc.v_tranche)
// unchanged — split_gross_yield, 85/15
net_yield       = gross_loan_interest × 85%
// new
ffc_share       = net_yield × ffc_share_pct
fyc_share       = net_yield − ffc_share

// two new gates, both keyed on severity — helpers/coverage.rs
assert_origination_allowed():  require(projected_severity ≤ 20%)   // replaces the flat 80% coverage floor
assert_mint_allowed() (new):   require(severity > 2%)              // blocks new FFC deposits once protection is already more than sufficient

// k_breakpoints (k_base) — real observed Junior/Senior spreads on a comparable live tranche market, captured during this design session
coverage=100%  →  k_base = 1.33   // observed @ coverage 99.90% — junior 11.67% / senior 8.75%
coverage= 80%  →  k_base = 1.85   // interpolated, widened from 1.50
coverage= 41%  →  k_base = 1.94   // observed @ coverage 40.78% — junior 15.91% / senior 8.22%
coverage= 20%  →  k_base = 7.02   // observed @ coverage 20.41% — junior 34.18% / senior 4.87%
coverage=  0%  →  k_base = 12.00  // extrapolated tail, beyond the observed range

// property: ffc_share/ffc.v_tranche = k × (fyc_share/fyc.v_tranche) exactly, for any pool split.
// FFC's rate can only equal FYC's if k=1, which needs severity=0 AND K_MIN=1 — neither of
// which happens except the trivial zero-loan-interest case.`}
        />
      </Card>
    </>
  );
}
