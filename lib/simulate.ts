/**
 * Time-stepped scenario simulator. Builds on lib/model.ts — every formula
 * here is a period-by-period application of the same functions used
 * everywhere else in the app, nothing new is invented.
 *
 * One simulated period = one 30-day repayment period (SECONDS_PER_PERIOD in
 * the real contract). Annualization uses the exact same day-count the real
 * contract's observed_source_apy_bps does — 365-day years, not a flat ×12 —
 * so 12 periods add up to 360 days, not 365, and PERIODS_PER_YEAR is
 * ~12.1667, not 12. Every place a rate gets annualized or de-annualized
 * uses this same constant (imported from lib/model.ts, the single source of
 * truth — amortization uses the identical constant now too, see
 * monthlyPayment's doc comment), so nothing here silently drifts against
 * the real contract's own math, or against this file's own loan schedule.
 */

import {
  NET_YIELD_FRACTION,
  K_MIN,
  SECONDS_PER_PERIOD,
  SECONDS_PER_YEAR,
  PERIODS_PER_YEAR,
  assertMintAllowed,
  assertOriginationAllowed,
  levelizedInterest,
  monthlyPayment,
  severityOf,
  coverageOf,
  splitBaseYieldTokenYield,
  capFycLoanShare,
  DEFAULT_MAX_FYC_APY,
  splitElb,
  instantRedemptionFeeBps,
  instantRedemptionFeeSplit,
  splitYieldFee,
  protocolBlendedApy,
  splitOriginationFee,
  originationFeeValue,
  type Tranche,
} from './model';

export { SECONDS_PER_PERIOD, SECONDS_PER_YEAR, PERIODS_PER_YEAR };

/** FYC_REDEMPTION_LOCK_SECS / FFC_REDEMPTION_LOCK_SECS (30d / 90d) expressed
 * in whole 30-day periods — exact, since both locks are multiples of
 * SECONDS_PER_PERIOD. A scheduled redemption submitted at period P becomes
 * eligible at period P + this many periods. */
export const LOCK_PERIODS: Record<Tranche, number> = { fyc: 1, ffc: 3 };

export interface OriginationEvent {
  id: string;
  period: number;
  amount: number;
  apr: number;
  termMonths: number;
  /** Fraction (e.g. 0.01 for 1%) — a one-time fee the BORROWER pays on top
   * of their own equity, sized off this loan's own amount. Routed straight
   * to the protocol wallet (100% — insurance gets none of this one); never
   * touches v_fyc/v_ffc or mints anything — see splitOriginationFee in
   * lib/model.ts. */
  feePct: number;
}

export interface DefaultEvent {
  id: string;
  period: number;
  lossAmount: number;
}

/** A deposit (mint) or redemption (burn) against FYC or FFC. Mints price at
 * the OPTIMISTIC estimate (v_tranche + this tranche's share of this
 * period's not-yet-collected yield, so a depositor can't buy in cheap right
 * before a yield sweep and dilute existing holders); redemptions — both
 * instant and scheduled — price at the CONSERVATIVE figure (v_tranche only,
 * nothing assumed). See runSimulation's step 1e below for exactly what "this
 * period's yield" means in a period-stepped (not continuous-time) model. */
export interface TrancheActivityEvent {
  id: string;
  period: number;
  tranche: 'fyc' | 'ffc';
  kind: 'mint' | 'redeem';
  amount: number;
  /** Redeem only. 'instant' (default when unset) draws on that tranche's
   * available instant liquidity (ELB minus pending/earmarked draws) at the
   * liquidity-scaled fee — see instantRedemptionFeeBps. 'scheduled' queues
   * the redemption for LOCK_PERIODS (1 for FYC, 3 for FFC) and pays out at
   * the price on the period it matures, no fee — the existing 30d/90d
   * queue. Ignored for mint events. */
  mode?: 'instant' | 'scheduled';
}

/** A loan reaching the off-chain "equity received" pipeline stage earmarks
 * its capital out of the reserve before it actually originates on-chain, so
 * it can't be instantly redeemed out from under the loan. 'release' fires
 * either when the loan actually originates (capital moves into
 * `outstanding`) or the deal falls through (cancel_earmark). */
export interface EarmarkEvent {
  id: string;
  period: number;
  amount: number;
  kind: 'earmark' | 'release';
}

export interface ScenarioConfig {
  initialFyc: number;
  initialFfc: number;
  /** The reserve/USDY token's TRUE underlying annual growth rate. The
   * simulator no longer applies this directly — it grows a simulated
   * reserve token price at this rate, then re-derives the period's actual
   * yield by observing that price delta and annualizing it exactly like
   * observed_source_apy_bps does. No noise is modeled, so the observed rate
   * exactly recovers this input every period — the point isn't to show
   * drift, it's to show the rate is genuinely DERIVED, not just piped
   * straight through. */
  reserveApy: number;
  periods: number;
  originations: OriginationEvent[];
  defaults: DefaultEvent[];
  trancheActivity: TrancheActivityEvent[];
  /** Overrides SEVERITY_GATE_MAX for this run's origination gate — defaults
   * to the stored constant. Lets the simulator pick up the same "what if
   * the gate were X" value explored on /explorer. */
  severityGateMax?: number;
  /** Capital reserved against equity-received-but-not-yet-originated loans —
   * see EarmarkEvent. Defaults to none. */
  earmarkEvents?: EarmarkEvent[];
  /** Admin-configurable ceiling on FYC's TOTAL blended APY (loan interest +
   * reserve/yield-token yield) — see capFycLoanShare in lib/model.ts.
   * Defaults to DEFAULT_MAX_FYC_APY. Only the loan-interest leg is ever
   * throttled to enforce it; the reserve/yield-token split is untouched. */
  maxFycApy?: number;
}

