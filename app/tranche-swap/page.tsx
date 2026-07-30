import { PageHeader, Card, Callout, Badge } from '@/components/ui';
import { convertTranche, fmtUSD } from '@/lib/model';

// Running example.
const FYC_PRICE = 1.04;
const FFC_PRICE = 0.97;
const CONVERT_TOKENS = 10000;
const result = convertTranche('jrToSr', CONVERT_TOKENS, FYC_PRICE, FFC_PRICE);

export default function TrancheSwapPage() {
  return (
    <>
      <PageHeader
        eyebrow="pinochio / src — round 2"
        title="jr_to_sr / sr_to_jr — the tranche-conversion primitive"
        lede="A general-purpose instruction that burns one tranche's tokens and mints the other's, at conservative price on both legs, so V_pool is exactly unchanged — the same shape as Hylo's stable↔lever conversion, adapted to two tranches instead of a stable/leverage pair."
      />

      <div style={{ marginTop: 8 }}>
        <Badge>1. The invariant</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Burns <code>tokens_in</code> of the source tranche at its OWN conservative price, and mints the exact
          same USD value of the destination tranche at ITS conservative price. Nothing is invented: the value
          that disappears from one tranche&rsquo;s v_tranche reappears, in full, in the other&rsquo;s.
        </p>
        <Callout>
          <b>In plain terms:</b> it&rsquo;s like exchanging currency at the exact market rate, with the
          exchange booth taking no commission. Hand over $100 of FFC, get exactly $100 worth of FYC back — at
          whatever FYC is actually trading for that moment, not a fixed or made-up rate. No money appears out
          of thin air, and none vanishes either; it just changes which tranche it&rsquo;s sitting in.
        </Callout>
        <Card>
          <div className="formula">
            {`jr_to_sr(ffc_tokens_in):
  value          = ffc_tokens_in × ffc_conservative_price
  burn ffc_tokens_in;         v_ffc -= value
  fyc_tokens_out = value / fyc_conservative_price
  mint fyc_tokens_out;        v_fyc += value
  require: severity(outstanding, new_ffc, new_fyc) ≤ SEVERITY_GATE_MAX

sr_to_jr(fyc_tokens_in):      // mirror image — burn FYC, mint FFC
  ... same shape, reversed ...
  require: assert_mint_allowed() still passes on the resulting pool

// V_pool = V_FYC + V_FFC is unchanged by construction — value moves
// between tranches, none is created or destroyed.`}
          </div>
        </Card>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Worked example: converting {CONVERT_TOKENS.toLocaleString()} FFC tokens at ${FFC_PRICE.toFixed(2)}/token
          (FYC trading at ${FYC_PRICE.toFixed(2)}/token) burns {fmtUSD(result.valueUsd)} of value out of FFC and
          mints exactly <b>{result.tokensMinted.toFixed(2)}</b> new FYC tokens — {fmtUSD(result.valueUsd)} of
          value, unchanged, now sitting in FYC instead.
        </p>
      </div>

      <div style={{ marginTop: 28 }}>
        <Badge>2. Why conservative price on both legs — not optimistic</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Optimistic pricing exists to protect EXISTING holders from being diluted by an incoming depositor
          minting against yield that&rsquo;s real but hasn&rsquo;t been swept into v_tranche yet. A conversion
          isn&rsquo;t new external capital arriving — it&rsquo;s already-collected value moving sideways between
          two tranches that both already exist. Minting the destination side at optimistic price would
          systematically UNDER-mint it and hand existing destination-tranche holders a NAV bump they didn&rsquo;t
          earn, at the source tranche&rsquo;s expense. Conservative→conservative is the only choice that keeps
          both tranches&rsquo; per-token NAV exactly flat across a conversion.
        </p>
      </div>

      <div style={{ marginTop: 28 }}>
        <Badge>3. Gate re-checks — more than just severity</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          A <code>jr_to_sr</code> call shrinks FFC&rsquo;s first-loss cover against the EXISTING loan book, not
          just future originations — re-checking severity against the post-conversion pool (as above) catches
          that. That check alone is insufficient, though:
        </p>
        <Card>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5, color: 'var(--text-secondary)' }}>
            <li>
              <b style={{ color: 'var(--text-primary)' }}>Post-conversion ELB vs. pending redemptions.</b> A
              conversion instantly reweights each tranche&rsquo;s share of ELB (elb_tranche is a function of
              V_FYC/V_FFC — see <a href="/redemption">/redemption</a>), and can strand an already-queued
              redeemer in the shrinking tranche even though the severity gate still passes. <code>jr_to_sr</code>{' '}
              /<code>sr_to_jr</code> must also require the resulting elb_fyc/elb_ffc still cover that
              tranche&rsquo;s <code>pending_fyc_redemptions</code>/<code>pending_ffc_redemptions</code>.
            </li>
            <li>
              <b style={{ color: 'var(--text-primary)' }}>The fee-collection path must never revert the
              user&rsquo;s redemption.</b> Instant FFC redemptions call <code>jr_to_sr</code> internally to
              settle their fee (see <a href="/redemption">/redemption</a> §3) — if that inline conversion&rsquo;s
              severity check fails, a naive implementation reverts the ENTIRE instruction, blocking the
              user&rsquo;s principal redemption over a fee-sizing side effect. Fix: the fee-conversion leg falls
              back to a suspense FFC balance (left un-burned, converted opportunistically later once headroom
              exists) instead of failing the whole call — the user&rsquo;s redemption always completes.
            </li>
          </ul>
        </Card>
        <Callout tone="amber">
          Not resolved here, flagged on <code>/open-questions</code>: whether <code>jr_to_sr</code>/
          <code>sr_to_jr</code> should be disallowed from composing atomically with <code>originate_loan</code>{' '}
          in the same transaction (temporarily satisfying a gate, originating, then reversing). Every check here
          reads live state, so this is likely low-risk, but it&rsquo;s a real design decision, not an oversight
          to wave off.
        </Callout>
      </div>

      <div style={{ marginTop: 28 }}>
        <Badge>4. Why the redemption-fee mechanism reuses this instead of inventing its own</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          The FFC-side of the redemption fee (burn fee-portion FFC, mint equivalent FYC into the two fee
          wallets) is exactly one <code>jr_to_sr</code> call with <code>tokens_in</code> = the fee-portion token
          count — not a parallel, hand-rolled burn/mint path. One audited conversion primitive, two callers
          (the fee mechanism, and any future direct swap surface), same invariant, same gate re-checks.
        </p>
      </div>
    </>
  );
}
