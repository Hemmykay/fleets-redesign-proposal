/**
 * Core protocol math for the FYC/FFC yield-distribution redesign.
 *
 * This is the single source of truth for every formula used across the
 * glossary, explorer, validation, and simulator pages — nothing here is
 * duplicated in a component. Doc comments follow the ASCII-fraction style
 * used in Hylo's `hylo-core` crate (ratios rendered as a stacked fraction),
 * since the plan is to eventually mirror this file's functions 1:1 as a
 * shared Rust crate — see /implementation.
 *
 * All money amounts are plain numbers (USD), not fixed-point integers —
 * this is a modeling/design tool, not the on-chain program. The Rust
 * port would use `u64`/`u128` with explicit floor/ceil `mul_div`, exactly
 * as flagged on /implementation.
 */

// ---------------------------------------------------------------------------
// Time — the ONE place SECONDS_PER_PERIOD/SECONDS_PER_YEAR are defined.
// Previously duplicated in lib/simulate.ts as a separate copy; moved here so
// amortization (below) and yield annualization (lib/simulate.ts, which now
// imports these) can never silently drift onto two different definitions of
// "how many periods in a year" — see the PERIODS_PER_YEAR note and
// /open-questions for the real bug this fixes.
// ---------------------------------------------------------------------------

export const SECONDS_PER_DAY = 86_400;
/** Every repayment/epoch period is a fixed 30 days — SECONDS_PER_PERIOD in
 * the real contract — never a calendar month. */
export const SECONDS_PER_PERIOD = 30 * SECONDS_PER_DAY;
export const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;
/** Periods per year, EXACT — 365/30 ≈ 12.1667, not a flat 12. A 30-day
 * period is not 1/12 of a 365-day year (12 periods is only 360 days), so
 * treating it as one silently overstates every per-period rate relative to
 * its stated annual figure once actually annualized. This constant is used
 * for BOTH loan-interest amortization (below) and yield-source APY
 * annualization (lib/simulate.ts) — before this fix, amortization used a
 * hardcoded /12 (implicitly a 30/360 day-count) while yield annualization
 * already used this exact 365-day figure, a real, confirmed inconsistency:
 * the real contract's compute_monthly_payment/period_interest (mirrors
 * helpers/amortization.rs) both hardcode "/ 12", while
 * observed_source_apy_bps already annualizes against a real 365-day year.
 * A stated "15% APR" loan was actually costing borrowers ~15.21% once
 * measured against a true calendar year (15% × 12.1667/12) — small
 * (≈1.4% relative), systematic, and asymmetric with the yield side's own
 * convention. Fixed here by using this SAME constant everywhere a period
 * gets annualized or de-annualized, loan interest included. See
 * /open-questions for the alternative (30/360 is also a common, legitimate
 * day-count convention) — this wasn't an obvious bug so much as a choice
 * nobody had made consistently yet. */
export const PERIODS_PER_YEAR = SECONDS_PER_YEAR / SECONDS_PER_PERIOD;

/** Fee taken off gross yield before any tranche split. 15% fee / 85% net. */
export const NET_YIELD_FRACTION = 0.85;

/** LOAN_ALLOCATION_BPS — max fraction of total pool value deployable as loans. */
export const ALLOCATION_CEILING_FRACTION = 0.8;

/**
 * Premium-multiplier breakpoints (k_base), keyed on coverage%.
 * A piecewise curve built from real observed Junior/Senior APY ratios at
 * three different coverage levels, plus one interpolated point at our own
 * gate and one extrapolated tail. Illustrative beyond the two most-anchored
 * points closest to the top — not exhaustively tuned.
 */
export const K_BREAKPOINTS: { cov: number; k: number; note: string }[] = [
  { cov: 0, k: 12.0, note: 'extrapolated tail, beyond the observed range' },
  { cov: 20, k: 7.02, note: "observed @ coverage 20.41% — junior 34.18% / senior 4.87%" },
  { cov: 41, k: 1.94, note: "observed @ coverage 40.78% — junior 15.91% / senior 8.22%" },
  { cov: 80, k: 1.85, note: 'interpolated — widened from 1.50 so the "normal operating" band (80-100% coverage) still pays a real premium, not a token one' },
  { cov: 100, k: 1.33, note: "observed @ coverage 99.90% — junior 11.67% / senior 8.75%" },
];

