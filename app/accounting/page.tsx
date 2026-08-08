'use client';

import { useMemo } from 'react';
import LineChart from '@/components/LineChart';
import { PageHeader, Card, Readout, Callout } from '@/components/ui';
import { buildDualSchedule, fmtUSD } from '@/lib/model';

const LOAN_P = 100000;
const LOAN_APR = 0.15;
const LOAN_N = 36;

export default function AccountingPage() {
  const rows = useMemo(() => buildDualSchedule(LOAN_P, LOAN_APR, LOAN_N), []);

  let maxGap = 0;
  let maxGapMonth = 0;
  for (const r of rows) {
    const g = r.trueBalance - r.internalBalance;
    if (g > maxGap) {
      maxGap = g;
      maxGapMonth = r.period;
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="pinochio / src / instructions / repay_loan.rs"
        title="Two schedules, one loan"
        lede="The borrower always sees — and always owes — a standard amortized loan. The protocol's own books run a second, separate schedule for the same loan, smoothed the same way the yield curve needs it smoothed. Decided: this is not a hedge or an open question anymore."
      />

      <Card>
        <div className="grid-2">
          <div>
            <h3>Borrower-facing (their dashboard)</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
              True amortization. <code>compute_monthly_payment</code> sets one level payment for the life of
              the loan; each payment&rsquo;s interest/principal split follows the real, declining-balance
              formula — interest high and falling, principal low and rising. This determines what the fleet
              operator contractually owes and when the loan is paid off.{' '}
              <b style={{ color: 'var(--text-primary)' }}>Unchanged by any of this.</b>
            </p>
          </div>
          <div>
            <h3>Protocol-internal (the pool&rsquo;s books)</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
              Levelized interest.{' '}
              <code>levelized_interest = (monthly_payment × term_months − principal) / term_months</code>,
              computed once at origination. Every period, <em>that</em> flat figure — not the true declining
              one — is what&rsquo;s recognized as interest; everything left of the payment is credited against{' '}
              <code>current_balance</code> / <code>outstanding_principal</code>.{' '}
              <b style={{ color: 'var(--ffc)' }}>This is the same number that feeds the coverage curve.</b>
            </p>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Callout>
            <strong>Why this is fine:</strong> the borrower&rsquo;s payment is identical either way — same cash,
            every period, regardless of which schedule is doing the labeling.{' '}
            <code>
              FLP total value = yield-bearing reserve (real, liquid — USDY, syrupUSDC, or any other registered
              source) + outstanding_principal (internal accounting — a number the books assume is there, not
              cash sitting anywhere).
            </code>{' '}
            Deliberately no <code>− realized_losses</code> term here — that already double-subtracts a default
            in the real contract&rsquo;s <code>compute_v_pool</code>: the old <code>approve_default.rs</code> reduced{' '}
            <code>outstanding_principal</code> by the defaulted loan&rsquo;s balance <em>and</em> separately grew{' '}
            <code>realized_losses</code> by the same loss, so subtracting it again on top of the already-shrunk{' '}
            <code>outstanding_principal</code> counted that loss twice. Fixed round 6 — see{' '}
            <code>/open-questions</code> and <code>helpers/pricing.rs</code> on <code>/code-diff</code>. Since the
            full payment lands in the pool as reserve either way,
            switching which schedule <code>outstanding_principal</code> follows doesn&rsquo;t change how much
            money is ever actually in the pool — only how the books narrate getting there.
          </Callout>
        </div>

        <h3 style={{ marginTop: 20 }}>Same loan, two balances</h3>
        <p className="section-dek" style={{ fontSize: 12.5, marginBottom: 10 }}>
          The $100,000 / 15% APR / 36-month loan from the previous page, run through both schedules at once.
          They start together, diverge through the middle of the term, and land on exactly $0 at exactly the
          same month — by construction, since total levelized interest is defined as total true interest over
          the loan&rsquo;s life.
        </p>
        <div className="readout-grid" style={{ marginBottom: 16, maxWidth: 620 }}>
          <Readout
            label="Widest gap between the two balances"
            value={fmtUSD(maxGap)}
            sub={`month ${maxGapMonth} — internal balance runs below true balance there, closes to $0 by month 36 either way`}
          />
          <Readout label="Both balances hit $0" value="Month 36" sub="same month, either schedule" />
        </div>
        <div className="chart-legend">
          <span>
            <i style={{ background: 'var(--fyc)' }} /> Borrower&rsquo;s true balance
          </span>
          <span>
            <i style={{ background: 'var(--ffc)' }} /> Protocol&rsquo;s internal balance (levelized)
          </span>
        </div>
        <LineChart
          xDomain={[0, 36]}
          yDomain={[0, LOAN_P * 1.05]}
          xTicks={[0, 6, 12, 18, 24, 30, 36]}
          yTicks={[0, 21000, 42000, 63000, 84000, 105000]}
          formatX={(v) => `mo ${Math.round(v)}`}
          formatY={(v) => '$' + Math.round(v).toLocaleString('en-US')}
          series={[
            { name: "Borrower's true balance", color: 'var(--fyc)', points: rows.map((r) => ({ x: r.period, y: r.trueBalance })) },
            { name: "Protocol's internal balance", color: 'var(--ffc)', points: rows.map((r) => ({ x: r.period, y: r.internalBalance })), dashed: true },
          ]}
        />
      </Card>
    </>
  );
}
