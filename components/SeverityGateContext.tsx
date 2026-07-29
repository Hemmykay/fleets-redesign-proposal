'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * A single, app-wide override for SEVERITY_GATE_MAX — set once (e.g. on
 * /explorer) and it carries into every page that reads it, including the
 * simulator. Lives above the router in the root layout, so it survives
 * client-side navigation between pages without needing localStorage or URL
 * state. The app-wide default in lib/model.ts is untouched; this is purely
 * a shared "what if the gate were X instead" knob for the design tool.
 */
interface SeverityGateContextValue {
  severityGateMax: number;
  setSeverityGateMax: (v: number) => void;
}

const SeverityGateContext = createContext<SeverityGateContextValue | null>(null);

export function SeverityGateProvider({ children }: { children: ReactNode }) {
  const [severityGateMax, setSeverityGateMax] = useState(30);
  return (
    <SeverityGateContext.Provider value={{ severityGateMax, setSeverityGateMax }}>
      {children}
    </SeverityGateContext.Provider>
  );
}

export function useSeverityGate(): SeverityGateContextValue {
  const ctx = useContext(SeverityGateContext);
  if (!ctx) throw new Error('useSeverityGate must be used within SeverityGateProvider');
  return ctx;
}
