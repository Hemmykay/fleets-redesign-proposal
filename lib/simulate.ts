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
 * uses this same constant, so nothing here silently drifts against the
 * real contract's own math.
 */

import {
  NET_YIELD_FRACTION,
  K_MIN,
  assertMintAllowed,
  assertOriginationAllowed,
  levelizedInterest,
  monthlyPayment,
  severityOf,
  coverageOf,
  splitBaseYieldTokenYield,
  distributeLoanInterest,
} from './model';

const SECONDS_PER_DAY = 86_400;
export const SECONDS_PER_PERIOD = 30 * SECONDS_PER_DAY;
export const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;
/** Exact periods-per-year — matches observed_source_apy_bps's own
 * annualization factor. 12 thirty-day periods is 360 days, not 365, so this
 * is ~12.1667, not 12. */
export const PERIODS_PER_YEAR = SECONDS_PER_YEAR / SECONDS_PER_PERIOD;

export interface OriginationEvent {
  id: string;
  period: number;
  amount: number;
  apr: number;
  termMonths: number;
}

export interface DefaultEvent {
  id: string;
  period: number;
  lossAmount: number;
}

/** A deposit (mint) or redemption (burn) against FYC or FFC. Priced at the
 * single v_tranche/supply price this simplified model uses throughout — the
 * real contract mints at the (higher) optimistic price and redeems at the
 * (lower) conservative price; distinguishing those would need this model to
 * track accrued-but-uncollected yield separately, which it doesn't. Flagged
 * here the same way the token-price section already flags no insurance-burn
 * defense being modeled. */
export interface TrancheActivityEvent {
  id: string;
  period: number;
  tranche: 'fyc' | 'ffc';
  kind: 'mint' | 'redeem';
  amount: number;
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
  kind: 'origination' | 'origination-blocked' | 'default' | 'mint-note' | 'mint' | 'mint-blocked' | 'redeem';
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
  coveragePct: number;
  severity: number;
  k: number;
  reserveGrossYield: number;
  reserveNetYield: number;
  loanGrossInterest: number;
  loanNetYield: number;
  feeValue: number;
  fycYield: number;
  ffcYield: number;
  fycReserveShare: number;
  ffcReserveShare: number;
  fycLoanShare: number;
  ffcLoanShare: number;
  fycCumYield: number;
  ffcCumYield: number;
  fycApyAnnualized: number;
  ffcApyAnnualized: number;
  defaultLoss: number;
  fycLoss: number;
  ffcLoss: number;
  activeLoanCount: number;
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