/** Absolute floor on the premium multiplier — FFC's own capital is still
 * first-loss regardless of severity, so k never collapses to 1 (parity).
 * Raised from 1.10 → 1.25: the old floor made the FYC/FFC spread nearly
 * invisible in the common near-zero-severity state. Kept ≤ the smallest
 * stored k_base (1.33 @ 100% coverage) so k stays non-decreasing in
 * severity everywhere — never lower it past that without also revisiting
 * the 100% breakpoint. */
export const K_MIN = 1.25;

/** Severity at which the full coverage-driven premium applies. Previously
 * pinned equal to SEVERITY_GATE_MAX (20%) "for continuity" with the old 80%
 * floor — but that meant full premium only ever engaged right at the edge
 * of the origination gate, so almost every allowed pool state was earning a
 * scaled-down, diluted premium. Lowered to 8% and deliberately decoupled
 * from SEVERITY_GATE_MAX: this is a ramp-to-full-premium knob (economics),
 * SEVERITY_GATE_MAX is a safety cap (risk control) — no reason they should
 * share a number. */
export const SEVERITY_REF = 0.08;

/** The minimum weight coverage's base curve always carries in the final
 * multiplier, regardless of how low severity is. Without this, a pool with
 * a very large FYC relative to the loan book can have low coverage (risky
 * by that measure) but tiny severity (safe, because FYC is huge) — and
 * severity's scaling would crush coverage's own signal down to almost
 * nothing. At COVERAGE_WEIGHT_FLOOR = 0.5, coverage always contributes at
 * least half of its raw premium; severity only controls the other half. */
export const COVERAGE_WEIGHT_FLOOR = 0.5;

/** Below this severity, FFC minting is blocked — protection is already more
 * than sufficient, more FFC would only dilute existing holders. */
export const SEVERITY_MINT_FLOOR = 0.02;

/** Above this severity, loan origination is blocked — replaces the old flat
 * 80% coverage floor. */
export const SEVERITY_GATE_MAX = 0.2;

export interface Pool {
  /** FYC — senior tranche value, in USD. */
  fyc: number;
  /** FFC — junior, first-loss tranche value, in USD. */
  ffc: number;
  /** Outstanding loan principal, in USD (the loan book only, not the pool). */
  outstanding: number;
}

// ---------------------------------------------------------------------------
// Coverage & severity — the two dials.
// ---------------------------------------------------------------------------

/**
 * Coverage — the attachment point. What fraction of the outstanding loan
 * book can default before FFC is exhausted and FYC starts taking losses.
 *
 * ```txt
 *                 FFC
 * coverage = min( ---, 1 )
 *                  P
 * ```
 *
 * Deliberately NOT `FFC / (FYC + FFC)` — that formula fits a design where
 * the entire pool sits in one price-moving asset; our risk event is a loan
 * defaulting, which only threatens the outstanding loan book, not the
 * pool's idle reserve. See /glossary#coverage.
 */
export function coverageOf(outstanding: number, ffc: number): number {
  if (outstanding <= 0) return 1;
  return Math.min(1, ffc / outstanding);
}

/**
 * Severity — the impact. If FFC's protection is exhausted, what fraction of
 * FYC's *own* TVL is still at risk in the worst case (the entire loan book
 * defaulting). Coverage alone can't answer this because FYC's size is a
 * free variable in our system: two pools with identical coverage can have
 * wildly different severity if one has a much larger FYC than the other.
 *
 * ```txt
 *                max(0, P − FFC)
 * severity = ----------------------
 *                     FYC
 * ```
 */
export function severityOf(outstanding: number, ffc: number, fyc: number): number {
  if (fyc <= 0) return 0;
  return Math.max(0, outstanding - ffc) / fyc;
}