interface ActiveLoan {
  id: string;
  originatedPeriod: number;
  principal: number;
  apr: number;
  termMonths: number;
  monthlyPaymentAmt: number;
  levelizedInterestAmt: number;
  balance: number;
}

export interface SimEvent {
  period: number;
  kind:
    | 'origination'
    | 'origination-blocked'
    | 'default'
    | 'mint'
    | 'mint-blocked'
    | 'redeem'
    | 'redeem-blocked'
    | 'redeem-scheduled'
    | 'redeem-processed'
    | 'fyc-apy-capped';
  detail: string;
}

export interface SimStep {
  period: number;
  fyc: number;
  ffc: number;
  fycSupply: number;
  ffcSupply: number;
  fycPrice: number;
  ffcPrice: number;
  outstanding: number;
  reserve: number;
  reservePrice: number;
  reserveObservedApyPct: number;
  loanObservedApyPct: number;
  /** Capital-weighted blend of loanObservedApyPct and reserveObservedApyPct
   * — "what is the protocol, as a whole, realizing right now" across BOTH
   * yield streams, weighted by outstanding loans vs. idle reserve. See
   * protocolBlendedApy in lib/model.ts. */
  protocolBlendedApyPct: number;
  coveragePct: number;
  severity: number;
  k: number;
  reserveGrossYield: number;
  reserveNetYield: number;
  loanGrossInterest: number;
  loanNetYield: number;
  fycYield: number;
  ffcYield: number;
  fycReserveShare: number;
  ffcReserveShare: number;
  fycLoanShare: number;
  ffcLoanShare: number;
  /** Whether the FYC APY cap redirected any of FYC's loan-interest share to
   * FFC this period — see capFycLoanShare in lib/model.ts. */
  fycApyCapped: boolean;
  /** How much of FYC's uncapped loan-interest share got redirected to FFC
   * this period — 0 whenever fycApyCapped is false. */
  redirectedToFfcFromCap: number;
  redirectedToFfcFromCapCum: number;
  fycCumYield: number;
  ffcCumYield: number;
  fycApyAnnualized: number;
  ffcApyAnnualized: number;
  defaultLoss: number;
  fycLoss: number;
  ffcLoss: number;
  activeLoanCount: number;
  /** Idle reserve (pool minus outstanding minus earmarked capital) and its
   * pro-rata tranche split — see splitElb. */
  elbTotal: number;
  elbFyc: number;
  elbFfc: number;
  /** Sum of not-yet-matured scheduled (30d/90d queue) redemptions per
   * tranche — netted out of elbFyc/elbFfc before an instant redemption is
   * evaluated, so a queued redeemer can't be stranded by one paid instantly
   * out from under them. */
  pendingFyc: number;
  pendingFfc: number;
  /** Capital reserved against loans that reached "equity received" but
   * haven't originated on-chain yet — see EarmarkEvent. */
  earmarkedCapital: number;
  /** This period's redemption-fee revenue, always settled as FYC, split
   * 50/50 — see instantRedemptionFeeSplit. */
  redemptionFeeProtocol: number;
  redemptionFeeInsurance: number;
  redemptionFeeProtocolCum: number;
  redemptionFeeInsuranceCum: number;
  /** The 15% protocol fee skimmed off this period's yield (reserve +
   * loans) and minted into FYC, split 2:1 protocol:insurance — see
   * splitYieldFee. Distinct revenue stream from the redemption fee above:
   * this one is funded by yield generation, not by redeeming users. */
  loanFeeValue: number;
  reserveFeeValue: number;
  yieldFeeTotal: number;
  yieldFeeProtocol: number;
  yieldFeeInsurance: number;
  yieldFeeProtocolCum: number;
  yieldFeeInsuranceCum: number;
  /** Optimistic (mint) price at the top of this period, before any of its
   * own activity — includes this tranche's share of the period's
   * not-yet-collected yield estimate. Contrast with fycPrice/ffcPrice
   * above, which is always the conservative (redeem) price. */
  fycOptimisticPrice: number;
  ffcOptimisticPrice: number;
  /** One-time fee the borrower pays on top of their own equity at
   * origination — 100% to the protocol wallet, insurance gets none. Never
   * touches fyc/ffc/fycSupply (see OriginationEvent.feePct in this file
   * and splitOriginationFee in lib/model.ts) — a third, independent
   * revenue stream alongside the redemption and yield fees above. */
  originationFeeProtocol: number;
  originationFeeInsurance: number;
  originationFeeProtocolCum: number;
  originationFeeInsuranceCum: number;
}

export interface SimResult {
  steps: SimStep[];
  events: SimEvent[];
}

