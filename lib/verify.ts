/**
 * Offline regression suite — `/open-questions` already claimed this file
 * exists ("pinned by regression tests in verify.ts, sections 20-21") before
 * it was actually written; confirmed missing during an external security
 * review. This is that file.
 *
 * Run directly: `npx tsx lib/verify.ts` (or `npm run verify`, see package.json).
 * No test framework dependency — a plain assert-and-report harness, matching
 * how every one of these was originally verified ("live probes via tsx")
 * during design and review. Exits non-zero if anything fails, so it's CI-safe.
 *
 * Each check here mirrors a LIVE reproduction already rendered on some page
 * in this design tool (e.g. /optimistic-price) or a specific finding from an
 * external review — see each check's comment for the pointer. If a check
 * here ever regresses, the corresponding page's live proof should regress
 * too; if they disagree, something is wrong with one of them, not just this
 * file.
 */

import {
  PERIODS_PER_YEAR,
  SEVERITY_GATE_MAX,
  severityOf,
  assertOriginationAllowed,
  periodInterest,
  instantRedemptionFeeBps,
  instantRedemptionFeeSplit,
  totalReserveCapital,
  totalReserveGrossYieldThisPeriod,
} from './model';
import { runSimulation, type OriginationEvent, type TrancheActivityEvent } from './simulate';
import { generateRandomOriginations, generateRandomTrancheActivity, generateRandomDefaults } from './random';

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

// ---------------------------------------------------------------------------
// 1. Severity gate at FYC = 0 — must fail CLOSED, not open.
//
// Before the fix: severityOf returned 0 whenever fyc <= 0 (read as "fully
// safe"), so assertOriginationAllowed's `severity <= gateMax` check passed
// unconditionally for a wiped/uninitialized FYC. See CODEBASE_REVIEW_REPORT.md
// §2.1. fyc=0, ffc=100000, outstanding=0, new loan $200,000 — bigger than
// FFC's entire protection, so FYC-side exposure is real despite FYC being
// zero. Before the fix this was ALLOWED (severity read as 0, "fully safe")
// regardless of loan size; must now be BLOCKED.
// ---------------------------------------------------------------------------
function checkSeverityGateAtZeroFyc() {
  const gate = assertOriginationAllowed({ fyc: 0, ffc: 100000, outstanding: 0 }, 200000);
  check(
    'severity gate fails closed at fyc=0 (loan exceeds ffc protection)',
    gate.allowed === false,
    `assertOriginationAllowed({fyc:0, ffc:100000, outstanding:0}, 200000) -> allowed=${gate.allowed}, severity=${gate.severity} (must be blocked — was unconditionally allowed before the fix)`,
  );

  // Still correctly ALLOWED when the projected loan is fully covered by FFC
  // alone, even with fyc=0 — severity genuinely is 0 in that state, this
  // isn't a blanket "fyc=0 always blocks" rule.
  const coveredGate = assertOriginationAllowed({ fyc: 0, ffc: 100000, outstanding: 0 }, 50000);
  check(
    'severity gate still allows fyc=0 when fully covered by FFC alone',
    coveredGate.allowed === true && coveredGate.severity === 0,
    `assertOriginationAllowed({fyc:0, ffc:100000, outstanding:0}, 50000) -> allowed=${coveredGate.allowed}, severity=${coveredGate.severity} (outstanding 50000 <= ffc 100000, must allow)`,
  );

  check(
    'severityOf(outstanding > ffc, fyc=0) returns +Infinity, not 0',
    severityOf(100, 50, 0) === Infinity,
    `severityOf(100, 50, 0) = ${severityOf(100, 50, 0)}`,
  );
}

// ---------------------------------------------------------------------------
// 2. SEVERITY_GATE_MAX is the decided value (50%), not a stale 20%/30%.
// See CODEBASE_REVIEW_REPORT.md §2.2 and §9.1 — lib/model.ts and the Rust
// proposal's constants.rs both need to agree; this pins the TS side.
// ---------------------------------------------------------------------------
function checkSeverityGateMaxValue() {
  check(
    'SEVERITY_GATE_MAX is 50% (decided value)',
    SEVERITY_GATE_MAX === 0.5,
    `SEVERITY_GATE_MAX = ${SEVERITY_GATE_MAX}`,
  );
}

