'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, Card, Callout } from '@/components/ui';
import { FILES, type DiffFile } from '@/app/code-diff/files-data';

const NARRATIVE = `# FYC/FFC Yield Redesign — full handoff context

## What this is

A proposed redesign of how a Solana lending protocol distributes yield between its two tranches:

- **FYC** ("Fleets Yield Coin") — the senior, protected tranche. Gets paid first, takes losses last.
- **FFC** ("Fleets FiLo Coin") — the junior, first-loss tranche. Absorbs every dollar of loan default
  first, up to its own value, in exchange for a premium rate on loan interest.

The live program (\`pinochio/src\`, a pinocchio/Solana program) currently splits loan interest and
reserve yield with a flat, unrisk-adjusted formula. This redesign replaces that with a
severity/coverage-scaled premium curve for loan interest, adds an admin-configurable ceiling on FYC's
total blended APY, and layers on redemption/liquidity mechanics, a junior↔senior conversion primitive,
and multi-yield-source support — none of which exist in the live contract today. Everything below is a
**design proposal only** — nothing has been merged into the live program.

This document is generated from the design tool's own single source of truth
(\`app/code-diff/files-data.ts\` for code, \`lib/model.ts\`/\`lib/simulate.ts\` for the reference math) —
it cannot drift from what the tool itself shows on \`/code-diff\`, \`/glossary\`, \`/latex\`, and
\`/simulator\`.

## Round 1 — coverage/severity premium curve (replaces the flat split)

**Problem:** the live contract's \`distribute_loan_interest\` split loan interest between FYC/FFC using
an epoch-cap-relative formula that could invert — FYC's rate could drop BELOW its own reserve-only
baseline once FFC was oversized relative to the epoch cap, the opposite of what a senior tranche should
guarantee.

**Fix:** a new premium multiplier \`k\` — "how many times more FFC earns per dollar than FYC, on loan
interest specifically" — driven by two readings:

- **Coverage** = min(1, FFC / outstanding_principal) — what fraction of the loan book FFC alone could
  absorb before FYC takes any loss.
- **Severity** = max(0, outstanding − FFC) / FYC — if FFC's protection is exhausted, what fraction of
  FYC's own value is still at risk in the worst case.

\`k_base\` (coverage's own contribution) is a piecewise-linear lookup table, three of five points
calibrated against REAL observed junior/senior spreads on a comparable live tranche market (not
invented): 0%→12.00x (extrapolated), 20.41%→7.02x (observed), 40.78%→1.94x (observed), 80%→1.85x
(interpolated, deliberately widened from ~1.50x), 100%→1.33x (observed). Severity then scales how much
of \`k_base\` actually applies, via a weight that never drops below 50% (\`COVERAGE_WEIGHT_FLOOR\`) and
reaches 100% once severity hits 8% (\`SEVERITY_REF\`). \`k\` is floored at 1.25x (\`K_MIN\`) so FFC's rate
can never equal FYC's, even at zero severity — FFC's own capital is still first-loss regardless.

Two new gates, both keyed on severity (replacing the old flat 80%-coverage floor): origination is
blocked above 50% projected severity (\`SEVERITY_GATE_MAX\`); FFC minting is blocked below 2% severity
(\`SEVERITY_MINT_FLOOR\`) — protection is already more than sufficient, more FFC would only dilute
existing holders.

Also fixed in this round: \`PERIODS_PER_YEAR\` — the live contract hardcoded \`/12\` for loan amortization
(implicitly a 30/360 day-count) while reserve-yield annualization already used a real 365-day year — two
different implicit calendars for the same word "period." A stated 15% APR loan was actually costing
~15.21% once measured consistently. Fixed by using \`365/30 ≈ 12.1667\` everywhere a rate crosses between
"per period" and "per year."

## Round 2 — redemption, tranche conversion, multi-yield-source

None of this exists in the live contract; it's a from-scratch addition.

- **Instant vs. scheduled redemption.** Instant (accelerated) redemption pays out immediately from a
  tranche's own ELB (Excess Liquidity Balance — idle reserve, net of outstanding loans and earmarked
  capital) share, at a liquidity-scaled fee — the closed-form integral of the marginal rate over the
  amount redeemed: \`fee = fee_min·amount + (fee_max−fee_min)·amount²/(2·elb_tranche)\` (see Round 4;
  an earlier endpoint-rate version of this formula was split-gameable and has been replaced). FYC's band
  (10-50bps) sits below FFC's (50-100bps) — junior liquidity is scarcer and riskier to hand out on
  demand. Scheduled redemption is the existing 30d(FYC)/90d(FFC) queue, no fee, priced conservative when
  it matures.
- **jr_to_sr / sr_to_jr** — the tranche-conversion primitive. Burns one tranche's tokens at ITS
  conservative price, mints the other's at ITS conservative price — V_pool is unchanged by construction.
  Used directly by the FFC-side redemption fee (fee-portion FFC burned, equivalent value minted as FYC
  into the fee wallets) — treasuries should never carry first-loss (FFC) exposure. Every redemption fee
  settles as FYC, split 50/50 protocol/insurance.
- **Earmarked loan capital** — capital reserved out of ELB the moment a loan hits the off-chain
  "equity received" pipeline stage, before it originates on-chain, so it can't be instantly redeemed out
  from under a committed loan. Carries an expiry so a forgotten cancellation can't permanently
  over-reserve capital.
- **Multi-yield-source registry** — extends the single registered reserve token into a full registry of
  \`YieldSourceState\` PDAs (USDY, syrupUSDC, or any future addition). Each tracks its own observed APY
  independently, read on-chain via a Pyth price feed (\`pyth_price_account\` per source) — never a
  client-supplied number. The pool-wide blended APY is capital-weighted across every source that still
  holds capital, ENABLED OR DISABLED (a disabled source is still earning real yield on whatever hasn't
  been unwound out of it yet — excluding it would understate the pool's actual return; only a
  zero-capital source drops out, for free). \`enabled\` only gates where NEW capital routes and which
  source unwinds first on redemption — a separate question from what the pool is earning right now. New
  capital routes to whichever enabled source lands the resulting blend closest to a [3%, 3.5%, 7%]
  target band.

## Round 3 — FYC APY cap, an optimistic-pricing timing bug, and a security review

**FYC APY cap.** An admin-configurable ceiling (\`max_fyc_apy_bps\` on \`PoolState\`, 0 = uncapped
sentinel, set via new instruction \`set_max_fyc_apy.rs\`) on FYC's TOTAL blended APY — loan interest and
reserve/yield-token yield combined. Enforced by throttling ONLY the loan-interest leg: every period,
whatever annualized headroom is left below the cap after subtracting FYC's reserve-yield share is how
much of the severity-curve's uncapped loan-interest share survives; everything above that redirects to
FFC — the same "FFC absorbs what FYC doesn't take" logic the whole curve already runs on. The
reserve/yield-token split itself is never touched — it stays the flat, risk-free, uncapped formula it's
always been.

**Bug found and fixed: optimistic price could read below conservative.** \`/simulator\`'s "Token price
over time" chart plotted, for each period, an optimistic (mint) price from a stale snapshot at the TOP
of that period (before that period's own mint/redeem activity), next to a conservative (redeem) price
measured at the END of the same period (after its yield had already landed) — two different moments
compared as one. Whenever a mid-period mint enlarged the base the ACTUAL yield collection used beyond
what the earlier estimate anticipated, conservative could read above optimistic — confirmed, dozens of
violations across 20 random seeds. Fixed by backfilling each period's displayed optimistic price from
the FOLLOWING period's pre-activity estimate — the same instant that period's conservative price was
actually measured at — instead of using its own now-stale one. Purely a display/measurement fix; the
actual mint-pricing logic (which prices a same-period mint using that period's own pre-activity
estimate) is unchanged.

**Security review finding: a real exploit in the cap's first fix, found and fixed.** The initial fix for
the "8% cap showed 8.7%" bug measured the cap's dollar ceiling against \`fycStart\` (FYC's balance at the
top of the period) — correct for the MINT case, but exploitable in the mirror direction: a large
same-period FYC REDEMPTION shrinks the balance AFTER the ceiling is sized against the larger pre-redeem
\`fycStart\`, so that dollar amount lands on the smaller post-redeem balance — handing whoever stays a
true per-token rate far above the cap. Confirmed via direct simulation: a 3% cap produced an 8.82% true
annualized rate for remaining holders after a large same-period FYC redemption. Fixed by using
\`Math.min(fycStart, fyc)\` as the cap's basis — always the SMALLER of what FYC started the period with
and what it ends mint/redeem activity with, closing both directions at once. Confirmed the real Rust
proposal was never vulnerable to either direction of this: \`distribute_loan_interest\` reads
\`fyc.v_tranche\` exactly once, synchronously, within a single \`repay_loan.rs\` instruction call — the
same read computes the ceiling AND applies the result, so there's no earlier/later snapshot gap to
exploit, even across a multi-instruction atomic transaction.

Also hardened during that review: \`set_max_fyc_apy.rs\` originally accepted any \`u64\` for the new cap
value with no bound — a value near \`u64::MAX\`, combined with a large \`fyc.v_tranche\`, could push
\`distribute_loan_interest\`'s \`u128\` intermediate uncomfortably close to overflow. Fixed by adding
\`MAX_FYC_APY_BPS\` (100,000 bps = 1,000% APY, far above any real use) to \`constants.rs\` and rejecting
anything above it.

Two more findings from that same review were investigated and explicitly NOT changed, because they're
not code bugs: (1) an extreme mint into a near-empty FYC balance can make the displayed
\`fycApyAnnualized\` read misleadingly high — confirmed this is a display-ratio artifact, not a
value-extraction path, since the reserve-yield leg is deliberately uncapped and the underlying dollars
are still a fair pro-rata split; (2) the cap's accuracy depends on \`run_yield_epoch\` being called
regularly to keep \`last_observed_base_apy_bps\` fresh — an operational/liveness risk, not an exploit,
since only an admin/keeper controls that cadence.

## Round 4 — external security review: parameter decision, real value-destruction bugs fixed

**Decision: \`SEVERITY_GATE_MAX\` set to 50%**, not the 20% used everywhere before this round — chosen
for capital efficiency (a larger gate supports more loan book per dollar of FYC). Both
\`lib/model.ts\` and the Rust proposal's \`constants.rs\` are updated together; nothing else about the
gate's mechanics changed.

**Fixed: severity gate failed OPEN, not closed, when FYC was zero.** \`severityOf\`/\`severity_bps\`
returned severity 0 (reads as "fully safe") whenever \`FYC == 0\`, which let
\`assert_origination_allowed\` pass unconditionally for a wiped or uninitialized senior tranche — the
exact opposite of fail-closed. Fixed everywhere severity is computed (\`lib/model.ts\`,
\`helpers/coverage.rs\`, \`helpers/tranche_convert.rs\`, \`helpers/waterfall.rs\`): if outstanding is
already fully covered by FFC alone, severity is genuinely 0; otherwise there's FYC-side exposure with
no FYC to absorb it, so severity now returns the maximum representable value, guaranteed to trip every
gate that reads it.

**Fixed: FFC accelerated-redeem fee accounting was double-subtracting real value.** The proposed
\`accelerated_redeem.rs\` removed a redemption's full \`gross_usd\` from \`ffc.v_tranche\` up front, then
called \`jr_to_sr\` for the fee portion — which removed that same fee value from \`ffc.v_tranche\` AGAIN
(and over-reduced \`ffc.total_supply\` to match), while only crediting FYC once. Net effect: fee value
was destroyed from NAV on every FFC-side accelerated redemption with a nonzero fee. Fixed by removing
only the investor's net payout up front and letting \`jr_to_sr\` handle the fee's single conversion —
see \`helpers/tranche_convert.rs\` and \`instructions/accelerated_redeem.rs\`.

**Fixed: \`jr_to_sr\`/\`sr_to_jr\` mutated state before validating it.** Both functions wrote to
\`fyc\`/\`ffc\` FIRST and checked severity/mint-floor validity AFTER — since both are \`&mut\` references,
an early \`Err\` return did NOT undo those writes. Combined with the bug above, a rejected fee
conversion inside \`accelerated_redeem.rs\` (which doesn't propagate \`jr_to_sr\`'s error) left both
tranches in a half-applied state: value moved, \`total_supply\` inflated, but no tokens actually minted
to match. Fixed by validating every check (severity gate, mint floor, and the new ELB-vs-pending check
below) against local copies first, only writing \`fyc\`/\`ffc\` once every check has passed. A rejected
fee conversion's value is now parked in the new \`TrancheState.suspense_fee_value\` field instead of
silently vanishing — a permissionless sweep instruction to retry it is flagged as follow-up work, not
implemented in this excerpt.

**Fixed: \`jr_to_sr\`/\`sr_to_jr\` didn't re-check pending redemptions after converting.** A conversion
instantly reweights each tranche's share of ELB and could pass its own severity/mint-floor check while
stranding an already-queued FYC or FFC redeemer behind insufficient post-conversion liquidity. Both now
require \`elb_fyc >= pending_fyc_redemptions\` and \`elb_ffc >= pending_ffc_redemptions\` after the
conversion, alongside the existing checks.

**Fixed: the premium curve used raw FFC while the origination gate used \`effective_ffc\`.** The gates
already netted out \`pending_ffc_redemptions\` before this round; \`distribute_loan_interest\`
(\`helpers/waterfall.rs\`) and the simulator's equivalent (\`lib/simulate.ts\`) did not — so a large
queued FFC exit made the gate correctly see thinner protection while the curve kept paying FFC as if
the full buffer were still there. Both now read \`effective_ffc\` for the risk inputs that set \`k\`; the
actual revenue-split weighting still uses the real \`ffc.v_tranche\`, since that's the capital actually
earning today's interest.

**Fixed: the instant-redemption fee formula was split-gameable.** The endpoint-rate formula
(\`fee_bps = fee_min + (amount/elb_tranche) × (fee_max−fee_min)\`, applied flat to the whole amount) let
someone reduce their average fee by splitting one redemption into several smaller ones against the
same \`elb_tranche\` (probe: one \$50K redeem at \$100K ELB paid \$150; two \$25K redeems at the same ELB
paid \$100 total). Replaced with the closed-form integral of the same marginal rate — see Key formulas
below — in both \`lib/model.ts\` and \`helpers/liquidity.rs\`.

**Fixed: the insurance floor checked the wrong wallet.** \`assert_origination_allowed\`'s insurance-floor
check read \`ffc.insurance_token_balance\`, but the new three-tier default waterfall
(\`helpers/waterfall.rs\`) burns FYC held in the insurance wallet, not FFC. The floor now reads
\`fyc.insurance_token_balance\`, matching what the waterfall actually burns.

**Compile-fix:** an extra closing brace in the proposed \`helpers/waterfall.rs\` text, right after the
new \`apply_default_waterfall\`, would have ended the module early and left every function after it
syntactically invalid. Removed.

**Not fixed in this round, flagged as pre-existing/out of scope (fixed round 6 — see below):**
\`compute_v_pool\` double-counted a default (\`approve_default.rs\` both shrinks \`outstanding_principal\`
and grows \`realized_losses\`, and \`compute_v_pool\` subtracted both) — pre-existing in the real contract, not
introduced by this redesign. Timelocks on admin parameters and permissionless
keepers for liveness-critical instructions (\`run_yield_epoch\`, \`flag_pending_default\`,
\`sweep_expired_earmark\`) remain unimplemented design suggestions, not code to hand off. A near-zero FFC
passing the severity gate (e.g. \$1k FFC "protecting" a large loan book) was reviewed and is an
INTENTIONAL design decision, not a bug — severity is the sole hard gate; the coverage-driven premium
curve (verified: k ≈ 12× at ~0.2% coverage) is the deliberate self-correcting incentive for more FFC
capital to arrive, not something a floor should block.

## Round 5 — loan lifecycle: grace, cure & default

Built from a live design discussion, not a security review — see \`/loan-lifecycle\` for the full
writeup with worked examples. Replaces the old admin-flagged \`DELINQUENT\`/\`PENDING_DEFAULT\` staging
with something entirely time-derived: **GRACE** starts automatically the instant a payment is missed
(no bump, still counted toward optimistic pricing), **CURE** starts automatically 15 days later (APR
bumped 1.25x, excluded from optimistic pricing), and **DEFAULTED** fires automatically 15 days after
that — 30 days total, deliberately equal to one payment period, so a loan is never more than one
payment behind when it defaults. None of these transitions need a stored status change except the
final one; \`repay_loan.rs\` and the new \`finalize_default.rs\` both compute "what stage would this
loan be in right now" fresh, off \`Clock\` vs \`LoanAccount.next_payment_due_ts()\`.

The CURE charge is true declining-balance interest at the bumped rate minus the same at the loan's
real rate, for one period, off the actual outstanding balance — pure interest, added on top of
\`levelized_interest\` without ever touching \`principal_portion\`, so a late payment never distorts the
payoff schedule. At default, \`owed_at_default = current_balance + levelized_interest + cure_fee\` is
computed once and never touched again — the accrued-but-uncollected interest for the loan's final
unpaid period is folded into what's owed rather than written off.

A \`DEFAULTED\` loan then sits indefinitely until one of three first-come-first-served paths resolves
it (a \`RESOLVED\` status enforces mutual exclusion — whichever lands first wins): **resell** (admin
supplies actual sale proceeds; loss = \`max(0, owed_at_default − recovery)\`, surplus back to the
borrower if recovery exceeds what was owed); **relist** (the same collateral becomes a new loan for a
new or the same borrower — no swap/disbursement leg, since there's no fresh cash to hand anyone; the
new principal directly replaces \`owed_at_default\`, only a shortfall is a real loss); or **IOU — NOT
SUPPORTED IN V1** (no instruction exists; a revenue-share instrument with no fixed schedule, scoped only
to already-defaulted loans if it's ever built, deferred as its own separate design conversation). A
DEFAULTED loan resolves via resell or relist only until that changes. Both resell and relist
route any real loss through the same insurance-first three-tier waterfall (FFC → insurance-held FYC →
general FYC) already fixed elsewhere in this redesign — see \`helpers/waterfall.rs\`.

\`approve_default.rs\` and \`record_recovery.rs\` are deprecated (their \`ix_tag\` discriminants, 7 and 8,
stay registered but now dispatch to stubs that always error) — superseded by \`resell_defaulted_loan.rs\`,
which measures loss against actual recovery instead of an arbitrary admin-typed \`confirmed_gross_loss\`
with zero on-chain tether to reality. \`flag_pending_default.rs\` is renamed to \`finalize_default.rs\`
in place (\`ix_tag\` discriminant 6 unchanged) and made fully permissionless — every check is a
deterministic \`Clock\` read, so there's no privileged judgment left to gate behind an admin.

**Explicitly flagged assumptions, not confirmed decisions:** relist closes the old loan and originates
the new one atomically, in one instruction (the alternative — two separate transactions — was
discussed and not settled); relist still re-clears \`assert_origination_allowed\`'s severity gate even
though no new external risk capital is technically being added; the 1% origination fee charged on
relist (\`ORIGINATION_FEE_BPS\`) is this protocol's first real on-chain implementation of a fee that
previously only existed in \`lib/model.ts\` as \`ORIGINATION_FEE_FRACTION\`, worth explicit sign-off
before treating it as settled for normal originations too.

## Round 6 — multi-source pricing + the default double-count, fixed together

Two bugs in the real, currently-deployed \`helpers/pricing.rs\` — confirmed by pulling and quoting the
real file (it had never been added to this handoff before; every prior reference to \`compute_v_pool\`
across this design was a call site with no defined body here) — decided and fixed in the same pass,
since both live in the same two functions.

**Decision 1 — drop the double-counted \`− realized_losses\` term.** \`approve_default.rs\` already
shrinks \`outstanding_principal\` by a defaulted loan's balance AND separately grows
\`realized_losses\` by the same loss; the old \`compute_v_pool\`/\`compute_v_pool_true\` subtracted both,
permanently understating every tranche price after any default that wasn't fully recovered. Fixed by
dropping the \`realized_losses\` READ from both pricing functions. The field itself is unchanged — still
written by \`resell_defaulted_loan.rs\`/\`relist_defaulted_loan.rs\` — now kept purely as an
analytics-only lifetime-losses counter.

**Decision 2 — "pass all accounts."** \`compute_v_pool\` only ever summed the primary reserve's
\`c_tokens\`; every additional registered \`YieldSourceState\`'s real capital was invisible to TVL, the
loan-allocation cap, and the optimistic-price split denominator. Chosen fix, over a running-total
checkpoint alternative: both \`compute_v_pool\` and \`compute_v_pool_true\` now take an explicit
\`sources\`/\`source_prices\` slice and sum across all of them. New \`load_other_sources\` (in
\`helpers/allocation.rs\`) reads that slice off a trailing \`(yield_source, oracle)\` account pair per
additional source, appended to \`deposit.rs\`, \`deposit_yield_token.rs\`, and \`run_yield_epoch.rs\`
(which also gains an explicit \`mode\` byte in its instruction data, since accounts-array length alone no
longer disambiguates its two branches once a variable-length tail is allowed).

**The alternative that was passed over, written up on request, not wired in:** a pool-wide
\`reserve_value_checkpoint\` running total, refreshed incrementally at whichever single source changed —
the same shape as the \`loan_accrual_rate\`/checkpoint/updated_ts pattern already shipped for loan
interest. Trades "every call pays for extra accounts + oracle reads" for "every future capital-moving
call site must remember to bump the checkpoint or silently reintroduce drift, with no compiler error to
catch the omission." See \`helpers/reserve_checkpoint_sketch.rs\` on \`/code-diff\` — deliberately excluded
from \`helpers/mod.rs\`, a design memo with real signatures attached, not shipped code.

TS mirror: \`totalReserveCapital\`/\`totalReserveGrossYieldThisPeriod\` in \`lib/model.ts\`, now the shared
implementation behind \`/optimistic-price\` (previously duplicated inline on that page); the
\`realized_losses\` double-count has no TS-side equivalent to fix, since the simulator already reduces
\`fyc\`/\`ffc\`/the loan book directly at default time with no second ledger to double-subtract. Pinned by
two new \`lib/verify.ts\` checks (multi-source sum correctness + order-independence; default loss applied
exactly once).

## Round 7 — closing the two P0s an end-to-end review found

A new \`END_TO_END_PROTOCOL_SIMULATION.md\` walked every lifecycle path (genesis, deposit, epoch,
origination, repayment, mid-period mint, redemption, conversion, default, multi-source portfolio) and
scored each WORKS / FRAGILE / BREAKS / GAP / DECISION. Two findings were verified against the actual code
(not just the spec) and fixed; a third was checked and confirmed already fine; a fourth was checked and
confirmed not actually live in \`files-data.ts\`.

**Fixed: optimistic yield_estimate was still single-source.** Round 6 fixed \`compute_v_pool\`'s TVL sum
(the split *denominator*) to cover every registered source, but \`compute_optimistic_price\`'s
yield-delta term (the *numerator*) stayed scoped to whichever one source a given deposit targeted —
depositors were under-credited for every OTHER source's real unrealized appreciation. Fixed by summing
every source's own delta: primary's reads straight off \`PoolState\` (\`c_tokens\` vs
\`last_base_yield_token_price\`/the live price), every other source's off its own entry in the
\`other_sources\`/\`other_source_prices\` slice already threaded through for round 6. The now-redundant
\`source_c_tokens\`/\`source_last_price\`/\`source_price_now\` params are gone from the signature entirely —
both call sites (\`deposit.rs\`, \`deposit_yield_token.rs\`) updated to match.

**Fixed: resell never actually moved the recovered cash into the pool.** \`resell_defaulted_loan.rs\`
computed surplus-out and deficit-waterfall correctly, but \`recovery_amount\` itself was only ever a
number in instruction data the admin asserted — no transfer ever moved it into \`deposit_vault\`.
\`outstanding_principal\` dropped by the full loan balance regardless, so the books marked the debt
collected without any cash landing — a real value-leakage path, not just an "under-specified" gap as
first characterized. Fixed by adding \`admin_proceeds_acc\` (holding the actual, already-converted sale
proceeds) and an unconditional \`Transfer\` of the full \`recovery_amount\` into \`deposit_vault\`, before the
existing surplus/deficit branch.

**Checked, no fix needed:** \`relist_defaulted_loan.rs\` already does real transfers for \`equity_amount\`
and the origination fee; \`new_principal\` is bookkeeping that replaces \`owed_at_default\`, not cash needing
to move immediately — same as any origination's principal. **Checked, not a live defect:** the "old
\`compute_v_pool\` mixed with new writers" deploy-mixing risk — every \`proposed\` call site in
\`files-data.ts\` already uses the round-6 signature; this stays a real rollout-sequencing caution for
whoever ships the handoff, not something more code here can fix.

## Round 8 — findings-verification response + greenfield cleanup

A follow-up review (\`FINDINGS_VERIFICATION_2026-08-07.md\`) checked round 7's own "both P0s fixed" claim
against the actual code before accepting it, confirmed the two P0s genuinely were fixed, and then pushed
back on the broader claim of "addressed all findings" — several P1/P2/P3 items from the earlier reviews
were still open. It also surfaced a real constraint worth acting on: **nothing is deployed yet**, so this
handoff's backward-compatibility scaffolding (deprecation stubs, append-only discriminants, realloc +
backfill migration prose) was solving a problem that doesn't exist yet.

**Fixed: the P1 "optional multi-source tail."** Omitting the trailing \`(yield_source, oracle)\` account
pairs used to be a silently *valid* call, just priced against less than the pool's real total. New
\`helpers/allocation.rs::require_complete_source_list\` rejects (\`IncompleteYieldSourceList\`) any
\`deposit.rs\` / \`deposit_yield_token.rs\` / \`run_yield_epoch.rs\` call whose final source count falls
short of \`pool.yield_source_count\`.

**Greenfield cleanup, since first deploy = whatever gets frozen now:** \`approve_default.rs\` /
\`record_recovery.rs\` and their \`ix_tag\`s (7, 8) are removed outright rather than kept as
deprecation-stub instructions — \`InstructionDeprecated\` is gone from \`errors.rs\`, and slot 50 is
reused for \`IncompleteYieldSourceList\`. \`DELINQUENT\` / \`PENDING_DEFAULT\` loan-status values and
\`LoanAccount.delinquency_start_ts\` are removed rather than kept as inert compatibility fields — both were
already unused by any new code. \`run_yield_epoch.rs\`'s two branches are now framed as two permanent modes
(primary vs. source tick), not "backward compatible with the original 5-account form."

**Docs:** \`/open-questions\`' stale bullet describing the pre-round-5 admin-staged
\`flag_pending_default\`/\`approve_default\` flow is rewritten to describe the actual current gap
(permissionless \`finalize_default.rs\` still needs *someone* to call it during CURE) instead. IOU is now
explicitly labeled **"NOT SUPPORTED IN V1"** on \`/loan-lifecycle\` and here, rather than left as an
implicit "unspecified."

**Left open, correctly** — these are genuine ops/product decisions, not code gaps a Rust instruction
proposal resolves by itself: cure-accrual-without-a-keeper, earmark concurrency race, convert↔originate
atomicity, epoch/APY staleness for the FYC cap. \`tsc --noEmit\`, \`eslint\`, and \`npm run verify\` (19/19)
all pass.

## Key formulas (reference implementation: lib/model.ts)

\`\`\`txt
effective_ffc      = FFC − pending_ffc_redemptions   // nets out FFC already queued to leave — GATES ONLY
coverage           = min(1, FFC / outstanding)                    // curve/distribution: raw FFC, not effective_ffc
severity           = max(0, outstanding − FFC) / FYC   // FYC == 0: 0 if outstanding <= FFC, else fails closed (max)
// origination/mint gates use effective_ffc for THEIR OWN severity/coverage check instead (forward-looking:
// protects a NEW loan's whole future life against capital scheduled to leave) — distribute_loan_interest
// deliberately does not, since pending-redemption FFC is still fully at risk until actually paid out.
k                  = K_MIN + (k_base(coverage) − K_MIN) × weight
weight             = COVERAGE_WEIGHT_FLOOR + (1 − COVERAGE_WEIGHT_FLOOR) × min(1, severity / SEVERITY_REF)
ffc_share_of_loan  = (k × FFC) / (FYC + k × FFC)

grace_period_days  = 15   // no APR bump, still counted toward optimistic pricing
cure_period_days   = 15   // APR bumped 1.25x, excluded from optimistic pricing; +grace = 30 days total
cure_fee           = period_interest(current_balance, apr × 1.25) − period_interest(current_balance, apr)
owed_at_default    = current_balance + levelized_interest + cure_fee   // computed once, at finalize_default

reserve_apy         = fyc_reserve_share × PERIODS_PER_YEAR / fyc_apy_base
loan_apy_headroom   = max(0, MAX_FYC_APY − reserve_apy)
loan_share_ceiling  = loan_apy_headroom × fyc_apy_base / PERIODS_PER_YEAR
fyc_apy_base        = min(fycStart, fyc)   // the balance FYC started the period with, or ends
                                             // mint/redeem activity with — whichever is SMALLER

optimistic_price   = (v_tranche + loan_estimate + yield_estimate) / total_supply
conservative_price = v_tranche / total_supply

fee                = fee_min·amount + (fee_max − fee_min) × amount² / (2 × elb_tranche)   // split-invariant integral, not the old endpoint rate
blended_apy        = Σ(capital_i × apy_i) / Σ capital_i     (every source with capital > 0)
\`\`\`

## Full proposed source code for every changed file follows below.
Grouped by category (pinocchio on-chain program, backend, frontend). \`why\` explains the intent behind
each file; the code block is the PROPOSED target state (not a diff — see \`/code-diff\` in the design
tool for original-vs-proposed side by side).

`;

