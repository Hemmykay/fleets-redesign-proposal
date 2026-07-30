'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, Card, Collapsible, Readout } from '@/components/ui';
import Latex from '@/components/Latex';
import { slugify } from '@/lib/slug';
import {
  coverageOf,
  severityOf,
  curveAtActual,
  assertOriginationAllowed,
  assertMintAllowed,
  splitBaseYieldTokenYield,
  monthlyPayment,
  levelizedInterest,
  splitElb,
  instantRedemptionFeeBps,
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
              <input
                type="number"
                step={inp.step ?? 1}
                value={values[inp.key]}
                onChange={(ev) => setValues((v) => ({ ...v, [inp.key]: Number(ev.target.value) }))}
              />
              {inp.suffix && <span className="worked-input-affix">{inp.suffix}</span>}
            </span>
          </label>
        ))}
      </div>
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

function EqBlock({ e }: { e: Eq }) {
  return (
    <div className="gloss-entry">
      <div className="gloss-term">{e.label}</div>
      <Latex tex={e.tex} />
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
    tex: '\\text{Coverage} = \\min\\!\\left(\\frac{\\text{FFC}}{\\text{Outstanding}},\\; 1\\right)',
    glossaryTerm: 'Coverage',
    codeFile: 'pinochio/src/helpers/coverage.rs',
    tool: { label: '▶ Play with the sliders on /explorer', href: '/explorer' },
    worked: {
      inputs: [
        { key: 'ffc', label: 'FFC', value: FFC, step: 10000, prefix: '$' },
        { key: 'outstanding', label: 'Outstanding', value: OUT, step: 10000, prefix: '$' },
      ],
      compute: (v) => [{ label: 'Coverage', value: fmtPct(coverageOf(v.outstanding, v.ffc), 1), color: 'var(--fyc)' }],
    },
  },
  {
    label: 'Severity — impact on FYC in the worst case',
    tex: '\\text{Severity} = \\frac{\\max(0,\\; \\text{Outstanding} - \\text{FFC})}{\\text{FYC}}',
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
    },
  },
  {
    label: 'Premium multiplier k',
    tex: 'k = K_{\\text{MIN}} + \\left(k_{\\text{base}}(\\text{Coverage}) - K_{\\text{MIN}}\\right) \\times w',
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
    },
  },
  {
    label: 'Coverage weight',
    tex: 'w = \\text{COVERAGE\\_WEIGHT\\_FLOOR} + \\left(1 - \\text{COVERAGE\\_WEIGHT\\_FLOOR}\\right) \\times \\min\\!\\left(1,\\; \\frac{\\text{Severity}}{\\text{SEVERITY\\_REF}}\\right)',
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
    },
  },
  {
    label: 'FFC share of net loan interest',
    tex: '\\text{FFC}_{\\text{share}} = \\frac{k \\times \\text{FFC}}{\\text{FYC} + k \\times \\text{FFC}}',
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
    },
  },
  {
    label: 'Origination gate',
    tex: '\\text{allowed} \\iff \\text{Severity}(P_{\\text{outstanding}} + \\text{new\\_loan},\\, \\text{FFC},\\, \\text{FYC}) \\le \\text{SEVERITY\\_GATE\\_MAX}',
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
    },
  },
  {
    label: 'FFC mint floor',
    tex: '\\text{allowed} \\iff \\text{Severity}(\\text{Outstanding},\\, \\text{FFC},\\, \\text{FYC}) > \\text{SEVERITY\\_MINT\\_FLOOR}',
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
    },
  },
  {
    label: 'Reserve / yield-token yield split (flat pro-rata)',
    tex: '\\text{FYC}_{\\text{share}} = \\text{NetYield} \\times \\frac{\\text{FYC}}{\\text{FYC} + \\text{FFC}}, \\qquad \\text{FFC}_{\\text{share}} = \\text{NetYield} - \\text{FYC}_{\\text{share}}',
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
    },
  },
  {
    label: 'Net / gross yield (85/15 protocol fee)',
    tex: '\\text{NetYield} = 0.85 \\times \\text{GrossYield}',
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
    },
  },
  {
    label: 'True amortization — level payment per period',
    tex: 'M = \\frac{P \\cdot r}{1 - (1+r)^{-n}}, \\qquad r = \\text{APR} \\times \\frac{\\text{SECONDS\\_PER\\_PERIOD}}{\\text{SECONDS\\_PER\\_YEAR}},\\;\\; n = \\text{term (periods)}',
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
    },
  },
  {
    label: 'Levelized interest',
    tex: '\\text{LevelizedInterest} = \\frac{M \\times n - P}{n}',
    glossaryTerm: 'Levelized interest',
    codeFile: 'pinochio/src/helpers/amortization.rs',
    worked: {
      inputs: [
        { key: 'principal', label: 'Principal', value: 100000, step: 5000, prefix: '$' },
        { key: 'aprPct', label: 'APR', value: 15, step: 0.5, suffix: '%' },
        { key: 'termPeriods', label: 'Term', value: 36, step: 1, suffix: 'periods' },
      ],
      compute: (v) => [{ label: 'Levelized interest / period', value: fmtUSD2(levelizedInterest(v.principal, v.aprPct / 100, v.termPeriods)), color: 'var(--ffc)' }],
    },
  },
];