// ---------------------------------------------------------------------------
// 3. The "redeem-then-collect" FYC APY cap exploit — must stay fixed.
// A large same-period FYC redemption must never let the true per-token rate
// exceed the configured cap. Before the fix: 8.82% true rate against a 3% cap.
// ---------------------------------------------------------------------------
function checkRedeemThenCollectCapExploit() {
  const CAP = 0.03;
  const originations: OriginationEvent[] = [
    { id: 'o1', period: 1, amount: 300000, apr: 0.4, termMonths: 36, feePct: 0.01 },
  ];
  const trancheActivity: TrancheActivityEvent[] = [
    { id: 'a1', period: 2, tranche: 'fyc', kind: 'redeem', amount: 400000, mode: 'instant' },
  ];
  const result = runSimulation({
    initialFyc: 600000,
    initialFfc: 400000,
    reserveApy: 0.035,
    periods: 5,
    originations,
    defaults: [],
    trancheActivity,
    maxFycApy: CAP,
  });
  let worstTrueRate = -Infinity;
  for (let i = 1; i < result.steps.length; i++) {
    const prev = result.steps[i - 1];
    const cur = result.steps[i];
    if (prev.fycPrice <= 0) continue;
    worstTrueRate = Math.max(worstTrueRate, ((cur.fycPrice - prev.fycPrice) / prev.fycPrice) * PERIODS_PER_YEAR);
  }
  check(
    'redeem-then-collect cap exploit stays fixed (3% cap)',
    worstTrueRate <= CAP + 1e-6,
    `worst true FYC rate = ${(worstTrueRate * 100).toFixed(2)}% vs ${(CAP * 100).toFixed(0)}% cap (was 8.82% before the fix)`,
  );
}

// ---------------------------------------------------------------------------
// 4. Mint-side cap exploit / optimistic >= conservative price invariant.
// Mirrors /optimistic-price's live reproduction (same-period FYC mint after
// a high-APR loan) plus its random stress sweep — a mint should never let
// the optimistic (mint) price read below the conservative (redeem) price at
// the same instant, and the FYC APY cap must survive a same-period mint too.
// ---------------------------------------------------------------------------
function checkOptimisticPriceInvariant() {
  const originations: OriginationEvent[] = [
    { id: 'o1', period: 1, amount: 500000, apr: 0.3, termMonths: 36, feePct: 0.01 },
  ];
  const trancheActivity: TrancheActivityEvent[] = [
    { id: 'a1', period: 2, tranche: 'fyc', kind: 'mint', amount: 300000 },
  ];
  const result = runSimulation({
    initialFyc: 600000,
    initialFfc: 400000,
    reserveApy: 0.035,
    periods: 24,
    originations,
    defaults: [],
    trancheActivity,
  });
  const violations = result.steps.filter(
    (s) => s.fycOptimisticPrice < s.fycPrice - 1e-9 || s.ffcOptimisticPrice < s.ffcPrice - 1e-9,
  );
  check(
    'optimistic price never reads below conservative price (reported scenario)',
    violations.length === 0,
    `${violations.length} violation(s) across ${result.steps.length} periods`,
  );

  let sweepViolations = 0;
  let sweepChecked = 0;
  const SWEEP_SEEDS = 12;
  for (let seed = 1; seed <= SWEEP_SEEDS; seed++) {
    const sweepOriginations = generateRandomOriginations({
      seed,
      periods: 30,
      aprMin: 0.1,
      aprMax: 0.3,
      amountMin: 40000,
      amountMax: 300000,
      frequency: 2,
      termMonths: 18,
      feePctMin: 0.005,
      feePctMax: 0.02,
    });
    const sweepActivity = generateRandomTrancheActivity({
      seed,
      periods: 30,
      frequency: 2,
      amountMin: 15000,
      amountMax: 200000,
      redeemFraction: 0.4,
      ffcFraction: 0.5,
    });
    const sweepDefaults = generateRandomDefaults({ seed, periods: 30, annualDefaultRate: 0.04, originations: sweepOriginations });
    const sweepResult = runSimulation({
      initialFyc: 600000,
      initialFfc: 400000,
      reserveApy: 0.045,
      periods: 30,
      originations: sweepOriginations,
      defaults: sweepDefaults,
      trancheActivity: sweepActivity,
      maxFycApy: 0.07,
    });
    for (const s of sweepResult.steps) {
      sweepChecked++;
      if (s.fycOptimisticPrice < s.fycPrice - 1e-9) sweepViolations++;
      if (s.ffcOptimisticPrice < s.ffcPrice - 1e-9) sweepViolations++;
    }
  }
  check(
    `optimistic >= conservative price invariant, ${SWEEP_SEEDS}-seed random sweep`,
    sweepViolations === 0,
    `${sweepViolations} violation(s) across ${sweepChecked} tranche-periods checked`,
  );
}

