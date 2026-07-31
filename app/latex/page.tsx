'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, Card, Collapsible, Readout } from '@/components/ui';
import { NumberInput } from '@/components/NumberInput';
import Latex from '@/components/Latex';
import { slugify } from '@/lib/slug';
import { VARIABLE_DEFS } from '@/lib/variableDefs';
import {
  coverageOf,
  severityOf,
  curveAtActual,
  kBase,
  K_MIN,
  assertOriginationAllowed,
  assertMintAllowed,
  splitBaseYieldTokenYield,
  monthlyPayment,
  levelizedInterest,
  splitElb,
  instantRedemptionFeeBps,
  INSTANT_FEE_BPS,
  convertTranche,
  instantRedemptionFeeSplit,
  blendedApy,
  blendedLoanApy,
  protocolBlendedApy,
  pickRebalanceTarget,
  NET_YIELD_FRACTION,
  ALLOCATION_CEILING_FRACTION,
  SEVERITY_REF,
  COVERAGE_WEIGHT_FLOOR,
  PERIODS_PER_YEAR,
  SECONDS_PER_DAY,
  SECONDS_PER_PERIOD,
  ZERO_LOAN_ACCRUAL,
  rollupLoanAccrual,
  addLoanToAccrual,
  fmtUSD,
  fmtUSD2,
  fmtPct,
  type YieldSource,
} from '@/lib/model';

// ---------------------------------------------------------------------------
// Worked-example machinery — every "compute" below calls the SAME functions
// every other page uses (imported above, nothing reimplemented here), so a
// worked example can never quietly drift from the formula it's illustrating.
// ---------------------------------------------------------------------------

/** Wraps a LaTeX fragment so the rendered symbol carries data-v="KEY" —
 * read back out by EqBlock's click handler via event delegation. Every
 * named variable in every tex string below should go through this instead
 * of being written as bare LaTeX, so clicking anywhere in a rendered
 * formula can resolve back to a real definition in VARIABLE_DEFS. */
function wrapVar(key: string, tex: string): string {
  return `\\htmlData{v=${key}}{${tex}}`;
}

/** Number formatting for embedding inside a LaTeX math expression — plain
 * digit-groups use {,} (a tight, non-spacing comma) rather than a bare ",",
 * which KaTeX renders as a math-mode list separator with extra spacing. */
function texNum(n: number, decimals = 0): string {
  const rounded = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
  const [intPart, decPart] = rounded.split('.');
  const negative = intPart.startsWith('-');
  const digits = negative ? intPart.slice(1) : intPart;
  const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '{,}');
  return `${negative ? '-' : ''}${withCommas}${decPart ? `.${decPart}` : ''}`;
}
function texDollar(n: number, decimals = 0): string {
  return `\\$${texNum(n, decimals)}`;
}
function texPct(fraction: number, decimals = 1): string {
  return `${(fraction * 100).toFixed(decimals)}\\%`;
}

interface WorkedInput {
  key: string;
  label: string;
  value: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}
interface WorkedOutput {
  label: string;
  value: string;
  detail?: string;
  color?: string;
}
interface Worked {
  inputs: WorkedInput[];
  compute: (v: Record<string, number>) => WorkedOutput[];
  /** Renders the SAME formula with real numbers plugged in, right where the
   * symbolic one is — so "which is which" is never a guessing game between
   * the equation and the input fields below it. Returns a plain (unwrapped)
   * LaTeX string; wrapVar isn't needed here since substituted numbers
   * aren't clickable variables, they're just numbers. */
  substituted?: (v: Record<string, number>) => string;
}

interface Eq {
  label: string;
  tex: string;
  note?: string;
  /** Exact term string from /glossary — "View in glossary" scrolls straight there. */
  glossaryTerm?: string;
  /** Exact path from /code-diff's FILES — "View in code" jumps straight there. */
  codeFile?: string;
  /** A live tool this formula's own mechanism actually runs inside. */
  tool?: { label: string; href: string };
  worked?: Worked;
}

function WorkedExample({ worked }: { worked: Worked }) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(worked.inputs.map((i) => [i.key, i.value])),
  );
  const outputs = worked.compute(values);
  return (
    <Collapsible label={<>🧮 <b>Worked example</b> — edit the numbers, the result recomputes live</>}>
      <div className="worked-inputs">
        {worked.inputs.map((inp) => (
          <label key={inp.key} className="worked-input">
            <span className="worked-input-label">{inp.label}</span>
            <span className="worked-input-field">
              {inp.prefix && <span className="worked-input-affix">{inp.prefix}</span>}
              <NumberInput
                step={inp.step ?? 1}
                value={values[inp.key]}
                onChange={(n) => setValues((v) => ({ ...v, [inp.key]: n }))}
              />
              {inp.suffix && <span className="worked-input-affix">{inp.suffix}</span>}
            </span>
          </label>
        ))}
      </div>
      {worked.substituted && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
            WITH THESE NUMBERS
          </div>
          <Latex tex={worked.substituted(values)} />
        </div>
      )}
      <div className="readout-grid" style={{ marginTop: 14 }}>
        {outputs.map((o) => (
          <Readout key={o.label} label={o.label} value={o.value} sub={o.detail} color={o.color} />
        ))}
      </div>
    </Collapsible>
  );
}

function CrossLinks({ e }: { e: Eq }) {
  if (!e.glossaryTerm && !e.codeFile && !e.tool) return null;
  return (
    <div className="latex-links">
      {e.glossaryTerm && (
        <Link href={`/glossary#${slugify(e.glossaryTerm)}`} className="latex-link" title={`Defined in full on /glossary: "${e.glossaryTerm}"`}>
          📖 View in glossary
        </Link>
      )}
      {e.codeFile && (
        <Link href={`/code-diff?file=${encodeURIComponent(e.codeFile)}`} className="latex-link" title={`Jump to ${e.codeFile} on /code-diff`}>
          ⎇ View in code
        </Link>
      )}
      {e.tool && (
        <Link href={e.tool.href} className="latex-link latex-link-accent">
          {e.tool.label}
        </Link>
      )}
    </div>
  );
}

/** Inline definition panel shown when a variable inside a rendered formula
 * gets clicked — not a floating tooltip (those are fragile to position
 * correctly against KaTeX's own internal layout), just a box that appears
 * right below the equation, same pattern as Collapsible elsewhere. */
function VariablePopover({ varKey, onClose }: { varKey: string; onClose: () => void }) {
  const def = VARIABLE_DEFS[varKey];
  if (!def) return null;
  return (
    <div className="latex-var-popover">
      <div className="latex-var-popover-head">
        <b>{def.symbol}</b>
        <button type="button" onClick={onClose} aria-label="Close" className="latex-var-popover-close">
          ✕
        </button>
      </div>
      <p style={{ margin: '4px 0 0' }}>{def.def}</p>
      {def.derivation && (
        <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>
          <b>How it came about:</b> {def.derivation}
        </p>
      )}
      {def.glossaryTerm && (
        <Link href={`/glossary#${slugify(def.glossaryTerm)}`} className="latex-link" style={{ marginTop: 8 }}>
          📖 Full definition in glossary →
        </Link>
      )}
    </div>
  );
}

function EqBlock({ e }: { e: Eq }) {
  const [activeVar, setActiveVar] = useState<string | null>(null);

  function handleClick(ev: React.MouseEvent<HTMLDivElement>) {
    const target = (ev.target as HTMLElement).closest('[data-v]');
    if (!target) return;
    const key = target.getAttribute('data-v');
    if (!key) return;
    setActiveVar((prev) => (prev === key ? null : key));
  }

  return (
    <div className="gloss-entry">
      <div className="gloss-term">{e.label}</div>
      <div className="latex-clickable" onClick={handleClick}>
        <Latex tex={e.tex} />
      </div>
      {activeVar && <VariablePopover varKey={activeVar} onClose={() => setActiveVar(null)} />}
      {e.note && <div className="gloss-def">{e.note}</div>}
      <CrossLinks e={e} />
      {e.worked && <WorkedExample worked={e.worked} />}
    </div>
  );
}

// Running example used throughout the app.
const FYC = 600000;
const FFC = 400000;
const OUT = 450000;

