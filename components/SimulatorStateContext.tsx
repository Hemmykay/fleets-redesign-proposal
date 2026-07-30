'use client';

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import type { OriginationEvent, DefaultEvent, TrancheActivityEvent } from '@/lib/simulate';
import { nextId } from '@/lib/idCounter';

/**
 * Everything the user configures on /simulator, lifted above the router in
 * the root layout — same pattern as SeverityGateContext — so navigating away
 * to read another page and coming back doesn't reset the scenario you built.
 * Only genuinely ephemeral view state (is playback currently running, which
 * event-log rows are expanded) stays local to the page component itself.
 */

const DEFAULT_ORIGINATIONS: OriginationEvent[] = [
  { id: nextId(), period: 1, amount: 450000, apr: 0.15, termMonths: 36 },
];
const DEFAULT_DEFAULTS: DefaultEvent[] = [];
const DEFAULT_ACTIVITY: TrancheActivityEvent[] = [];

interface SimulatorStateValue {
  initialFyc: number;
  setInitialFyc: (v: number) => void;
  initialFfc: number;
  setInitialFfc: (v: number) => void;
  reserveApy: number;
  setReserveApy: (v: number) => void;
  periods: number;
  setPeriods: (v: number) => void;
  originations: OriginationEvent[];
  setOriginations: Dispatch<SetStateAction<OriginationEvent[]>>;
  defaults: DefaultEvent[];
  setDefaults: Dispatch<SetStateAction<DefaultEvent[]>>;

  randomMode: boolean;
  setRandomMode: (v: boolean) => void;
  randomSeed: number;
  setRandomSeed: Dispatch<SetStateAction<number>>;
  randomAprMin: number;
  setRandomAprMin: (v: number) => void;
  randomAprMax: number;
  setRandomAprMax: (v: number) => void;
  randomAmountMin: number;
  setRandomAmountMin: (v: number) => void;
  randomAmountMax: number;
  setRandomAmountMax: (v: number) => void;
  randomFrequency: number;
  setRandomFrequency: (v: number) => void;
  randomTermMonths: number;
  setRandomTermMonths: (v: number) => void;

  trancheActivity: TrancheActivityEvent[];
  setTrancheActivity: Dispatch<SetStateAction<TrancheActivityEvent[]>>;
  randomActivityMode: boolean;
  setRandomActivityMode: (v: boolean) => void;
  randomActivitySeed: number;
  setRandomActivitySeed: Dispatch<SetStateAction<number>>;
  randomActivityFrequency: number;
  setRandomActivityFrequency: (v: number) => void;
  randomActivityAmountMin: number;
  setRandomActivityAmountMin: (v: number) => void;
  randomActivityAmountMax: number;
  setRandomActivityAmountMax: (v: number) => void;
  randomActivityRedeemFraction: number;
  setRandomActivityRedeemFraction: (v: number) => void;
  randomActivityFfcFraction: number;
  setRandomActivityFfcFraction: (v: number) => void;

  cursor: number;
  setCursor: Dispatch<SetStateAction<number>>;
  playbackSeconds: number;
  setPlaybackSeconds: (v: number) => void;
}

const SimulatorStateContext = createContext<SimulatorStateValue | null>(null);

export function SimulatorStateProvider({ children }: { children: ReactNode }) {
  const [initialFyc, setInitialFyc] = useState(600000);
  const [initialFfc, setInitialFfc] = useState(400000);
  const [reserveApy, setReserveApy] = useState(0.035);
  const [periods, setPeriods] = useState(36);
  const [originations, setOriginations] = useState<OriginationEvent[]>(DEFAULT_ORIGINATIONS);
  const [defaults, setDefaults] = useState<DefaultEvent[]>(DEFAULT_DEFAULTS);

  const [randomMode, setRandomMode] = useState(false);
  const [randomSeed, setRandomSeed] = useState(1);
  const [randomAprMin, setRandomAprMin] = useState(0.15);
  const [randomAprMax, setRandomAprMax] = useState(0.18);
  const [randomAmountMin, setRandomAmountMin] = useState(50000);
  const [randomAmountMax, setRandomAmountMax] = useState(200000);
  const [randomFrequency, setRandomFrequency] = useState(3);
  const [randomTermMonths, setRandomTermMonths] = useState(24);

  const [trancheActivity, setTrancheActivity] = useState<TrancheActivityEvent[]>(DEFAULT_ACTIVITY);
  const [randomActivityMode, setRandomActivityMode] = useState(false);
  const [randomActivitySeed, setRandomActivitySeed] = useState(1);
  const [randomActivityFrequency, setRandomActivityFrequency] = useState(4);
  const [randomActivityAmountMin, setRandomActivityAmountMin] = useState(20000);
  const [randomActivityAmountMax, setRandomActivityAmountMax] = useState(120000);
  const [randomActivityRedeemFraction, setRandomActivityRedeemFraction] = useState(0.3);
  const [randomActivityFfcFraction, setRandomActivityFfcFraction] = useState(0.5);

  const [cursor, setCursor] = useState(0);
  const [playbackSeconds, setPlaybackSeconds] = useState(10);

  return (
    <SimulatorStateContext.Provider
      value={{
        initialFyc, setInitialFyc,
        initialFfc, setInitialFfc,
        reserveApy, setReserveApy,
        periods, setPeriods,
        originations, setOriginations,
        defaults, setDefaults,
        randomMode, setRandomMode,
        randomSeed, setRandomSeed,
        randomAprMin, setRandomAprMin,
        randomAprMax, setRandomAprMax,
        randomAmountMin, setRandomAmountMin,
        randomAmountMax, setRandomAmountMax,
        randomFrequency, setRandomFrequency,
        randomTermMonths, setRandomTermMonths,
        trancheActivity, setTrancheActivity,
        randomActivityMode, setRandomActivityMode,
        randomActivitySeed, setRandomActivitySeed,
        randomActivityFrequency, setRandomActivityFrequency,
        randomActivityAmountMin, setRandomActivityAmountMin,
        randomActivityAmountMax, setRandomActivityAmountMax,
        randomActivityRedeemFraction, setRandomActivityRedeemFraction,
        randomActivityFfcFraction, setRandomActivityFfcFraction,
        cursor, setCursor,
        playbackSeconds, setPlaybackSeconds,
      }}
    >
      {children}
    </SimulatorStateContext.Provider>
  );
}

export function useSimulatorState(): SimulatorStateValue {
  const ctx = useContext(SimulatorStateContext);
  if (!ctx) throw new Error('useSimulatorState must be used within SimulatorStateProvider');
  return ctx;
}
