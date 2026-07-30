import { PageHeader, Card, Callout, SectionHead } from '@/components/ui';
import CodeBlock from '@/components/CodeBlock';

function Q({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <span className="qmark">?</span>
      <p>{children}</p>
    </li>
  );
}

export default function FfcResetPage() {
  return (
    <>
      <PageHeader
        eyebrow="pinochio / src — exploratory, not in the code diff"
        title="Resetting FFC after a catastrophic loss"
        lede="A suggestion for what to do once FFC's price has crashed far enough that continuing to operate the token as-is stops making sense. Deliberately kept off the code-diff page — this needs a decision from the team before it's a Rust proposal, not just an implementation."
      />

      <Callout tone="amber">
        This is a discussion starter, not a locked-in design. Everything on <code>/code-diff</code> is a concrete
        Rust proposal against the real deployed contract; nothing below is. Treat this page as a place to reason
        about the mechanism and its tradeoffs before anyone writes code against it.
      </Callout>

      <div style={{ marginTop: 32 }}>
        <SectionHead
          num="01"
          title="Why FFC eventually needs an answer for this"
          dek="apply_default_waterfall doing its job correctly is exactly what creates the problem."
        />
        <Card>
          <p>
            FFC is the first-loss tranche by design — the default waterfall (see <code>helpers/waterfall.rs</code>{' '}
            on <code>/code-diff</code>) burns down FFC&rsquo;s <code>v_tranche</code> before FYC ever takes a cut,
            and now also burns insurance-held FYC before touching general FYC holders. That&rsquo;s correct,
            intended behavior for ordinary losses, including fairly large ones.
          </p>
          <p style={{ marginTop: 12 }}>
            But a large enough default, or a run of them, can still drive FFC&rsquo;s <code>live_price</code> toward
            zero even after the insurance-FYC tier is exhausted. Once that happens, the token is still technically
            alive but economically dead:
          </p>
          <ul className="oq-list" style={{ marginTop: 12 }}>
            <Q>
              <b>New capital has no reason to come in.</b> Depositing $1 at a fraction-of-a-cent price buys an
              enormous, meaningless number of tokens — nothing about that price signals risk or opportunity to a
              rational depositor anymore.
            </Q>
            <Q>
              <b>Fixed-point precision starts to break down.</b> Prices are scaled by <code>PRECISION</code> (
              1,000,000) — as <code>live_price</code> approaches its lower bound, small pool-value changes stop
              being representable at all, and rounding error becomes a larger share of every holder&rsquo;s balance.
            </Q>
            <Q>
              <b>Existing holders are stuck.</b> The pool can keep originating loans and collecting yield, and
              FFC&rsquo;s price could in theory climb back over years — but nobody is incentivized to accelerate
              that by depositing, and redeeming out at a near-zero price returns close to nothing.
            </Q>
          </ul>
        </Card>
      </div>

      <div style={{ marginTop: 32 }}>
        <SectionHead
          num="02"
          title="The proposed mechanism"
          dek="Re-denominate FFC's existing claim on the pool into a fresh, usable unit — without inventing or destroying any value in the process."
        />
        <Card>
          <p>
            At some trigger point, freeze the old FFC tranche exactly as it stands — its{' '}
            <code>v_tranche</code>, its <code>total_supply</code>, and therefore its price at that instant
            (<code>old_price = old_v_tranche / old_total_supply</code>). Stand up a brand-new FFC tranche
            alongside it — new mint, new <code>TrancheState</code>, starting at <code>v_tranche = 0</code>,{' '}
            <code>total_supply = 0</code>, price pinned to $1.
          </p>
          <p style={{ marginTop: 12 }}>
            Holders of the old token can then burn some or all of their old FFC to mint the equivalent value of
            new FFC, priced at the frozen <code>old_price</code>, not a live one:
          </p>
          <CodeBlock
            fontSize={12.8}
            code={`usd_value    = old_tokens_burned × old_price   // old_price frozen at reset, not live
new_tokens   = usd_value / $1                  // new tranche starts at exactly $1`}
          />
          <p style={{ marginTop: 12 }}>
            The same principle the yield-minting side of this design already leans on applies here too: this
            never invents value that doesn&rsquo;t exist. Every old token is worth exactly{' '}
            <code>old_price</code> at the moment of freeze, and the sum of every holder&rsquo;s balance is exactly{' '}
            <code>old_total_supply</code> — so the total value convertible across all holders, if everyone
            eventually converts, is exactly <code>old_v_tranche</code>. The new tranche is fully backed by
            claims that already existed; nothing is minted against thin air, and nothing is destroyed either
            beyond what the loss already destroyed.
          </p>
          <p style={{ marginTop: 12 }}>
            Crucially, this touches only FFC&rsquo;s own accounting. The pool&rsquo;s real assets — the
            yield-bearing reserve(s), the outstanding loan book — aren&rsquo;t moved, split, or re-valued by
            this at all. FYC&rsquo;s
            <code> TrancheState</code> is untouched. This is a re-labeling of FFC&rsquo;s claim structure, not a
            change to what backs it.
          </p>
        </Card>
      </div>

      <div style={{ marginTop: 32 }}>
        <SectionHead num="03" title="Open questions" dek="What this page doesn't answer yet." />
        <Card>
          <ul className="oq-list">
            <Q>
              <b>Automatic trigger vs. admin-gated.</b> A price-threshold trigger is predictable and therefore
              front-runnable — someone could position ahead of a reset they saw coming. An admin-gated trigger
              avoids that but reintroduces trust and timing discretion. Worth deciding which failure mode is
              more acceptable.
            </Q>
            <Q>
              <b>Non-obligatory conversion.</b> Nothing forces an old holder to convert — lost keys, inattention,
              or holders who&rsquo;ve simply moved on all leave value sitting dormant in the frozen old tranche
              indefinitely. Is that acceptable forever, or does it eventually need an expiry or a swept
              claims process?
            </Q>
            <Q>
              <b>Does FYC get a say?</b> The reset only touches FFC&rsquo;s own accounting, but FYC shares the
              same pool and the same first-loss protection FFC is supposed to provide. Worth deciding whether a
              reset should require any notice or sign-off tied to FYC&rsquo;s position, even though its own
              tranche state is mathematically untouched.
            </Q>
            <Q>
              <b>Should a reset pause originations for a cooldown period?</b> Resetting into the same conditions
              that caused the catastrophic loss — without addressing whatever drove it — just delays the next
              one. Worth considering whether a reset should force a review or a temporary origination freeze.
            </Q>
            <Q>
              <b>Where&rsquo;s the actual threshold?</b> &ldquo;Price crashed far enough&rdquo; isn&rsquo;t a
              number yet. Whether that&rsquo;s a fixed constant (e.g. <code>live_price</code> below some small
              fraction of $1) or a case-by-case judgment call changes how much of this can be automated versus
              how much stays a manual decision.
            </Q>
            <Q>
              <b>Versioning across multiple resets.</b> If this ever happens more than once in the protocol&rsquo;s
              life, every new FFC tranche needs a clear generation marker so holders, redemption UIs, and any
              off-chain indexers can always tell which FFC &ldquo;era&rdquo; a given token belongs to.
            </Q>
          </ul>
        </Card>
      </div>
    </>
  );
}
