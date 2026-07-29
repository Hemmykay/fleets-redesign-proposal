import { PageHeader, Card, SectionHead } from '@/components/ui';
import WaterfallAnimation from '@/components/WaterfallAnimation';

function Item({ b, file }: { b: React.ReactNode; file: string }) {
  return (
    <li>
      <div>
        {b}
        <span className="file">{file}</span>
      </div>
    </li>
  );
}

export default function ChangesPage() {
  return (
    <>
      <PageHeader
        eyebrow="pinochio / src"
        title="What changes, what doesn&rsquo;t"
        lede="The loss side and fee mechanics are untouched. The origination gate is not — it's reopened and replaced, per live direction on this design."
      />

      <Card>
        <div className="diff-grid">
          <div className="diff-col">
            <h3>
              <span className="sw" style={{ background: 'var(--border-strong)' }} /> Unchanged
            </h3>
            <ul className="diff-list unchanged">
              <Item
                b={<><b>Reserve/USDY yield split.</b> Stays flat pro-rata by tranche size — the curve applies only to loan interest.</>}
                file="helpers/waterfall.rs — split_base_yield_token_yield"
              />
              <Item
                b={<><b>The 85/15 net/fee split.</b> 15% fee still mints new FYC tokens, 2:1 protocol:insurance, on both yield streams.</>}
                file="helpers/fees.rs — mint_fee_value_into_fyc"
              />
            </ul>
          </div>
          <div className="diff-col">
            <h3>
              <span className="sw" style={{ background: 'var(--ffc)' }} /> Changing
            </h3>
            <ul className="diff-list changed">
              <Item
                b={<><b>The default waterfall — new middle tier.</b> FFC still absorbs losses first. Once FFC is exhausted, the remainder now burns FYC tokens held in the insurance wallet — a real loss absorption (v_tranche and total_supply both drop) — before touching general FYC holders at all. Only after the insurance fund&rsquo;s own FYC is exhausted does the loss finally reduce general fyc.v_tranche.</>}
                file="helpers/waterfall.rs — apply_default_waterfall"
              />
              <Item
                b={<><b>Manual insurance-burn — new.</b> Admin can burn a chosen amount of insurance-held FYC to top up FFC&rsquo;s price directly, even without a triggered default — the value moves into ffc.v_tranche, no new FFC tokens minted.</>}
                file="instructions/burn_insurance_for_ffc.rs (new)"
              />
              <Item
                b={<><b>Loan-interest split.</b> Fixed <code>fyc_target</code>/residual logic replaced by a premium-multiplier lookup — FFC&rsquo;s rate is pinned to k× FYC&rsquo;s rate, k&gt;1 always, so the two never converge. k is now also scaled by severity, not coverage alone.</>}
                file="helpers/waterfall.rs — distribute_loan_interest"
              />
              <Item
                b={<><b>New curve/interpolation helper.</b> Piecewise-linear lookup over fixed-point bps breakpoints, returning the multiplier k rather than a share directly.</>}
                file="helpers/curve.rs (new)"
              />
              <Item
                b={<><b>The 80% coverage gate — reopened and replaced.</b> Was explicitly kept in the written proposal (§4, &ldquo;considered for removal, explicitly rejected&rdquo;) — that decision is now reversed. <code>assert_origination_allowed</code> blocks origination on projected severity exceeding 20%, not projected coverage falling below 80%, so a large FYC unlocks real origination capacity without needing more FFC.</>}
                file="helpers/coverage.rs — assert_origination_allowed"
              />
              <Item
                b={<><b>FFC-minting ceiling — new.</b> Blocks new FFC deposits once severity drops to 2% or below — protection is already more than sufficient, additional FFC would only dilute existing holders.</>}
                file="instructions/deposit.rs (or equivalent mint path)"
              />
              <Item
                b={<><b>Levelized interest — adopted, not optional.</b> <code>current_balance</code> / <code>outstanding_principal</code> now follow the flat levelized schedule too, not just the yield split — fixes the timing cliff and gives the pool&rsquo;s books one consistent internal schedule for the loan. The borrower&rsquo;s own amortized schedule is unaffected.</>}
                file="instructions/repay_loan.rs, LoanAccount, originate_loan.rs"
              />
              <Item
                b={<><b><code>cap_diff_bps</code> / <code>fyc_monthly_loan_target</code></b> become unused by <code>distribute_loan_interest</code> specifically — still used by <code>build_snapshot</code>&rsquo;s loan-origination-allocation target, its original purpose. No longer used by <code>compute_optimistic_price</code> at all now (see below) — that was always a mismatched reuse of allocation-capacity math for a pricing estimate, not a real dependency.</>}
                file="helpers/allocation.rs — build_snapshot"
              />
              <Item
                b={<><b>Swap aggregator generalized to an allow-list.</b> Jupiter was hardcoded twice — once as the allow-check, once again as the literal CPI target. Both the check and the invoked program now come from <code>ALLOWED_SWAP_PROGRAMS</code>, so a second aggregator (Titan) is an allow-list entry away, not a rewrite. Titan&rsquo;s own program id is a flagged placeholder — their public docs don&rsquo;t expose one yet.</>}
                file="helpers/jupiter.rs, helpers/swap.rs, constants.rs"
              />
              <Item
                b={<><b>Multi-yield-source registry — new.</b> A pool can register more than one yield-bearing reserve (USDY, syrupUSDC, ...) as its own <code>YieldSourceState</code> PDA, without ever touching <code>PoolState</code>&rsquo;s layout beyond one spare padding byte. Investors can also deposit a yield-bearing token straight in, skipping the swap leg entirely.</>}
                file="state.rs, instructions/initialize_yield_source.rs, instructions/deposit_yield_token.rs"
              />
              <Item
                b={<><b>Optimistic price — the loan and yield-token accrual estimates are now real, not proxies.</b> Auditing the mechanism found the loan side used a cap-based days-elapsed/30 proxy disconnected from any real loan&rsquo;s schedule, and the yield-token side wasn&rsquo;t reflected in optimistic pricing at all. Fixed: a real reward-per-second accrual per active loan, and a live unrealized-appreciation calc for the reserve token, both split through the exact same functions real yield collection uses.</>}
                file="helpers/allocation.rs — compute_optimistic_price; state.rs (three new PoolState fields)"
              />
            </ul>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 32 }}>
        <SectionHead
          num="→"
          title="Watch the new waterfall cascade"
          dek="Same order apply_default_waterfall applies a loss in: FFC first, then insurance-held FYC burns, then general FYC only as a last resort. Illustrative capacities — drag the slider or pick a preset."
        />
        <Card>
          <WaterfallAnimation />
        </Card>
      </div>
    </>
  );
}