// ---------------------------------------------------------------------------
// 5. FFC instant-redeem fee conservation — the exact bug class from
// CODEBASE_REVIEW_REPORT.md §2.3/§2.9 (double-subtracting the fee's value
// out of FFC in the Rust proposal). The TS model (lib/simulate.ts) was
// already correct; this pins it so a future edit can't quietly reintroduce
// the same class of bug here. Checked via NAV conservation, not by
// replicating the fee formula: whatever left the combined pool must exactly
// equal the investor's net payout — the fee portion must stay IN the pool
// (moving FFC -> FYC), never double-counted out of it.
// ---------------------------------------------------------------------------
function checkFfcInstantRedeemFeeConservation() {
  const trancheActivity: TrancheActivityEvent[] = [
    { id: 'a1', period: 1, tranche: 'ffc', kind: 'redeem', amount: 50000, mode: 'instant' },
  ];
  const result = runSimulation({
    initialFyc: 600000,
    initialFfc: 400000,
    reserveApy: 0,
    periods: 1,
    originations: [],
    defaults: [],
    trancheActivity,
  });
  const vPoolBefore = 600000 + 400000;
  // steps[0] is the period-0 initial snapshot (no activity applied yet);
  // the redemption lands in the last step.
  const step = result.steps[result.steps.length - 1];
  const vPoolAfter = step.fyc + step.ffc;
  const feeValue = step.redemptionFeeProtocol + step.redemptionFeeInsurance;
  const netPayout = 50000 - feeValue;
  const actualOutflow = vPoolBefore - vPoolAfter;
  check(
    'FFC instant-redeem: pool value drop equals net payout exactly (fee stays in pool, FFC->FYC)',
    Math.abs(actualOutflow - netPayout) < 1e-6,
    `pool dropped $${actualOutflow.toFixed(4)}, expected net payout $${netPayout.toFixed(4)} (fee $${feeValue.toFixed(4)} moved FFC->FYC, not lost)`,
  );
  check(
    'FFC instant-redeem: FYC gains value (the fee), never loses it',
    step.fyc >= 600000 - 1e-9,
    `fyc: 600000 -> ${step.fyc.toFixed(4)}`,
  );

  // Same conservation property directly on the pure fee-split helper, at a
  // fixed price, independent of the simulator's period-stepping.
  const split = instantRedemptionFeeSplit('ffc', 100, 1.05, 0.98);
  const totalOut = split.protocolValueUsd + split.insuranceValueUsd;
  check(
    'instantRedemptionFeeSplit: protocol + insurance shares sum to the full fee value',
    Math.abs(totalOut - 100) < 1e-9,
    `protocol $${split.protocolValueUsd} + insurance $${split.insuranceValueUsd} = $${totalOut} (fee was $100)`,
  );
}