function fileToMarkdown(f: DiffFile): string {
  const statusLabel = f.status === 'U' ? 'NEW FILE' : 'MODIFIED';
  const suggestions = f.suggestions?.length
    ? `\n**Open follow-ups:**\n${f.suggestions.map((s) => `- ${s}`).join('\n')}\n`
    : '';
  const lang = f.path.endsWith('.rs') ? 'rust' : f.path.endsWith('.ts') || f.path.endsWith('.tsx') ? 'typescript' : '';
  return `### \`${f.path}\` — ${statusLabel} (${f.category})\n\n**Why:** ${f.why}\n${suggestions}\n\`\`\`${lang}\n${f.proposed.trim()}\n\`\`\`\n`;
}

function buildCodeMarkdown(category?: DiffFile['category']): string {
  const files = category ? FILES.filter((f) => f.category === category) : FILES;
  return files.map(fileToMarkdown).join('\n');
}

const CODE_ALL = buildCodeMarkdown();
const FULL_DOCUMENT = NARRATIVE + CODE_ALL;

/** Legacy fallback for browsers/contexts where the async Clipboard API
 * throws (e.g. NotAllowedError without a sufficiently "trusted" gesture) —
 * document.execCommand('copy') is deprecated but still broadly supported,
 * and being synchronous within the same click handler satisfies stricter
 * user-activation checks the async API sometimes doesn't. */
