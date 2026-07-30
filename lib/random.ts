/**
 * Deterministic PRNG-driven random origination generator for the simulator.
 * Seeded (mulberry32) rather than Math.random() directly, so the same seed
 * always reproduces the same scenario — re-renders (e.g. scrubbing the
 * playhead) don't silently reshuffle the loan book, and "reroll" is an
 * explicit, deliberate action.
 */

import type { OriginationEvent, DefaultEvent, TrancheActivityEvent } from './simulate';
import { PERIODS_PER_YEAR } from './model';

function mulberry32(seed: number) {
  let s = seed | 0;
  return function random() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RandomOriginationConfig {
  seed: number;
  periods: number;
  /** Roughly one origination every N periods, jittered so it isn't perfectly periodic.
   * Under severityTarget mode this instead sets the per-period ATTEMPT
   * probability (1/frequency) — see below. */
  frequency: number;
  aprMin: number;
  aprMax: number;
  amountMin: number;
  amountMax: number;
  termMonths: number;
  /** Origination fee range (fraction, e.g. 0.005-0.02 for 0.5%-2%) — each
   * generated loan draws its own fee the same way it draws its own APR. */
  feePctMin: number;
  feePctMax: number;
  /** When set, switches to a denser, pool-aware generator that sizes each
   * loan to push the book's severity up toward (never past) severityGateMax,
   * instead of drawing amount blindly from [amountMin, amountMax] every
   * ~frequency periods regardless of headroom. Omit for the original
   * blind-random behavior. */
  severityTarget?: { fyc: number; ffc: number; severityGateMax: number };
}

/** Straight-line amortization approximation used ONLY for randomizer
 * generation-time sizing decisions (severity headroom below, expected
 * default loss in generateRandomDefaults) — NOT a claim about the real
 * declining-balance/levelized schedule, which lib/simulate.ts computes
 * exactly. Good enough for "roughly how much of this loan book is still
 * outstanding at period N," which is all a generation-time heuristic
 * needs; the actual simulation run afterward is what's authoritative. */
export function estimateOutstandingApprox(
  loans: { amount: number; period: number; termMonths: number }[],
  atPeriod: number,
): number {
  return loans.reduce((sum, l) => {
    const elapsed = atPeriod - l.period;
    if (elapsed < 0) return sum; // hasn't originated yet as of atPeriod — contributes nothing
    if (elapsed >= l.termMonths) return sum; // already fully amortized
    return sum + l.amount * (1 - elapsed / l.termMonths); // elapsed === 0 -> full amount, decaying after
  }, 0);
}

export function generateRandomOriginations(cfg: RandomOriginationConfig): OriginationEvent[] {
  const rand = mulberry32(cfg.seed);
  const freq = Math.max(1, cfg.frequency);

  if (cfg.severityTarget) {
    // Denser, pool-aware mode: reconsider EVERY period (not gap-jumping),
    // since headroom keeps freeing up as earlier loans amortize down —
    // skipping periods would leave that freed-up capacity unused and
    // generate fewer loans than the book could actually support. Sizing is
    // biased toward the top of the currently-available headroom (skewed,
    // not deterministic) so the book trends toward — without any single
    // loan being GUARANTEED to hit — severityGateMax.
    const { fyc, ffc, severityGateMax } = cfg.severityTarget;
    const maxOutstanding = ffc + severityGateMax * fyc;
    const events: OriginationEvent[] = [];
    const attemptChance = 1 / freq;
    let i = 0;
    for (let period = 1; period <= cfg.periods; period++) {
      if (rand() >= attemptChance) continue;
      const currentOutstanding = estimateOutstandingApprox(events, period);
      const headroom = maxOutstanding - currentOutstanding;
      if (headroom < cfg.amountMin) continue; // no room for even the smallest loan right now
      const maxAmount = Math.min(cfg.amountMax, headroom);
      if (maxAmount <= cfg.amountMin) continue;
      const skewed = maxAmount - Math.pow(rand(), 2) * (maxAmount - cfg.amountMin);
      const amount = Math.max(1000, Math.round(skewed / 1000) * 1000);
      const apr = cfg.aprMin + rand() * Math.max(0, cfg.aprMax - cfg.aprMin);
      const feePct = cfg.feePctMin + rand() * Math.max(0, cfg.feePctMax - cfg.feePctMin);
      events.push({ id: 'rand-' + i, period, amount, apr, termMonths: cfg.termMonths, feePct });
      i += 1;
    }
    return events;
  }

  const events: OriginationEvent[] = [];
  let period = Math.max(1, Math.round(freq * (0.4 + rand() * 0.6)));
  let i = 0;
  while (period <= cfg.periods) {
    const apr = cfg.aprMin + rand() * Math.max(0, cfg.aprMax - cfg.aprMin);
    const rawAmount = cfg.amountMin + rand() * Math.max(0, cfg.amountMax - cfg.amountMin);
    const amount = Math.max(1000, Math.round(rawAmount / 1000) * 1000);
    const feePct = cfg.feePctMin + rand() * Math.max(0, cfg.feePctMax - cfg.feePctMin);
    events.push({
      id: 'rand-' + i,
      period,
      amount,
      apr,
      termMonths: cfg.termMonths,
      feePct,
    });
    i += 1;
    const gap = Math.max(1, Math.round(freq * (0.5 + rand() * 1.0)));
    period += gap;
  }
  return events;
}

export interface RandomDefaultConfig {
  seed: number;
  periods: number;
  /** Blended ANNUAL default rate across the whole loan book (fraction, e.g.
   * 0.03 for 3%/year) — the single knob this generator "works with," per
   * the design ask. Converted to a per-period rate via PERIODS_PER_YEAR and
   * applied against each period's ESTIMATED outstanding balance (see
   * estimateOutstandingApprox) rather than picking random loans to default
   * outright, so the loss scales naturally with however large the
   * generated book actually is. */
  annualDefaultRate: number;
  /** The loan book to estimate outstanding against — normally whatever
   * generateRandomOriginations (or the manual rows) already produced. */
  originations: OriginationEvent[];
}

/** Random default events sized off a single blended annual rate instead of
 * min/max/frequency knobs — "we just set a blended yearly default rate
 * that it can work with." Light jitter (0.5x-1.5x) keeps it from reading
 * as a robotic fixed drip while staying centered on the stated rate. */
export function generateRandomDefaults(cfg: RandomDefaultConfig): DefaultEvent[] {
  const rand = mulberry32(cfg.seed + 4271);
  const events: DefaultEvent[] = [];
  const perPeriodRate = cfg.annualDefaultRate / PERIODS_PER_YEAR;
  let i = 0;
  for (let period = 1; period <= cfg.periods; period++) {
    const outstanding = estimateOutstandingApprox(cfg.originations, period);
    const expected = outstanding * perPeriodRate;
    if (expected < 1) continue; // nothing meaningful to write off this period
    const lossAmount = Math.round((expected * (0.5 + rand())) / 100) * 100;
    if (lossAmount <= 0) continue;
    events.push({ id: 'rand-default-' + i, period, lossAmount });
    i += 1;
  }
  return events;
}

export interface RandomTrancheActivityConfig {
  seed: number;
  periods: number;
  /** Roughly one mint/redeem event every N periods, jittered. */
  frequency: number;
  amountMin: number;
  amountMax: number;
  /** Fraction of events that are redeems rather than mints, 0-1. */
  redeemFraction: number;
  /** Fraction of events on FFC rather than FYC, 0-1. */
  ffcFraction: number;
}

/** Random FYC/FFC mint (deposit) and redeem (withdrawal) events — same
 * seeded, deterministic-per-seed generation as generateRandomOriginations,
 * so scrubbing the playhead never reshuffles the schedule, only a reroll
 * does. FFC mints that land on a period where the mint floor is already
 * blocking new deposits still get generated here — the simulator itself is
 * what decides whether they land, exactly like a blocked origination. */
export function generateRandomTrancheActivity(cfg: RandomTrancheActivityConfig): TrancheActivityEvent[] {
  const rand = mulberry32(cfg.seed + 977);
  const events: TrancheActivityEvent[] = [];
  const freq = Math.max(1, cfg.frequency);

  let period = Math.max(1, Math.round(freq * (0.4 + rand() * 0.6)));
  let i = 0;
  while (period <= cfg.periods) {
    const rawAmount = cfg.amountMin + rand() * Math.max(0, cfg.amountMax - cfg.amountMin);
    const amount = Math.max(1000, Math.round(rawAmount / 1000) * 1000);
    const tranche: 'fyc' | 'ffc' = rand() < cfg.ffcFraction ? 'ffc' : 'fyc';
    const kind: 'mint' | 'redeem' = rand() < cfg.redeemFraction ? 'redeem' : 'mint';
    events.push({ id: 'act-' + i, period, tranche, kind, amount });
    i += 1;
    const gap = Math.max(1, Math.round(freq * (0.5 + rand() * 1.0)));
    period += gap;
  }
  return events;
}