// ---------------------------------------------------------------------------
// 6. Instant-redemption fee formula: split-invariant integral, not the old
// endpoint rate. See CODEBASE_REVIEW_REPORT.md §2.7 — splitting one
// redemption into several legs against the same elb_tranche must no longer
// converge the average fee toward fee_min the way the endpoint formula did.
// ---------------------------------------------------------------------------
function checkInstantFeeSplitInvariance() {
  // fee_min=10bps, fee_max=50bps (INSTANT_FEE_BPS.fyc), elb=$100,000 —
  // exactly the CODEBASE_REVIEW_REPORT.md §2.7 probe.
  const elb = 100000;
  const whole = instantRedemptionFeeBps('fyc', 50000, elb);
  const half = instantRedemptionFeeBps('fyc', 25000, elb);
  const splitTotal = half.feeValue * 2;
  const newRatio = splitTotal / whole.feeValue;

  // Exact closed-form values for this probe, pinned so a future formula
  // change is caught even if it doesn't regress the ratio below the old
  // endpoint formula's (the check below): $100 for one $50k redeem, $75
  // combined for two $25k redeems at the same held-constant ELB.
  check(
    'instant-redemption fee: exact integral-formula values for the report §2.7 probe',
    Math.abs(whole.feeValue - 100) < 0.01 && Math.abs(splitTotal - 75) < 0.01,
    `one $50k redeem: $${whole.feeValue.toFixed(2)} (expect $100.00); two $25k redeems: $${splitTotal.toFixed(2)} combined (expect $75.00)`,
  );

  // The OLD endpoint formula's ratio for the same probe was 100/150 ≈
  // 0.667 (a 33% discount from splitting) — see report §2.7. The new
  // integral formula doesn't achieve full split-invariance for two
  // independent calls against a HELD-CONSTANT elb (that needs cumulative-
  // utilization threading across calls, a separate, undecided design
  // question — see /open-questions), but it must move the ratio closer to
  // 1 (less discount), not just relabel the same formula.
  const oldEndpointRatio = 100 / 150;
  check(
    'instant-redemption fee: split discount is smaller than the old endpoint formula\'s',
    newRatio > oldEndpointRatio + 0.01,
    `split ratio (two-legs / one-leg) = ${newRatio.toFixed(3)}, old endpoint formula's was ${oldEndpointRatio.toFixed(3)} — must be higher (less discount)`,
  );
}

// ---------------------------------------------------------------------------
// 7. Day-count / PERIODS_PER_YEAR consistency — a stated APR must actually
// annualize back to itself, not the old ~1.4% inflated 30/360-vs-ACT/365
// mismatch. See CODEBASE_REVIEW_REPORT.md §1.3 ("already fixed, don't
// regress") and lib/model.ts's monthlyPayment/periodInterest doc comments.
// ---------------------------------------------------------------------------
function checkDayCountConsistency() {
  check(
    'PERIODS_PER_YEAR is exactly 365/30 (ACT/365, 30-day periods)',
    Math.abs(PERIODS_PER_YEAR - 365 / 30) < 1e-12,
    `PERIODS_PER_YEAR = ${PERIODS_PER_YEAR}`,
  );

  const apr = 0.15;
  const balance = 100000;
  const interest = periodInterest(balance, apr);
  const recoveredApr = (interest / balance) * PERIODS_PER_YEAR;
  check(
    'periodInterest annualizes back to the exact stated APR (no 30/360 drift)',
    Math.abs(recoveredApr - apr) < 1e-9,
    `stated APR 15% -> recovered ${(recoveredApr * 100).toFixed(4)}% (old bug: ~15.21%)`,
  );
}