/**
 * Severity implied by a hypothetical/swept coverage value, holding FFC and
 * FYC fixed. Used to draw the coverage→premium curve itself, where coverage
 * is the independent variable rather than something read off a real pool.
 *
 * Derived by inverting `coverageOf`: outstanding = FFC / coverage, then
 * substituting into `severityOf`.
 */
export function severityImplied(coveragePct: number, ffc: number, fyc: number): number {
  const cov = coveragePct / 100;
  if (fyc <= 0) return 0;
  if (cov >= 1) return 0;
  if (cov <= 0) return Infinity;
  return (ffc * (1 - cov)) / (cov * fyc);
}

// ---------------------------------------------------------------------------
// The premium multiplier — coverage sets the base curve, severity scales it.
// ---------------------------------------------------------------------------

/** Piecewise-linear interpolation of k_base over the stored coverage breakpoints. */
export function kBase(coveragePct: number): number {
  const bps = K_BREAKPOINTS;
  if (coveragePct <= bps[0].cov) return bps[0].k;
  for (let i = 0; i < bps.length - 1; i++) {
    const a = bps[i];
    const b = bps[i + 1];
    if (coveragePct >= a.cov && coveragePct <= b.cov) {
      const f = (coveragePct - a.cov) / (b.cov - a.cov);
      return a.k + f * (b.k - a.k);
    }
  }
  return bps[bps.length - 1].k;
}

/**
 * The final premium multiplier: coverage sets the base curve, severity
 * scales how much of it applies on top of a guaranteed floor — coverage
 * always carries at least COVERAGE_WEIGHT_FLOOR of its own signal, so a
 * pool can't talk its way out of a bad-coverage premium just by having a
 * large, low-severity FYC.
 *
 * ```txt
 * severity_factor = min(1, severity / SEVERITY_REF)
 * weight          = COVERAGE_WEIGHT_FLOOR + (1 − COVERAGE_WEIGHT_FLOOR) × severity_factor
 * k               = K_MIN + (k_base(coverage) − K_MIN) × weight
 * ```
 *
 * At severity = 0, weight = COVERAGE_WEIGHT_FLOOR (coverage's floor share
 * still applies). At severity ≥ SEVERITY_REF, weight = 1 (full curve, same
 * as before — this end of the formula is unchanged).
 *
 * k > 1 always (K_MIN = 1.25), so FFC's rate can only equal FYC's in the
 * trivial case of zero loan interest to split at all.
 */
export function kFromCoverageAndSeverity(coveragePct: number, severity: number): number {
  const base = kBase(coveragePct);
  const severityFactor = Math.min(1, Math.max(0, severity) / SEVERITY_REF);
  const weight = COVERAGE_WEIGHT_FLOOR + (1 - COVERAGE_WEIGHT_FLOOR) * severityFactor;
  return K_MIN + (base - K_MIN) * weight;
}

export interface CurveResult {
  /** FFC's share of net loan interest, 0-1. */
  share: number;
  /** The final premium multiplier applied. */
  k: number;
  severity: number;
  coveragePct: number;
}

/** Curve output for a REAL pool state (outstanding, ffc, fyc all known). */
export function curveAtActual(outstanding: number, ffc: number, fyc: number): CurveResult {
  const coveragePct = coverageOf(outstanding, ffc) * 100;
  const severity = severityOf(outstanding, ffc, fyc);
  const k = kFromCoverageAndSeverity(coveragePct, severity);
  const kF = k * ffc;
  return { share: fyc + kF > 0 ? kF / (fyc + kF) : 0, k, severity, coveragePct };
}

/** Curve output for a SWEPT/hypothetical coverage axis (ffc, fyc fixed). Used
 * to draw the curve chart, where coverage is the independent variable. */
export function curveAtSwept(coveragePct: number, ffc: number, fyc: number): CurveResult {
  const severity = severityImplied(coveragePct, ffc, fyc);
  const k = kFromCoverageAndSeverity(coveragePct, severity);
  const kF = k * ffc;
  return { share: fyc + kF > 0 ? kF / (fyc + kF) : 0, k, severity, coveragePct };
}

// ---------------------------------------------------------------------------
// The two gates — both keyed on severity.
// ---------------------------------------------------------------------------

