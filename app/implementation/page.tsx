import { PageHeader, Card, Callout, Badge } from '@/components/ui';
import FlowDiagram from '@/components/FlowDiagram';
import CodeBlock from '@/components/CodeBlock';

export default function ImplementationPage() {
  return (
    <>
      <PageHeader
        eyebrow="pinochio / src"
        title="Implementation suggestions"
        lede="Concrete update suggestions for the existing pinochio code — five patterns worth adopting, plus how this whole system should connect end to end."
      />

      <Callout tone="amber">
        These five patterns are demonstrated in a real, production Solana lending protocol with the same
        senior/junior tranche shape as FYC/FFC — worth a look if you want to see one of them in practice:{' '}
        <a href="https://github.com/hylo-so/sdk" target="_blank" rel="noopener noreferrer">
          github.com/hylo-so/sdk ↗
        </a>
      </Callout>

      {/* ---- 1. Limiter struct ---- */}
      <div style={{ marginTop: 32 }}>
        <Badge>1. Struct-based gate, not a bare function</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Wrap the relevant state in a struct with a private &ldquo;projected state&rdquo; helper, an{' '}
          <code>#[cfg(feature = &quot;offchain&quot;)]</code> inverse function a frontend can call to know its
          headroom <em>before</em> submitting a transaction, and a <code>validate_*</code> method the on-chain
          program actually calls. Our two new gates should follow this shape:
        </p>
        <Card>
          <CodeBlock code={`pub struct SeverityGate {
  pub fyc_value: u64,
  pub ffc_value: u64,
  pub outstanding: u64,
}

impl SeverityGate {
  fn projected_severity(&self, new_loan: u64) -> Result<u64, FleetError> {
    let projected = checked_add_u64(self.outstanding, new_loan)?;
    severity_bps(projected, self.ffc_value, self.fyc_value)
  }

  /// Max new-loan headroom under the severity gate — inverse of
  /// projected_severity. Lets the frontend show "you can originate up
  /// to $X" before the borrower even submits anything.
  #[cfg(feature = "offchain")]
  pub fn max_origination(&self) -> Result<u64, FleetError> {
    let ceiling = checked_add_u64(
      self.ffc_value,
      mul_div_floor(SEVERITY_GATE_MAX_BPS, self.fyc_value, BPS_DENOMINATOR)?,
    )?;
    Ok(ceiling.saturating_sub(self.outstanding))
  }

  pub fn validate_origination(&self, new_loan: u64) -> Result<u64, FleetError> {
    let severity = self.projected_severity(new_loan)?;
    (severity <= SEVERITY_GATE_MAX_BPS)
      .then_some(new_loan)
      .ok_or(FleetError::SeverityGateExceeded)
  }
}

// MintFloorGate follows the same shape, checking severity > SEVERITY_MINT_FLOOR_BPS`} />
        </Card>
      </div>

      {/* ---- 2. inner/outer split ---- */}
      <div style={{ marginTop: 32 }}>
        <Badge>2. Split pure computation from error attachment</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Make every math function a thin public wrapper (<code>Result</code>, a specific error) around a
          private <code>_inner</code> function (<code>Option</code>, no error type at all). It keeps the
          actual math trivially unit-testable without constructing error types, and makes the public
          function&rsquo;s only job &ldquo;attach the right error variant.&rdquo; Our new <code>curve.rs</code>{' '}
          interpolation helper should follow it:
        </p>
        <Card>
          <CodeBlock code={`pub fn interpolate_k(coverage_bps: u64, breakpoints: &[(u64, u64)]) -> Result<u64, FleetError> {
  interpolate_k_inner(coverage_bps, breakpoints).ok_or(FleetError::InterpOutOfDomain)
}

fn interpolate_k_inner(coverage_bps: u64, breakpoints: &[(u64, u64)]) -> Option<u64> {
  // pure piecewise-linear lookup — None on domain/monotonicity failure,
  // never touches an error type
}`} />
        </Card>
      </div>

      {/* ---- 3. rounding ---- */}
      <div style={{ marginTop: 32 }}>
        <Badge>3. Explicit rounding direction, every time</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Never call a bare <code>mul_div</code> — every call site should be <code>mul_div_floor</code> or{' '}
          <code>mul_div_ceil</code>, chosen deliberately and asserted in tests (e.g.{' '}
          <code>payout × supply ≤ user_lp × pool</code> — &ldquo;rounds down, favors the protocol&rdquo;). Our{' '}
          <code>helpers/math.rs::mul_div_u64</code> doesn&rsquo;t make this choice visible at the call site,
          which means every one of ~15 call sites across <code>coverage.rs</code>/<code>waterfall.rs</code>/
          <code>curve.rs</code> is implicitly trusting whatever <code>mul_div_u64</code> happens to do
          internally. Split it in two, and audit each call site to pick on purpose — new FFC-share and gate
          math should floor in the protocol&rsquo;s favor.
        </p>
      </div>

      {/* ---- 4. errors ---- */}
      <div style={{ marginTop: 32 }}>
        <Badge>4. Group and specialize the error enum</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Keep the error enum flat, but group it by originating module with a <code>// module_name</code>{' '}
          comment header per cluster, and name every variant for its exact failure (
          <code>InterpPointsNotMonotonic</code>) rather than reusing a generic <code>Overflow</code>. Worth
          doing the same pass on <code>FleetError</code> for the new surface:
        </p>
        <Card>
          <CodeBlock code={`// helpers/curve.rs
InterpInsufficientPoints,   // fewer than 2 breakpoints configured
InterpPointsNotMonotonic,   // coverage breakpoints not strictly increasing
InterpOutOfDomain,          // coverage_bps outside the stored range
InterpArithmetic,           // overflow during the lerp itself

// helpers/coverage.rs — gates
SeverityGateExceeded,       // origination blocked, projected severity > 20%
MintFloorNotMet,            // FFC mint blocked, severity <= 2%
SeverityArithmetic,         // overflow computing (P - FFC) / FYC`} />
        </Card>
      </div>

      {/* ---- 5. tests ---- */}
      <div style={{ marginTop: 32 }}>
        <Badge>5. Property-based tests on the invariants, boundary tests on the gates</Badge>
        <p className="section-dek" style={{ marginTop: 10 }}>
          Every math function should ship <code>proptest</code> cases asserting a general property (rounding
          direction, proportionality), plus hand-written boundary tests at the exact limit (
          <code>accept_mint_at_limit</code>, <code>reject_mint_one_unit_over_limit</code>). Nothing in the
          current codebase does this for <code>coverage.rs</code>/<code>waterfall.rs</code>. Minimum bar for
          the new severity math:
        </p>
        <Card>
          <CodeBlock code={`proptest! {
  #[test]
  fn ffc_share_pct_bounded(fyc in 1u64..1_000_000_000, ffc in 1u64..1_000_000_000, out in 0u64..1_000_000_000) {
    let share = curve_at_actual(out, ffc, fyc)?.share_bps;
    prop_assert!(share <= BPS_DENOMINATOR); // never more than 100%
  }

  #[test]
  fn k_never_below_k_min(coverage_bps in 0u64..=10_000, severity_bps in 0u64..=100_000) {
    let k = k_from_coverage_and_severity(coverage_bps, severity_bps)?;
    prop_assert!(k >= K_MIN_BPS);
  }
}

#[test] fn origination_at_exactly_20pct_severity_allowed() { /* boundary, not just "under" */ }
#[test] fn origination_one_unit_over_severity_blocked() { /* off-by-one, the standard boundary-test pair */ }`} />
        </Card>
      </div>

      {/* ---- flow diagram ---- */}
      <div style={{ marginTop: 40 }}>
        <h2>System flow — backend to frontend to smart contract</h2>
        <p className="section-dek" style={{ marginBottom: 16 }}>
          The recommendation is to extract the shared math (coverage, severity, the curve, both gates) into
          its own crate — <code>fleet-core</code> — imported by both the on-chain program and an off-chain
          indexer, gated behind the same <code>#[cfg(feature = &quot;offchain&quot;)]</code> pattern used in
          pattern 1 above. Today there is no off-chain service at all — the frontend would have to
          reimplement this math in TypeScript (as this very app does, in <code>lib/model.ts</code>) with a
          real risk of drift from the Rust source of truth. A shared crate removes that risk entirely.
        </p>
        <Card>
          <FlowDiagram />
        </Card>
        <Card style={{ marginTop: 16 }}>
          <h3>Why this matters concretely</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>
              <b style={{ color: 'var(--text-primary)' }}>No math drift.</b> Today this Next.js app&rsquo;s{' '}
              <code>lib/model.ts</code> is a hand-ported copy of the intended Rust logic. If the real program
              changes a breakpoint or a gate threshold, this app silently goes stale. A shared crate compiled
              to WASM (or a generated TS client from the same source) removes that entirely.
            </li>
            <li>
              <b style={{ color: 'var(--text-primary)' }}>Frontend previews before signing.</b> The{' '}
              <code>max_origination()</code>/<code>max_mint()</code> offchain-only functions above are exactly
              what lets a borrower&rsquo;s dashboard say &ldquo;you can borrow up to $X&rdquo; without a
              simulated transaction round-trip.
            </li>
            <li>
              <b style={{ color: 'var(--text-primary)' }}>The indexer is the only thing that needs to poll
              RPC.</b> The frontend never talks to Solana RPC directly for read paths — it hits the indexer&rsquo;s
              API, which already did the math. Wallet-signed writes (originate, repay, deposit) still go
              straight from frontend to chain.
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
