# FYC/FFC Yield Distribution Redesign — Proposal

> ## ⚠️ SUPERSEDED — historical record only, do not implement from this document
>
> This is the **original** proposal, written before the design introduced **severity** as a
> concept at all. Everything below describes a coverage-only curve that keeps the old flat
> **80% coverage gate** (§2, §4) — that decision has since been **reversed**. The current design
> replaces the 80%-coverage gate with a **severity-based gate** (`assert_origination_allowed`:
> blocks origination when projected severity exceeds `SEVERITY_GATE_MAX`, currently **50%**), adds
> a second new gate (`assert_mint_allowed`, blocks FFC minting below `SEVERITY_MINT_FLOOR`), and
> the coverage→premium curve itself is scaled by severity, not read directly as the FFC share.
>
> **If you are implementing this redesign, do not use this document as the spec.** The
> current, authoritative source is generated fresh from the design tool's own data and cannot
> drift from what the tool shows: use **`/llm-handoff`** in the design tool (or
> `app/code-diff/files-data.ts` for code + `lib/model.ts`/`lib/simulate.ts` for the reference
> math directly). This document is kept only as a record of the design conversation that led
> here — see `/changes` in the design tool for what changed and why, round by round, since this
> was written.
>
> Sections directly contradicted by the current design: **§2** (the 80% gate "is not being
> removed" — it was), **§4** (the reasoning for keeping the flat 80% gate — superseded by the
> severity gate), **§5** (coverage-only curve, no severity scaling), **§6.3** (worked numbers
> computed at 15%/8% loan APR against the old 80% gate, not the current 50% severity gate).

Status: **design proposal, not yet implemented.** Nothing in this document has been written into the program. It's a record of the design conversation and the decisions reached, intended as the spec to implement against.

## 1. Motivation

The current loan-interest distribution in `distribute_loan_interest` ([helpers/waterfall.rs](../src/helpers/waterfall.rs)) gives FYC an absolute, capped monthly target and gives FFC whatever's left over:

```rust
let fyc_target = mul_div_u64(fyc.v_tranche, cap_diff_bps, BPS_DENOMINATOR * 12)?;
let fyc_share = fyc_target.min(split.net_yield);
let ffc_share = split.net_yield.saturating_sub(fyc_share);
```

This has two concrete failure modes, both demonstrated numerically during design (see §6):

1. **FFC can earn exactly $0.** If a given month's net loan interest doesn't even cover FYC's target, FYC takes all of it and FFC gets the residual — zero. This happened for 16 of the 36 months in a worked example of a single amortizing loan, purely because loan interest declines every month as the loan pays down (standard amortization), even with no defaults involved.
2. **No relationship between FFC's yield and the risk it's actually taking on.** FFC is the first-loss tranche — it's supposed to earn a premium proportional to how thin its protection is relative to the loan book. The fixed-target model has no such relationship; FFC's share is just "whatever's left."

The redesign replaces the fixed-target/residual split with a **coverage-based curve**, modeled on how Exponent Finance (a comparable Solana tranching protocol) splits yield between its Senior and Junior tranches — verified against Exponent's live production market (`ONyc`) during this design process, not just their docs.

## 2. What stays exactly as-is

- **`assert_origination_allowed`** ([helpers/coverage.rs](../src/helpers/coverage.rs)) — the hard gate blocking new loan origination when `effective_ffc / outstanding_principal < 80%` (`FFC_COVERAGE_NUMERATOR`/`FFC_COVERAGE_DENOMINATOR`). **This is not being removed.** It was considered and explicitly rejected — see §4. **[SUPERSEDED — see banner at top: this gate WAS later replaced, by a severity-based one, not removed outright. Do not implement the flat 80% gate from this section.]**
- **`split_base_yield_token_yield`** ([helpers/waterfall.rs](../src/helpers/waterfall.rs)) — the USDY/reserve-appreciation yield split stays flat pro-rata by tranche size. The curve described here applies **only** to loan interest, not to this yield source. (A pool-share-based curve for this stream was discussed and explicitly deferred — see §7.)
- **`mint_fee_value_into_fyc`** ([helpers/fees.rs](../src/helpers/fees.rs)) and the 85/15 net/fee split (`split_gross_yield`) — unchanged. The 15% fee still mints new FYC tokens split 2:1 protocol:insurance, on both yield streams, exactly as today.
- **`apply_default_waterfall`** ([helpers/waterfall.rs](../src/helpers/waterfall.rs)) — the loss side (FFC absorbs losses first, FYC only after FFC is exhausted) is unchanged and was confirmed to already match Exponent's own loss-waterfall design.