// ---------------------------------------------------------------------------
// 8. Multi-source reserve sum — round 6's "pass all accounts" fix
// (helpers/pricing.rs::compute_v_pool, mirrored here by
// totalReserveCapital/totalReserveGrossYieldThisPeriod in lib/model.ts,
// both now shared by /optimistic-price instead of an inline .reduce()).
// A source with zero capital must contribute nothing to either sum, and the
// total must equal the plain sum of parts regardless of source count/order.
// ---------------------------------------------------------------------------
function checkMultiSourceReserveSum() {
  const sources = [
    { capitalUsd: 300000, apy: 0.042 },
    { capitalUsd: 150000, apy: 0.028 },
    { capitalUsd: 0, apy: 0.099 }, // zero-capital source — must contribute nothing
    { capitalUsd: 100000, apy: 0.035 },
  ];
  const total = totalReserveCapital(sources);
  check(
    'totalReserveCapital sums every source, zero-capital source contributes nothing',
    Math.abs(total - 550000) < 0.01,
    `sum = ${total} (expect 550000 = 300000 + 150000 + 0 + 100000)`,
  );

  const grossYield = totalReserveGrossYieldThisPeriod(sources);
  const expected = (300000 * 0.042 + 150000 * 0.028 + 100000 * 0.035) / PERIODS_PER_YEAR;
  check(
    'totalReserveGrossYieldThisPeriod sums every source\'s own capital-weighted share',
    Math.abs(grossYield - expected) < 0.01,
    `sum = ${grossYield.toFixed(2)} (expect ${expected.toFixed(2)})`,
  );

  // Order independence — the multi-source undercount bug this mirrors was a
  // MISSING term, not a wrong-order one, but pinning this catches a future
  // regression that accidentally makes the sum order-sensitive (e.g. a
  // mistaken running-total/checkpoint shortcut — see
  // helpers/reserve_checkpoint_sketch.rs for the alternative that was
  // deliberately NOT wired in, precisely because it trades this kind of
  // guarantee away for a per-call-site discipline burden instead).
  const reversedTotal = totalReserveCapital([...sources].reverse());
  check(
    'totalReserveCapital is order-independent',
    Math.abs(total - reversedTotal) < 0.01,
    `forward sum = ${total}, reversed sum = ${reversedTotal}`,
  );
}

// ---------------------------------------------------------------------------
// 9. Default loss applied exactly once — the TS-side confirmation that
// pricing.rs Decision 1 (drop the double-counted realized_losses
// subtraction from compute_v_pool) has no equivalent bug to fix here. This
// simulator reduces fyc/ffc and writes off the loan book directly at
// default time, with no separate realized_losses ledger that could be
// subtracted a second time — this check pins that invariant so a future
// change can't quietly introduce one.
// ---------------------------------------------------------------------------
function checkDefaultLossAppliedOnce() {
  const originations: OriginationEvent[] = [
    { id: 'o1', period: 1, amount: 500000, apr: 0.2, termMonths: 36, feePct: 0.01 },
  ];
  const result = runSimulation({
    initialFyc: 600000,
    initialFfc: 400000,
    reserveApy: 0.035,
    periods: 24,
    originations,
    defaults: [{ id: 'o1', period: 6, lossAmount: 120000 }],
    trancheActivity: [],
  });

  const defaultSteps = result.steps.filter((s) => s.defaultLoss > 0);
  check(
    'default loss scenario actually produced a default step',
    defaultSteps.length > 0,
    `${defaultSteps.length} step(s) with defaultLoss > 0`,
  );

  const bookkeepingViolations = defaultSteps.filter(
    (s) => Math.abs(s.fycLoss + s.ffcLoss - s.defaultLoss) > 0.01,
  );
  check(
    'default loss is absorbed by fyc+ffc exactly once, never double-counted',
    bookkeepingViolations.length === 0,
    `${bookkeepingViolations.length} step(s) where fycLoss+ffcLoss != defaultLoss`,
  );
}

// ---------------------------------------------------------------------------
// Run everything, report, exit non-zero on any failure.
// ---------------------------------------------------------------------------
checkSeverityGateAtZeroFyc();
checkSeverityGateMaxValue();
checkRedeemThenCollectCapExploit();
checkOptimisticPriceInvariant();
checkFfcInstantRedeemFeeConservation();
checkInstantFeeSplitInvariance();
checkDayCountConsistency();
checkMultiSourceReserveSum();
checkDefaultLossAppliedOnce();

const failed = results.filter((r) => !r.pass);
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'} — ${r.name}\n       ${r.detail}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  process.exit(1);
}
