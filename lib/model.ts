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
// Constants — every one of these is a stored, tunable protocol parameter.
// Values marked "illustrative" have not been signed off; see /open-questions
// equivalent callouts throughout the app.
// ---------------------------------------------------------------------------

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
 * `r` = monthly rate (APR / 12), `n` = term in months (30-day periods).
 */
export function monthlyPayment(principal: number, aprAnnual: number, termMonths: number): number {
  const r = aprAnnual / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

/** period_interest — true, declining-balance interest for one period. */
export function periodInterest(balance: number, aprAnnual: number): number {
  return (balance * aprAnnual) / 12;
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
    bal = bal * (1 + aprAnnual / 12) - m;
    const netYield = interest * NET_YIELD_FRACTION;
    const fycShare = Math.min(fycMonthlyTarget, netYield);
    const ffcShare = Math.max(0, netYield - fycShare);
    rows.push({ period: k, netYield, fycShare, ffcShare });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export const fmtUSD = (n: number): string =>
  '$' + Math.round(n).toLocaleString('en-US');

export const fmtUSD2 = (n: number): string =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtPct = (n: number, digits = 2): string => (n * 100).toFixed(digits) + '%';