export interface GateResult {
  allowed: boolean;
  severity: number;
  threshold: number;
}

/**
 * Origination gate. Replaces the old flat 80%-coverage floor.
 *
 * ```txt
 * allowed  <=>  severity(projected_outstanding, FFC, FYC) <= gateMax
 * ```
 *
 * `gateMax` defaults to the stored SEVERITY_GATE_MAX but can be overridden —
 * used by /explorer's live gate slider to explore other thresholds without
 * touching the app-wide default.
 */
export function assertOriginationAllowed(
  pool: Pool,
  newLoanAmount: number,
  gateMax: number = SEVERITY_GATE_MAX,
): GateResult {
  const projected = pool.outstanding + newLoanAmount;
  const severity = severityOf(projected, pool.ffc, pool.fyc);
  return { allowed: severity <= gateMax, severity, threshold: gateMax };
}

/**
 * FFC minting ceiling (new mechanism — did not exist before this round).
 *
 * ```txt
 * allowed  <=>  severity(outstanding, FFC, FYC) > SEVERITY_MINT_FLOOR
 * ```
 */
export function assertMintAllowed(pool: Pool): GateResult {
  const severity = severityOf(pool.outstanding, pool.ffc, pool.fyc);
  return { allowed: severity > SEVERITY_MINT_FLOOR, severity, threshold: SEVERITY_MINT_FLOOR };
}

/** The outstanding principal at which severity hits exactly `gateMax`
 * (the severity-gate ceiling), for a given FFC/FYC. Defaults to
 * SEVERITY_GATE_MAX; see assertOriginationAllowed for the override use case. */
export function severityCeilingOutstanding(ffc: number, fyc: number, gateMax: number = SEVERITY_GATE_MAX): number {
  return ffc + gateMax * fyc;
}

/** Which constraint binds first: the severity gate, or the (unchanged) 80%
 * allocation ceiling on total pool value. */
export function bindingConstraint(
  fyc: number,
  ffc: number,
  gateMax: number = SEVERITY_GATE_MAX,
): { kind: 'severity' | 'allocation'; value: number } {
  const pool = fyc + ffc;
  const allocCeiling = pool * ALLOCATION_CEILING_FRACTION;
  const severityCeiling = severityCeilingOutstanding(ffc, fyc, gateMax);
  return severityCeiling < allocCeiling
    ? { kind: 'severity', value: severityCeiling }
    : { kind: 'allocation', value: allocCeiling };
}

// ---------------------------------------------------------------------------
// Reserve/USDY yield — unchanged throughout every iteration of this design.
// ---------------------------------------------------------------------------

/**
 * USDY/reserve-appreciation yield split. Flat pro-rata by tranche size —
 * this stream carries no loan-specific risk (it's not exposed to any
 * borrower defaulting), so there's no coverage curve here, just each
 * tranche's share of the combined pool.
 *
 * ```txt
 *                        FYC
 * fyc_share = net_yield ---------
 *                       FYC + FFC
 *
 * ffc_share = net_yield − fyc_share
 * ```
 */
export function splitBaseYieldTokenYield(
  netYield: number,
  fyc: number,
  ffc: number,
): { fycShare: number; ffcShare: number } {
  const pool = fyc + ffc;
  if (pool <= 0 || netYield <= 0) return { fycShare: 0, ffcShare: 0 };
  const fycShare = (netYield * fyc) / pool;
  return { fycShare, ffcShare: netYield - fycShare };
}

// ---------------------------------------------------------------------------
// Loan interest split — the curve, applied to an actual gross-interest figure.
// ---------------------------------------------------------------------------

export interface DistributeLoanInterestResult extends CurveResult {
  netYield: number;
  feeValue: number;
  fycShare: number;
  ffcShare: number;
}

/**
 * distribute_loan_interest — the redesigned split. gross_interest here is
 * always the LEVELIZED figure (see amortization below), never true
 * declining-balance interest.
 */