## 3. The coverage formula

### 3.1 Definition

```
coverage = min(1, effective_ffc / outstanding_principal)
```

Capped at 100%. This is deliberately **not** the same formula Exponent uses (`junior / (senior + junior)`). The two protocols have different loss mechanics:

- **Exponent's underlying asset (ONyc) can decline in value across the whole pool** — a price drop is proportional to Senior + Junior combined, so `junior/(senior+junior)` correctly answers "what % decline can Junior absorb before Senior is touched."
- **Our loss event is a loan default**, which only threatens that loan's own principal — nothing else. The relevant "total at risk" is the outstanding loan, not FFC + outstanding combined.

`coverage = min(1, FFC/outstanding)` directly answers the question we actually care about: **if this loan defaulted entirely, what fraction of that loss would FFC absorb before FYC takes any?**

- FFC $400K, loan $100K → coverage = 100% (capped). FFC could absorb the entire loan defaulting and have $300K left over.
- FFC $400K, loan $500K → coverage = 80%. FFC absorbs $400K of a total default; the remaining $100K would hit FYC.

### 3.2 Relationship to the existing gate

The gate's check (`effective_ffc/outstanding >= 80%`) and this coverage formula are **the same ratio** for every value the gate would actually allow (≤ 100% doesn't change the comparison — capping only affects values that already pass). The gate does not need to change at all; the new curve just reads the same underlying number the gate already computes.

### 3.3 A property worth knowing before choosing curve breakpoints

Because coverage is capped at 100%, **it stays pinned at exactly 100% for the entire range where FFC ≥ outstanding_principal**, and only starts falling once the loan book grows past FFC's own size. In a $600K FYC / $400K FFC pool, that means coverage is flat at 100% from $0 up to $400K of outstanding loans (40% of the pool), and only moves from 100% down to the 80% gate floor across the last $100K (the 40%→50% deployment window). This is not a bug — it's the direct, correct consequence of a properly-capped percentage metric — but it means most of a curve's "interesting" behavior is compressed into the last stretch before the gate, which should inform how breakpoints are spaced.

### 3.4 Rejected alternative: a separate "utilization" transform

