import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  lede,
  badges,
}: {
  eyebrow: string;
  title: string;
  lede: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <header style={{ marginBottom: 32 }}>
      <div className="page-eyebrow">
        <span className="dot" /> {eyebrow}
      </div>
      <h1 className="page-title">{title}</h1>
      <p className="page-lede">{lede}</p>
      {badges && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{badges}</div>}
    </header>
  );
}

export function SectionHead({ num, title, dek }: { num: string; title: string; dek: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="section-num">{num}</div>
      <h2>{title}</h2>
      <p className="section-dek">{dek}</p>
    </div>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={style}>
      {children}
    </div>
  );
}

export function Callout({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'amber' | 'good';
}) {
  return <div className={`callout${tone !== 'default' ? ' ' + tone : ''}`}>{children}</div>;
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'warn' | 'good' | 'critical';
}) {
  return (
    <span className={`badge${tone !== 'default' ? ' ' + tone : ''}`}>
      {tone !== 'default' && <span className="dot" />}
      {children}
    </span>
  );
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function Readout({
  label,
  value,
  sub,
  color,
  compact,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  color?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'readout compact' : 'readout'}>
      <div className="rlabel" style={color ? { color } : undefined}>
        {label}
      </div>
      <div className="rvalue tabular">{value}</div>
      {sub && <div className="rsub">{sub}</div>}
    </div>
  );
}

export function Kpi({
  label,
  oldValue,
  newValue,
  note,
  single,
}: {
  label: string;
  oldValue?: ReactNode;
  newValue: ReactNode;
  note: ReactNode;
  single?: boolean;
}) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">
        {!single && oldValue !== undefined && (
          <>
            <span className="old">{oldValue}</span>
            <span className="arrow">→</span>
          </>
        )}
        <span className={single ? '' : 'new'}>{newValue}</span>
      </div>
      <div className="note">{note}</div>
    </div>
  );
}

export function Meter({
  fillPct,
  color,
  gateMarks,
}: {
  fillPct: number;
  color: string;
  gateMarks?: { pct: number; title?: string }[];
}) {
  return (
    <div className="meter">
      <div className="fill" style={{ width: `${Math.max(0, Math.min(100, fillPct))}%`, background: color }} />
      {gateMarks?.map((m, i) => (
        <div key={i} className="gate-mark" style={{ left: `${m.pct}%` }} title={m.title} />
      ))}
    </div>
  );
}

export function Collapsible({
  label,
  children,
  defaultOpen = false,
}: {
  label: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="collapsible" open={defaultOpen}>
      <summary>{label}</summary>
      <div className="collapsible-body">{children}</div>
    </details>
  );
}

export function PageFooter() {
  return (
    <footer className="page-footer">
      <span>FYC = senior tranche · FFC = junior, first-loss tranche · all figures net of the unchanged 85/15 fee split</span>
      <span>
        <code>protocol_monorepo/pinochio/src/</code> — the live Solana program (not the Anchor mirror under program/)
      </span>
    </footer>
  );
}