export function distributeLoanInterest(pool: Pool, grossInterest: number): DistributeLoanInterestResult {
  const netYield = grossInterest * NET_YIELD_FRACTION;
  const feeValue = grossInterest - netYield;
  const curve = curveAtActual(pool.outstanding, pool.ffc, pool.fyc);
  const ffcShare = netYield * curve.share;
  const fycShare = netYield - ffcShare;
  return { ...curve, netYield, feeValue, fycShare, ffcShare };
}

// ---------------------------------------------------------------------------
// Amortization — the borrower's true schedule, and the protocol's levelized one.
// ---------------------------------------------------------------------------

/**
 * compute_monthly_payment — standard level-payment amortization.
 *
 * ```txt
 *                    P · r
 * M = -----------------------------
 *      1 − (1 + r)^(−n)
 * ```
 * `r` = per-period rate (APR / PERIODS_PER_YEAR ≈ APR / 12.1667), `n` =
 * term in 30-day periods — despite the parameter name `termMonths`
 * (inherited as-is from the real contract's own `term_months` field name;
 * it counts periods, not calendar months — see /open-questions). Fixed
 * (round 2) from a hardcoded `/ 12`: that divisor implicitly treated each
 * 30-day period as exactly 1/12 of a year (a 30/360 day-count), which
 * doesn't match this same file's own yield-annualization convention
 * (365-day, ACT/365 — see PERIODS_PER_YEAR). The old math wasn't
 * "wrong" in isolation — 30/360 is a legitimate, common convention — it
 * was just inconsistent with the OTHER convention already in use one
 * function away. Using PERIODS_PER_YEAR everywhere closes that gap: a
 * stated 15% APR loan now actually costs 15% annualized, not ~15.21%.
 */
