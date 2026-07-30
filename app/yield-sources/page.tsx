import { PageHeader, Card, Callout, Badge, Readout } from '@/components/ui';
import { blendedApy, pickRebalanceTarget, YIELD_TARGET, fmtUSD, fmtPct, type YieldSource } from '@/lib/model';

const SOURCES: YieldSource[] = [
  { id: 'usdy', capitalUsd: 600000, apy: 0.042, enabled: true },
  { id: 'syrupUSDC', capitalUsd: 300000, apy: 0.028, enabled: true },
  { id: 'legacy-token', capitalUsd: 50000, apy: 0.01, enabled: false },
];
const currentBlended = blendedApy(SOURCES);
const DEPOSIT = 100000;
const choice = pickRebalanceTarget(SOURCES, DEPOSIT);

export default function YieldSourcesPage() {
  return (
    <>
      <PageHeader
        eyebrow="pinochio / src — round 2"
        title="Multi-yield-source routing"
        lede="Today the contract has exactly one primary reserve token (USYC) — confirmed by reading the live pinocchio program. This proposes the multi-YieldSourceState registry this design tool's own /code-diff already references as proposed-only, plus the routing logic that decides where new capital goes."
      />

      <div style={{ marginTop: 8 }}>
        <Badge>1. Admin-gated registry</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          <code>initialize_yield_source</code> is admin-only (the same <code>assert_admin</code> check already
          gating <code>set_redemption_fees</code>/<code>set_paused</code>) — a malicious actor can&rsquo;t
          register a worthless token as yield-bearing collateral. <code>disable_yield_source</code> (new,
          also admin-only) sets an <code>enabled: bool</code> flag: a disabled source stops being a target for
          new deposits or rebalance routing, and gets prioritized for unwinding (see §4).
        </p>
        <Card>
          <div className="formula">
            {`YieldSourceState {
  mint: Address,
  token_balance: u64,
  enabled: bool,
  capital_deployed_usd: u64,      // token_balance × last observed price
  last_price: u64,
  last_epoch_ts: i64,
  observed_apy_bps: u64,          // derived, same price-delta method as
}                                  // the existing single-source calc`}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 28 }}>
        <Badge>2. Per-source APY tracking → blended portfolio yield</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          <code>run_yield_epoch</code> (existing, admin-called) is extended to iterate every registered source
          instead of the single hard-coded reserve — deriving each one&rsquo;s <code>observed_apy_bps</code> the
          same way the current single-source version already does (a price-delta over the epoch, annualized,
          exactly like <code>observed_source_apy_bps</code>; the design tool&rsquo;s own simulator uses the
          identical method — see /simulator). The pool-wide number that matters is the CAPITAL-WEIGHTED blend
          across every source, structurally identical to Hylo&rsquo;s published &ldquo;Average SOL Reserve
          Yield&rdquo; equation:
        </p>
        <Card>
          <div className="formula">{'            Σ (capital_i × apy_i)\nblended_apy = ----------------------\n                 Σ capital_i'}</div>
        </Card>
        <Callout>
          <b>In plain terms:</b> if you have $600 earning 4% and $300 earning 2%, your combined return
          isn&rsquo;t the plain average of 4% and 2% (3%) — it&rsquo;s pulled toward whichever pile of money
          is bigger, the same way a report-card GPA weights a 4-credit class more than a 1-credit one. Here,
          the bigger pile is $600, so the blend lands closer to 4% than to 2%.
        </Callout>
        <Card style={{ marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>Worked example</h3>
          <div className="readout-grid">
            {SOURCES.map((s) => (
              <Readout
                key={s.id}
                label={s.id + (s.enabled ? '' : ' — disabled')}
                value={`${fmtUSD(s.capitalUsd)} @ ${fmtPct(s.apy, 1)}`}
                color={s.enabled ? undefined : 'var(--critical)'}
              />
            ))}
            <Readout label="blended portfolio APY" value={fmtPct(currentBlended, 2)} color="var(--good)" />
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 28 }}>
        <Badge>3. Target-range routing — [3%, 3.5%, 7%]</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          When new capital needs a home (a fresh deposit, or rebalancing after a source is disabled), the
          system picks whichever ENABLED source moves the BLENDED portfolio APY closest to the 3.5% target,
          among candidates landing inside [3%, 7%]. The 3% floor exists purely so &ldquo;couldn&rsquo;t reach
          the target&rdquo; is never an on-chain error — it&rsquo;s the point routing stops caring, not a hard
          requirement. The 7% ceiling is soft too: a source that pushes the blend ABOVE 7% is still fine, and
          if nothing lands in range at all, routing reaches for the single highest resulting APY instead of
          failing.
        </p>
        <Callout>
          <b>In plain terms:</b> we&rsquo;re not trying to hit exactly 3.5% and giving up if we can&rsquo;t —
          we&rsquo;re aiming for it, happy with anywhere between 3% and 7%, and if even 3% is out of reach
          right now, we still take the best deal actually available instead of refusing to do anything at
          all. A thermostat set to 70° that&rsquo;s fine with 68&ndash;72° is the same idea.
        </Callout>
        <Card>
          <div className="formula">
            {`for each enabled source i:
  hypothetical_apy_i = blended_apy(sources, with source i += deposit_amount)

in_range = { i : YIELD_MIN ≤ hypothetical_apy_i ≤ YIELD_MAX }
choice   = in_range.length > 0
             ? argmin_i |hypothetical_apy_i − YIELD_TARGET|   // closest to 3.5%
             : argmax_i hypothetical_apy_i                    // never errors — reach for the top instead`}
          </div>
        </Card>
        <Card style={{ marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>Worked example</h3>
          <p className="section-dek">
            Routing a {fmtUSD(DEPOSIT)} deposit against the portfolio above (current blend{' '}
            {fmtPct(currentBlended, 2)}, target [{fmtPct(YIELD_TARGET.min, 0)}, {fmtPct(YIELD_TARGET.target, 1)},{' '}
            {fmtPct(YIELD_TARGET.max, 0)}]):
          </p>
          <Readout
            label="routes to"
            value={choice.sourceId ?? 'none enabled'}
            sub={`resulting blend ${fmtPct(choice.resultingApy, 2)} — ${choice.inRange ? 'inside target range' : 'closest available, outside range'}`}
            color="var(--fyc)"
          />
        </Card>
        <Callout tone="amber">
          This scoring is deliberately specified as an OFF-CHAIN preview function (same{' '}
          <code>#[cfg(feature = &quot;offchain&quot;)]</code> pattern as the severity gate&rsquo;s{' '}
          <code>max_origination()</code> on <code>/implementation</code>) — comparing hypothetical blends
          across N sources is a routing decision, not something that needs to happen inside the instruction
          itself. The on-chain instruction just receives a <code>target_source_id</code> argument and validates
          it (enabled, and doesn&rsquo;t move the blend somewhere obviously wrong), the same trust boundary
          Jupiter/Titan swap routing already uses.
        </Callout>
      </div>

      <div style={{ marginTop: 28 }}>
        <Badge>4. Disabled sources unwind first</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Once a source is disabled, the NEXT time any redemption (instant or scheduled) needs to swap
          yield-token → stable for payout, it draws from a disabled source&rsquo;s balance before touching any
          enabled one — a simple withdrawal-order rule (sort candidate sources disabled-first, then by lowest
          APY as a tiebreak) inside the shared redemption payout helper. This is how a disabled token actually
          gets wound down over time, rather than sitting inert forever once flagged.
        </p>
      </div>

      <div style={{ marginTop: 28 }}>
        <Badge>5. Scope cut — not modeled in the interactive simulator</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          <code>/simulator</code> keeps a single time-stepped reserve price path — rebuilding it to run N
          independent sources with independent price paths is a disproportionate rewrite for what this round
          needs. The formulas above (<code>blendedApy</code>, <code>pickRebalanceTarget</code>) are real, tested
          pure functions in <code>lib/model.ts</code>, demonstrated here via worked examples rather than live
          simulation — see <a href="/open-questions">/open-questions</a>.
        </p>
      </div>
    </>
  );
}
