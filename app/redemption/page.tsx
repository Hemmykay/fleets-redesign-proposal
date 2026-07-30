import { PageHeader, Card, Callout, Badge, Readout } from '@/components/ui';
import {
  splitElb,
  instantRedemptionFeeBps,
  RESERVE_TARGET_FRACTION,
  INSTANT_FEE_BPS,
  fmtUSD,
} from '@/lib/model';

// Running example used throughout the app.
const FYC = 600000;
const FFC = 400000;
const OUT = 450000;
const elb = splitElb(FYC + FFC - OUT, FYC, FFC);

// The round-number example this fee formula was specified against.
const EX_LIQUIDITY = 100000;
const EX_FYC_SHARE = 0.4;
const exElbFyc = EX_LIQUIDITY * EX_FYC_SHARE;
const exRedeem = 20000;
const exFee = instantRedemptionFeeBps('fyc', exRedeem, exElbFyc);

export default function RedemptionPage() {
  return (
    <>
      <PageHeader
        eyebrow="pinochio / src — round 2"
        title="Instant & scheduled redemption"
        lede="What's already real in the contract today, and what this round adds: a liquidity-scaled instant-redemption fee, a loan-origination gate that respects pending redemptions, and capital earmarking at the equity-received stage."
      />

      <Callout>
        <b>Already implemented, confirmed by reading the live contract</b> — this round doesn&rsquo;t touch any
        of these: the {(RESERVE_TARGET_FRACTION * 100).toFixed(0)}% reserve floor (the algebraic complement of <code>LOAN_ALLOCATION_BPS</code> = 80%, not
        an independently-enforced gate), the severity origination gate (<code>SEVERITY_GATE_MAX</code>), and the
        30-day FYC / 90-day FFC redemption locks (<code>FYC_REDEMPTION_LOCK_SECS</code> /{' '}
        <code>FFC_REDEMPTION_LOCK_SECS</code>, enforced in <code>submit_redemption.rs</code> /{' '}
        <code>process_redemption.rs</code>).
      </Callout>

      <div style={{ marginTop: 28 }}>
        <Badge>1. ELB — the liquidity an instant redemption actually draws on</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          &ldquo;Excess Liquidity Balance&rdquo; — the pool&rsquo;s idle capital sitting in a yield-bearing
          reserve token, not deployed as loans. Split pro-rata by each tranche&rsquo;s share of the combined
          pool, the same flat pool-share formula the reserve-yield split already uses, applied to capital
          instead of yield.
        </p>
        <Card>
          <div className="formula">{'elb_total = (FYC + FFC) − outstanding − earmarked_loan_capital\n\nelb_fyc = elb_total × FYC / (FYC + FFC)\nelb_ffc = elb_total − elb_fyc'}</div>
        </Card>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Running example: FYC {fmtUSD(FYC)}, FFC {fmtUSD(FFC)}, outstanding {fmtUSD(OUT)} (no earmarks) → ELB
          = {fmtUSD(FYC + FFC - OUT)}, split <b style={{ color: 'var(--fyc)' }}>{fmtUSD(elb.elbFyc)}</b> FYC /{' '}
          <b style={{ color: 'var(--ffc)' }}>{fmtUSD(elb.elbFfc)}</b> FFC.
        </p>
      </div>

      <div style={{ marginTop: 32 }}>
        <Badge>2. Instant redemption fee — scales with how much of that liquidity you take</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          An instant (accelerated) redemption never waits for the 30d/90d queue — it&rsquo;s paid immediately out
          of that tranche&rsquo;s own ELB share. The fee rate charged on the whole redemption is read off where
          the amount lands within that available liquidity: 10&ndash;50 bps for FYC, 50&ndash;100 bps for FFC —
          junior liquidity is scarcer and riskier to hand out on demand, so its band sits strictly above
          FYC&rsquo;s.
        </p>
        <Callout>
          <b>In plain terms:</b> the more of the tranche&rsquo;s available cash you try to grab right now, the
          bigger the cut you pay — like a surge price. Take a small slice, pay close to the minimum fee. Take
          (almost) all of what&rsquo;s available, pay close to the maximum. Nobody sets this fee by hand each
          time — it&rsquo;s just this one formula, read fresh every time someone redeems.
        </Callout>
        <Card>
          <div className="formula">
            {`fee_bps = fee_min + (amount / elb_tranche) × (fee_max − fee_min)

FYC:  fee_min = ${INSTANT_FEE_BPS.fyc[0]} bps (${(INSTANT_FEE_BPS.fyc[0] / 100).toFixed(2)}%)   fee_max = ${INSTANT_FEE_BPS.fyc[1]} bps (${(INSTANT_FEE_BPS.fyc[1] / 100).toFixed(2)}%)
FFC:  fee_min = ${INSTANT_FEE_BPS.ffc[0]} bps (${(INSTANT_FEE_BPS.ffc[0] / 100).toFixed(2)}%)   fee_max = ${INSTANT_FEE_BPS.ffc[1]} bps (${(INSTANT_FEE_BPS.ffc[1] / 100).toFixed(2)}%)

amount > elb_tranche  →  instant path unavailable, must use the scheduled queue instead`}
          </div>
        </Card>
        <Card style={{ marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>Worked example</h3>
          <p className="section-dek">
            $100K available liquidity, FYC:FFC pool share 40:60 → ELB<sub>FYC</sub> = {fmtUSD(exElbFyc)}. Someone
            redeeming {fmtUSD(exRedeem)} FYC — the midpoint of $0&ndash;${fmtUSD(exElbFyc).slice(1)} — lands at
            the midpoint of the fee band.
          </p>
          <div className="readout-grid">
            <Readout label="fee rate" value={`${exFee.feeBps.toFixed(2)} bps`} sub="midpoint of 10–50 bps" color="var(--fyc)" />
            <Readout label="fee value" value={fmtUSD(exFee.feeValue)} sub="settled as FYC, 50/50 to protocol/insurance" />
            <Readout label="net payout" value={fmtUSD(exFee.netPayout)} sub={`of ${fmtUSD(exRedeem)} requested`} />
          </div>
          <p className="section-dek" style={{ marginTop: 12, marginBottom: 0 }}>
            Every subsequent redemption re-reads ELB live — if this $20K goes through, ELB<sub>FYC</sub> drops to{' '}
            {fmtUSD(exElbFyc - exRedeem)} and the next redeemer&rsquo;s fee curve is measured against that,
            automatically — there&rsquo;s no separate &ldquo;recalculate&rdquo; step.
          </p>
        </Card>
        <Callout tone="amber" >
          <b>Known, deliberately unfixed gaming vector:</b> because ELB is read live, splitting one large
          redemption into several small ones inside a single transaction (before anything else can move ELB)
          converges the average rate paid toward fee_min — this endpoint formula is quadratic but not
          split-invariant. The closed-form fix is charging the integral of the same marginal rate,{' '}
          <code>fee = fee_min·amount + (fee_max−fee_min)·amount²/(2·elb_tranche)</code> — exactly half this
          formula&rsquo;s quadratic term — which IS split-invariant. Not adopted here because it changes this
          worked example&rsquo;s numbers; flagged on <code>/open-questions</code> as the recommended production
          hardening.
        </Callout>
      </div>

      <div style={{ marginTop: 32 }}>
        <Badge>3. Fee settlement — always FYC, split 50/50</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Redeeming FYC: the fee-portion tokens are simply never burned — they&rsquo;re transferred straight to
          protocol_wallet / insurance_wallet, split 50/50. Redeeming FFC: the fee-portion tokens ARE burned and
          the equivalent USD value is minted as new FYC into the same two wallets instead, via the{' '}
          <code>jr_to_sr</code> primitive (see <a href="/tranche-swap">/tranche-swap</a>) — deliberate, not
          incidental: protocol/insurance treasuries should never carry first-loss (FFC) exposure, so a junior
          fee always converts up to senior before it lands in a wallet. Both legs price at{' '}
          <b>conservative</b> price, never optimistic — this moves already-collected value, not new external
          capital, so optimistic pricing&rsquo;s dilution-protection purpose doesn&rsquo;t apply; using it here
          would under-mint FYC and hand existing holders a NAV bump for free. One accepted, stated asymmetry:
          because of this, protocol/insurance end up with proportionally more future-yield claim per fee-dollar
          than an external depositor gets per deposit-dollar (who mints at the higher optimistic price) — see{' '}
          <a href="/open-questions">/open-questions</a>.
        </p>
      </div>

      <div style={{ marginTop: 32 }}>
        <Badge>4. Scheduled (30d/90d) queue — now with an admin review page</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          <code>submit_redemption</code> already escrows the tokens and sets <code>eligible_ts</code> (now +
          30d FYC / 90d FFC); <code>process_redemption</code> already pays out at the conservative price{' '}
          <em>at processing time</em>, not submission — any yield or loss during the lock window is borne by
          the redeemer. What&rsquo;s missing today: nowhere to actually SEE the pending queue.
        </p>
        <Card>
          Proposed <b>backend + admin frontend</b> addition (see <code>/code-diff</code>, backend/frontend
          entries): a redemptions review page listing every <code>RedemptionRequest</code> with status{' '}
          <code>PENDING</code>, its <code>eligible_ts</code>, and a one-click{' '}
          <code>process_redemption</code> call once eligible — the only place today that instruction gets
          called from is nowhere; there&rsquo;s no caller at all in the real frontend.
        </Card>
      </div>

      <div style={{ marginTop: 32 }}>
        <Badge>5. Loan origination can&rsquo;t outrun submitted redemptions</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          A second, independent gate alongside the existing severity check: a new loan can&rsquo;t be funded out
          of capital that&rsquo;s needed to cover redemptions that have already been submitted (queued, not yet
          eligible OR eligible but not yet processed) — across BOTH tranches, and against BOTH the standard
          queue and anything currently earmarked (below). Today only FFC pending redemptions are tracked at all
          (<code>pool.pending_ffc_redemptions</code>); FYC&rsquo;s equivalent field doesn&rsquo;t exist yet —
          proposed as <code>pending_fyc_redemptions</code>, updated by <code>submit_redemption</code> the same
          way.
        </p>
        <Card>
          <div className="formula">
            {'require(\n  elb_total − pending_fyc_redemptions − pending_ffc_redemptions − earmarked_loan_capital\n  ≥ new_loan_amount\n)\n\n// both this AND the (unchanged) severity gate must pass — whichever is stricter binds'}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 32 }}>
        <Badge>6. Earmarking loan capital at &ldquo;equity received&rdquo;</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          &ldquo;Equity received&rdquo; is a real, existing stage in the off-chain borrower pipeline (
          <code>ApplicationStage.EQUITY_RECEIVED</code>) — confirmed by the backend&rsquo;s own settlement-bank
          provisioning at that stage — that happens BEFORE the loan actually originates on-chain. Without an
          earmark, capital already committed to that loan is indistinguishable from idle reserve, and could be
          instantly redeemed out from under it. Proposed: an admin-only <code>earmark_loan_capital(amount)</code>{' '}
          instruction, called by the backend the moment equity_received fires, incrementing a new{' '}
          <code>PoolState.earmarked_loan_capital</code> field — released either when <code>originate_loan</code>{' '}
          actually fires (capital transitions from &ldquo;earmarked&rdquo; to <code>outstanding_principal</code>
          ) or via admin <code>cancel_earmark</code> if the deal falls through.
        </p>
        <Callout tone="amber">
          Two hardening details folded in from review, not left as gaps: every earmark carries an{' '}
          <code>expires_ts</code> and a permissionless <code>sweep_expired_earmark</code> releases it if nobody
          calls <code>cancel_earmark</code> in time — otherwise a forgotten cancellation permanently over-reserves
          capital. The remaining risk — two concurrent equity-received events both passing the liquidity gate
          before either earmark actually posts — isn&rsquo;t solvable on-chain alone; it needs the backend to
          serialize equity-received processing. Flagged, not fixed, on <code>/open-questions</code>.
        </Callout>
      </div>
    </>
  );
}