export function monthlyPayment(principal: number, aprAnnual: number, termMonths: number): number {
  const r = aprAnnual / PERIODS_PER_YEAR;
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

/** period_interest — true, declining-balance interest for one period. Same
 * PERIODS_PER_YEAR fix as monthlyPayment above — was a hardcoded /12. */
export function periodInterest(balance: number, aprAnnual: number): number {
  return (balance * aprAnnual) / PERIODS_PER_YEAR;
}

/** Total interest paid over the life of the loan, and its levelized
 * (flat, per-period) equivalent — computed once at origination. */
export function levelizedInterest(principal: number, aprAnnual: number, termMonths: number): number {
  const m = monthlyPayment(principal, aprAnnual, termMonths);
  const totalInterest = m * termMonths - principal;
  return totalInterest / termMonths;
}

export interface AmortRow {
  period: number;
  trueInterest: number;
  truePrincipal: number;
  trueBalance: number;
  levelizedInterestAmt: number;
  internalPrincipal: number;
  internalBalance: number;
}

/** Builds both schedules for the same loan side by side — the borrower's
 * true amortization, and the protocol's internal levelized one. They start
 * and end together (same total principal, same total interest over the
 * life of the loan) but diverge through the middle. */
export function buildDualSchedule(principal: number, aprAnnual: number, termMonths: number): AmortRow[] {
  const m = monthlyPayment(principal, aprAnnual, termMonths);
  const levelized = levelizedInterest(principal, aprAnnual, termMonths);
  const rows: AmortRow[] = [
    { period: 0, trueInterest: 0, truePrincipal: 0, trueBalance: principal, levelizedInterestAmt: 0, internalPrincipal: 0, internalBalance: principal },
  ];
  let trueBal = principal;
  let intBal = principal;
  for (let k = 1; k <= termMonths; k++) {
    const trueInterest = periodInterest(trueBal, aprAnnual);
    const truePrincipal = Math.min(m - trueInterest, trueBal);
    trueBal = Math.max(0, trueBal - truePrincipal);

    const internalPrincipal = Math.min(m - levelized, intBal);
    intBal = Math.max(0, intBal - internalPrincipal);

    rows.push({
      period: k,
      trueInterest,
      truePrincipal,
      trueBalance: trueBal,
      levelizedInterestAmt: levelized,
      internalPrincipal,
      internalBalance: intBal,
    });
  }
  return rows;
}

/** The OLD, broken model: fixed FYC monthly target + FFC gets the residual.
 * True declining interest, not levelized — this is the failure mode being
 * fixed, so it deliberately does NOT use the levelized schedule. */
export function buildOldModelSchedule(
  principal: number,
  aprAnnual: number,
  termMonths: number,
  fycMonthlyTarget: number,
): { period: number; netYield: number; fycShare: number; ffcShare: number }[] {
  const m = monthlyPayment(principal, aprAnnual, termMonths);
  const rows: { period: number; netYield: number; fycShare: number; ffcShare: number }[] = [];
  let bal = principal;
  for (let k = 1; k <= termMonths; k++) {
    const interest = periodInterest(bal, aprAnnual);
    bal = bal * (1 + aprAnnual / PERIODS_PER_YEAR) - m;
    const netYield = interest * NET_YIELD_FRACTION;
    const fycShare = Math.min(fycMonthlyTarget, netYield);
    const ffcShare = Math.max(0, netYield - fycShare);
    rows.push({ period: k, netYield, fycShare, ffcShare });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Redemption liquidity — ELB (idle/undeployed reserve) and its tranche split.
// Second design round — see /redemption, /tranche-swap, /yield-sources.
// ---------------------------------------------------------------------------

/** RESERVE_TARGET_FRACTION — the "20% always stays as reserve" floor. Not an
 * independently-enforced gate: it's the algebraic complement of
 * ALLOCATION_CEILING_FRACTION (loans can be at most 80% of V_pool), so it's
 * already guaranteed by the existing allocation ceiling. Named here purely
 * so /glossary and /latex can cite it as its own concept. */
export const RESERVE_TARGET_FRACTION = 1 - ALLOCATION_CEILING_FRACTION;

export interface Elb {
  elbTotal: number;
  elbFyc: number;
  elbFfc: number;
}

/**
 * ELB — "Excess Liquidity Balance," the pool's idle capital sitting in a
 * yield-bearing reserve token, not deployed as loans. Split pro-rata by each
 * tranche's share of the combined pool — the same flat pool-share formula
 * splitBaseYieldTokenYield already uses for reserve *yield*, applied here to
 * reserve *capital* instead.
 *
 * ```txt
 *                    V_tranche
 * elb_tranche = ELB × ----------
 *                     FYC + FFC
 * ```
 */
export function splitElb(elbTotal: number, fyc: number, ffc: number): Elb {
  const pool = fyc + ffc;
  if (pool <= 0 || elbTotal <= 0) return { elbTotal: Math.max(0, elbTotal), elbFyc: 0, elbFfc: 0 };
  const elbFyc = (elbTotal * fyc) / pool;
  return { elbTotal, elbFyc, elbFfc: elbTotal - elbFyc };
}

// ---------------------------------------------------------------------------
// Instant (accelerated) redemption — fee scales with how much of that
// tranche's available instant liquidity a redemption consumes.
// ---------------------------------------------------------------------------

export type Tranche = 'fyc' | 'ffc';

/** [fee_min_bps, fee_max_bps] per tranche. FFC's band sits strictly above
 * FYC's — junior liquidity is scarcer and riskier to hand out on demand. */
export const INSTANT_FEE_BPS: Record<Tranche, [number, number]> = {
  fyc: [10, 50], // 0.10% – 0.50%
  ffc: [50, 100], // 0.50% – 1.00%
};

export interface InstantFeeResult {
  allowed: boolean;
  feeBps: number;
  feeValue: number;
  netPayout: number;
}

/**
 * Instant-redemption fee — the ENDPOINT-RATE formula, as specified: the fee
 * rate charged on the WHOLE redemption is read off where the amount lands
 * within the tranche's available instant liquidity, then applied flat to
 * the full amount.
 *
 * ```txt
 *                                amount
 * fee_bps = fee_min + ------------------------------ × (fee_max − fee_min)
 *                          elb_tranche
 * ```
 *
 * Worked example (the one this was specified against): $40K ELB_FYC,
 * redeeming $20K (the midpoint) lands fee_bps at the midpoint of [10, 50] —
 * 30 bps.
 *
 * NOTE — split-gameable, deliberately not fixed here: because elb_tranche is
 * read live, splitting one large redemption into several smaller ones (in
 * one transaction, before anything else can move elb_tranche) converges the
 * *average* rate paid toward fee_min. The split-invariant fix is the closed-
 * form integral of this same marginal rate over [0, amount] —
 * `fee = fee_min·amount + (fee_max−fee_min)·amount²/(2·elb_tranche)`, exactly
 * half the quadratic term this endpoint formula charges. That variant is
 * recommended for production but changes this worked example's numbers, so
 * it isn't silently substituted here — see /open-questions.
 *
 * Redeeming more than the tranche's available instant liquidity isn't
 * discounted or partially served — it's simply not eligible for the instant
 * path at all; the only route for that amount is the 30d/90d scheduled queue.
 */
export function instantRedemptionFeeBps(tranche: Tranche, amount: number, elbTranche: number): InstantFeeResult {
  const [min, max] = INSTANT_FEE_BPS[tranche];
  if (amount <= 0 || elbTranche <= 0 || amount > elbTranche) {
    return { allowed: false, feeBps: 0, feeValue: 0, netPayout: 0 };
  }
  const feeBps = min + (amount / elbTranche) * (max - min);
  const feeValue = (amount * feeBps) / 10_000;
  return { allowed: true, feeBps, feeValue, netPayout: amount - feeValue };
}

// ---------------------------------------------------------------------------
// jr_to_sr / sr_to_jr — the tranche-conversion primitive. Burns one tranche's
// tokens, mints the other's, at CONSERVATIVE price on both legs — this moves
// already-collected value, not new external capital, so optimistic price's
// dilution-protection purpose doesn't apply; using it here would under-mint
// the destination tranche and hand existing holders a NAV bump for free.
// ---------------------------------------------------------------------------

export type ConvertDirection = 'jrToSr' | 'srToJr';

export interface ConvertResult {
  valueUsd: number;
  tokensBurned: number;
  tokensMinted: number;
}

/** Burns `tokensIn` of the source tranche at its own conservative price and
 * mints the equivalent USD value of the destination tranche at ITS
 * conservative price. V_pool is unchanged by construction — value moves
 * between tranches, none is invented or destroyed. */
export function convertTranche(
  direction: ConvertDirection,
  tokensIn: number,
  fycPrice: number,
  ffcPrice: number,
): ConvertResult {
  const srcPrice = direction === 'jrToSr' ? ffcPrice : fycPrice;
  const destPrice = direction === 'jrToSr' ? fycPrice : ffcPrice;
  const valueUsd = tokensIn * srcPrice;
  const tokensMinted = destPrice > 0 ? valueUsd / destPrice : 0;
  return { valueUsd, tokensBurned: tokensIn, tokensMinted };
}

// ---------------------------------------------------------------------------
// Redemption-fee collection — always settles as FYC in the two fee wallets.
// ---------------------------------------------------------------------------

export interface FeeSplitResult {
  /** USD value attributed to each wallet — always feeValue/2, regardless of
   * which tranche the fee was taken from (only the MECHANISM by which it
   * becomes FYC differs, never the 50/50 split itself). */
  protocolValueUsd: number;
  insuranceValueUsd: number;
  /** Nonzero only for an FFC-sourced fee: how much FFC was burned, and how
   * much new FYC was minted to cover it (via convertTranche). Both zero for
   * an FYC-sourced fee, since those tokens are transferred, never burned. */
  ffcTokensBurned: number;
  fycTokensMinted: number;
}

/**
 * Splits a redemption fee 50/50 between protocol_wallet and insurance_wallet
 * — always settled as FYC. Redeeming FYC: the fee-portion tokens are simply
 * never burned, just transferred (protocol/insurance treasuries end up
 * holding FYC they were always going to hold anyway) — v_fyc/fyc_supply
 * don't move at all for this leg. Redeeming FFC: the fee-portion tokens ARE
 * burned (via convertTranche('jrToSr', ...)) and the equivalent value is
 * minted as new FYC instead — deliberately asymmetric with the FYC case:
 * protocol/insurance treasuries should never carry first-loss (FFC)
 * exposure, so junior-side fees are always converted up to senior before
 * they land in a wallet.
 */
export function instantRedemptionFeeSplit(
  tranche: Tranche,
  feeValue: number,
  fycPrice: number,
  ffcPrice: number,
): FeeSplitResult {
  const half = feeValue / 2;
  if (tranche === 'fyc') {
    return { protocolValueUsd: half, insuranceValueUsd: half, ffcTokensBurned: 0, fycTokensMinted: 0 };
  }
  const feeFfcTokens = ffcPrice > 0 ? feeValue / ffcPrice : 0;
  const { tokensMinted } = convertTranche('jrToSr', feeFfcTokens, fycPrice, ffcPrice);
  return { protocolValueUsd: half, insuranceValueUsd: half, ffcTokensBurned: feeFfcTokens, fycTokensMinted: tokensMinted };
}

// ---------------------------------------------------------------------------
// Multi-yield-source targeting — blended portfolio APY and rebalance routing.
// ---------------------------------------------------------------------------

/** Target band for the pool's BLENDED yield across every enabled yield
 * source. `min` exists purely so "couldn't reach the target" is never an
 * error — it's the point at which the routing logic stops caring, not a
 * hard requirement. `max` is a soft ceiling too: overshooting it is fine,
 * the routing logic will still reach for it. */
export const YIELD_TARGET = { min: 0.03, target: 0.035, max: 0.07 };

export interface YieldSource {
  id: string;
  capitalUsd: number;
  apy: number;
  enabled: boolean;
}

/**
 * Blended portfolio APY — capital-weighted average across every source.
 * Structurally identical to Hylo's published "Average SOL Reserve Yield"
 * equation (Σ(supply×price×apy) / total reserve); ours weights by USD
 * capital directly since each source already reports its own USD value.
 *
 * ```txt
 *              Σ (capital_i × apy_i)
 * blended_apy = ----------------------
 *                   Σ capital_i
 * ```
 */
export function blendedApy(sources: YieldSource[]): number {
  const enabled = sources.filter((s) => s.enabled);
  const total = enabled.reduce((s, x) => s + x.capitalUsd, 0);
  if (total <= 0) return 0;
  return enabled.reduce((s, x) => s + x.capitalUsd * x.apy, 0) / total;
}

export interface RebalanceChoice {
  sourceId: string | null;
  resultingApy: number;
  inRange: boolean;
}

/**
 * Picks which ENABLED source new capital should route into. Scores every
 * candidate by the blended APY the pool would have right after routing
 * `depositAmount` into it; prefers whichever lands closest to
 * YIELD_TARGET.target among candidates that land inside [min, max]. If none
 * land in range, prefers the single highest resulting APY instead of
 * failing — undershooting forever is the failure mode this guards against,
 * not overshooting.
 */
export function pickRebalanceTarget(sources: YieldSource[], depositAmount: number): RebalanceChoice {
  const enabled = sources.filter((s) => s.enabled);
  if (enabled.length === 0) return { sourceId: null, resultingApy: 0, inRange: false };

  const scored = enabled.map((candidate) => {
    const hypothetical = sources.map((s) =>
      s.id === candidate.id ? { ...s, capitalUsd: s.capitalUsd + depositAmount } : s,
    );
    return { id: candidate.id, resultingApy: blendedApy(hypothetical) };
  });

  const inRange = scored.filter((s) => s.resultingApy >= YIELD_TARGET.min && s.resultingApy <= YIELD_TARGET.max);
  if (inRange.length > 0) {
    const best = inRange.reduce((a, b) =>
      Math.abs(a.resultingApy - YIELD_TARGET.target) <= Math.abs(b.resultingApy - YIELD_TARGET.target) ? a : b,
    );
    return { sourceId: best.id, resultingApy: best.resultingApy, inRange: true };
  }
  const highest = scored.reduce((a, b) => (a.resultingApy >= b.resultingApy ? a : b));
  return { sourceId: highest.id, resultingApy: highest.resultingApy, inRange: false };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export const fmtUSD = (n: number): string =>
  '$' + Math.round(n).toLocaleString('en-US');

export const fmtUSD2 = (n: number): string =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtPct = (n: number, digits = 2): string => (n * 100).toFixed(digits) + '%';