const REDEEM_SIM_PRESET = '/simulator?fyc=600000&ffc=400000&redeemTranche=ffc&redeemAmount=150000&redeemMode=instant&redeemPeriod=3&cursor=3';

const ROUND_2: Eq[] = [
  {
    label: 'PERIODS_PER_YEAR (the day-count fix)',
    tex: '\\text{PERIODS\\_PER\\_YEAR} = \\frac{\\text{SECONDS\\_PER\\_YEAR}}{\\text{SECONDS\\_PER\\_PERIOD}} = \\frac{365}{30} \\approx 12.1667',
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
    },
  },
  {
    label: 'Reserve target (the "20% always stays as reserve" floor)',
    tex: '\\text{ReserveTargetFraction} = 1 - \\text{AllocationCeilingFraction} = 1 - 0.80 = 0.20',
    note: 'Not an independent gate — the algebraic complement of the existing 80% loan-allocation ceiling.',
    codeFile: 'pinochio/src/constants.rs',
    worked: {
      inputs: [{ key: 'allocCeilingPct', label: 'Allocation ceiling', value: ALLOCATION_CEILING_FRACTION * 100, step: 1, suffix: '%' }],
      compute: (v) => [{ label: 'Reserve floor', value: `${(100 - v.allocCeilingPct).toFixed(0)}%`, color: 'var(--good)' }],
    },
  },
  {
    label: 'ELB — Excess Liquidity Balance',
    tex: '\\text{ELB}_{\\text{total}} = (\\text{FYC} + \\text{FFC}) - \\text{Outstanding} - \\text{Earmarked}',
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
    },
  },
  {
    label: 'ELB tranche split (pro-rata by pool share)',
    tex: '\\text{ELB}_{\\text{FYC}} = \\text{ELB}_{\\text{total}} \\times \\frac{\\text{FYC}}{\\text{FYC}+\\text{FFC}}, \\qquad \\text{ELB}_{\\text{FFC}} = \\text{ELB}_{\\text{total}} - \\text{ELB}_{\\text{FYC}}',
    glossaryTerm: 'ELB',
    codeFile: 'pinochio/src/helpers/liquidity.rs',
  },
  {
    label: 'Instant-redemption fee (endpoint-rate formula)',
    tex: '\\text{fee}_{\\text{bps}} = \\text{fee}_{\\min} + \\frac{\\text{amount}}{\\text{ELB}_{\\text{tranche}}} \\times \\left(\\text{fee}_{\\max} - \\text{fee}_{\\min}\\right)',
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
    },
  },
  {
    label: 'Split-invariant variant (recommended hardening, not adopted by default)',
    tex: '\\text{fee} = \\text{fee}_{\\min}\\cdot\\text{amount} + \\left(\\text{fee}_{\\max}-\\text{fee}_{\\min}\\right) \\cdot \\frac{\\text{amount}^2}{2 \\cdot \\text{ELB}_{\\text{tranche}}}',
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
    },
  },
  {
    label: 'jr_to_sr conversion (burns FFC, mints FYC — mirrors sr_to_jr)',
    tex: '\\text{value} = \\text{tokens}_{\\text{in}} \\times \\text{FFC}_{\\text{price}}^{\\text{cons}}, \\qquad \\text{tokens}_{\\text{out}} = \\frac{\\text{value}}{\\text{FYC}_{\\text{price}}^{\\text{cons}}}',
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
    },
  },
  {
    label: 'Redemption-fee settlement (always as FYC, 50/50)',
    tex: '\\text{Protocol}_{\\text{FYC}} = \\text{Insurance}_{\\text{FYC}} = \\frac{\\text{fee}_{\\text{value}}}{2}',
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
    },
  },
  {
    label: 'Loan-origination liquidity gate',
    tex: '\\text{ELB}_{\\text{total}} - \\text{Pending}_{\\text{FYC}} - \\text{Pending}_{\\text{FFC}} - \\text{Earmarked} \\;\\ge\\; \\text{new\\_loan\\_amount}',
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
    },
  },
  {
    label: 'Per-source observed APY (the building block blended APY is made of)',
    tex: '\\text{APY}_i = \\frac{\\text{price}_{i,\\text{now}} - \\text{price}_{i,\\text{last}}}{\\text{price}_{i,\\text{last}}} \\times \\frac{\\text{SECONDS\\_PER\\_YEAR}}{\\text{elapsed}_i}',
    note: 'Computed once per yield source, every epoch tick (run_yield_epoch) — the exact same price-delta method the pool already used for its one original reserve, just applied per-source now. This is what feeds Capital_i × APY_i below, not a separate estimate.',
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
    },
  },
  {
    label: 'Blended portfolio APY across yield sources',
    tex: '\\overline{\\text{APY}} = \\frac{\\sum_{i} \\text{Capital}_i \\times \\text{APY}_i}{\\sum_{i} \\text{Capital}_i}',
    note: 'Structurally identical to Hylo’s published "Average SOL Reserve Yield" equation. Only ENABLED sources are summed — a disabled source contributes zero weight, not just zero yield.',
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
    },
  },
  {
    label: 'Optimistic price (used to mint)',
    tex: '\\text{price}_{\\text{opt}} = \\frac{V_{\\text{tranche}} + \\text{yield\\_estimate} + \\text{loan\\_estimate}}{\\text{total\\_supply}}',
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
    },
  },
  {
    label: 'Conservative price (used to redeem)',
    tex: '\\text{price}_{\\text{cons}} = \\frac{V_{\\text{tranche}}}{\\text{total\\_supply}}',
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
    },
  },
  {
    label: 'Reward-per-second loan accrual',
    tex: '\\text{rollup}(\\text{now}) = \\text{checkpoint} + \\text{rate} \\times (\\text{now} - \\text{updated\\_at})',
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
    },
  },
  {
    label: 'Blended loan-book APY',
    tex: '\\overline{\\text{APR}}_{\\text{loans}} = \\frac{\\sum_{i} \\text{balance}_i \\times \\text{apr}_i}{\\sum_{i} \\text{balance}_i}',
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
    },
  },
  {
    label: 'Protocol blended APY (loans + reserve)',
    tex: '\\overline{\\text{APY}}_{\\text{protocol}} = \\frac{\\text{Capital}_{\\text{loans}} \\times \\overline{\\text{APY}}_{\\text{loans}} + \\text{Capital}_{\\text{reserve}} \\times \\overline{\\text{APY}}_{\\text{reserve}}}{\\text{Capital}_{\\text{loans}} + \\text{Capital}_{\\text{reserve}}}',
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
    },
  },
  {
    label: 'Target-range rebalance selection',
    tex: '\\text{choice} = \\begin{cases} \\displaystyle\\arg\\min_i \\left|\\overline{\\text{APY}}_i - \\text{target}\\right| & \\text{if } \\exists\\, i : \\overline{\\text{APY}}_i \\in [\\text{min}, \\text{max}] \\\\[8pt] \\displaystyle\\arg\\max_i \\overline{\\text{APY}}_i & \\text{otherwise} \\end{cases}',
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