export function runSimulation(config: ScenarioConfig): SimResult {
  const events: SimEvent[] = [];
  const steps: SimStep[] = [];

  let fyc = config.initialFyc;
  let ffc = config.initialFfc;
  let loans: ActiveLoan[] = [];
  let fycCumYield = 0;
  let ffcCumYield = 0;

  // Redemption liquidity state — see /redemption.
  let pendingQueue: { tranche: Tranche; amount: number; requestPeriod: number; eligiblePeriod: number }[] = [];
  let earmarkedCapital = 0;
  let redemptionFeeProtocolCum = 0;
  let redemptionFeeInsuranceCum = 0;
  let yieldFeeProtocolCum = 0;
  let yieldFeeInsuranceCum = 0;
  // Origination fee — unlike the two above, this never touches fyc/ffc at
  // all: it's a side payment from the borrower straight to the protocol
  // wallet (100%, insurance gets none), tracked purely for revenue
  // visibility. See splitOriginationFee in lib/model.ts.
  let originationFeeProtocolCum = 0;
  let originationFeeInsuranceCum = 0;
  // FYC APY cap — cumulative loan-interest redirected to FFC because FYC's
  // total blended yield would otherwise have exceeded maxFycApy. Purely
  // informational (fyc/ffc themselves already reflect the redirect via
  // capFycLoanShare's ffcShare) — see /simulator.
  let redirectedToFfcFromCapCum = 0;
  const maxFycApy = config.maxFycApy ?? DEFAULT_MAX_FYC_APY;

  // Token supply — set at genesis so price starts at exactly $1.00, then
  // mutated by mint/redeem events. The 15% yield fee IS minted into FYC
  // (price-neutral by construction — see step 4b) so it DOES affect
  // fycSupply, same as any other mint.
  let fycSupply = config.initialFyc > 0 ? config.initialFyc : 1;
  let ffcSupply = config.initialFfc > 0 ? config.initialFfc : 1;

  // $12,345.6 -> "12,346" — shared by every event-log detail string below so
  // reserve/loan figures read consistently across mint, redeem, and
  // scheduled-payout events.
  const fmtInt = (n: number) => Math.round(n).toLocaleString();

  // Reserve token's own simulated price — the thing observed_source_apy_bps
  // actually watches. Starts at $1, compounds at the TRUE input rate every
  // period; the "observed" APY below is derived from this, never read
  // directly off the input.
  let reservePrice = 1;

  const originationsByPeriod = new Map<number, OriginationEvent[]>();
  for (const o of config.originations) {
    const arr = originationsByPeriod.get(o.period) ?? [];
    arr.push(o);
    originationsByPeriod.set(o.period, arr);
  }
  const defaultsByPeriod = new Map<number, DefaultEvent[]>();
  for (const d of config.defaults) {
    const arr = defaultsByPeriod.get(d.period) ?? [];
    arr.push(d);
    defaultsByPeriod.set(d.period, arr);
  }
  const activityByPeriod = new Map<number, TrancheActivityEvent[]>();
  for (const a of config.trancheActivity) {
    const arr = activityByPeriod.get(a.period) ?? [];
    arr.push(a);
    activityByPeriod.set(a.period, arr);
  }
  const earmarkEventsByPeriod = new Map<number, EarmarkEvent[]>();
  for (const e of config.earmarkEvents ?? []) {
    const arr = earmarkEventsByPeriod.get(e.period) ?? [];
    arr.push(e);
    earmarkEventsByPeriod.set(e.period, arr);
  }

  // period 0 — initial snapshot, before anything happens
  steps.push({
    period: 0,
    fyc,
    ffc,
    fycSupply,
    ffcSupply,
    fycPrice: fyc / fycSupply,
    ffcPrice: ffc / ffcSupply,
    outstanding: 0,
    reserve: fyc + ffc,
    reservePrice,
    reserveObservedApyPct: 0,
    loanObservedApyPct: 0,
    protocolBlendedApyPct: 0,
    coveragePct: 100,
    severity: 0,
    k: K_MIN, // no loan interest yet at period 0 — display-only
    reserveGrossYield: 0,
    reserveNetYield: 0,
    loanGrossInterest: 0,
    loanNetYield: 0,
    fycYield: 0,
    ffcYield: 0,
    fycReserveShare: 0,
    ffcReserveShare: 0,
    fycLoanShare: 0,
    ffcLoanShare: 0,
    fycApyCapped: false,
    redirectedToFfcFromCap: 0,
    redirectedToFfcFromCapCum: 0,
    fycCumYield: 0,
    ffcCumYield: 0,
    fycApyAnnualized: 0,
    ffcApyAnnualized: 0,
    defaultLoss: 0,
    fycLoss: 0,
    ffcLoss: 0,
    activeLoanCount: 0,
    elbTotal: fyc + ffc,
    elbFyc: splitElb(fyc + ffc, fyc, ffc).elbFyc,
    elbFfc: splitElb(fyc + ffc, fyc, ffc).elbFfc,
    pendingFyc: 0,
    pendingFfc: 0,
    earmarkedCapital: 0,
    redemptionFeeProtocol: 0,
    redemptionFeeInsurance: 0,
    redemptionFeeProtocolCum: 0,
    redemptionFeeInsuranceCum: 0,
    loanFeeValue: 0,
    reserveFeeValue: 0,
    yieldFeeTotal: 0,
    yieldFeeProtocol: 0,
    yieldFeeInsurance: 0,
    yieldFeeProtocolCum: 0,
    yieldFeeInsuranceCum: 0,
    fycOptimisticPrice: fycSupply > 0 ? fyc / fycSupply : 1,
    ffcOptimisticPrice: ffcSupply > 0 ? ffc / ffcSupply : 1,
    originationFeeProtocol: 0,
    originationFeeInsurance: 0,
    originationFeeProtocolCum: 0,
    originationFeeInsuranceCum: 0,
  });

  for (let period = 1; period <= config.periods; period++) {
    const fycStart = fyc;
    const ffcStart = ffc;

    // 1. Loan book: collect levelized interest, pay down internal balances.
    // internalPrincipal (monthlyPaymentAmt - levelizedInterestAmt) is
    // algebraically constant every period — principal/termMonths exactly —
    // so a loan's balance should hit EXACTLY 0 on its final period. In
    // floating point it doesn't always: repeated subtraction of two
    // independently-rounded values can leave a residue on the order of
    // 1e-10. Left alone, that "active" loan keeps contributing its full
    // levelizedInterestAmt to loanGrossInterest every period thereafter
    // while `outstanding` sits at ~1e-10 — and loanObservedApyPct below
    // divides by it, producing figures like 2.17e17%. BALANCE_DUST snaps
    // the residue to exactly 0 (and out of the active-loan filter) instead.
    const BALANCE_DUST = 1e-6;
    let loanGrossInterest = 0;
    for (const loan of loans) {
      if (loan.balance <= 0) continue;
      loanGrossInterest += loan.levelizedInterestAmt;
      const principalPortion = Math.min(
        loan.monthlyPaymentAmt - loan.levelizedInterestAmt,
        loan.balance,
      );
      loan.balance = Math.max(0, loan.balance - principalPortion);
      if (loan.balance < BALANCE_DUST) loan.balance = 0;
    }
    loans = loans.filter((l) => l.balance > 0);
    let outstanding = loans.reduce((sum, l) => sum + l.balance, 0);

    // 1b. Earmark/release events — capital reserved against loans that hit
    // "equity received" but haven't originated on-chain yet, netted out of
    // ELB below so it can't be instantly redeemed out from under the loan.
    for (const e of earmarkEventsByPeriod.get(period) ?? []) {
      earmarkedCapital =
        e.kind === 'earmark' ? earmarkedCapital + e.amount : Math.max(0, earmarkedCapital - e.amount);
    }

    // 1c. Scheduled (30d/90d queue) redemptions maturing this period — paid
    // out NOW, at this period's CONSERVATIVE price, never the price at
    // submission (any yield/loss during the lock window is borne by the
    // redeemer, matching the real contract's process_redemption). No fee.
    pendingQueue = pendingQueue.filter((req) => {
      if (req.eligiblePeriod > period) return true;
      const isFyc = req.tranche === 'fyc';
      const value = isFyc ? fyc : ffc;
      const supply = isFyc ? fycSupply : ffcSupply;
      const price = supply > 0 ? value / supply : 1;
      const tokensBurned = price > 0 ? req.amount / price : 0;
      if (isFyc) {
        fyc -= req.amount;
        fycSupply = Math.max(0, fycSupply - tokensBurned);
      } else {
        ffc -= req.amount;
        ffcSupply = Math.max(0, ffcSupply - tokensBurned);
      }
      events.push({
        period,
        kind: 'redeem-processed',
        detail: `$${fmtInt(req.amount)} ${req.tranche.toUpperCase()} scheduled redemption PAID at $${price.toFixed(4)}/token (conservative, submitted period ${req.requestPeriod}, no fee) — reserve $${fmtInt(Math.max(0, fyc + ffc - outstanding))}, loans $${fmtInt(outstanding)}`,
      });
      return false;
    });
    // Read fresh from pendingQueue at each call site below (not cached as a
    // per-period constant) — a scheduled submission processed mid-loop, in
    // step 2, must immediately count against a LATER same-period instant
    // redemption's available liquidity, or the two could double-spend the
    // same slice of ELB within one period.
    const pendingAmount = (tranche: Tranche) =>
      pendingQueue.filter((r) => r.tranche === tranche).reduce((s, r) => s + r.amount, 0);

    // 1d. Reserve token price tick, moved ahead of step 2 (was step 3) —
    // this is deterministic, a pure function of the TRUE input rate, so it
    // never actually depended on step 2's activity. Moved early because the
    // OPTIMISTIC mint price below needs this period's reserve-yield
    // estimate before step 2 runs.
    const reservePriceBefore = reservePrice;
    reservePrice = reservePrice * (1 + config.reserveApy / PERIODS_PER_YEAR);
    const reserveObservedApy =
      reservePriceBefore > 0 ? (reservePrice / reservePriceBefore - 1) * PERIODS_PER_YEAR : 0;

    // 1e. This period's yield ESTIMATE, off pre-activity state — the basis
    // for OPTIMISTIC (mint) pricing below. There's no sub-period clock to
    // accrue against continuously the way the real contract's
    // reward-per-second checkpoint does; the honest analog in a
    // period-stepped model is "the yield this period's already-active loans
    // and current reserve are KNOWN to generate, whether or not it's been
    // swept into v_tranche yet" — computed from the exact same loans/
    // reserve state steps 3/4 use to actually collect it moments later.
    // Minting against v_tranche alone (ignoring this) would let a
    // same-period depositor buy in cheap and immediately share in yield
    // they contributed nothing to — precisely what optimistic pricing
    // exists to prevent.
    const reserveBeforeActivity = Math.max(0, fyc + ffc - outstanding);
    const reserveGrossYieldEstimate = reserveBeforeActivity * (reserveObservedApy / PERIODS_PER_YEAR);
    const reserveNetYieldEstimate = reserveGrossYieldEstimate * NET_YIELD_FRACTION;
    const reserveSplitEstimate = splitBaseYieldTokenYield(reserveNetYieldEstimate, fyc, ffc);
    // fycApyBase left at its default (pool.fyc) deliberately — this estimate
    // runs before step 2's activity, so `fyc` here already IS the
    // pre-activity balance; no separate base to thread through. See the
    // step 4 call below for the case where they actually diverge.
    const loanDistEstimate = capFycLoanShare(
      { fyc, ffc, outstanding },
      loanGrossInterest,
      reserveSplitEstimate.fycShare,
      maxFycApy,
    );
    const fycYieldEstimate = reserveSplitEstimate.fycShare + loanDistEstimate.fycShare;
    const ffcYieldEstimate = reserveSplitEstimate.ffcShare + loanDistEstimate.ffcShare;
    // The price a mint at the very TOP of this period, before any of its own
    // activity, would have paid — used below (step 2) to price THIS
    // period's own mints, unchanged. ALSO, confirmed bug fix: this exact
    // number is the state at the END of period `period - 1` (nothing has
    // happened between "end of period-1" and "top of period" — they're the
    // same instant), so it backfills steps[period-1].fycOptimisticPrice
    // rather than becoming steps[period]'s own optimistic price below. Before
    // this fix, steps[period].fycOptimisticPrice held THIS number while
    // steps[period].fycPrice (conservative) was measured a full period
    // LATER — after period's own yield had already landed — so the chart
    // was comparing two different moments in time, not "mint vs. redeem
    // right now." Whenever a mid-period mint enlarged the reserve/loan base
    // the ACTUAL yield (step 3/4 below) collects against beyond what this
    // stale estimate anticipated, conservative could read ABOVE optimistic
    // for that period — confirmed via direct simulation across 20 random
    // seeds, dozens of violations. See /optimistic-price for the full
    // derivation and worked proof, and lib/model.ts's capFycLoanShare doc
    // comment for the sibling fix this one is built on the same lesson from.
    const fycOptimisticPriceAtOpen = fycSupply > 0 ? (fyc + fycYieldEstimate) / fycSupply : 1;
    const ffcOptimisticPriceAtOpen = ffcSupply > 0 ? (ffc + ffcYieldEstimate) / ffcSupply : 1;
    steps[period - 1].fycOptimisticPrice = fycOptimisticPriceAtOpen;
    steps[period - 1].ffcOptimisticPrice = ffcOptimisticPriceAtOpen;

    // 2. Mint/redeem activity — processed before this period's yield
    // actually gets collected (steps 3/4), so capital arriving this period
    // already earns it, and capital leaving stops immediately. Mints price
    // OPTIMISTIC (v_tranche + this tranche's share of the 1e estimate, so a
    // same-period depositor can't buy in below the yield that's about to
    // land); every redemption path — instant or scheduled — prices
    // CONSERVATIVE (v_tranche alone, nothing assumed). See the
    // TrancheActivityEvent doc comment.
    let redemptionFeeProtocol = 0;
    let redemptionFeeInsurance = 0;
    for (const a of activityByPeriod.get(period) ?? []) {
      const isFyc = a.tranche === 'fyc';
      const value = isFyc ? fyc : ffc;
      const supply = isFyc ? fycSupply : ffcSupply;
      const conservativePrice = supply > 0 ? value / supply : 1;
      if (a.kind === 'mint') {
        if (a.tranche === 'ffc') {
          // effective ffc — see capFycLoanShare's call below for why a
          // queued FFC exit should make this gate see the same thinner
          // protection assertOriginationAllowed already does.
          const gate = assertMintAllowed({ fyc, ffc: ffc - pendingAmount('ffc'), outstanding });
          if (!gate.allowed) {
            events.push({
              period,
              kind: 'mint-blocked',
              detail: `$${fmtInt(a.amount)} FFC mint BLOCKED — severity ${(gate.severity * 100).toFixed(2)}% ≤ ${(gate.threshold * 100).toFixed(0)}% floor`,
            });
            continue;
          }
        }
        const yieldEstimate = isFyc ? fycYieldEstimate : ffcYieldEstimate;
        const optimisticPrice = supply > 0 ? (value + yieldEstimate) / supply : 1;
        const tokensMinted = optimisticPrice > 0 ? a.amount / optimisticPrice : a.amount;
        if (isFyc) {
          fyc += a.amount;
          fycSupply += tokensMinted;
        } else {
          ffc += a.amount;
          ffcSupply += tokensMinted;
        }
        events.push({
          period,
          kind: 'mint',
          detail: `$${fmtInt(a.amount)} ${a.tranche.toUpperCase()} minted at $${optimisticPrice.toFixed(4)}/token (optimistic — includes an est. $${fmtInt(yieldEstimate)} share of this period's not-yet-collected yield; +${Math.round(tokensMinted).toLocaleString()} tokens) — reserve $${fmtInt(Math.max(0, fyc + ffc - outstanding))}, loans $${fmtInt(outstanding)}`,
        });
      } else if (a.mode === 'scheduled') {
        const eligiblePeriod = period + LOCK_PERIODS[a.tranche];
        pendingQueue.push({ tranche: a.tranche, amount: a.amount, requestPeriod: period, eligiblePeriod });
        events.push({
          period,
          kind: 'redeem-scheduled',
          detail: `$${fmtInt(a.amount)} ${a.tranche.toUpperCase()} redemption SUBMITTED — eligible period ${eligiblePeriod} (${a.tranche === 'fyc' ? '30d' : '90d'} lock), no fee, priced conservative when it matures`,
        });
      } else {
        // Instant (default when unset) — draws on this tranche's available
        // instant liquidity: ELB (idle reserve, net of outstanding loans AND
        // earmarked capital), pro-rata split by pool share, minus whatever's
        // already queued in the scheduled path for the same tranche.
        const elbNow = Math.max(0, fyc + ffc - outstanding - earmarkedCapital);
        const elbSplitNow = splitElb(elbNow, fyc, ffc);
        const elbTrancheRaw = isFyc ? elbSplitNow.elbFyc : elbSplitNow.elbFfc;
        const elbAvailable = Math.max(0, elbTrancheRaw - pendingAmount(a.tranche));
        const fee = instantRedemptionFeeBps(a.tranche, a.amount, elbAvailable);
        if (!fee.allowed) {
          events.push({
            period,
            kind: 'redeem-blocked',
            detail: `$${fmtInt(a.amount)} ${a.tranche.toUpperCase()} instant redemption BLOCKED — only $${fmtInt(elbAvailable)} of instant liquidity available; use the scheduled (${a.tranche === 'fyc' ? '30d' : '90d'}) queue instead`,
          });
          continue;
        }
        const fycPriceNow = fycSupply > 0 ? fyc / fycSupply : 1;
        const ffcPriceNow = ffcSupply > 0 ? ffc / ffcSupply : 1;
        const split = instantRedemptionFeeSplit(a.tranche, fee.feeValue, fycPriceNow, ffcPriceNow);
        if (isFyc) {
          // Fee-portion FYC tokens are never burned — only the net payout
          // leaves v_fyc/fyc_supply; the fee just changes ownership.
          const tokensBurned = conservativePrice > 0 ? fee.netPayout / conservativePrice : 0;
          fyc -= fee.netPayout;
          fycSupply = Math.max(0, fycSupply - tokensBurned);
        } else {
          // Full amount leaves FFC (net payout + the fee-portion, which gets
          // burned-and-converted rather than paid out) — see jr_to_sr.
          const tokensBurned = conservativePrice > 0 ? a.amount / conservativePrice : 0;
          ffc -= a.amount;
          ffcSupply = Math.max(0, ffcSupply - tokensBurned);
          fyc += fee.feeValue;
          fycSupply += split.fycTokensMinted;
        }
        redemptionFeeProtocol += split.protocolValueUsd;
        redemptionFeeInsurance += split.insuranceValueUsd;
        events.push({
          period,
          kind: 'redeem',
          detail: `$${fmtInt(a.amount)} ${a.tranche.toUpperCase()} redeemed INSTANTLY at $${conservativePrice.toFixed(4)}/token (conservative) — fee ${fee.feeBps.toFixed(2)}bps ($${fee.feeValue.toFixed(2)}, settled as FYC 50/50 protocol/insurance), net payout $${fee.netPayout.toFixed(2)} — reserve $${fmtInt(Math.max(0, fyc + ffc - outstanding))}, loans $${fmtInt(outstanding)}`,
        });
      }
    }
    redemptionFeeProtocolCum += redemptionFeeProtocol;
    redemptionFeeInsuranceCum += redemptionFeeInsurance;

    // 3. Reserve yield, for real — same price tick from step 1d, but now
    // reads POST-activity reserve (step 2 above may have moved it), not the
    // pre-activity estimate step 1e used for mint pricing. The two can
    // differ slightly whenever step 2 itself changed the reserve; expected,
    // not a bug — see the 1e comment.
    const pool = fyc + ffc;
    const reserve = Math.max(0, pool - outstanding);
    const reserveGrossYield = reserve * (reserveObservedApy / PERIODS_PER_YEAR);
    const reserveNetYield = reserveGrossYield * NET_YIELD_FRACTION;
    const reserveSplit = splitBaseYieldTokenYield(reserveNetYield, fyc, ffc);

    // 4. Loan interest — the severity-scaled premium curve, for real
    // (post-activity fyc/ffc/outstanding — may differ slightly from the
    // step 1e estimate for the same reason as reserve yield above). Then
    // capped against maxFycApy: FYC's total blended APY (this loan share +
    // reserveSplit.fycShare above) can never exceed the admin-configured
    // ceiling — any excess redirects to FFC. See capFycLoanShare.
    //
    // CHANGED (bug fix, twice over) — fycApyBase is Math.min(fycStart, fyc),
    // not either one alone. First pass used bare fycStart to fix a MINT
    // exploit: passing post-activity fyc let a same-period mint enlarge the
    // base the $ ceiling was sized against, so the displayed
    // fycApyAnnualized (divided by the smaller pre-mint fycStart) could
    // read above maxFycApy even though the cap's own math was consistent
    // against a different, larger number.
    //
    // But bare fycStart alone opens the MIRROR exploit on a same-period
    // REDEEM: if FYC redeems heavily in step 2, fycStart (pre-redeem) is
    // the LARGER number — sizing the $ ceiling against it, then landing
    // that dollar amount on the SMALLER post-redeem `fyc`, hands whoever
    // stayed a per-token appreciation rate far above the cap. Confirmed by
    // direct simulation: a 3% cap produced an 8.82% true annualized
    // per-token rate for remaining holders after a large same-period FYC
    // redemption — a real, exploitable "redeem-most-then-collect-the-
    // windfall-on-the-remainder" attack, not a rounding artifact.
    //
    // Math.min(fycStart, fyc) closes both directions at once: the $ ceiling
    // is always sized against whichever balance — the one FYC started the
    // period with, or the one it ends step 2 with — is SMALLER, so it can
    // never exceed maxFycApy relative to either. See /optimistic-price for
    // the full writeup and the regression tests this is pinned against.
    const loanDist = capFycLoanShare(
      { fyc, ffc, outstanding },
      loanGrossInterest,
      reserveSplit.fycShare,
      maxFycApy,
      Math.min(fycStart, fyc),
    );
    if (loanDist.capped) {
      redirectedToFfcFromCapCum += loanDist.redirectedToFfc;
      events.push({
        period,
        kind: 'fyc-apy-capped',
        detail: `FYC APY cap engaged (${(maxFycApy * 100).toFixed(1)}% ceiling) — $${loanDist.redirectedToFfc.toFixed(2)} of loan interest redirected from FYC to FFC this period`,
      });
    }
    // Defense in depth alongside BALANCE_DUST above: never divide by a
    // sub-dollar outstanding figure, however it got that small. A ratio
    // against a fraction of a cent isn't a meaningful "APY," it's noise.
    const MIN_OUTSTANDING_FOR_APY = 1;
    const loanObservedApy =
      outstanding > MIN_OUTSTANDING_FOR_APY ? (loanGrossInterest * PERIODS_PER_YEAR) / outstanding : 0;

    const fycPriceBeforeYield = fycSupply > 0 ? fyc / fycSupply : 1;
    const fycYield = reserveSplit.fycShare + loanDist.fycShare;
    const ffcYield = reserveSplit.ffcShare + loanDist.ffcShare;
    fyc += fycYield;
    ffc += ffcYield;
    fycCumYield += fycYield;
    ffcCumYield += ffcYield;

    // 4b. Mint the 15% yield fee into FYC — price-neutral (priced off
    // fycPriceBeforeYield, the instant before this period's net yield
    // landed, so the mint neither dilutes nor gifts existing holders).
    // Previously computed (loanDist.feeValue) but never actually added to
    // v_fyc anywhere: gross yield came in, only the 85% net share ever
    // showed up in the pool, and the fee just vanished from the model every
    // period instead of doing what /glossary has always documented — mint
    // new FYC, split 2:1 protocol:insurance.
    const reserveFeeValue = reserveGrossYield - reserveNetYield;
    const loanFeeValue = loanDist.feeValue;
    const yieldFeeTotal = reserveFeeValue + loanFeeValue;
    const yieldFeeTokensMinted = fycPriceBeforeYield > 0 ? yieldFeeTotal / fycPriceBeforeYield : yieldFeeTotal;
    fyc += yieldFeeTotal;
    fycSupply += yieldFeeTokensMinted;
    const yieldFeeSplit = splitYieldFee(yieldFeeTotal);
    yieldFeeProtocolCum += yieldFeeSplit.protocolValueUsd;
    yieldFeeInsuranceCum += yieldFeeSplit.insuranceValueUsd;

    // 5. Defaults this period — FFC absorbs first, unchanged waterfall.
    let defaultLoss = 0;
    let fycLoss = 0;
    let ffcLoss = 0;
    for (const d of defaultsByPeriod.get(period) ?? []) {
      const loss = Math.min(d.lossAmount, outstanding);
      const ffcAbsorbed = Math.min(loss, ffc);
      ffc -= ffcAbsorbed;
      const remaining = loss - ffcAbsorbed;
      const fycAbsorbed = Math.min(remaining, fyc);
      fyc -= fycAbsorbed;
      defaultLoss += loss;
      fycLoss += fycAbsorbed;
      ffcLoss += ffcAbsorbed;
      // write the loss off the loan book, oldest balances first
      let toWriteOff = loss;
      for (const loan of loans) {
        if (toWriteOff <= 0) break;
        const take = Math.min(loan.balance, toWriteOff);
        loan.balance -= take;
        toWriteOff -= take;
      }
      loans = loans.filter((l) => l.balance > 0);
      events.push({
        period,
        kind: 'default',
        detail: `$${Math.round(loss).toLocaleString()} default — FFC absorbed $${Math.round(ffcAbsorbed).toLocaleString()}, FYC absorbed $${Math.round(fycAbsorbed).toLocaleString()}`,
      });
    }
    outstanding = loans.reduce((sum, l) => sum + l.balance, 0);

    // 6. Scheduled originations this period — gated on severity.
    let originationFeeProtocol = 0;
    let originationFeeInsurance = 0;
    for (const o of originationsByPeriod.get(period) ?? []) {
      // effective ffc — a queued FFC exit shouldn't count toward the buffer
      // this gate is protecting; re-read live per loan, same as the real
      // pendingAmount closure is documented to do elsewhere in this loop.
      const gate = assertOriginationAllowed(
        { fyc, ffc: ffc - pendingAmount('ffc'), outstanding },
        o.amount,
        config.severityGateMax,
      );
      if (gate.allowed) {
        const m = monthlyPayment(o.amount, o.apr, o.termMonths);
        const lev = levelizedInterest(o.amount, o.apr, o.termMonths);
        loans.push({
          id: o.id,
          originatedPeriod: period,
          principal: o.amount,
          apr: o.apr,
          termMonths: o.termMonths,
          monthlyPaymentAmt: m,
          levelizedInterestAmt: lev,
          balance: o.amount,
        });
        outstanding += o.amount;
        // Origination fee — a side payment the borrower makes ON TOP of
        // their own equity, straight to the protocol wallet. Never touches
        // fyc/ffc/fycSupply: this money doesn't come from or go into the
        // pool at all, so there's nothing to mint or dilute.
        const originationFeeAmount = originationFeeValue(o.amount, o.feePct);
        const originationSplit = splitOriginationFee(originationFeeAmount);
        originationFeeProtocol += originationSplit.protocolValueUsd;
        originationFeeInsurance += originationSplit.insuranceValueUsd;
        events.push({
          period,
          kind: 'origination',
          detail: `$${Math.round(o.amount).toLocaleString()} loan originated (severity ${(gate.severity * 100).toFixed(1)}% ≤ ${(gate.threshold * 100).toFixed(0)}%) — origination fee $${originationFeeAmount.toFixed(2)} (${(o.feePct * 100).toFixed(2)}% of principal, paid by borrower on top of equity, 100% to protocol wallet)`,
        });
      } else {
        events.push({
          period,
          kind: 'origination-blocked',
          detail: `$${Math.round(o.amount).toLocaleString()} origination BLOCKED — projected severity ${(gate.severity * 100).toFixed(1)}% > ${(gate.threshold * 100).toFixed(0)}%`,
        });
      }
    }
    originationFeeProtocolCum += originationFeeProtocol;
    originationFeeInsuranceCum += originationFeeInsurance;

    // effective ffc — matches assertMintAllowed's own input above, so the
    // mint-blocked indicator below (read directly off this severity value)
    // agrees with what a same-period mint attempt would actually see.
    const effectiveFfcNow = ffc - pendingAmount('ffc');
    const coveragePct = coverageOf(outstanding, effectiveFfcNow) * 100;
    const severity = severityOf(outstanding, effectiveFfcNow, fyc);
    // NOTE: whether minting is currently blocked is a STATE (read directly
    // off step.severity in the UI, against SEVERITY_MINT_FLOOR), not an
    // EVENT — it used to fire into the log every single period severity sat
    // at/below the floor, which clogged the log with an identical line
    // repeated dozens of times in a row. mint-blocked below still fires as a
    // real event, but only when an actual mint attempt lands and gets
    // rejected — that's a thing that happened, not an ambient status.

    steps.push({
      period,
      fyc,
      ffc,
      fycSupply,
      ffcSupply,
      fycPrice: fyc / fycSupply,
      ffcPrice: ffc / ffcSupply,
      outstanding,
      reserve: Math.max(0, fyc + ffc - outstanding),
      reservePrice,
      reserveObservedApyPct: reserveObservedApy * 100,
      loanObservedApyPct: loanObservedApy * 100,
      protocolBlendedApyPct:
        protocolBlendedApy({
          loanCapital: outstanding,
          loanApy: loanObservedApy,
          reserveCapital: Math.max(0, fyc + ffc - outstanding),
          reserveApy: reserveObservedApy,
        }) * 100,
      coveragePct,
      severity,
      k: loanDist.k,
      reserveGrossYield,
      reserveNetYield,
      loanGrossInterest,
      loanNetYield: loanDist.netYield,
      fycYield,
      ffcYield,
      fycReserveShare: reserveSplit.fycShare,
      ffcReserveShare: reserveSplit.ffcShare,
      fycLoanShare: loanDist.fycShare,
      ffcLoanShare: loanDist.ffcShare,
      fycApyCapped: loanDist.capped,
      redirectedToFfcFromCap: loanDist.redirectedToFfc,
      redirectedToFfcFromCapCum,
      fycCumYield,
      ffcCumYield,
      fycApyAnnualized: fycStart > 0 ? (fycYield / fycStart) * PERIODS_PER_YEAR * 100 : 0,
      ffcApyAnnualized: ffcStart > 0 ? (ffcYield / ffcStart) * PERIODS_PER_YEAR * 100 : 0,
      defaultLoss,
      fycLoss,
      ffcLoss,
      activeLoanCount: loans.length,
      elbTotal: Math.max(0, fyc + ffc - outstanding - earmarkedCapital),
      elbFyc: splitElb(Math.max(0, fyc + ffc - outstanding - earmarkedCapital), fyc, ffc).elbFyc,
      elbFfc: splitElb(Math.max(0, fyc + ffc - outstanding - earmarkedCapital), fyc, ffc).elbFfc,
      pendingFyc: pendingAmount('fyc'),
      pendingFfc: pendingAmount('ffc'),
      earmarkedCapital,
      redemptionFeeProtocol,
      redemptionFeeInsurance,
      redemptionFeeProtocolCum,
      redemptionFeeInsuranceCum,
      loanFeeValue,
      reserveFeeValue,
      yieldFeeTotal,
      yieldFeeProtocol: yieldFeeSplit.protocolValueUsd,
      yieldFeeInsurance: yieldFeeSplit.insuranceValueUsd,
      yieldFeeProtocolCum,
      yieldFeeInsuranceCum,
      // Placeholder — overwritten either by the NEXT iteration's backfill
      // above (the normal case) or, for the very last period, by the
      // closing pass right after this loop. Defaults to this SAME period's
      // conservative price rather than anything else, so if either backfill
      // path were ever somehow skipped, this fails toward "optimistic ==
      // conservative" (the boundary-safe value) instead of a wrong number.
      fycOptimisticPrice: fyc / fycSupply,
      ffcOptimisticPrice: ffc / ffcSupply,
      originationFeeProtocol,
      originationFeeInsurance,
      originationFeeProtocolCum,
      originationFeeInsuranceCum,
    });
  }

  // The last period's optimistic price never gets backfilled by a "next
  // iteration" (there isn't one) — do the identical step-1d/1e computation
  // once here, off the final post-loop state, to close it out. `outstanding`
  // was block-scoped to the loop above, so it's re-derived from `loans`
  // (still in scope, holding its final mutated balances) exactly the way
  // step 1 itself computes it.
  if (steps.length > 0) {
    const finalOutstanding = loans.reduce((sum, l) => sum + l.balance, 0);
    const finalReservePriceNext = reservePrice * (1 + config.reserveApy / PERIODS_PER_YEAR);
    const finalReserveObservedApy =
      reservePrice > 0 ? (finalReservePriceNext / reservePrice - 1) * PERIODS_PER_YEAR : 0;
    const finalReserveBeforeActivity = Math.max(0, fyc + ffc - finalOutstanding);
    const finalReserveGrossYieldEstimate = finalReserveBeforeActivity * (finalReserveObservedApy / PERIODS_PER_YEAR);
    const finalReserveNetYieldEstimate = finalReserveGrossYieldEstimate * NET_YIELD_FRACTION;
    const finalReserveSplitEstimate = splitBaseYieldTokenYield(finalReserveNetYieldEstimate, fyc, ffc);
    const finalLoanGrossInterest = loans
      .filter((l) => l.balance > 0)
      .reduce((sum, l) => sum + l.levelizedInterestAmt, 0);
    const finalLoanDistEstimate = capFycLoanShare(
      { fyc, ffc, outstanding: finalOutstanding },
      finalLoanGrossInterest,
      finalReserveSplitEstimate.fycShare,
      maxFycApy,
    );
    const finalFycYieldEstimate = finalReserveSplitEstimate.fycShare + finalLoanDistEstimate.fycShare;
    const finalFfcYieldEstimate = finalReserveSplitEstimate.ffcShare + finalLoanDistEstimate.ffcShare;
    const lastStep = steps[steps.length - 1];
    lastStep.fycOptimisticPrice = fycSupply > 0 ? (fyc + finalFycYieldEstimate) / fycSupply : 1;
    lastStep.ffcOptimisticPrice = ffcSupply > 0 ? (ffc + finalFfcYieldEstimate) / ffcSupply : 1;
  }

  return { steps, events };
}