const ROUND_1: Eq[] = [
  {
    label: 'Coverage — the attachment point',
    tex: `\\text{Coverage} = \\min\\!\\left(\\frac{${wrapVar('FFC', '\\text{FFC}')}}{${wrapVar('Outstanding', '\\text{Outstanding}')}},\\; 1\\right)`,
    glossaryTerm: 'Coverage',
    codeFile: 'pinochio/src/helpers/coverage.rs',
    tool: { label: '▶ Play with the sliders on /explorer', href: '/explorer' },
    worked: {
      inputs: [
        { key: 'ffc', label: 'FFC', value: FFC, step: 10000, prefix: '$' },
        { key: 'outstanding', label: 'Outstanding', value: OUT, step: 10000, prefix: '$' },
      ],
      compute: (v) => [{ label: 'Coverage', value: fmtPct(coverageOf(v.outstanding, v.ffc), 1), color: 'var(--fyc)' }],
      substituted: (v) =>
        `\\text{Coverage} = \\min\\!\\left(\\frac{${texDollar(v.ffc)}}{${texDollar(v.outstanding)}},\\; 1\\right) = ${texPct(coverageOf(v.outstanding, v.ffc), 1)}`,
    },
  },
  {
    label: 'Severity — impact on FYC in the worst case',
    tex: `\\text{Severity} = \\frac{\\max(0,\\; ${wrapVar('Outstanding', '\\text{Outstanding}')} - ${wrapVar('FFC', '\\text{FFC}')})}{${wrapVar('FYC', '\\text{FYC}')}}`,
    glossaryTerm: 'Severity',
    codeFile: 'pinochio/src/helpers/coverage.rs',
    tool: { label: '▶ Play with the sliders on /explorer', href: '/explorer' },
    worked: {
      inputs: [
        { key: 'ffc', label: 'FFC', value: FFC, step: 10000, prefix: '$' },
        { key: 'outstanding', label: 'Outstanding', value: OUT, step: 10000, prefix: '$' },
        { key: 'fyc', label: 'FYC', value: FYC, step: 10000, prefix: '$' },
      ],
      compute: (v) => [{ label: 'Severity', value: fmtPct(severityOf(v.outstanding, v.ffc, v.fyc), 2), color: 'var(--ffc)' }],
      substituted: (v) =>
        `\\text{Severity} = \\frac{\\max(0,\\; ${texDollar(v.outstanding)} - ${texDollar(v.ffc)})}{${texDollar(v.fyc)}} = ${texPct(severityOf(v.outstanding, v.ffc, v.fyc), 2)}`,
    },
  },
  {
    label: 'Premium multiplier k',
    tex: `k = ${wrapVar('K_MIN', 'K_{\\text{MIN}}')} + \\left(${wrapVar('k_base', 'k_{\\text{base}}')}(${wrapVar('Coverage', '\\text{Coverage}')}) - ${wrapVar('K_MIN', 'K_{\\text{MIN}}')}\\right) \\times ${wrapVar('w', 'w')}`,
    note: 'where the severity-driven weight w is:',
    glossaryTerm: 'k (premium multiplier)',
    codeFile: 'pinochio/src/helpers/curve.rs',
    tool: { label: '▶ Play with the sliders on /explorer', href: '/explorer' },
    worked: {
      inputs: [
        { key: 'fyc', label: 'FYC', value: FYC, step: 10000, prefix: '$' },
        { key: 'ffc', label: 'FFC', value: FFC, step: 10000, prefix: '$' },
        { key: 'outstanding', label: 'Outstanding', value: OUT, step: 10000, prefix: '$' },
      ],
      compute: (v) => {
        const curve = curveAtActual(v.outstanding, v.ffc, v.fyc);
        return [
          { label: 'k', value: `${curve.k.toFixed(2)}×`, color: 'var(--ffc)' },
          { label: 'coverage', value: fmtPct(curve.coveragePct / 100, 1), detail: 'feeds k_base' },
          { label: 'severity', value: fmtPct(curve.severity, 2), detail: 'feeds w' },
        ];
      },
      substituted: (v) => {
        const curve = curveAtActual(v.outstanding, v.ffc, v.fyc);
        const base = kBase(curve.coveragePct);
        const factor = Math.min(1, curve.severity / SEVERITY_REF);
        const w = COVERAGE_WEIGHT_FLOOR + (1 - COVERAGE_WEIGHT_FLOOR) * factor;
        return `k = ${texNum(K_MIN, 2)} + \\left(${texNum(base, 2)} - ${texNum(K_MIN, 2)}\\right) \\times ${texNum(w, 3)} = ${texNum(curve.k, 2)}`;
      },
    },
  },
  {
    label: 'Coverage weight',
    tex: `w = ${wrapVar('COVERAGE_WEIGHT_FLOOR', '\\text{COVERAGE\\_WEIGHT\\_FLOOR}')} + \\left(1 - ${wrapVar('COVERAGE_WEIGHT_FLOOR', '\\text{COVERAGE\\_WEIGHT\\_FLOOR}')}\\right) \\times \\min\\!\\left(1,\\; \\frac{${wrapVar('Severity', '\\text{Severity}')}}{${wrapVar('SEVERITY_REF', '\\text{SEVERITY\\_REF}')}}\\right)`,
    glossaryTerm: 'COVERAGE_WEIGHT_FLOOR',
    codeFile: 'pinochio/src/helpers/curve.rs',
    worked: {
      inputs: [{ key: 'severityPct', label: 'Severity', value: 8.33, step: 0.5, suffix: '%' }],
      compute: (v) => {
        const severity = v.severityPct / 100;
        const factor = Math.min(1, severity / SEVERITY_REF);
        const w = COVERAGE_WEIGHT_FLOOR + (1 - COVERAGE_WEIGHT_FLOOR) * factor;
        return [{ label: 'w', value: w.toFixed(3), detail: `coverage keeps ≥${fmtPct(COVERAGE_WEIGHT_FLOOR, 0)} of its own say regardless` }];
      },
      substituted: (v) => {
        const severity = v.severityPct / 100;
        const factor = Math.min(1, severity / SEVERITY_REF);
        const w = COVERAGE_WEIGHT_FLOOR + (1 - COVERAGE_WEIGHT_FLOOR) * factor;
        return `w = ${texNum(COVERAGE_WEIGHT_FLOOR, 2)} + \\left(1 - ${texNum(COVERAGE_WEIGHT_FLOOR, 2)}\\right) \\times \\min\\!\\left(1,\\; \\frac{${texPct(severity, 2)}}{${texPct(SEVERITY_REF, 0)}}\\right) = ${texNum(w, 3)}`;
      },
    },
  },
  {
    label: 'FFC share of net loan interest',
    tex: `${wrapVar('FFC_share', '\\text{FFC}_{\\text{share}}')} = \\frac{${wrapVar('k', 'k')} \\times ${wrapVar('FFC', '\\text{FFC}')}}{${wrapVar('FYC', '\\text{FYC}')} + ${wrapVar('k', 'k')} \\times ${wrapVar('FFC', '\\text{FFC}')}}`,
    glossaryTerm: 'k (premium multiplier)',
    codeFile: 'pinochio/src/helpers/curve.rs',
    worked: {
      inputs: [
        { key: 'fyc', label: 'FYC', value: FYC, step: 10000, prefix: '$' },
        { key: 'ffc', label: 'FFC', value: FFC, step: 10000, prefix: '$' },
        { key: 'outstanding', label: 'Outstanding', value: OUT, step: 10000, prefix: '$' },
      ],
      compute: (v) => {
        const curve = curveAtActual(v.outstanding, v.ffc, v.fyc);
        return [
          { label: 'FFC share', value: fmtPct(curve.share, 1), color: 'var(--ffc)' },
          { label: 'FYC share', value: fmtPct(1 - curve.share, 1), color: 'var(--fyc)' },
        ];
      },
      substituted: (v) => {
        const curve = curveAtActual(v.outstanding, v.ffc, v.fyc);
        return `\\text{FFC}_{\\text{share}} = \\frac{${texNum(curve.k, 2)} \\times ${texDollar(v.ffc)}}{${texDollar(v.fyc)} + ${texNum(curve.k, 2)} \\times ${texDollar(v.ffc)}} = ${texPct(curve.share, 1)}`;
      },
    },
  },
  {
    label: 'Origination gate',
    tex: `\\text{allowed} \\iff \\text{Severity}(${wrapVar('Outstanding', 'P_{\\text{outstanding}}')} + ${wrapVar('new_loan_amount', '\\text{new\\_loan}')},\\, ${wrapVar('FFC', '\\text{FFC}')},\\, ${wrapVar('FYC', '\\text{FYC}')}) \\le ${wrapVar('SEVERITY_GATE_MAX', '\\text{SEVERITY\\_GATE\\_MAX}')}`,
    glossaryTerm: 'SEVERITY_GATE_MAX — origination gate',
    codeFile: 'pinochio/src/helpers/coverage.rs',
    tool: { label: '▶ Play with the sliders on /explorer', href: '/explorer' },
    worked: {
      inputs: [
        { key: 'fyc', label: 'FYC', value: FYC, step: 10000, prefix: '$' },
        { key: 'ffc', label: 'FFC', value: FFC, step: 10000, prefix: '$' },
        { key: 'outstanding', label: 'Outstanding', value: OUT, step: 10000, prefix: '$' },
        { key: 'newLoan', label: 'New loan', value: 50000, step: 10000, prefix: '$' },
      ],
      compute: (v) => {
        const gate = assertOriginationAllowed({ fyc: v.fyc, ffc: v.ffc, outstanding: v.outstanding }, v.newLoan);
        return [
          { label: 'Allowed?', value: gate.allowed ? 'Yes' : 'No — blocked', color: gate.allowed ? 'var(--good)' : 'var(--critical)' },
          { label: 'Projected severity', value: fmtPct(gate.severity, 2), detail: `vs. ${fmtPct(gate.threshold, 0)} max` },
        ];
      },
      substituted: (v) => {
        const gate = assertOriginationAllowed({ fyc: v.fyc, ffc: v.ffc, outstanding: v.outstanding }, v.newLoan);
        return `\\text{Severity}(${texDollar(v.outstanding)} + ${texDollar(v.newLoan)},\\, ${texDollar(v.ffc)},\\, ${texDollar(v.fyc)}) = ${texPct(gate.severity, 2)} \\;${gate.allowed ? '\\le' : '>'}\\; ${texPct(gate.threshold, 0)}`;
      },
    },
  },
  {
    label: 'FFC mint floor',
    tex: `\\text{allowed} \\iff \\text{Severity}(${wrapVar('Outstanding', '\\text{Outstanding}')},\\, ${wrapVar('FFC', '\\text{FFC}')},\\, ${wrapVar('FYC', '\\text{FYC}')}) > ${wrapVar('SEVERITY_MINT_FLOOR', '\\text{SEVERITY\\_MINT\\_FLOOR}')}`,
    glossaryTerm: 'SEVERITY_MINT_FLOOR — minting ceiling',
    codeFile: 'pinochio/src/helpers/coverage.rs',
    worked: {
      inputs: [
        { key: 'fyc', label: 'FYC', value: FYC, step: 10000, prefix: '$' },
        { key: 'ffc', label: 'FFC', value: FFC, step: 10000, prefix: '$' },
        { key: 'outstanding', label: 'Outstanding', value: OUT, step: 10000, prefix: '$' },
      ],
      compute: (v) => {
        const gate = assertMintAllowed({ fyc: v.fyc, ffc: v.ffc, outstanding: v.outstanding });
        return [
          { label: 'New FFC allowed?', value: gate.allowed ? 'Yes' : 'No — floor hit', color: gate.allowed ? 'var(--good)' : 'var(--critical)' },
          { label: 'Severity', value: fmtPct(gate.severity, 2), detail: `vs. ${fmtPct(gate.threshold, 0)} floor` },
        ];
      },
      substituted: (v) => {
        const gate = assertMintAllowed({ fyc: v.fyc, ffc: v.ffc, outstanding: v.outstanding });
        return `\\text{Severity}(${texDollar(v.outstanding)},\\, ${texDollar(v.ffc)},\\, ${texDollar(v.fyc)}) = ${texPct(gate.severity, 2)} \\;${gate.allowed ? '>' : '\\le'}\\; ${texPct(gate.threshold, 0)}`;
      },
    },
  },
  {
    label: 'Reserve / yield-token yield split (flat pro-rata)',
    tex: `${wrapVar('FYC_share', '\\text{FYC}_{\\text{share}}')} = ${wrapVar('NetYield', '\\text{NetYield}')} \\times \\frac{${wrapVar('FYC', '\\text{FYC}')}}{${wrapVar('FYC', '\\text{FYC}')} + ${wrapVar('FFC', '\\text{FFC}')}}, \\qquad ${wrapVar('FFC_share', '\\text{FFC}_{\\text{share}}')} = ${wrapVar('NetYield', '\\text{NetYield}')} - ${wrapVar('FYC_share', '\\text{FYC}_{\\text{share}}')}`,
    glossaryTerm: 'Reserve / yield-token yield split',
    codeFile: 'pinochio/src/helpers/waterfall.rs',
    worked: {
      inputs: [
        { key: 'netYield', label: 'Net yield this period', value: 10000, step: 500, prefix: '$' },
        { key: 'fyc', label: 'FYC', value: FYC, step: 10000, prefix: '$' },
        { key: 'ffc', label: 'FFC', value: FFC, step: 10000, prefix: '$' },
      ],
      compute: (v) => {
        const split = splitBaseYieldTokenYield(v.netYield, v.fyc, v.ffc);
        return [
          { label: 'FYC gets', value: fmtUSD(split.fycShare), color: 'var(--fyc)' },
          { label: 'FFC gets', value: fmtUSD(split.ffcShare), color: 'var(--ffc)' },
        ];
      },
      substituted: (v) => {
        const split = splitBaseYieldTokenYield(v.netYield, v.fyc, v.ffc);
        return `\\text{FYC}_{\\text{share}} = ${texDollar(v.netYield)} \\times \\frac{${texDollar(v.fyc)}}{${texDollar(v.fyc)} + ${texDollar(v.ffc)}} = ${texDollar(split.fycShare, 2)}, \\qquad \\text{FFC}_{\\text{share}} = ${texDollar(split.ffcShare, 2)}`;
      },
    },
  },
  {
    label: 'Net / gross yield (85/15 protocol fee)',
    tex: `${wrapVar('NetYield', '\\text{NetYield}')} = 0.85 \\times ${wrapVar('GrossYield', '\\text{GrossYield}')}`,
    glossaryTerm: 'Net yield / gross yield',
    codeFile: 'pinochio/src/helpers/waterfall.rs',
    worked: {
      inputs: [{ key: 'gross', label: 'Gross yield', value: 10000, step: 500, prefix: '$' }],
      compute: (v) => {
        const net = v.gross * NET_YIELD_FRACTION;
        return [
          { label: 'Net (to tranches)', value: fmtUSD(net), color: 'var(--good)' },
          { label: 'Fee (mints FYC)', value: fmtUSD(v.gross - net) },
        ];
      },
      substituted: (v) => `\\text{NetYield} = 0.85 \\times ${texDollar(v.gross)} = ${texDollar(v.gross * NET_YIELD_FRACTION, 2)}`,
    },
  },
  {
    label: 'True amortization — level payment per period',
    tex: `${wrapVar('M', 'M')} = \\frac{${wrapVar('P', 'P')} \\cdot ${wrapVar('r', 'r')}}{1 - (1+${wrapVar('r', 'r')})^{-${wrapVar('n', 'n')}}}, \\qquad ${wrapVar('r', 'r')} = ${wrapVar('APR', '\\text{APR}')} \\times \\frac{${wrapVar('SECONDS_PER_PERIOD', '\\text{SECONDS\\_PER\\_PERIOD}')}}{${wrapVar('SECONDS_PER_YEAR', '\\text{SECONDS\\_PER\\_YEAR}')}},\\;\\; ${wrapVar('n', 'n')} = \\text{term (periods)}`,
    note: 'Fixed in round 2 from r = APR/12 (a 30/360 day-count, since a period is 30 days, not a calendar month) to this exact fraction — see PERIODS_PER_YEAR in the round 2 group below.',
    glossaryTerm: 'True amortization',
    codeFile: 'pinochio/src/helpers/amortization.rs',
    tool: { label: '▶ See a full loan schedule on /simulator', href: '/simulator' },
    worked: {
      inputs: [
        { key: 'principal', label: 'Principal', value: 100000, step: 5000, prefix: '$' },
        { key: 'aprPct', label: 'APR', value: 15, step: 0.5, suffix: '%' },
        { key: 'termPeriods', label: 'Term', value: 36, step: 1, suffix: 'periods' },
      ],
      compute: (v) => {
        const m = monthlyPayment(v.principal, v.aprPct / 100, v.termPeriods);
        return [{ label: 'Payment per period', value: fmtUSD2(m), color: 'var(--fyc)' }];
      },
      substituted: (v) => {
        const r = v.aprPct / 100 / PERIODS_PER_YEAR;
        const m = monthlyPayment(v.principal, v.aprPct / 100, v.termPeriods);
        return `M = \\frac{${texDollar(v.principal)} \\cdot ${r.toFixed(5)}}{1 - (1+${r.toFixed(5)})^{-${texNum(v.termPeriods)}}} = ${texDollar(m, 2)}`;
      },
    },
  },
  {
    label: 'Levelized interest',
    tex: `${wrapVar('LevelizedInterest', '\\text{LevelizedInterest}')} = \\frac{${wrapVar('M', 'M')} \\times ${wrapVar('n', 'n')} - ${wrapVar('P', 'P')}}{${wrapVar('n', 'n')}}`,
    glossaryTerm: 'Levelized interest',
    codeFile: 'pinochio/src/helpers/amortization.rs',
    worked: {
      inputs: [
        { key: 'principal', label: 'Principal', value: 100000, step: 5000, prefix: '$' },
        { key: 'aprPct', label: 'APR', value: 15, step: 0.5, suffix: '%' },
        { key: 'termPeriods', label: 'Term', value: 36, step: 1, suffix: 'periods' },
      ],
      compute: (v) => [{ label: 'Levelized interest / period', value: fmtUSD2(levelizedInterest(v.principal, v.aprPct / 100, v.termPeriods)), color: 'var(--ffc)' }],
      substituted: (v) => {
        const m = monthlyPayment(v.principal, v.aprPct / 100, v.termPeriods);
        const li = levelizedInterest(v.principal, v.aprPct / 100, v.termPeriods);
        return `\\text{LevelizedInterest} = \\frac{${texDollar(m, 2)} \\times ${texNum(v.termPeriods)} - ${texDollar(v.principal)}}{${texNum(v.termPeriods)}} = ${texDollar(li, 2)}`;
      },
    },
  },
];

