import { PageHeader, Card } from '@/components/ui';

function Q({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <span className="qmark">?</span>
      <p>{children}</p>
    </li>
  );
}

export default function OpenQuestionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="pinochio / src"
        title="Deferred, out of scope, and worth tracking"
        lede="What's illustrative, what's deferred, and what still needs an explicit sign-off before this goes anywhere near production."
      />
      <Card>
        <ul className="oq-list">
          <Q>
            <b>The k breakpoints are a point-in-time snapshot,</b> not a general formula: 1.33× / 1.94× / 7.02×
            were a real, live Junior/Senior APY ratio observed on a comparable tranche market at the moment
            this design session pulled them. That market&rsquo;s own curve moves with conditions too — worth
            re-checking before finalizing, and revisiting periodically after.
          </Q>
          <Q>
            <b>Final curve breakpoints</b> beyond the 100%/80% anchors are illustrative and validated against
            the scenario on the Validation page, but not exhaustively tuned or signed off — particularly the
            ramp steepness between the 80% gate and full exhaustion.
          </Q>
          <Q>
            <b>The old binding-constraint finding is superseded, not just outdated:</b> under the coverage-based
            gate, whether the coverage gate or the 80% allocation ceiling bound first depended on FFC&rsquo;s
            live pool share (crossed over around 64%). Under the severity gate, the math is simpler and more
            predictable — the severity gate binds first whenever FFC &lt; 3× FYC, which is virtually always
            true for a junior tranche. Worth confirming that&rsquo;s actually the desired behavior, not just a
            side effect of the algebra.
          </Q>
          <Q>
            <b>K_MIN (1.25), SEVERITY_REF (8%), COVERAGE_WEIGHT_FLOOR (0.5), SEVERITY_MINT_FLOOR (2%), and
            SEVERITY_GATE_MAX (20%) are all illustrative,</b> not signed off. SEVERITY_REF and
            SEVERITY_GATE_MAX were originally pinned equal (both 20%, tied to the old 80% floor&rsquo;s
            complement) but that made full premium only ever engage right at the edge of the origination gate
            — nearly every allowed pool state was earning a diluted, scaled-down rate. They were deliberately
            decoupled and SEVERITY_REF lowered so the premium ramps in well before the gate.
            COVERAGE_WEIGHT_FLOOR came later, for a related reason: a pool with a very large FYC can have
            low, risky-looking coverage but tiny severity (because FYC is huge), and severity&rsquo;s scaling
            was crushing coverage&rsquo;s own signal in that case — the floor guarantees coverage always keeps
            at least half its say. All three are design choices, not derivations — worth an explicit
            gut-check, and revisiting if the ratio still feels off against the actual risk.
          </Q>
          <Q>
            <b>In the limit, a large enough FYC can support origination with very little FFC at all</b> —
            severity alone doesn&rsquo;t require a minimum FFC balance, just a small-enough loan book relative
            to FYC. That&rsquo;s the intended capital-efficiency win, not a bug, but worth confirming there&rsquo;s
            no scenario where &ldquo;first-loss tranche&rdquo; should mean something even when the math says
            it barely needs to.
          </Q>
          <Q>
            <b>A pool-share curve for reserve/USDY yield</b> — applying the same premium-curve idea there too,
            since that stream is pool-wide with no loan-specific risk. Explicitly deferred to keep this round
            scoped to loan interest only.
          </Q>
          <Q>
            <b>Recovery Period / Settlement</b> — a two-tier loss-handling design that pauses senior&rsquo;s
            yield and freezes redemptions during a partial-loss recovery window. We finalize losses
            immediately today; not decided whether to pursue an equivalent.
          </Q>
          <Q>
            <b>The simulator&rsquo;s default-waterfall and origination logic are simplified</b> relative to the
            real multi-loan book: defaults write off the oldest active loans first rather than being
            attributed to a specific defaulting loan, and every origination in a scenario shares one APR/term
            pair unless configured otherwise. Fine for exploring the yield mechanics; not a substitute for
            per-loan portfolio modeling.
          </Q>
          <Q>
            <b>Titan&rsquo;s program id is a deliberate placeholder,</b> not a real value — their public docs
            (titan-exchange.gitbook.io) describe an off-chain quote/routing API with no fixed on-chain program
            id exposed yet, and integration access is gated. <code>ALLOWED_SWAP_PROGRAMS</code> is wired to
            accept it the moment a real id exists; until then it points at the System Program, which can never
            authorize a real swap.
          </Q>
          <Q>
            <b>PoolState&rsquo;s three new loan-accrual fields are another breaking layout change,</b> same
            story as <code>LoanAccount.levelized_interest</code> above — already-deployed <code>PoolState</code>{' '}
            PDAs need a realloc + backfill (rate = 0, checkpoint = 0, updated_ts = now) before this ships. Safe
            to backfill at zero since the estimate only ever under-counts until the first loan touches it, never
            invents value.
          </Q>
          <Q>
            <b>compute_v_pool still only sums the primary reserve&rsquo;s tokens,</b> not any additional
            registered <code>YieldSourceState</code>. Pool-wide totals — the loan-allocation cap, TVL, and
            optimistic price&rsquo;s own split denominator — all under-count value sitting in a second or third
            source until that function itself is migrated to sum across all of them. Flagged everywhere it
            matters on <code>/code-diff</code>, not fixed in this round.
          </Q>
          <Q>
            <b>A loan stops counting toward optimistic-price accrual at flag_pending_default, not the later
            approve_default</b> — deliberately conservative, since by the time a loan is flagged it&rsquo;s
            already gone through a full cure period of non-payment. But <code>flag_pending_default</code> is
            its own explicit call, gated on <code>CURE_PERIOD_DAYS</code> having elapsed, not something that
            fires automatically the moment a loan goes delinquent. If nobody calls it promptly, an already-overdue
            loan keeps counting toward the accrual rate for however long that gap lasts — worth deciding whether
            this needs a permissionless keeper incentive rather than relying on someone remembering to call it.
          </Q>
        </ul>
      </Card>
    </>
  );
}