function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

function CopyButton({ label, getText, primary }: { label: string; getText: () => string; primary?: boolean }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <button
      type="button"
      onClick={async () => {
        const text = getText();
        try {
          await navigator.clipboard.writeText(text);
          setState('copied');
        } catch {
          setState(legacyCopy(text) ? 'copied' : 'failed');
        }
        setTimeout(() => setState('idle'), 2500);
      }}
      style={{
        padding: primary ? '12px 20px' : '8px 14px',
        borderRadius: 8,
        border: primary ? 'none' : '1px solid var(--border-strong)',
        background: state === 'failed' ? 'var(--critical-wash)' : primary ? 'var(--accent)' : 'var(--surface-2)',
        color: state === 'failed' ? 'var(--critical)' : primary ? 'var(--accent-contrast, #fff)' : 'var(--text-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: primary ? 14 : 12.5,
        fontWeight: primary ? 700 : 500,
        cursor: 'pointer',
      }}
    >
      {state === 'copied' ? '✓ Copied to clipboard' : state === 'failed' ? '⚠ Copy blocked — select text in Preview below' : label}
    </button>
  );
}

export default function LlmHandoffPage() {
  const charCount = FULL_DOCUMENT.length;
  const approxTokens = Math.round(charCount / 4);

  return (
    <>
      <PageHeader
        eyebrow="LLM handoff"
        title="Copy this whole design to another LLM"
        lede="One document, generated straight from this tool's own data (never hand-duplicated, so it can't drift) — the full narrative of what changed and why across every round, plus the complete proposed source for every file. Paste it into a fresh conversation and it has everything needed to understand or implement this redesign, with no other context required."
      />

      <Card>
        <h3 style={{ marginTop: 0 }}>Copy everything</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {`~${charCount.toLocaleString()} characters (~${approxTokens.toLocaleString()} tokens) — narrative + all ${FILES.length} changed files' proposed source.`}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <CopyButton label="📋 Copy full handoff (narrative + all code)" getText={() => FULL_DOCUMENT} primary />
          <CopyButton label="Copy narrative only" getText={() => NARRATIVE} />
          <CopyButton label="Copy all code only" getText={() => CODE_ALL} />
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Copy by category</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Narrower copies, if the full handoff is more than you need — e.g. handing an implementer just the
          on-chain program changes.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <CopyButton
            label={`Copy pinocchio (on-chain) — ${FILES.filter((f) => f.category === 'pinocchio').length} files`}
            getText={() => NARRATIVE + buildCodeMarkdown('pinocchio')}
          />
          <CopyButton
            label={`Copy backend — ${FILES.filter((f) => f.category === 'backend').length} files`}
            getText={() => NARRATIVE + buildCodeMarkdown('backend')}
          />
          <CopyButton
            label={`Copy frontend — ${FILES.filter((f) => f.category === 'frontend').length} files`}
            getText={() => NARRATIVE + buildCodeMarkdown('frontend')}
          />
        </div>
      </Card>

      <Callout tone="default" >
        <b>Why this works reliably for an LLM:</b> the narrative above and the code below are generated from
        the SAME underlying data every other page in this tool reads from (<code>app/code-diff/files-data.ts</code>,{' '}
        <code>lib/model.ts</code>) — there&rsquo;s no separate, hand-maintained copy that could quietly drift out of
        sync with what <Link href="/code-diff">/code-diff</Link>, <Link href="/glossary">/glossary</Link>, and{' '}
        <Link href="/latex">/latex</Link> actually show.
      </Callout>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Preview</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>The exact text the buttons above copy — scroll to read the whole thing.</p>
        <pre
          style={{
            maxHeight: 500,
            overflow: 'auto',
            fontSize: 12,
            lineHeight: 1.6,
            padding: 16,
            background: 'var(--surface-2)',
            borderRadius: 8,
            border: '1px solid var(--border)',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {FULL_DOCUMENT}
        </pre>
      </Card>
    </>
  );
}
