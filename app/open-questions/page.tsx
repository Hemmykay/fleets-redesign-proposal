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
          <Q>
            <b>The yield fee (15% of gross reserve + loan yield) previously computed a value but never actually
            minted it — found while auditing the simulator, not a change this round introduced deliberately.</b>{' '}
            Gross yield came in, the 85% net share landed in <code>v_fyc</code>/<code>v_ffc</code> as documented,
            but the 15% fee value was calculated and then discarded — silently leaking value out of the model
            every single period instead of minting new FYC and crediting protocol/insurance, exactly as{' '}
            <a href="/glossary">/glossary</a> has always described. Fixed in <code>lib/simulate.ts</code>: the
            fee is now minted into FYC at the price the instant before that period&rsquo;s net yield landed
            (price-neutral by construction), split 2:1 protocol:insurance via the new{' '}
            <code>splitYieldFee</code>. Surfaced on <a href="/simulator">/simulator</a> as its own
            &ldquo;protocol revenue — yield fee&rdquo; readout, separate from the existing redemption-fee
            revenue, since the two are funded by different things (yield generation vs. redeeming users).
          </Q>
          <Q>
            <b>Optimistic (mint) vs. conservative (redeem) pricing wasn&rsquo;t modeled in the simulator at
            all until this round</b> — every mint and redeem read the same single <code>v_tranche/supply</code>{' '}
            price, letting a same-period depositor buy in before a yield sweep and immediately share in yield
            they contributed nothing to. Fixed by computing a pre-activity yield ESTIMATE each period (off that
            period&rsquo;s already-active loans and current reserve — the same state steps 3/4 use moments
            later to actually collect it) and pricing mints against <code>v_tranche + estimate</code> while
            every redemption path keeps pricing against <code>v_tranche</code> alone. One honest residual gap:
            the estimate is computed off PRE-activity pool weights, but the actual split three steps later uses
            POST-activity weights, so a same-period mint or redeem large enough to meaningfully shift the
            FYC/FFC ratio can end that period&rsquo;s conservative price slightly above what was quoted at mint
            time (observed up to ~0.02% in testing, scaling with activity size relative to pool). This is a
            simulator-only artifact of batching a whole period&rsquo;s activity and yield into one step — the
            real contract has no such batching, since <code>compute_optimistic_price</code> reads live state at
            the exact instant of the instruction. Not fixed, because fixing it would require pricing a mint off
            state that includes the mint itself, which is circular; flagged here rather than silently rounded
            away.
          </Q>
          <Q>
            <b>The real contract&rsquo;s yield-bearing epoch ticks every 24 hours, not every 30 days</b> — a
            much finer-grained cadence than <code>SECONDS_PER_PERIOD</code>, the loan repayment cycle.{' '}
            <code>/simulator</code> samples yield once per 30-day period instead of once per day, for the same
            tractability reason the multi-source rewrite was scope-cut above. This is safe for the numbers this
            tool reports: every APY figure here annualizes off a real ACT/365 day-count regardless of how often
            it&rsquo;s sampled, so daily vs. 30-day compounding of the same 3.5% true rate over a year comes out
            to 3.5618% vs. 3.5568% effective — about half a basis point apart, negligible next to anything else
            this model varies. What the coarser sampling genuinely can&rsquo;t represent: any mid-period,
            on-chain state read — a loan originating on day 17 of a 30-day cycle sees whatever the most recent
            daily epoch left behind, not a value frozen at the cycle&rsquo;s start, and the simulator&rsquo;s
            period-stepped design has no sub-period state to read at all. See{' '}
            <code>YIELD_EPOCH_SECONDS</code> in <code>lib/model.ts</code> and <a href="/glossary">/glossary</a>.
          </Q>
          <Q>
            <b>Loans don&rsquo;t all originate on the same calendar day — the real contract handles this
            correctly, proven, not just asserted.</b> One loan originates July 3, another July 21; both still run
            their own independent 30-day repayment clock from their own start. <code>compute_optimistic_price</code>{' '}
            needs &ldquo;how much has each active loan accrued so far&rdquo; at ANY query instant, for ANY mix of
            staggered origination dates, without iterating the loan book on every call. The pool-wide reward-per-
            second accumulator (<code>loan_accrual_rate</code>/<code>loan_accrual_checkpoint</code>/
            <code>loan_accrual_updated_ts</code> — see <a href="/glossary">Reward-per-second accrual</a> and the
            interactive worked example on <a href="/latex">/latex</a>) gets this exactly right: every lifecycle
            event (originate, repay, flag-default) rolls the checkpoint up to now AT THE OLD RATE first, then
            changes the rate — so a loan contributes nothing to anything banked before it existed, and a
            just-collected payment is subtracted back out so it can never double-count on a later rollup. Verified
            numerically (not just argued) in <code>verify.ts</code>: a two-loan, staggered-origination scenario
            crossing a repayment boundary, cross-checked against an independently-computed ground truth at every
            step — see task 35 in this design tool&rsquo;s own working notes.
            <br />
            <br />
            <code>/simulator</code>, by contrast, doesn&rsquo;t need this mechanism at all — not because it solved
            the same problem differently, but because it never has the problem in the first place: every loan
            origination, mint, and redeem in a scenario is tagged with an integer PERIOD (not a calendar date), so
            two loans &ldquo;originated in the same period&rdquo; are, within the simulator&rsquo;s own model,
            exactly synchronized by construction — there is no sub-period offset to misrepresent. That&rsquo;s a
            genuinely coarser abstraction than the real contract&rsquo;s continuous-time accrual, not a bug: it
            matches the resolution the simulator already commits to everywhere else (see the yield-epoch entry
            above), and the conservation checks in <code>verify.ts</code> already confirm no value leaks or gets
            invented at that resolution. A future enhancement — giving the simulator its own per-loan calendar-day
            origination and running the exact same accumulator functions from <code>lib/model.ts</code> to drive
            optimistic pricing — is possible but was not undertaken here, for the same tractability reason the
            multi-source rewrite above was scope-cut: a disproportionate rebuild of the simulator&rsquo;s time-
            stepping for a refinement the period-level conservation proofs already show doesn&rsquo;t change any
            reported total.
          </Q>
          <Q>
            <b>The proposed 1% origination fee is a deliberate change from today&rsquo;s live default, not a
            correction of it.</b> Confirmed against the real repo (<code>backend/*/src/services/repository.ts</code>,{' '}
            <code>backend/*/.env.example</code>): the live system already charges a per-loan, admin-configurable
            origination fee — <code>DEFAULT_ORIGINATION_FEE_BPS=30</code> (0.30%) today, overridable per contract up
            to a schema-enforced 500 bps (5%) ceiling (<code>page.new_contract.ts</code>). It&rsquo;s handled
            entirely off-chain, alongside the borrower&rsquo;s equity deposit (
            <code>requestedEquity + originationFeeBps → total_due_to_borrower</code>) — never touching the
            pinocchio program, confirmed by there being zero matches for <code>origination_fee</code> anywhere in{' '}
            <code>pinochio/</code>. This round proposes 1% as this design tool&rsquo;s own default (randomizer range
            0.5%–2% on <code>/simulator</code>), a stated choice for exploring the mechanic&rsquo;s impact — not a
            claim that 30 bps was wrong. The 100%-to-protocol / 0%-to-insurance split is likewise a stated choice
            for this round, distinct from the redemption fee&rsquo;s 50/50 and the yield fee&rsquo;s 2:1 — flagged
            here so it reads as a decision, not an inconsistency. See <a href="/glossary">Origination fee</a>.
          </Q>
        </ul>
      </Card>
    </>
  );
}
