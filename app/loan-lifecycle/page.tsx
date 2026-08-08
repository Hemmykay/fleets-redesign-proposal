'use client';

import { useState } from 'react';
import { PageHeader, Card, Callout, Badge, Readout, Meter, Collapsible } from '@/components/ui';
import {
  GRACE_PERIOD_DAYS,
  CURE_PERIOD_DAYS,
  CURE_APR_MULTIPLIER,
  daysLate,
  isInGrace,
  isInCure,
  isDefaultable,
  cureFee,
  periodInterest,
  levelizedInterest,
  fmtUSD,
} from '@/lib/model';

const SECONDS_PER_DAY = 86_400;
const TOTAL_WINDOW_DAYS = GRACE_PERIOD_DAYS + CURE_PERIOD_DAYS;

// Running example — same loan used on /accounting and /explorer.
const PRINCIPAL = 100_000;
const APR = 0.15;
const TERM_MONTHS = 36;
const OUTSTANDING_BALANCE = 90_000; // mid-life current_balance for the worked example
const LEVELIZED = levelizedInterest(PRINCIPAL, APR, TERM_MONTHS);

export default function LoanLifecyclePage() {
  const [simDaysLate, setSimDaysLate] = useState(20);
  const nextDueTs = 0;
  const nowTs = simDaysLate * SECONDS_PER_DAY;

  const late = daysLate(nowTs, nextDueTs);
  const grace = isInGrace(nowTs, nextDueTs);
  const cure = isInCure(nowTs, nextDueTs);
  const defaulted = isDefaultable(nowTs, nextDueTs);
  const charge = cure || defaulted ? cureFee(OUTSTANDING_BALANCE, APR) : 0;
  const owedAtDefault = OUTSTANDING_BALANCE + LEVELIZED + cureFee(OUTSTANDING_BALANCE, APR);

  const stage = defaulted ? 'DEFAULTED' : cure ? 'CURE' : grace ? 'GRACE' : 'ACTIVE';
  const stageColor = defaulted ? 'var(--critical)' : cure ? 'var(--warning)' : grace ? 'var(--ffc)' : 'var(--good)';

  const normalInterest = periodInterest(OUTSTANDING_BALANCE, APR);
  const bumpedInterest = periodInterest(OUTSTANDING_BALANCE, APR * CURE_APR_MULTIPLIER);

  return (
    <>
      <PageHeader
        eyebrow="pinochio / src — round 5"
        title="Loan lifecycle: grace, cure & default"
        lede="What happens when a borrower misses a payment, all the way through to repossession — entirely time-derived from Clock, no admin call required to start any of it. New this round, built from a live design discussion — see /open-questions for what's still explicitly undecided."
      />

      <Callout>
        <strong>Nothing here needs a keeper to notice anything.</strong> GRACE starts the instant a payment is
        missed, CURE starts automatically 15 days later, and DEFAULTED fires automatically 15 days after that —
        every transition is a pure function of <code>Clock</code> against{' '}
        <code>LoanAccount.next_payment_due_ts()</code>, never a stored flag someone has to remember to set. The
        only place a stored <code>status</code> field changes at all is the final jump to <code>DEFAULTED</code>{' '}
        (and later, whichever resolution path closes the loan out) — see <code>helpers/loan_lifecycle.rs</code>{' '}
        on <code>/code-diff</code>.
      </Callout>

      <div style={{ marginTop: 28 }}>
        <Badge>1. The timeline — 30 days, always, by construction</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          {`Grace (${GRACE_PERIOD_DAYS} days) and cure (${CURE_PERIOD_DAYS} days) add up to exactly ${TOTAL_WINDOW_DAYS} days`}
          {' '}— the same length as one payment period. That&rsquo;s deliberate: a loan
          always reaches <code>DEFAULTED</code> at the exact moment a <em>second</em> payment would otherwise
          fall due, so no loan is ever more than one payment behind when it defaults. Drag to see which stage
          applies at any point past the due date:
        </p>
        <Card>
          <div style={{ marginBottom: 14 }}>
            <input
              type="range"
              min={0}
              max={45}
              value={simDaysLate}
              onChange={(e) => setSimDaysLate(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <Meter
            fillPct={(simDaysLate / 45) * 100}
            color={stageColor}
            gateMarks={[
              { pct: (GRACE_PERIOD_DAYS / 45) * 100, title: 'grace -> cure (day 15)' },
              { pct: (TOTAL_WINDOW_DAYS / 45) * 100, title: 'cure -> DEFAULTED (day 30)' },
            ]}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>due date</span>
            <span>+15d grace ends</span>
            <span>+30d cure ends</span>
            <span>+45d</span>
          </div>
          <div className="readout-grid" style={{ marginTop: 16 }}>
            <Readout label="days late" value={late} color={stageColor} />
            <Readout
              label="stage"
              value={stage}
              color={stageColor}
              sub={
                defaulted
                  ? 'repay_loan.rs refuses payment — only finalize_default / resell / relist from here'
                  : cure
                    ? 'APR bumped 1.25x; excluded from optimistic pricing'
                    : grace
                      ? 'no bump yet; still counted in optimistic pricing'
                      : 'on time'
              }
            />
            <Readout
              label="this period's cure charge"
              value={charge > 0 ? fmtUSD(charge) : '—'}
              sub={charge > 0 ? `on top of the normal $${LEVELIZED.toFixed(2)} levelized interest` : 'no charge outside CURE'}
            />
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 32 }}>
        <Badge>2. The cure charge — true declining-balance interest at 1.25x, minus the same at the real rate</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Not a day-counted fee, and not re-amortized over the loan&rsquo;s whole remaining term — just &ldquo;what
          would this one period cost at the bumped rate instead,&rdquo; computed the exact same way{' '}
          <code>period_interest</code> already prices the borrower-facing schedule. It&rsquo;s pure interest: added
          on top of <code>levelized_interest</code>, never carved out of it, so <code>principal_portion</code>{' '}
          — and therefore the payoff schedule — is completely unaffected by a late payment. The combined total
          (normal + cure charge) flows through the same 85/15 protocol fee split and severity curve as any other
          period&rsquo;s interest — nothing new to build there, it just rides along as a bigger{' '}
          <code>gross_interest</code> for that one period.
        </p>
        <Card>
          <div className="formula">
            {'cure_fee = period_interest(current_balance, apr × 1.25) − period_interest(current_balance, apr)'}
          </div>
          <div className="readout-grid" style={{ marginTop: 14 }}>
            <Readout label="outstanding balance" value={fmtUSD(OUTSTANDING_BALANCE)} />
            <Readout label="normal interest (15% APR)" value={fmtUSD(normalInterest)} />
            <Readout label="bumped interest (18.75% APR)" value={fmtUSD(bumpedInterest)} color="var(--warning)" />
            <Readout label="cure charge (the difference)" value={fmtUSD(bumpedInterest - normalInterest)} color="var(--critical)" />
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 32 }}>
        <Badge>3. Default — the accrued-but-uncollected interest is owed, not written off</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          When <code>finalize_default</code>{' '}fires automatically at day 30, whatever interest had been legitimately
          accruing for the final unpaid period — normal levelized interest plus that period&rsquo;s cure charge —
          gets folded into what&rsquo;s owed rather than silently dropped. <code>owed_at_default</code> is computed{' '}
          <b>once</b>, right here, and never touched again:
        </p>
        <Card>
          <div className="formula">
            {'owed_at_default = current_balance + levelized_interest + cure_fee(current_balance, apr)'}
          </div>
          <div className="readout-grid" style={{ marginTop: 14 }}>
            <Readout label="current_balance" value={fmtUSD(OUTSTANDING_BALANCE)} />
            <Readout label="+ levelized_interest" value={fmtUSD(LEVELIZED)} />
            <Readout label="+ cure_fee" value={fmtUSD(cureFee(OUTSTANDING_BALANCE, APR))} />
            <Readout label="= owed_at_default" value={fmtUSD(owedAtDefault)} color="var(--critical)" />
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 32 }}>
        <Badge>4. Three resolution paths — first one to land wins</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Once <code>DEFAULTED</code>, a loan just sits at <code>owed_at_default</code>{' '}indefinitely — there&rsquo;s
          no timer, no forced outcome. Whichever of three instructions actually gets called first <em>is</em> the
          resolution; the other two are permanently locked out by a mutual-exclusion check (<code>status ==
          RESOLVED</code>). The same borrower can pick the loan back up via relist, same as anyone else.
        </p>
        <div className="grid-2">
          <Card>
            <h3 style={{ marginTop: 0 }}>Resell</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
              Admin supplies the actual sale/repossession proceeds. Loss = <code>max(0, owed_at_default −
              recovery_amount)</code> — if recovery covers it, no loss at all and any <b>surplus goes back to the
              borrower</b> (standard repossession practice). A real deficit runs through the same insurance-first
              three-tier waterfall (FFC → insurance-held FYC → general FYC) already fixed elsewhere in this
              redesign — see <code>resell_defaulted_loan.rs</code>.
            </p>
          </Card>
          <Card>
            <h3 style={{ marginTop: 0 }}>Relist</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
              The repossessed vehicle becomes collateral for a brand-new loan — new or the same borrower, normal
              origination fee and equity apply. The new loan&rsquo;s principal directly replaces{' '}
              <code>owed_at_default</code>; only a shortfall (new principal below what was owed) is a real loss,
              through the same waterfall as resell. No swap/disbursement leg — the collateral&rsquo;s already
              there, there&rsquo;s no fresh cash to hand anyone.
            </p>
          </Card>
        </div>
        <Card style={{ marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>
            IOU — <span style={{ color: 'var(--severity, #d97757)' }}>NOT SUPPORTED IN V1</span>
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
            Open the outstanding balance to public funding in exchange for an IOU-style token, with no fixed
            payment schedule — paid from whatever the vehicle actually earns until it&rsquo;s no longer roadworthy.
            Structurally this is a revenue-share/royalty instrument, not a loan — no term, no schedule, and a
            return that depends on real-world income the contract has no way to observe without a trusted
            reporting feed. This isn&rsquo;t a &ldquo;TBD&rdquo; sitting quietly in the design — it&rsquo;s an
            explicit product decision: <b>there is no on-chain instruction for this path, and none is planned for
            v1.</b> A DEFAULTED loan only ever resolves via resell or relist (both above) unless and until IOU
            gets its own separate design pass (token mechanics, income reporting, exit path for holders) and
            ships its own instruction. Scoped only to already-defaulted loans if it ever does — never a general
            financing option.
          </p>
        </Card>
      </div>

      <div style={{ marginTop: 32 }}>
        <Badge>5. Optimistic pricing during CURE — bounded exposure, not a guarantee</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          A loan stops counting toward <code>pool.loan_accrual_rate</code> (and therefore <code>
          compute_optimistic_price</code>&rsquo;s loan-side estimate) the instant it enters CURE, not the full 30
          days later at finalize — the same &ldquo;stop counting once risk is real&rdquo; principle the old
          contract already used at pending-default, just retimed earlier.
        </p>
        <Callout tone="amber">
          <strong>This bounds the exposure — it doesn&rsquo;t eliminate it.</strong>{' '}A mint that happens during
          GRACE (before exclusion kicks in) can still price in a loan&rsquo;s expected interest that never
          arrives if that loan goes on to default.{' '}
          {`That gap is capped at exactly ${GRACE_PERIOD_DAYS} days of one loan's own daily interest`} — small,
          computable, never open-ended — and there&rsquo;s no separate
          value to &ldquo;write off&rdquo; later: the optimistic estimate never touches real <code>v_tranche</code>{' '}
          in the first place (it&rsquo;s a mint-time-only pricing input), so <code>owed_at_default</code> stays
          cleanly just principal + accrued interest, nothing double-counted. The actual conservation guarantee
          comes from the default waterfall marking down <code>v_tranche</code> for whoever currently holds
          tokens, regardless of when they minted — see <a href="/open-questions">/open-questions</a> for the full
          reasoning and the NAV-conservation-invariant suggestion for monitoring it live.
        </Callout>
      </div>

      <Collapsible label="what's explicitly assumed, not decided">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>
            <b>Relist is atomic</b> — closing the old defaulted loan and originating the new one happen in ONE
            instruction, with no window where the bus is defaulted-but-not-yet-relisted. Two separate
            transactions was the alternative; atomic was chosen as the default, not confirmed as required.
          </li>
          <li>
            <b>Relist still re-clears the severity gate</b> — <code>assert_origination_allowed</code> runs
            against the new principal even though no new external risk capital is technically being added.
          </li>
          <li>
            <b>IOU is NOT SUPPORTED in v1</b> — not just unspecified, no instruction exists at all. Token design,
            income reporting, holder exit path are all genuinely open, but the actual product decision already
            made is narrower and firmer: a DEFAULTED loan resolves via resell or relist only, until IOU gets its
            own separate design pass and ships its own instruction.
          </li>
          <li>
            <b>Origination fee on relist</b> (<code>ORIGINATION_FEE_BPS</code>, 1%) is this protocol&rsquo;s
            first real on-chain implementation of a fee that previously only existed in the design tool&rsquo;s
            own <code>lib/model.ts</code> — worth an explicit sign-off before treating it as settled for normal
            (non-relist) originations too.
          </li>
        </ul>
      </Collapsible>
    </>
  );
}
