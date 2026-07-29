/**
 * Deterministic PRNG-driven random origination generator for the simulator.
 * Seeded (mulberry32) rather than Math.random() directly, so the same seed
 * always reproduces the same scenario — re-renders (e.g. scrubbing the
 * playhead) don't silently reshuffle the loan book, and "reroll" is an
 * explicit, deliberate action.
 */

import type { OriginationEvent, TrancheActivityEvent } from './simulate';

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
  /** Roughly one origination every N periods, jittered so it isn't perfectly periodic. */
  frequency: number;
  aprMin: number;
  aprMax: number;
  amountMin: number;
  amountMax: number;
  termMonths: number;
}

export function generateRandomOriginations(cfg: RandomOriginationConfig): OriginationEvent[] {
  const rand = mulberry32(cfg.seed);
  const events: OriginationEvent[] = [];
  const freq = Math.max(1, cfg.frequency);

  let period = Math.max(1, Math.round(freq * (0.4 + rand() * 0.6)));
  let i = 0;
  while (period <= cfg.periods) {
    const apr = cfg.aprMin + rand() * Math.max(0, cfg.aprMax - cfg.aprMin);
    const rawAmount = cfg.amountMin + rand() * Math.max(0, cfg.amountMax - cfg.amountMin);
    const amount = Math.max(1000, Math.round(rawAmount / 1000) * 1000);
    events.push({
      id: 'rand-' + i,
      period,
      amount,
      apr,
      termMonths: cfg.termMonths,
    });
    i += 1;
    const gap = Math.max(1, Math.round(freq * (0.5 + rand() * 1.0)));
    period += gap;
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