An earlier draft of this proposal defined `utilization = coverage_floor / coverage` as an inverted intermediate variable (mirroring Exponent's own terminology) and built the curve on *utilization* instead of *coverage* directly. This was dropped as an unnecessary layer of indirection — it added confusion without adding anything the direct coverage-based curve couldn't do just as well. **The final design curves FFC's yield share directly against coverage, no separate utilization concept.**

## 4. Why the origination gate is not being removed

This was explicitly proposed and rejected during design. The reasoning:

- **Exponent itself keeps a hard cap alongside its curve.** Their Junior tranche was observed at "$0 capacity left" while Senior still had capacity — a hard deposit cap that exists specifically so Senior can't dilute coverage below the protocol's floor, even though the curve is simultaneously creating an economic incentive to prevent exactly that. The curve didn't replace their floor enforcement; it's what makes the floor rarely worth hitting.
- **Our risk profile is worse for relying on incentives alone.** Exponent's curve pulls capital toward an already-liquid, freely-tradeable yield asset. Ours pulls capital toward the promise that new FFC minters will show up to backstop a book of real-world loan receivables. That's adverse selection territory — a thin, deteriorating coverage ratio is exactly the condition under which cautious capital is least likely to show up despite a high advertised APY. A hard gate bounds the worst case (`originate_loan` simply stops); an incentive curve alone does not.

**Conclusion: the curve is the soft pull toward healthy coverage; `assert_origination_allowed` remains the hard stop if the pull isn't enough or isn't fast enough.** They are complementary, not substitutes.

**[SUPERSEDED — see banner at top.]** The conclusion that a hard gate should stay held, but the gate itself later changed from flat-coverage to severity-based (`assert_origination_allowed` now blocks on projected *severity*, not coverage, against `SEVERITY_GATE_MAX`). The adverse-selection argument above for keeping *a* hard gate at all is still the current reasoning; the specific 80%-coverage mechanics described in this section are not.

## 5. The new curve

### 5.1 Anchor point — this is the key correction from earlier drafts

An early draft of the curve anchored its "calm" end (coverage = 100%) at an arbitrary low FFC share (e.g. 20%). **This was wrong**, and the correction matters:

Every dollar in the pool — FYC's or FFC's — is fungible capital that funds the same loans. There's no ring-fencing of "FYC's loans" vs "FFC's loans." That means FFC's capital is exposed to loan-default risk *exactly as much as* FYC's is, purely by sitting in the same pool, regardless of the coverage ratio. The coverage curve is only supposed to add a **premium on top of that shared exposure** for FFC's first-loss priority — it should never result in FFC earning *less* than plain proportional ownership would already give it.

The correct anchor at coverage = 100% is therefore:

```
ffc_share_at_full_coverage = ffc.v_tranche / (fyc.v_tranche + ffc.v_tranche)
```

FFC's live pool share — computed fresh every time, from actual on-chain tranche balances, **never a fixed constant.** At that anchor, the loan-interest split degenerates to exactly the same pro-rata split the reserve/USDY yield already uses — which is correct, because at 100% coverage there is nothing extra to compensate for.

### 5.2 No fixed genesis ratio

`FYC`/`FFC` are **not** meant to be maintained at any particular target split (e.g. 60/40). Genesis mints 1 unit of each tranche — a nominal technical bootstrap (avoiding a degenerate zero-supply state at initialization), not a meaningful economic allocation, putting the pool share formula at 50/50 on day one. The real capital structure is entirely demand-driven from whatever deposits and redemptions happen after that. Because §5.1's formula reads live tranche balances rather than any hardcoded ratio, it is already correct regardless of what that ratio turns out to be at any point in the pool's life — no code changes are needed to account for this, it was a confirmation of the formula's design, not a new requirement.

### 5.3 Curve shape

Piecewise-linear ("kinked"), not a continuous formula. This is a deliberate departure from replicating Exponent's exact hyperbola-shaped curve:

- Cheaper and simpler in Solana's fixed-point bps math (no division-heavy continuous formula — just linear interpolation between a handful of stored breakpoints).
- Easier to audit and reason about.
- Mirrors the well-established kinked-rate model used by on-chain lending markets (Aave, Compound): gentle slope in the normal operating range, steep slope only near the danger zone.

**Illustrative breakpoints from the worked example** (FFC's share of net loan interest, keyed on coverage — `pool_share` is the live §5.1 value, not a constant):

| Coverage | FFC share of net loan interest |
|---|---|
| 100% (fully covers the loan, or more) | `pool_share` (e.g. ~40-50%, live) |
| 80% (the gate floor) | 60% |
| 50% | 80% |
| 0% | 95% |

**These specific numbers past the 100% anchor are illustrative, not finalized.** They satisfied the checks run against them (see §6) but were not exhaustively tuned and should get explicit sign-off — particularly how steep the ramp should be between the gate floor (80%) and full exhaustion (0%), since that region is only reachable after origination has already happened and FFC has since shrunk (e.g. via losses or redemptions) — new loans can't be originated below 80% coverage, so this part of the curve only matters for existing exposure.

### 5.4 Formula summary, end to end

```
coverage        = min(1, effective_ffc / outstanding_principal)
ffc_share_pct   = interpolate(coverage, curve_breakpoints)   // curve_breakpoints as in §5.3
net_yield       = gross_loan_interest × 85%                   // unchanged split_gross_yield
ffc_share       = net_yield × ffc_share_pct
fyc_share       = net_yield − ffc_share
```

This replaces the `fyc_target`/residual logic in `distribute_loan_interest`; everything downstream of `net_yield` (fee minting, `cumulative_yield` bookkeeping) is unchanged.

## 6. Validation performed during design

All of the following were computed and charted during the design conversation to stress-test the formulas before proposing them as final. None of this is committed code — it's the evidence behind the decisions above.

### 6.1 The old model's failure mode, concretely

A $100,000 loan at 15% APR, 36-month standard amortization, run through the **current, unmodified** `distribute_loan_interest`: FFC's monthly share dropped to exactly $0 starting at month 20 and stayed there for the remaining 16 months of the loan's life — even with zero defaults. This is a natural consequence of amortization (interest declines every month as the loan pays down) combined with FYC's fixed absolute monthly target never adjusting downward until net interest is already below it.

### 6.2 Levelized interest recognition (a separate, complementary fix)

Proposed and validated independently of the curve: instead of feeding the true, declining per-month amortization interest into the distribution, recognize a **flat** monthly interest figure — `total interest over the loan's life ÷ term in months` — computed once from the amortization schedule at origination. This doesn't change what the borrower actually pays (same level payment throughout); it only changes how that payment is internally categorized into interest vs. principal for the purpose of pool distribution.

Applied to the same $100K/15%/36mo loan: FFC's share became a flat $22.94/month for the entire term, instead of cliffing from $500 down to exactly $0. This fixes the *timing* discontinuity but does not by itself fix the *magnitude* problem from §1's second failure mode — that required the coverage-curve redesign in §5.

### 6.3 Realistic yield assumptions

Re-run with 8% loan APR and 2.8% reserve/USDY APY (replacing the illustrative 15% used earlier), FYC $600K / FFC $400K, loan book swept from $0 to the $500K gate limit (80% coverage floor):

- **An early curve draft** (anchored at a low, arbitrary 20% FFC share) let FYC's blended APY peak at ~3.64% then *fall to 2.04%* at full utilization — **below** FYC's reserve-only baseline of 2.38%. This is the concrete problem that motivated the §5.1 pool-share anchor correction: a "protected" tranche should never end up worse off than not lending at all.
- **The pool-share-anchored curve** (§5.1's fix): FYC and FFC track identically while coverage sits at 100% (pure pro-rata, both rising together from 2.38% to ~4.15% as deployment grows from 0% to 40%), then FFC pulls ahead only once coverage genuinely degrades past that point — reaching 6.29% at the gate while FYC eases back to 3.46%, still comfortably above its 2.38% reserve floor throughout.

### 6.4 A found inconsistency, worth tracking separately

While validating deployment ranges: with FFC at a 40% pool share (an earlier illustrative snapshot, not a target — see §5.2) and the existing 80% coverage floor, the loan book is structurally capped at 50% of pool value before the gate trips — **not** the 80% that `LOAN_ALLOCATION_BPS` nominally allows. FFC would need to be at least 64% of the pool before the 80% allocation ceiling would ever bind instead of the coverage gate. This isn't something this proposal changes (coverage's dynamic, non-targeted nature per §5.2 means this isn't a fixed problem — it depends entirely on where FFC's share actually sits at any given time), but it's worth knowing: `LOAN_ALLOCATION_BPS` and `FFC_COVERAGE_NUMERATOR` interact, and one will bind before the other depending on live tranche composition.

## 7. Explicitly out of scope / deferred

- **A pool-share-based curve for `split_base_yield_token_yield`** (the USDY/reserve yield split). A "pool coverage" metric (`FFC/(FYC+FFC)`, the direct Exponent analog) was discussed as a candidate for this — it would be the more literal Exponent-style application, since that yield source, like Exponent's, is pool-wide with no loan-specific risk in it. Explicitly deferred per direction to scope this round of changes to loan interest only.
- **Recovery Period / Settlement**, Exponent's two-tier loss handling (a partial loss that stays above a settlement threshold pauses Senior's yield and freezes redemptions for a recovery window, rather than immediately finalizing the loss). We don't have an equivalent — `apply_default_waterfall` finalizes losses immediately. Not decided whether to pursue; noted as a possible future addition to the loss side, symmetric to what this proposal does for the yield side.
- **Final curve breakpoint values** past the pool-share anchor (§5.3) — illustrative and validated against the scenarios in §6, but not exhaustively tuned or signed off.

## 8. Implementation surface (for whoever picks this up)

Files that would need changes:

- **`helpers/waterfall.rs`** — `distribute_loan_interest` loses the `fyc_target`/residual logic, gains the coverage-curve lookup from §5.4. `build_snapshot`'s `cap_diff_bps`/`fyc_monthly_loan_target` fields in `allocation.rs` become unused by this function specifically (still used elsewhere for `compute_optimistic_price`; check before removing).
- **New: a curve/interpolation helper** (e.g. `helpers/curve.rs`) — piecewise-linear interpolation over fixed-point bps breakpoints, taking `coverage_bps` and returning `ffc_share_bps`. Breakpoints as constants, per §5.3.
- **`instructions/repay_loan.rs`** — if levelized interest (§6.2) is adopted alongside the curve, the loan's flat monthly interest figure needs to be computed once (likely at `originate_loan` time, from `compute_monthly_payment` and the full amortization schedule) and stored on `LoanAccount`, rather than recomputed via `period_interest` on every repayment.
- **`helpers/coverage.rs`** — no changes. `assert_origination_allowed` is reused as-is; the new curve reads the same ratio it already computes.
- **`helpers/fees.rs`**, **`apply_default_waterfall`** — no changes.