const REDEEM_SIM_PRESET = '/simulator?fyc=600000&ffc=400000&redeemTranche=ffc&redeemAmount=150000&redeemMode=instant&redeemPeriod=3&cursor=3';

const ROUND_2: Eq[] = [
  {
    label: 'PERIODS_PER_YEAR (the day-count fix)',
    tex: `${wrapVar('PERIODS_PER_YEAR', '\\text{PERIODS\\_PER\\_YEAR}')} = \\frac{${wrapVar('SECONDS_PER_YEAR', '\\text{SECONDS\\_PER\\_YEAR}')}}{${wrapVar('SECONDS_PER_PERIOD', '\\text{SECONDS\\_PER\\_PERIOD}')}} = \\frac{365}{30} \\approx 12.1667`,
    note: 'Not 12 — a 30-day period is not 1/12 of a 365-day year. Used everywhere a rate crosses between "per period" and "per year": amortization (above) and every APY below.',
    glossaryTerm: 'PERIODS_PER_YEAR',
    codeFile: 'pinochio/src/constants.rs',
    worked: {
      inputs: [
        { key: 'periodDays', label: 'Days per period', value: 30, step: 1 },
        { key: 'yearDays', label: 'Days per year', value: 365, step: 1 },
      ],
      compute: (v) => {
        const ppy = v.yearDays / v.periodDays;
        const overcharge = (ppy / 12 - 1) * 100;
        return [
          { label: 'Periods / year', value: ppy.toFixed(4), color: 'var(--fyc)' },
          { label: 'If you used /12 instead', value: `${overcharge >= 0 ? '+' : ''}${overcharge.toFixed(2)}% off`, detail: 'the old bug, quantified' },
        ];
      },
      substituted: (v) => `\\text{PERIODS\\_PER\\_YEAR} = \\frac{${texNum(v.yearDays)}}{${texNum(v.periodDays)}} = ${(v.yearDays / v.periodDays).toFixed(4)}`,
    },
  },
  {
    label: 'Reserve target (the "20% always stays as reserve" floor)',
    tex: `${wrapVar('ReserveTargetFraction', '\\text{ReserveTargetFraction}')} = 1 - ${wrapVar('AllocationCeilingFraction', '\\text{AllocationCeilingFraction}')} = 1 - 0.80 = 0.20`,
    note: 'Not an independent gate — the algebraic complement of the existing 80% loan-allocation ceiling.',
    codeFile: 'pinochio/src/constants.rs',
    worked: {
      inputs: [{ key: 'allocCeilingPct', label: 'Allocation ceiling', value: ALLOCATION_CEILING_FRACTION * 100, step: 1, suffix: '%' }],
      compute: (v) => [{ label: 'Reserve floor', value: `${(100 - v.allocCeilingPct).toFixed(0)}%`, color: 'var(--good)' }],
      substituted: (v) => `\\text{ReserveTargetFraction} = 1 - ${(v.allocCeilingPct / 100).toFixed(2)} = ${(1 - v.allocCeilingPct / 100).toFixed(2)}`,
    },
  },
  {
    label: 'ELB — Excess Liquidity Balance',
    tex: `${wrapVar('ELB_total', '\\text{ELB}_{\\text{total}}')} = (${wrapVar('FYC', '\\text{FYC}')} + ${wrapVar('FFC', '\\text{FFC}')}) - ${wrapVar('Outstanding', '\\text{Outstanding}')} - ${wrapVar('Earmarked', '\\text{Earmarked}')}`,
    glossaryTerm: 'ELB',
    codeFile: 'pinochio/src/helpers/liquidity.rs',
    tool: { label: '▶ Watch ELB move on /simulator', href: '/simulator' },
    worked: {
      inputs: [
        { key: 'fyc', label: 'FYC', value: FYC, step: 10000, prefix: '$' },
        { key: 'ffc', label: 'FFC', value: FFC, step: 10000, prefix: '$' },
        { key: 'outstanding', label: 'Outstanding', value: OUT, step: 10000, prefix: '$' },
        { key: 'earmarked', label: 'Earmarked', value: 0, step: 10000, prefix: '$' },
      ],
      compute: (v) => {
        const total = Math.max(0, v.fyc + v.ffc - v.outstanding - v.earmarked);
        const split = splitElb(total, v.fyc, v.ffc);
        return [
          { label: 'ELB total', value: fmtUSD(split.elbTotal), color: 'var(--good)' },
          { label: 'ELB FYC', value: fmtUSD(split.elbFyc), color: 'var(--fyc)' },
          { label: 'ELB FFC', value: fmtUSD(split.elbFfc), color: 'var(--ffc)' },
        ];
      },
      substituted: (v) => {
        const total = Math.max(0, v.fyc + v.ffc - v.outstanding - v.earmarked);
        return `\\text{ELB}_{\\text{total}} = (${texDollar(v.fyc)} + ${texDollar(v.ffc)}) - ${texDollar(v.outstanding)} - ${texDollar(v.earmarked)} = ${texDollar(total)}`;
      },
    },
  },
  {
    label: 'ELB tranche split (pro-rata by pool share)',
    tex: `${wrapVar('ELB_FYC', '\\text{ELB}_{\\text{FYC}}')} = ${wrapVar('ELB_total', '\\text{ELB}_{\\text{total}}')} \\times \\frac{${wrapVar('FYC', '\\text{FYC}')}}{${wrapVar('FYC', '\\text{FYC}')}+${wrapVar('FFC', '\\text{FFC}')}}, \\qquad ${wrapVar('ELB_FFC', '\\text{ELB}_{\\text{FFC}}')} = ${wrapVar('ELB_total', '\\text{ELB}_{\\text{total}}')} - ${wrapVar('ELB_FYC', '\\text{ELB}_{\\text{FYC}}')}`,
    glossaryTerm: 'ELB',
    codeFile: 'pinochio/src/helpers/liquidity.rs',
  },
  {
    label: 'Instant-redemption fee (endpoint-rate formula)',
    tex: `${wrapVar('fee_bps', '\\text{fee}_{\\text{bps}}')} = ${wrapVar('fee_min', '\\text{fee}_{\\min}')} + \\frac{${wrapVar('amount', '\\text{amount}')}}{${wrapVar('ELB_tranche', '\\text{ELB}_{\\text{tranche}}')}} \\times \\left(${wrapVar('fee_max', '\\text{fee}_{\\max}')} - ${wrapVar('fee_min', '\\text{fee}_{\\min}')}\\right)`,
    note: 'FYC: [10, 50] bps. FFC: [50, 100] bps. Undefined (instant path unavailable) for amount > ELB_tranche.',
    glossaryTerm: 'Instant-redemption fee scale',
    codeFile: 'pinochio/src/helpers/liquidity.rs',
    tool: { label: '▶ Run this exact redemption on /simulator', href: REDEEM_SIM_PRESET },
    worked: {
      inputs: [
        { key: 'elbTranche', label: 'ELB (FYC)', value: 40000, step: 5000, prefix: '$' },
        { key: 'amount', label: 'Redeem amount', value: 20000, step: 1000, prefix: '$' },
      ],
      compute: (v) => {
        const fee = instantRedemptionFeeBps('fyc', v.amount, v.elbTranche);
        return fee.allowed
          ? [
              { label: 'Fee rate', value: `${fee.feeBps.toFixed(2)} bps`, color: 'var(--fyc)' },
              { label: 'Fee value', value: fmtUSD2(fee.feeValue) },
              { label: 'Net payout', value: fmtUSD2(fee.netPayout), color: 'var(--good)' },
            ]
          : [{ label: 'Result', value: 'Blocked — amount exceeds ELB', color: 'var(--critical)', detail: 'must use the scheduled 30d/90d queue instead' }];
      },
      substituted: (v) => {
        const [feeMin, feeMax] = INSTANT_FEE_BPS.fyc;
        const fee = instantRedemptionFeeBps('fyc', v.amount, v.elbTranche);
        return `\\text{fee}_{\\text{bps}} = ${feeMin} + \\frac{${texDollar(v.amount)}}{${texDollar(v.elbTranche)}} \\times (${feeMax} - ${feeMin}) = ${fee.allowed ? fee.feeBps.toFixed(2) : '\\text{blocked}'}`;
      },
    },
  },
  {
    label: 'Split-invariant variant (recommended hardening, not adopted by default)',
    tex: `${wrapVar('fee', '\\text{fee}')} = ${wrapVar('fee_min', '\\text{fee}_{\\min}')}\\cdot${wrapVar('amount', '\\text{amount}')} + \\left(${wrapVar('fee_max', '\\text{fee}_{\\max}')}-${wrapVar('fee_min', '\\text{fee}_{\\min}')}\\right) \\cdot \\frac{${wrapVar('amount', '\\text{amount}')}^2}{2 \\cdot ${wrapVar('ELB_tranche', '\\text{ELB}_{\\text{tranche}}')}}`,
    note: 'The closed-form integral of the marginal fee rate over [0, amount] — exactly half the quadratic term of the endpoint-rate formula above, and immune to splitting one redemption into many.',
    codeFile: 'pinochio/src/helpers/liquidity.rs',
    worked: {
      inputs: [
        { key: 'elbTranche', label: 'ELB (FYC)', value: 40000, step: 5000, prefix: '$' },
        { key: 'amount', label: 'Redeem amount', value: 20000, step: 1000, prefix: '$' },
        { key: 'feeMinBps', label: 'fee_min', value: 10, step: 1, suffix: 'bps' },
        { key: 'feeMaxBps', label: 'fee_max', value: 50, step: 1, suffix: 'bps' },
      ],
      compute: (v) => {
        const endpointBps = v.feeMinBps + (v.amount / v.elbTranche) * (v.feeMaxBps - v.feeMinBps);
        const endpointFee = (v.amount * endpointBps) / 10000;
        const integralFee = (v.feeMinBps / 10000) * v.amount + ((v.feeMaxBps - v.feeMinBps) / 10000) * (v.amount * v.amount) / (2 * v.elbTranche);
        return [
          { label: 'Endpoint formula (adopted)', value: fmtUSD2(endpointFee), color: 'var(--ffc)' },
          { label: 'Split-invariant integral', value: fmtUSD2(integralFee), color: 'var(--good)', detail: 'always ≤ the endpoint fee — this is the "closes the loophole" number' },
        ];
      },
      substituted: (v) => {
        const integralFee = (v.feeMinBps / 10000) * v.amount + ((v.feeMaxBps - v.feeMinBps) / 10000) * (v.amount * v.amount) / (2 * v.elbTranche);
        return `\\text{fee} = ${(v.feeMinBps / 10000).toFixed(4)}\\cdot${texDollar(v.amount)} + \\left(${(v.feeMaxBps / 10000).toFixed(4)}-${(v.feeMinBps / 10000).toFixed(4)}\\right) \\cdot \\frac{${texDollar(v.amount)}^2}{2 \\cdot ${texDollar(v.elbTranche)}} = ${texDollar(integralFee, 2)}`;
      },
    },
  },
  {
    label: 'jr_to_sr conversion (burns FFC, mints FYC — mirrors sr_to_jr)',
    tex: `${wrapVar('jrToSrValue', '\\text{value}')} = ${wrapVar('tokens_in', '\\text{tokens}_{\\text{in}}')} \\times ${wrapVar('price_cons', '\\text{FFC}_{\\text{price}}^{\\text{cons}}')}, \\qquad ${wrapVar('tokens_out', '\\text{tokens}_{\\text{out}}')} = \\frac{${wrapVar('jrToSrValue', '\\text{value}')}}{${wrapVar('price_cons', '\\text{FYC}_{\\text{price}}^{\\text{cons}}')}}`,
    note: 'Both legs at conservative price — value moves between tranches, V_pool = V_FYC + V_FFC is unchanged.',
    glossaryTerm: 'jr_to_sr / sr_to_jr',
    codeFile: 'pinochio/src/helpers/tranche_convert.rs',
    tool: { label: '▶ Run this exact redemption on /simulator', href: REDEEM_SIM_PRESET },
    worked: {
      inputs: [
        { key: 'tokensIn', label: 'FFC tokens in', value: 10000, step: 500 },
        { key: 'ffcPrice', label: 'FFC price', value: 0.97, step: 0.01, prefix: '$' },
        { key: 'fycPrice', label: 'FYC price', value: 1.04, step: 0.01, prefix: '$' },
      ],
      compute: (v) => {
        const r = convertTranche('jrToSr', v.tokensIn, v.fycPrice, v.ffcPrice);
        return [
          { label: 'Value moved', value: fmtUSD2(r.valueUsd) },
          { label: 'FYC tokens out', value: r.tokensMinted.toFixed(2), color: 'var(--fyc)' },
        ];
      },
      substituted: (v) => {
        const r = convertTranche('jrToSr', v.tokensIn, v.fycPrice, v.ffcPrice);
        return `\\text{value} = ${texNum(v.tokensIn)} \\times ${texDollar(v.ffcPrice, 2)} = ${texDollar(r.valueUsd, 2)}, \\qquad \\text{tokens}_{\\text{out}} = \\frac{${texDollar(r.valueUsd, 2)}}{${texDollar(v.fycPrice, 2)}} = ${r.tokensMinted.toFixed(2)}`;
      },
    },
  },
  {
    label: 'Redemption-fee settlement (always as FYC, 50/50)',
    tex: `${wrapVar('Protocol_FYC', '\\text{Protocol}_{\\text{FYC}}')} = ${wrapVar('Insurance_FYC', '\\text{Insurance}_{\\text{FYC}}')} = \\frac{${wrapVar('fee_value', '\\text{fee}_{\\text{value}}')}}{2}`,
    glossaryTerm: 'Redemption fee settlement',
    codeFile: 'pinochio/src/instructions/accelerated_redeem.rs',
    tool: { label: '▶ Run this exact redemption on /simulator', href: REDEEM_SIM_PRESET },
    worked: {
      inputs: [
        { key: 'feeValue', label: 'Fee value', value: 1000, step: 50, prefix: '$' },
        { key: 'fycPrice', label: 'FYC price', value: 1.04, step: 0.01, prefix: '$' },
        { key: 'ffcPrice', label: 'FFC price', value: 0.97, step: 0.01, prefix: '$' },
      ],
      compute: (v) => {
        const split = instantRedemptionFeeSplit('ffc', v.feeValue, v.fycPrice, v.ffcPrice);
        return [
          { label: 'Protocol wallet', value: fmtUSD2(split.protocolValueUsd), color: 'var(--fyc)' },
          { label: 'Insurance wallet', value: fmtUSD2(split.insuranceValueUsd), color: 'var(--fyc)' },
          { label: 'FFC burned', value: `${split.ffcTokensBurned.toFixed(2)} tokens` },
        ];
      },
      substituted: (v) => {
        const split = instantRedemptionFeeSplit('ffc', v.feeValue, v.fycPrice, v.ffcPrice);
        return `\\text{Protocol}_{\\text{FYC}} = \\text{Insurance}_{\\text{FYC}} = \\frac{${texDollar(v.feeValue)}}{2} = ${texDollar(split.protocolValueUsd, 2)}`;
      },
    },
  },
  {
    label: 'Loan-origination liquidity gate',
    tex: `${wrapVar('ELB_total', '\\text{ELB}_{\\text{total}}')} - ${wrapVar('Pending_FYC', '\\text{Pending}_{\\text{FYC}}')} - ${wrapVar('Pending_FFC', '\\text{Pending}_{\\text{FFC}}')} - ${wrapVar('Earmarked', '\\text{Earmarked}')} \\;\\ge\\; ${wrapVar('new_loan_amount', '\\text{new\\_loan\\_amount}')}`,
    codeFile: 'pinochio/src/helpers/coverage.rs',
    worked: {
      inputs: [
        { key: 'elbTotal', label: 'ELB total', value: 550000, step: 10000, prefix: '$' },
        { key: 'pendingFyc', label: 'Pending FYC', value: 0, step: 5000, prefix: '$' },
        { key: 'pendingFfc', label: 'Pending FFC', value: 0, step: 5000, prefix: '$' },
        { key: 'earmarked', label: 'Earmarked', value: 0, step: 5000, prefix: '$' },
        { key: 'newLoan', label: 'New loan', value: 100000, step: 10000, prefix: '$' },
      ],
      compute: (v) => {
        const available = v.elbTotal - v.pendingFyc - v.pendingFfc - v.earmarked;
        const allowed = v.newLoan <= available;
        return [
          { label: 'Available', value: fmtUSD(available) },
          { label: 'Allowed?', value: allowed ? 'Yes' : 'No — blocked', color: allowed ? 'var(--good)' : 'var(--critical)' },
        ];
      },
      substituted: (v) => {
        const available = v.elbTotal - v.pendingFyc - v.pendingFfc - v.earmarked;
        const allowed = v.newLoan <= available;
        return `${texDollar(v.elbTotal)} - ${texDollar(v.pendingFyc)} - ${texDollar(v.pendingFfc)} - ${texDollar(v.earmarked)} \\;${allowed ? '\\ge' : '<'}\\; ${texDollar(v.newLoan)}`;
      },
    },
  },
  {
    label: 'Per-source observed APY (the building block blended APY is made of)',
    tex: `${wrapVar('APY_i', '\\text{APY}_i')} = \\frac{${wrapVar('price_i_now', '\\text{price}_{i,\\text{now}}')} - ${wrapVar('price_i_last', '\\text{price}_{i,\\text{last}}')}}{${wrapVar('price_i_last', '\\text{price}_{i,\\text{last}}')}} \\times \\frac{${wrapVar('SECONDS_PER_YEAR', '\\text{SECONDS\\_PER\\_YEAR}')}}{${wrapVar('elapsed_i', '\\text{elapsed}_i')}}`,
    note: 'Computed once per yield source, every epoch tick (run_yield_epoch) — the exact same price-delta method the pool already used for its one original reserve, just applied per-source now. This is what feeds Capital_i × APY_i below, not a separate estimate. Prices come from a Pyth on-chain oracle feed per registered source — see /yield-sources.',
    glossaryTerm: 'Per-source observed APY',
    codeFile: 'pinochio/src/instructions/run_yield_epoch.rs',
    worked: {
      inputs: [
        { key: 'priceLast', label: 'Price last epoch', value: 1.04, step: 0.001, prefix: '$' },
        { key: 'priceNow', label: 'Price now', value: 1.0435, step: 0.001, prefix: '$' },
        { key: 'elapsedDays', label: 'Days elapsed', value: 30, step: 1 },
      ],
      compute: (v) => {
        const apy = ((v.priceNow - v.priceLast) / v.priceLast) * (PERIODS_PER_YEAR * 30 / v.elapsedDays);
        return [{ label: 'Observed APY', value: fmtPct(apy, 2), color: 'var(--good)' }];
      },
      substituted: (v) => {
        const apy = ((v.priceNow - v.priceLast) / v.priceLast) * (365 / v.elapsedDays);
        return `\\text{APY}_i = \\frac{${texDollar(v.priceNow, 4)} - ${texDollar(v.priceLast, 4)}}{${texDollar(v.priceLast, 4)}} \\times \\frac{365}{${texNum(v.elapsedDays)}} = ${texPct(apy, 2)}`;
      },
    },
  },
  {
    label: 'Blended portfolio APY across yield sources',
    tex: `${wrapVar('APY_bar', '\\overline{\\text{APY}}')} = \\frac{\\sum_{i} ${wrapVar('Capital_i', '\\text{Capital}_i')} \\times ${wrapVar('APY_i', '\\text{APY}_i')}}{\\sum_{i} ${wrapVar('Capital_i', '\\text{Capital}_i')}}`,
    note: 'Structurally identical to Hylo’s published "Average SOL Reserve Yield" equation. Every source with capital still deployed is summed — enabled or disabled. A disabled source is still earning real yield on whatever hasn’t been unwound out of it yet, so excluding it would understate the pool’s actual blend; only a source with zero capital left drops out, and it does so for free (a $0 term contributes zero to both the sum and the total). "Enabled" only decides where NEW capital routes — see the Target-range rebalance selection formula below — a separate question from what this formula measures.',
    glossaryTerm: 'Blended portfolio APY',
    codeFile: 'pinochio/src/helpers/liquidity.rs',
    tool: { label: '▶ See the full breakdown on /yield-sources', href: '/yield-sources' },
    worked: {
      inputs: [
        { key: 'cap1', label: 'USDY capital', value: 600000, step: 10000, prefix: '$' },
        { key: 'apy1', label: 'USDY APY', value: 4.2, step: 0.1, suffix: '%' },
        { key: 'cap2', label: 'syrupUSDC capital', value: 300000, step: 10000, prefix: '$' },
        { key: 'apy2', label: 'syrupUSDC APY', value: 2.8, step: 0.1, suffix: '%' },
      ],
      compute: (v) => {
        const sources: YieldSource[] = [
          { id: 'a', capitalUsd: v.cap1, apy: v.apy1 / 100, enabled: true },
          { id: 'b', capitalUsd: v.cap2, apy: v.apy2 / 100, enabled: true },
        ];
        return [{ label: 'Blended APY', value: fmtPct(blendedApy(sources), 2), color: 'var(--good)' }];
      },
      substituted: (v) => {
        const sources: YieldSource[] = [
          { id: 'a', capitalUsd: v.cap1, apy: v.apy1 / 100, enabled: true },
          { id: 'b', capitalUsd: v.cap2, apy: v.apy2 / 100, enabled: true },
        ];
        const blend = blendedApy(sources);
        return `\\overline{\\text{APY}} = \\frac{${texDollar(v.cap1)} \\times ${texPct(v.apy1 / 100, 1)} + ${texDollar(v.cap2)} \\times ${texPct(v.apy2 / 100, 1)}}{${texDollar(v.cap1)} + ${texDollar(v.cap2)}} = ${texPct(blend, 2)}`;
      },
    },
  },
  {
    label: 'Optimistic price (used to mint)',
    tex: `${wrapVar('price_opt', '\\text{price}_{\\text{opt}}')} = \\frac{${wrapVar('V_tranche', 'V_{\\text{tranche}}')} + ${wrapVar('yield_estimate', '\\text{yield\\_estimate}')} + ${wrapVar('loan_estimate', '\\text{loan\\_estimate}')}}{${wrapVar('total_supply', '\\text{total\\_supply}')}}`,
    note: 'Deliberately assumes yield that has genuinely accrued but hasn’t been formally collected yet is already in the tranche’s value — so a same-period depositor can’t buy in cheap right before a sweep and dilute existing holders. loan_estimate is the Reward-per-second accrual below; yield_estimate is the reserve token’s own unrealized price appreciation since its last epoch tick.',
    glossaryTerm: 'Optimistic price',
    codeFile: 'pinochio/src/helpers/allocation.rs',
    worked: {
      inputs: [
        { key: 'vTranche', label: 'V_tranche', value: 600000, step: 10000, prefix: '$' },
        { key: 'yieldEstimate', label: 'Yield estimate', value: 2100, step: 100, prefix: '$' },
        { key: 'loanEstimate', label: 'Loan estimate', value: 3400, step: 100, prefix: '$' },
        { key: 'supply', label: 'Total supply', value: 600000, step: 10000, suffix: 'tokens' },
      ],
      compute: (v) => {
        const price = (v.vTranche + v.yieldEstimate + v.loanEstimate) / v.supply;
        return [{ label: 'Optimistic (mint) price', value: `$${price.toFixed(4)}`, color: 'var(--good)' }];
      },
      substituted: (v) => {
        const price = (v.vTranche + v.yieldEstimate + v.loanEstimate) / v.supply;
        return `\\text{price}_{\\text{opt}} = \\frac{${texDollar(v.vTranche)} + ${texDollar(v.yieldEstimate)} + ${texDollar(v.loanEstimate)}}{${texNum(v.supply)}} = ${texDollar(price, 4)}`;
      },
    },
  },
  {
    label: 'Conservative price (used to redeem)',
    tex: `${wrapVar('price_cons', '\\text{price}_{\\text{cons}}')} = \\frac{${wrapVar('V_tranche', 'V_{\\text{tranche}}')}}{${wrapVar('total_supply', '\\text{total\\_supply}')}}`,
    note: 'Counts only value that has actually been collected and recorded in v_tranche — none of the optimistic assumptions above. Minting high and redeeming low, never the reverse, is what keeps the two prices from ever letting someone extract yield that was only ever assumed, not real.',
    glossaryTerm: 'Conservative price',
    codeFile: 'pinochio/src/helpers/waterfall.rs',
    worked: {
      inputs: [
        { key: 'vTranche', label: 'V_tranche', value: 600000, step: 10000, prefix: '$' },
        { key: 'supply', label: 'Total supply', value: 600000, step: 10000, suffix: 'tokens' },
      ],
      compute: (v) => {
        const price = v.vTranche / v.supply;
        return [{ label: 'Conservative (redeem) price', value: `$${price.toFixed(4)}`, color: 'var(--good)' }];
      },
      substituted: (v) => `\\text{price}_{\\text{cons}} = \\frac{${texDollar(v.vTranche)}}{${texNum(v.supply)}} = ${texDollar(v.vTranche / v.supply, 4)}`,
    },
  },
  {
    label: 'Reward-per-second loan accrual',
    tex: `${wrapVar('rollup', '\\text{rollup}')}(${wrapVar('now', '\\text{now}')}) = ${wrapVar('checkpoint', '\\text{checkpoint}')} + ${wrapVar('rate', '\\text{rate}')} \\times (${wrapVar('now', '\\text{now}')} - ${wrapVar('updated_at', '\\text{updated\\_at}')})`,
    note: 'Feeds loan_estimate above, correctly regardless of how staggered individual loans’ origination dates are — a pool-wide rate (Σ every accruing loan’s own levelized_interest ÷ its period length) plus a checkpoint, both re-banked on every loan lifecycle event (originate/repay/flag-default) BEFORE the rate changes. That ordering is what makes it exact: a loan contributes zero to anything banked before it existed, and a just-collected payment is subtracted back out so it can never double-count on the next rollup. Try it below — loan B originating well after loan A must not retroactively change loan A’s own share.',
    glossaryTerm: 'Reward-per-second accrual',
    codeFile: 'pinochio/src/helpers/allocation.rs',
    worked: {
      inputs: [
        { key: 'principalA', label: 'Loan A principal', value: 100000, step: 10000, prefix: '$' },
        { key: 'aprA', label: 'Loan A APR', value: 15, step: 0.5, suffix: '%' },
        { key: 'termA', label: 'Loan A term', value: 36, step: 1, suffix: 'periods' },
        { key: 'originDayA', label: 'Loan A origin day ("July 3" = day 0)', value: 0, step: 1, suffix: 'day' },
        { key: 'principalB', label: 'Loan B principal', value: 60000, step: 10000, prefix: '$' },
        { key: 'aprB', label: 'Loan B APR', value: 18, step: 0.5, suffix: '%' },
        { key: 'termB', label: 'Loan B term', value: 24, step: 1, suffix: 'periods' },
        { key: 'originDayB', label: 'Loan B origin day ("July 21")', value: 18, step: 1, suffix: 'day' },
        { key: 'queryDay', label: 'Query day', value: 25, step: 1, suffix: 'day' },
      ],
      compute: (v) => {
        const levA = levelizedInterest(v.principalA, v.aprA / 100, v.termA);
        const levB = levelizedInterest(v.principalB, v.aprB / 100, v.termB);
        const originA = v.originDayA * SECONDS_PER_DAY;
        const originB = v.originDayB * SECONDS_PER_DAY;
        const queryTs = v.queryDay * SECONDS_PER_DAY;

        let state = ZERO_LOAN_ACCRUAL;
        const originations = [
          { ts: originA, lev: levA },
          { ts: originB, lev: levB },
        ]
          .filter((o) => o.ts <= queryTs)
          .sort((a, b) => a.ts - b.ts);
        for (const o of originations) state = addLoanToAccrual(state, o.ts, o.lev);

        const accum = rollupLoanAccrual(state, queryTs);
        const rateA = levA / SECONDS_PER_PERIOD;
        const rateB = levB / SECONDS_PER_PERIOD;
        const truth = rateA * Math.max(0, queryTs - originA) + rateB * Math.max(0, queryTs - originB);
        const matches = Math.abs(accum - truth) < 0.01;

        return [
          { label: 'Accumulator result', value: fmtUSD2(accum), color: 'var(--good)' },
          { label: 'Ground truth (independent per-loan sum)', value: fmtUSD2(truth) },
          { label: 'Match?', value: matches ? 'Yes — exact, no leak or invention' : 'MISMATCH', color: matches ? 'var(--good)' : 'var(--critical)' },
        ];
      },
      substituted: (v) => {
        const levA = levelizedInterest(v.principalA, v.aprA / 100, v.termA);
        const levB = levelizedInterest(v.principalB, v.aprB / 100, v.termB);
        const originA = v.originDayA * SECONDS_PER_DAY;
        const originB = v.originDayB * SECONDS_PER_DAY;
        const queryTs = v.queryDay * SECONDS_PER_DAY;
        let state = ZERO_LOAN_ACCRUAL;
        const originations = [
          { ts: originA, lev: levA },
          { ts: originB, lev: levB },
        ]
          .filter((o) => o.ts <= queryTs)
          .sort((a, b) => a.ts - b.ts);
        for (const o of originations) state = addLoanToAccrual(state, o.ts, o.lev);
        const accum = rollupLoanAccrual(state, queryTs);
        const elapsedDays = (queryTs - state.updatedAt) / SECONDS_PER_DAY;
        const ratePerDay = state.rate * SECONDS_PER_DAY;
        return `\\text{rollup}(${texNum(v.queryDay)}\\text{d}) = ${texDollar(state.checkpoint, 2)} + ${texDollar(ratePerDay, 4)}\\text{/day} \\times ${texNum(elapsedDays)}\\text{d} = ${texDollar(accum, 2)}`;
      },
    },
  },
  {
    label: 'Blended loan-book APY',
    tex: `${wrapVar('APR_bar_loans', '\\overline{\\text{APR}}_{\\text{loans}}')} = \\frac{\\sum_{i} ${wrapVar('balance_i', '\\text{balance}_i')} \\times ${wrapVar('apr_i', '\\text{apr}_i')}}{\\sum_{i} ${wrapVar('balance_i', '\\text{balance}_i')}}`,
    note: 'The loan book’s own AVERAGE STATED RATE, balance-weighted — a portfolio-composition figure, not a yield-collection one. Differs from the pool’s realized rate once the severity-scaled premium curve is in play; use this for "what does this book of loans average out to by their own terms," the realized-rate readout on /simulator for "what is FYC/FFC actually collecting."',
    glossaryTerm: 'Blended loan-book APY',
    worked: {
      inputs: [
        { key: 'bal1', label: 'Loan A balance', value: 300000, step: 10000, prefix: '$' },
        { key: 'apr1', label: 'Loan A APR', value: 15, step: 0.5, suffix: '%' },
        { key: 'bal2', label: 'Loan B balance', value: 150000, step: 10000, prefix: '$' },
        { key: 'apr2', label: 'Loan B APR', value: 18, step: 0.5, suffix: '%' },
      ],
      compute: (v) => {
        const loans = [
          { balance: v.bal1, apr: v.apr1 / 100 },
          { balance: v.bal2, apr: v.apr2 / 100 },
        ];
        return [{ label: 'Blended loan APY', value: fmtPct(blendedLoanApy(loans), 2), color: 'var(--good)' }];
      },
      substituted: (v) => {
        const loans = [
          { balance: v.bal1, apr: v.apr1 / 100 },
          { balance: v.bal2, apr: v.apr2 / 100 },
        ];
        const blended = blendedLoanApy(loans);
        return `\\overline{\\text{APR}}_{\\text{loans}} = \\frac{${texDollar(v.bal1)} \\times ${texPct(v.apr1 / 100, 1)} + ${texDollar(v.bal2)} \\times ${texPct(v.apr2 / 100, 1)}}{${texDollar(v.bal1)} + ${texDollar(v.bal2)}} = ${texPct(blended, 2)}`;
      },
    },
  },
  {
    label: 'Protocol blended APY (loans + reserve)',
    tex: `${wrapVar('APY_bar_protocol', '\\overline{\\text{APY}}_{\\text{protocol}}')} = \\frac{${wrapVar('Capital_loans', '\\text{Capital}_{\\text{loans}}')} \\times ${wrapVar('APY_loans', '\\overline{\\text{APY}}_{\\text{loans}}')} + ${wrapVar('Capital_reserve', '\\text{Capital}_{\\text{reserve}}')} \\times ${wrapVar('APY_reserve', '\\overline{\\text{APY}}_{\\text{reserve}}')}}{${wrapVar('Capital_loans', '\\text{Capital}_{\\text{loans}}')} + ${wrapVar('Capital_reserve', '\\text{Capital}_{\\text{reserve}}')}}`,
    note: 'One level up from the two blends above: capital-weighted across BOTH yield streams the pool has — loan interest and reserve/yield-token appreciation — weighted by outstanding loans vs. idle/deployed reserve. Deliberately generic about which loan/reserve APY feeds it: the realized per-period rate answers "what is the protocol collectively earning right now," the two blends above answer "what does this portfolio’s composition average out to."',
    glossaryTerm: 'Protocol blended APY',
    tool: { label: '▶ See it live on /simulator', href: '/simulator' },
    worked: {
      inputs: [
        { key: 'loanCapital', label: 'Loan capital', value: 450000, step: 10000, prefix: '$' },
        { key: 'loanApyPct', label: 'Loan APY', value: 16, step: 0.5, suffix: '%' },
        { key: 'reserveCapital', label: 'Reserve capital', value: 550000, step: 10000, prefix: '$' },
        { key: 'reserveApyPct', label: 'Reserve APY', value: 3.73, step: 0.1, suffix: '%' },
      ],
      compute: (v) => {
        const blend = protocolBlendedApy({
          loanCapital: v.loanCapital,
          loanApy: v.loanApyPct / 100,
          reserveCapital: v.reserveCapital,
          reserveApy: v.reserveApyPct / 100,
        });
        return [{ label: 'Protocol blended APY', value: fmtPct(blend, 2), color: 'var(--good)' }];
      },
      substituted: (v) => {
        const blend = protocolBlendedApy({
          loanCapital: v.loanCapital,
          loanApy: v.loanApyPct / 100,
          reserveCapital: v.reserveCapital,
          reserveApy: v.reserveApyPct / 100,
        });
        return `\\overline{\\text{APY}}_{\\text{protocol}} = \\frac{${texDollar(v.loanCapital)} \\times ${texPct(v.loanApyPct / 100, 2)} + ${texDollar(v.reserveCapital)} \\times ${texPct(v.reserveApyPct / 100, 2)}}{${texDollar(v.loanCapital)} + ${texDollar(v.reserveCapital)}} = ${texPct(blend, 2)}`;
      },
    },
  },
  {
    label: 'Target-range rebalance selection',
    tex: `${wrapVar('choice', '\\text{choice}')} = \\begin{cases} \\displaystyle\\arg\\min_i \\left|${wrapVar('APY_bar', '\\overline{\\text{APY}}_i')} - ${wrapVar('target', '\\text{target}')}\\right| & \\text{if } \\exists\\, i : ${wrapVar('APY_bar', '\\overline{\\text{APY}}_i')} \\in [${wrapVar('rangeMin', '\\text{min}')}, ${wrapVar('rangeMax', '\\text{max}')}] \\\\[8pt] \\displaystyle\\arg\\max_i ${wrapVar('APY_bar', '\\overline{\\text{APY}}_i')} & \\text{otherwise} \\end{cases}`,
    note: '[min, target, max] = [3%, 3.5%, 7%]. The "otherwise" branch is why min exists — a soft reference, never a hard failure.',
    glossaryTerm: 'Target yield range',
    codeFile: 'pinochio/src/helpers/liquidity.rs',
    tool: { label: '▶ See the full breakdown on /yield-sources', href: '/yield-sources' },
    worked: {
      inputs: [
        { key: 'cap1', label: 'Source A capital', value: 1000000, step: 50000, prefix: '$' },
        { key: 'apy1', label: 'Source A APY', value: 1, step: 0.5, suffix: '%' },
        { key: 'cap2', label: 'Source B capital', value: 1000000, step: 50000, prefix: '$' },
        { key: 'apy2', label: 'Source B APY', value: 6, step: 0.5, suffix: '%' },
        { key: 'deposit', label: 'New deposit', value: 500000, step: 50000, prefix: '$' },
      ],
      compute: (v) => {
        const sources: YieldSource[] = [
          { id: 'A', capitalUsd: v.cap1, apy: v.apy1 / 100, enabled: true },
          { id: 'B', capitalUsd: v.cap2, apy: v.apy2 / 100, enabled: true },
        ];
        const choice = pickRebalanceTarget(sources, v.deposit);
        return [
          { label: 'Routes to', value: choice.sourceId ?? 'none enabled', color: 'var(--fyc)' },
          { label: 'Resulting blend', value: fmtPct(choice.resultingApy, 2), detail: choice.inRange ? 'inside target range' : 'closest available, outside range' },
        ];
      },
      substituted: (v) => {
        const sources: YieldSource[] = [
          { id: 'A', capitalUsd: v.cap1, apy: v.apy1 / 100, enabled: true },
          { id: 'B', capitalUsd: v.cap2, apy: v.apy2 / 100, enabled: true },
        ];
        const choice = pickRebalanceTarget(sources, v.deposit);
        return `\\text{choice} = \\text{${choice.sourceId ?? 'none'}} \\quad (\\overline{\\text{APY}} = ${texPct(choice.resultingApy, 2)},\\ \\text{${choice.inRange ? 'in range' : 'outside range, highest available'}})`;
      },
    },
  },
];