  // Token supply — set at genesis so price starts at exactly $1.00, then
  // mutated by mint/redeem events. The 15% fee mint into FYC is price-neutral
  // by construction (mints exactly fee_value/price_before new tokens) so it's
  // left out of supply tracking here, same simplification as before.
  let fycSupply = config.initialFyc > 0 ? config.initialFyc : 1;
  let ffcSupply = config.initialFfc > 0 ? config.initialFfc : 1;

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
    coveragePct: 100,
    severity: 0,
    k: K_MIN, // no loan interest yet at period 0 — display-only
    reserveGrossYield: 0,
    reserveNetYield: 0,
    loanGrossInterest: 0,
    loanNetYield: 0,
    feeValue: 0,
    fycYield: 0,
    ffcYield: 0,
    fycReserveShare: 0,
    ffcReserveShare: 0,
    fycLoanShare: 0,
    ffcLoanShare: 0,
    fycCumYield: 0,
    ffcCumYield: 0,
    fycApyAnnualized: 0,
    ffcApyAnnualized: 0,
    defaultLoss: 0,
    fycLoss: 0,
    ffcLoss: 0,
    activeLoanCount: 0,
  });

  for (let period = 1; period <= config.periods; period++) {
    const fycStart = fyc;
    const ffcStart = ffc;

    // 1. Loan book: collect levelized interest, pay down internal balances.
    let loanGrossInterest = 0;
    for (const loan of loans) {
      if (loan.balance <= 0) continue;
      loanGrossInterest += loan.levelizedInterestAmt;
      const principalPortion = Math.min(
        loan.monthlyPaymentAmt - loan.levelizedInterestAmt,
        loan.balance,
      );
      loan.balance = Math.max(0, loan.balance - principalPortion);
    }
    loans = loans.filter((l) => l.balance > 0);
    let outstanding = loans.reduce((sum, l) => sum + l.balance, 0);

    // 2. Mint/redeem activity — processed before this period's yield split,
    // same treatment as freshly-repaid principal above: capital that shows
    // up this period is already in v_tranche/reserve by the time yield gets
    // split, capital that leaves stops earning it immediately.
    for (const a of activityByPeriod.get(period) ?? []) {
      const isFyc = a.tranche === 'fyc';
      const value = isFyc ? fyc : ffc;
      const supply = isFyc ? fycSupply : ffcSupply;
      const price = supply > 0 ? value / supply : 1;
      if (a.kind === 'mint') {
        if (a.tranche === 'ffc') {
          const gate = assertMintAllowed({ fyc, ffc, outstanding });
          if (!gate.allowed) {
            events.push({
              period,
              kind: 'mint-blocked',
              detail: `$${Math.round(a.amount).toLocaleString()} FFC mint BLOCKED — severity ${(gate.severity * 100).toFixed(2)}% ≤ ${(gate.threshold * 100).toFixed(0)}% floor`,
            });
            continue;
          }
        }
        const tokensMinted = price > 0 ? a.amount / price : a.amount;
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
          detail: `$${Math.round(a.amount).toLocaleString()} ${a.tranche.toUpperCase()} minted at $${price.toFixed(4)}/token (+${Math.round(tokensMinted).toLocaleString()} tokens)`,
        });
      } else {
        const redeemAmount = Math.min(a.amount, value);
        const tokensBurned = price > 0 ? redeemAmount / price : 0;
        if (isFyc) {
          fyc -= redeemAmount;
          fycSupply = Math.max(0, fycSupply - tokensBurned);
        } else {
          ffc -= redeemAmount;
          ffcSupply = Math.max(0, ffcSupply - tokensBurned);
        }
        events.push({
          period,
          kind: 'redeem',
          detail: `$${Math.round(redeemAmount).toLocaleString()} ${a.tranche.toUpperCase()} redeemed at $${price.toFixed(4)}/token (−${Math.round(tokensBurned).toLocaleString()} tokens)${redeemAmount < a.amount ? ' — capped at available value' : ''}`,
        });
      }
    }

    // 3. Reserve yield — the reserve token's own price grows at the TRUE
    // rate, then the period's yield is derived by observing that delta and
    // annualizing it, exactly like observed_source_apy_bps. Because this
    // reads the token's PRICE, not the reserve's dollar value or token
    // count, minting/redeeming/repayments moving through step 2 above never
    // distorts the estimate — the whole point of pricing yield off price,
    // not balance.
    const reservePriceBefore = reservePrice;
    reservePrice = reservePrice * (1 + config.reserveApy / PERIODS_PER_YEAR);
    const reserveObservedApy =
      reservePriceBefore > 0
        ? (reservePrice / reservePriceBefore - 1) * PERIODS_PER_YEAR
        : 0;
    const pool = fyc + ffc;
    const reserve = Math.max(0, pool - outstanding);
    const reserveGrossYield = reserve * (reserveObservedApy / PERIODS_PER_YEAR);
    const reserveNetYield = reserveGrossYield * NET_YIELD_FRACTION;
    const reserveSplit = splitBaseYieldTokenYield(reserveNetYield, fyc, ffc);

    // 4. Loan interest — the severity-scaled premium curve.
    const loanDist = distributeLoanInterest({ fyc, ffc, outstanding }, loanGrossInterest);
    const loanObservedApy = outstanding > 0 ? (loanGrossInterest * PERIODS_PER_YEAR) / outstanding : 0;

    const fycYield = reserveSplit.fycShare + loanDist.fycShare;
    const ffcYield = reserveSplit.ffcShare + loanDist.ffcShare;
    fyc += fycYield;
    ffc += ffcYield;
    fycCumYield += fycYield;
    ffcCumYield += ffcYield;

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
    for (const o of originationsByPeriod.get(period) ?? []) {
      const gate = assertOriginationAllowed({ fyc, ffc, outstanding }, o.amount, config.severityGateMax);
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
        events.push({
          period,
          kind: 'origination',
          detail: `$${Math.round(o.amount).toLocaleString()} loan originated (severity ${(gate.severity * 100).toFixed(1)}% ≤ ${(gate.threshold * 100).toFixed(0)}%)`,
        });
      } else {
        events.push({
          period,
          kind: 'origination-blocked',
          detail: `$${Math.round(o.amount).toLocaleString()} origination BLOCKED — projected severity ${(gate.severity * 100).toFixed(1)}% > ${(gate.threshold * 100).toFixed(0)}%`,
        });
      }
    }

    const coveragePct = coverageOf(outstanding, ffc) * 100;
    const severity = severityOf(outstanding, ffc, fyc);
    const mint = assertMintAllowed({ fyc, ffc, outstanding });
    if (!mint.allowed) {
      events.push({
        period,
        kind: 'mint-note',
        detail: `FFC minting blocked this period — severity ${(severity * 100).toFixed(2)}% ≤ ${(mint.threshold * 100).toFixed(0)}% floor`,
      });
    }

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
      coveragePct,
      severity,
      k: loanDist.k,
      reserveGrossYield,
      reserveNetYield,
      loanGrossInterest,
      loanNetYield: loanDist.netYield,
      feeValue: loanDist.feeValue,
      fycYield,
      ffcYield,
      fycReserveShare: reserveSplit.fycShare,
      ffcReserveShare: reserveSplit.ffcShare,
      fycLoanShare: loanDist.fycShare,
      ffcLoanShare: loanDist.ffcShare,
      fycCumYield,
      ffcCumYield,
      fycApyAnnualized: fycStart > 0 ? (fycYield / fycStart) * PERIODS_PER_YEAR * 100 : 0,
      ffcApyAnnualized: ffcStart > 0 ? (ffcYield / ffcStart) * PERIODS_PER_YEAR * 100 : 0,
      defaultLoss,
      fycLoss,
      ffcLoss,
      activeLoanCount: loans.length,
    });
  }

  return { steps, events };
}
