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
            <b>A pool-share curve for reserve/yield-token yield</b> — applying the same premium-curve idea there too,
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
          <Q>
            <b>compute_v_pool / compute_v_pool_true likely double-count a default,</b> pre-existing in the real
            contract, not introduced by this redesign. <code>approve_default.rs</code> does two independent
            things to the same <code>PoolState</code> in the same instruction:{' '}
            <code>outstanding_principal -= loan.current_balance</code> AND{' '}
            <code>realized_losses += confirmed_gross_loss</code>. Since <code>compute_v_pool</code> is{' '}
            <code>c_tokens×price + outstanding_principal − realized_losses</code>, and nothing nets these two
            terms against each other, a fully-written-off loan (where <code>confirmed_gross_loss ≈
            current_balance</code>) gets subtracted from pool value twice — once through the vanished{' '}
            <code>outstanding_principal</code>, once through the grown <code>realized_losses</code>.{' '}
            <code>record_recovery.rs</code> only ever decrements <code>realized_losses</code> by the recovered
            amount, capped at one recovery per loan — it never restores <code>outstanding_principal</code>, so
            any unrecovered portion stays double-counted permanently, understating every tranche&rsquo;s price
            from that point on. Confirmed by reading every read/write site of both fields; not fixed in this
            round — the likely correct fix is dropping the <code>− realized_losses</code> term from{' '}
            <code>compute_v_pool</code>/<code>compute_v_pool_true</code> entirely, since <code>
            outstanding_principal</code> already reflects the loss, but that touches every caller of those two
            functions (already several, across this redesign) and deserves its own pass before shipping.
          </Q>
          <Q>
            <b>The instant-redemption fee formula is split-gameable, and the fix is deliberately not
            adopted.</b> <code>fee_bps = fee_min + (amount/elb_tranche) × (fee_max−fee_min)</code>, applied flat
            to the whole amount, is quadratic in <code>amount</code> but not split-invariant — splitting one
            redemption into several smaller ones inside a single transaction (before anything else can move{' '}
            <code>elb_tranche</code>) converges the average rate paid toward <code>fee_min</code>. The
            split-invariant fix is charging the closed-form integral of the same marginal rate instead —{' '}
            <code>fee = fee_min·amount + (fee_max−fee_min)·amount²/(2·elb_tranche)</code>, exactly half this
            formula&rsquo;s quadratic term. Not adopted here because it changes the worked example&rsquo;s
            numbers (the one this was specified against); recommended as the production hardening. See{' '}
            <a href="/redemption">/redemption</a>.
          </Q>
          <Q>
            <b>Minting the FFC-sourced redemption fee&rsquo;s FYC at conservative (not optimistic) price is
            correct, but creates a stated, accepted asymmetry.</b> Conservative→conservative is the right
            choice — this moves already-collected value, not new external capital, so optimistic
            pricing&rsquo;s dilution-protection purpose doesn&rsquo;t apply, and using it would under-mint FYC
            and hand existing holders a free NAV bump. The side effect: protocol/insurance end up with
            proportionally MORE future-yield claim per fee-dollar than an external depositor gets per
            deposit-dollar, since a real depositor mints at the higher optimistic price. Intentional, not a bug
            — flagged here so it&rsquo;s a decision, not an oversight. See <a href="/tranche-swap">/tranche-swap</a>.
          </Q>
          <Q>
            <b>Earmarking loan capital at &ldquo;equity received&rdquo; has a real concurrency race, not fully
            solved on-chain.</b> Two concurrent deals can each pass the loan-origination liquidity gate before either
            one&rsquo;s <code>earmark_loan_capital</code> call actually lands, both drawing on the same slice of
            ELB, leaving insufficient cash when both try to disburse. An expiry + permissionless{' '}
            <code>sweep_expired_earmark</code> prevents a forgotten <code>cancel_earmark</code> from
            permanently over-reserving capital, but the race itself needs the backend to serialize
            equity-received processing — an off-chain operational fix, not something the on-chain gate alone
            can guarantee. See <a href="/redemption">/redemption</a>.
          </Q>
          <Q>
            <b>Multi-yield-source routing (target range [3%, 3.5%, 7%]) is designed but not simulated.</b>{' '}
            <code>/simulator</code> keeps a single time-stepped reserve price path — rebuilding it to run N
            independent sources with independent price paths would be a disproportionate rewrite for this
            round. <code>blendedApy</code>/<code>pickRebalanceTarget</code> in <code>lib/model.ts</code> are
            real, working pure functions, demonstrated on <a href="/yield-sources">/yield-sources</a> via
            worked examples rather than a live multi-period run.
          </Q>
          <Q>
            <b>Whether jr_to_sr/sr_to_jr should be blocked from composing atomically with originate_loan in the
            same transaction</b> (temporarily satisfying a gate, originating, then reversing) isn&rsquo;t
            decided. Every gate check involved reads live state, so this is likely low-risk, but it&rsquo;s a
            real design decision that deserves an explicit answer rather than being waved off as unlikely.
          </Q>
          <Q>
            <b>Loan amortization used the wrong day-count convention relative to yield annualization — found
            while reviewing this round&rsquo;s formulas, not something this round introduced.</b> The real
            contract&rsquo;s <code>compute_monthly_payment</code>/<code>period_interest</code> both hardcode{' '}
            <code>/ 12</code>, implicitly treating every 30-day repayment period as exactly 1/12 of a year (a
            30/360 day-count — 12 periods is only 360 days). <code>observed_source_apy_bps</code>, on the
            reserve-yield side, already annualizes against a real 365-day year (ACT/365) — a separate,
            deliberate, explicitly-commented choice. Both conventions are individually normal in finance;
            nobody had made them agree with each other. Net effect: a loan stated at 15% APR was actually
            costing borrowers about 15.21% once measured against a real calendar year, and{' '}
            <code>/explorer</code>&rsquo;s own instantaneous per-tranche APY figures (which re-annualize a
            single period&rsquo;s yield with a flat ×12) quietly disagreed with what a full{' '}
            <code>/simulator</code> run of the identical inputs would show, which annualizes with the correct
            ~12.1667. Fixed here by introducing one shared <code>PERIODS_PER_YEAR</code> constant in{' '}
            <code>lib/model.ts</code> and using it everywhere a rate crosses between per-period and per-year —
            amortization, reserve-yield display, and the loan-interest curve chart all included — see{' '}
            <a href="/glossary">/glossary</a>. The alternative — keep loan interest on 30/360 and leave the
            reserve side on ACT/365 — is also legitimate; this wasn&rsquo;t an obvious bug so much as an
            inconsistency nobody had resolved either way. Recommending ACT/365 everywhere here because it&rsquo;s
            the convention this whole redesign already committed to for yield, and because it means a stated
            APR is the APR actually charged, with no asterisk.
          </Q>
        </ul>
      </Card>
    </>
  );
}