export default function LatexPage() {
  return (
    <>
      <PageHeader
        eyebrow="reference"
        title="LaTeX equations"
        lede={
          <>
            Every formula from both design rounds, typeset the way{' '}
            <a href="https://docs.hylo.so/technical-addendum/hylo-equations" target="_blank" rel="noopener noreferrer">
              Hylo&rsquo;s technical addendum ↗
            </a>{' '}
            does — display-mode KaTeX, <code>\text{'{'}...{'}'}</code> labels, explicit fractions — rendered
            server-side via <code>katex.renderToString</code>, no client JS required for the typesetting itself.
            Every card below also has a <b>worked example you can edit</b> (real numbers, recomputed live off
            the exact same <code>lib/model.ts</code> functions every other page uses — nothing here is a
            separate, hand-checked copy), a button to the plain-English definition on{' '}
            <a href="/glossary">/glossary</a>, a button to the proposed Rust on <a href="/code-diff">/code-diff</a>,
            and, where the formula maps onto a real page, a button that runs it live.
          </>
        }
      />

      <h2 style={{ fontSize: 18 }}>Round 1 — coverage &amp; severity premium curve</h2>
      <Card>
        {ROUND_1.map((e) => (
          <EqBlock key={e.label} e={e} />
        ))}
      </Card>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>Round 2 — redemption, tranche conversion &amp; yield routing</h2>
      <Card>
        {ROUND_2.map((e) => (
          <EqBlock key={e.label} e={e} />
        ))}
      </Card>
    </>
  );
}
