'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/ui';
import { slugify } from '@/lib/slug';
import {
  coverageOf,
  severityOf,
  kBase,
  kFromCoverageAndSeverity,
  splitBaseYieldTokenYield,
  levelizedInterest,
  monthlyPayment,
  fmtUSD,
  fmtUSD2,
  splitElb,
  instantRedemptionFeeBps,
  convertTranche,
  blendedApy,
  blendedLoanApy,
  protocolBlendedApy,
  YIELD_TARGET,
  YIELD_EPOCH_SECONDS,
  SECONDS_PER_DAY,
  SECONDS_PER_PERIOD,
  ZERO_LOAN_ACCRUAL,
  rollupLoanAccrual,
  addLoanToAccrual,
  ORIGINATION_FEE_FRACTION,
  fmtPct,
  PERIODS_PER_YEAR,
} from '@/lib/model';

// Running example used throughout the app.
const FYC = 600000;
const FFC = 400000;
const OUT = 450000;

const coveragePct = coverageOf(OUT, FFC) * 100;
const severity = severityOf(OUT, FFC, FYC);
const kb = kBase(coveragePct);
const k = kFromCoverageAndSeverity(coveragePct, severity);
const reserveSplit = splitBaseYieldTokenYield(10000, FYC, FFC);
const levInt = levelizedInterest(100000, 0.15, 36);
const mp = monthlyPayment(100000, 0.15, 36);

const elb = splitElb(FYC + FFC - OUT, FYC, FFC);
const exampleFee = instantRedemptionFeeBps('fyc', 20000, 40000);
const exampleConvert = convertTranche('jrToSr', 10000, 1.04, 0.97);
const exampleBlend = blendedApy([
  { id: 'usdy', capitalUsd: 600000, apy: 0.042, enabled: true },
  { id: 'syrupUSDC', capitalUsd: 300000, apy: 0.028, enabled: true },
]);
const exampleLoanBlend = blendedLoanApy([
  { balance: 300000, apr: 0.15 },
  { balance: 150000, apr: 0.18 },
]);
const exampleProtocolBlend = protocolBlendedApy({
  loanCapital: OUT,
  loanApy: exampleLoanBlend,
  reserveCapital: FYC + FFC - OUT,
  reserveApy: exampleBlend,
});

// Staggered-origination accrual worked example — loan A originates "July 3"
// (day 0), loan B originates 18 days later, "July 21". Proves the O(1)
// accumulator matches summing each loan's own elapsed-time-into-its-own-
// cycle accrual, computed independently — see /latex and verify.ts.
const accrualLoanA = { levelized: levelizedInterest(100000, 0.15, 36), originDay: 0 };
const accrualLoanB = { levelized: levelizedInterest(60000, 0.18, 24), originDay: 18 };
const accrualRateA = accrualLoanA.levelized / SECONDS_PER_PERIOD;
const accrualRateB = accrualLoanB.levelized / SECONDS_PER_PERIOD;
let accrualState = addLoanToAccrual(ZERO_LOAN_ACCRUAL, accrualLoanA.originDay * SECONDS_PER_DAY, accrualLoanA.levelized);
accrualState = addLoanToAccrual(accrualState, accrualLoanB.originDay * SECONDS_PER_DAY, accrualLoanB.levelized);
const accrualQueryDay = 25;
const accrualAtQuery = rollupLoanAccrual(accrualState, accrualQueryDay * SECONDS_PER_DAY);
const accrualGroundTruth = accrualRateA * (accrualQueryDay - accrualLoanA.originDay) * SECONDS_PER_DAY + accrualRateB * (accrualQueryDay - accrualLoanB.originDay) * SECONDS_PER_DAY;

interface Entry {
  term: string;
  symbol?: string;
  def: React.ReactNode;
  formula?: React.ReactNode;
  example?: React.ReactNode;
}

function Entry({ e }: { e: Entry }) {
  return (
    <div className="gloss-entry" id={slugify(e.term)}>
      <div className="gloss-term">
        {e.term}
        {e.symbol && <span className="gloss-symbol">{e.symbol}</span>}
      </div>
      <div className="gloss-def">{e.def}</div>
      {e.formula && <div className="formula" style={{ fontSize: 12.5, padding: '12px 16px' }}>{e.formula}</div>}
      {e.example && <div className="gloss-example">{e.example}</div>}
    </div>
  );
}

const entries: { group: string; items: Entry[] }[] = [
  {
    group: 'The tranches',
    items: [
      {
        term: 'FYC',
        symbol: 'senior tranche',
        def: 'The protected, senior claim on the pool. FYC holders get paid first out of loan interest and reserve yield, but only after FFC has taken its share of the risk premium. FYC only takes a loss once FFC is fully exhausted.',
      },
      {
        term: 'FFC',
        symbol: 'junior, first-loss tranche',
        def: 'The junior claim. FFC absorbs every dollar of loan default first, up to its own value, before FYC feels anything. In exchange, this redesign pays FFC a premium on loan interest that scales with how much protection it’s actually providing.',
      },
      {
        term: 'Outstanding principal',
        symbol: 'P, or outstanding',
        def: 'The sum of every currently-active loan’s remaining balance — the loan book. Not the same as the pool’s total value: some of the pool sits as idle reserve (a yield-bearing token — USDY, syrupUSDC, or any other registered source), which is not exposed to loan-default risk at all.',
        example: <>In the running example: <code>{fmtUSD(OUT)}</code> outstanding, out of a <code>{fmtUSD(FYC + FFC)}</code> pool — the rest, <code>{fmtUSD(FYC + FFC - OUT)}</code>, sits as reserve.</>,
      },
    ],
  },
  {
    group: 'The two dials',
    items: [
      {
        term: 'Coverage',
        symbol: 'the attachment point',
        def: 'What fraction of the outstanding loan book can default before FFC is exhausted and FYC starts taking losses. Deliberately NOT FFC / (FYC + FFC) — that formula fits a design where 100% of the pool sits in one price-moving asset. Our risk event is a loan defaulting, which only threatens the loan book, not the idle reserve — so the denominator is the loan book alone.',
        formula: (
          <>
            {'coverage = min( FFC / P, 1 )'}
          </>
        ),
        example: <>FFC {fmtUSD(FFC)} / outstanding {fmtUSD(OUT)} = <b>{coveragePct.toFixed(1)}%</b> coverage.</>,
      },
      {
        term: 'Severity',
        symbol: 'the impact',
        def: 'If FFC’s protection is exhausted, what fraction of FYC’s own TVL is still at risk in the worst case — the entire loan book defaulting. Coverage alone can’t answer this, because FYC’s size is a free variable in our system: two pools with identical coverage can have wildly different severity if one has a much larger FYC than the other.',
        formula: <>{'severity = max(0, P − FFC) / FYC'}</>,
        example: <>max(0, {fmtUSD(OUT)} − {fmtUSD(FFC)}) / {fmtUSD(FYC)} = <b>{(severity * 100).toFixed(2)}%</b> — even in the worst case, FYC would lose only {(severity * 100).toFixed(1)}% of its own value.</>,
      },
    ],
  },
  {
    group: 'The premium curve',
    items: [
      {
        term: 'k (premium multiplier)',
        symbol: 'a.k.a. "k"',
        def: 'The number of times greater FFC’s per-dollar rate is than FYC’s, on loan interest specifically. k is always strictly greater than 1, so the two tranches’ rates can never be equal (except the trivial case where there’s no loan interest to split at all).',
        formula: <>{'ffc_share / FFC  =  k × (fyc_share / FYC)'}</>,
        example: <>At the running example&rsquo;s state, k = <b>{k.toFixed(2)}×</b> — FFC earns {k.toFixed(2)} times FYC&rsquo;s rate on this month&rsquo;s loan interest.</>,
      },
      {
        term: 'k_base',
        def: 'The part of k that depends only on coverage — a piecewise-linear lookup over five stored breakpoints, calibrated against real observed Junior/Senior spreads on a comparable live tranche market. This is the curve before severity scales it.',
        example: <>At {coveragePct.toFixed(1)}% coverage, k_base = <b>{kb.toFixed(2)}×</b>.</>,
      },
      {
        term: 'K_MIN',
        def: 'The absolute floor on k — currently 1.25 (raised from an initial 1.10, which made the FYC/FFC spread nearly invisible whenever severity was near zero). Even when severity is negligible, FFC’s own capital is still first-loss on its own size, so it never earns a rate exactly equal to FYC’s.',
      },
      {
        term: 'SEVERITY_REF',
        def: 'The severity level at which the full k_base premium applies — above this, more severity doesn’t increase k any further, it’s already fully engaged. Set to 8% (lowered from an initial 20%, which was pinned to SEVERITY_GATE_MAX and meant full premium only ever engaged right at the edge of the origination gate). Deliberately decoupled from SEVERITY_GATE_MAX now — this is a "how fast does the premium ramp in" knob, the gate is a separate safety cap.',
      },
      {
        term: 'COVERAGE_WEIGHT_FLOOR',
        def: 'The minimum share of k_base that always applies, even at zero severity. Without it, a pool with a very large FYC could have low, risky-looking coverage but still earn almost no premium, because severity (which depends on FYC’s size) stays tiny — severity’s scaling would crush coverage’s own signal down to nearly nothing. Set to 0.5: coverage always keeps at least half its say over k, severity only controls the other half.',
      },
    ],
  },
  {
    group: 'The two gates',
    items: [
      {
        term: 'SEVERITY_GATE_MAX — origination gate',
        def: 'Loan origination is blocked once the projected severity from adding a new loan would exceed this threshold (20%). Replaces the old flat 80%-coverage floor. Because it’s keyed on severity rather than coverage, origination capacity scales with FYC’s actual size, not FFC’s alone.',
        formula: <>{'assert_origination_allowed: require(severity(P + new_loan, FFC, FYC) ≤ 20%)'}</>,
      },
      {
        term: 'SEVERITY_MINT_FLOOR — minting ceiling',
        def: 'New this design round. Blocks new FFC deposits once severity drops to 2% or below — the point at which FFC is already covering the loan book so thoroughly that more junior capital buys no further real protection, and would only dilute existing FFC holders’ yield.',
        formula: <>{'assert_mint_allowed: require(severity(P, FFC, FYC) > 2%)'}</>,
      },
      {
        term: 'Binding constraint',
        def: 'Loan origination is actually limited by whichever of two independent checks trips first: the severity gate, or the (unchanged) 80% allocation ceiling on total pool value. Under the new severity gate, the severity check binds first whenever FFC < 3× FYC — true for essentially any real junior tranche.',
      },
    ],
  },
  {
    group: 'Mint & redeem pricing',
    items: [
      {
        term: 'Optimistic price',
        symbol: 'used to mint',
        def: 'The price charged when MINTING new FYC/FFC — deliberately assumes yield that has genuinely accrued but hasn’t been formally collected yet is already in the tranche’s value. Two sources feed it: the reserve token’s own unrealized price appreciation since its last epoch tick, and a real per-active-loan interest accrual (see Reward-per-second accrual below). Pricing new tokens higher this way protects existing holders from being diluted by yield that’s real but just hasn’t been swept into v_tranche yet.',
        formula: <>{'optimistic_price = (v_tranche + yield_estimate + loan_estimate) / total_supply'}</>,
      },
      {
        term: 'Conservative price',
        symbol: 'used to redeem',
        def: 'The price paid out when REDEEMING — counts only value that has actually been collected and recorded in v_tranche, none of the optimistic assumptions above. Minting high and redeeming low, never the reverse, is what keeps the two prices from ever letting someone extract yield that was only ever assumed, not real.',
        formula: <>{'conservative_price = v_tranche / total_supply'}</>,
      },
      {
        term: 'Reward-per-second accrual',
        def: 'How the optimistic price estimates loan interest without iterating every loan on-chain — and, critically, correctly regardless of how staggered individual loans’ origination dates are (a loan originated July 3 and one originated July 21 don’t share a repayment clock). The pool tracks one running rate — the sum of every currently-accruing loan’s own levelized_interest ÷ its period length — plus a checkpoint, both kept current the instant a loan originates, repays, or is flagged pending-default: every update rolls the checkpoint up to now AT THE OLD RATE first, then changes the rate — so a loan contributes zero to anything banked before it existed, and a just-collected payment is subtracted back out (never left to double-count on the next rollup). This event-driven mechanism is NOT tied to the 24-hour yield epoch below — see Yield epoch — it updates on loan lifecycle events, continuously, whenever a query needs it, whichever comes first.',
        formula: <>{'rollup(state, now) = state.checkpoint + state.rate × (now − state.updatedAt)'}</>,
        example: (
          <>
            Loan A ($100K/15%/36 periods, originates day 0) + Loan B ($60K/18%/24 periods, originates day 18):
            querying the accumulator on day 25 gives <b>{fmtUSD2(accrualAtQuery)}</b> accrued — exactly matching{' '}
            <b>{fmtUSD2(accrualGroundTruth)}</b> from independently summing each loan’s own elapsed-time-into-its-own-cycle
            accrual (25 days of loan A + 7 days of loan B). No value leaked, none invented — see the full multi-step proof
            (including a repayment crossing a period boundary) in verify.ts, and the interactive version on{' '}
            <a href="/latex">/latex</a>.
          </>
        ),
      },
      {
        term: 'Yield source',
        symbol: 'YieldSourceState',
        def: 'A registered yield-bearing reserve token the pool holds alongside — or instead of — its original primary reserve: USDY, syrupUSDC, or any future addition. Each gets its own PDA tracking its own token balance and epoch price history, so optimistic pricing and yield accrual work correctly per-source instead of only for whichever reserve token was there first. Almost every candidate token in this category is designed to start life pegged at $1.00 (a rebasing or accruing stable-value wrapper, not a floating asset) — its yield shows up as slow price appreciation away from that $1 peg over time, not volatility around it. See "Per-source observed APY" below for how that appreciation gets read on-chain.',
      },
    ],
  },
  {
    group: 'Amortization & accounting',
    items: [
      {
        term: 'True amortization',
        def: 'The borrower’s real, contractual repayment schedule — one level monthly payment, with the interest portion declining and the principal portion rising every period, exactly as a standard loan works. This never changes; it’s what the fleet operator sees on their own dashboard.',
        formula: <>{'M = P·r / (1 − (1+r)^−n),  r = APR / PERIODS_PER_YEAR ≈ APR/12.1667,  n = term in periods (30d each)'}</>,
        example: (
          <>
            A $100,000 loan at 15% APR over 36 periods (each 30 days, not a calendar month — see{' '}
            <b>PERIODS_PER_YEAR</b> below): M = <b>{fmtUSD(mp)}</b>/period.
          </>
        ),
      },
      {
        term: 'PERIODS_PER_YEAR',
        symbol: 'the day-count fix',
        def: (
          <>
            How many 30-day periods fit in a real, 365-day year — 12.1667, not a flat 12. Before this round,
            loan amortization (<code>compute_monthly_payment</code>/<code>period_interest</code>) hardcoded{' '}
            <code>/ 12</code>, silently treating every 30-day period as exactly 1/12 of a year (12 periods
            is only 360 days) — while yield-source annualization (<code>observed_source_apy_bps</code>) had
            already, separately, chosen to annualize against a real 365-day year. Two different implicit
            calendars for the same word &ldquo;period,&rdquo; in the same pool. Neither was <em>wrong</em> in
            isolation — 30/360 is a common, legitimate day-count convention in finance — but mixing the two
            meant a $1 of loan interest and a $1 of reserve yield didn&rsquo;t represent the same
            &ldquo;per year&rdquo; claim, and a stated 15% APR loan was actually costing{' '}
            <b>{(0.15 * (PERIODS_PER_YEAR / 12) * 100).toFixed(2)}%</b> once measured against a true calendar
            year. Fixed by using this one constant everywhere a rate crosses between &ldquo;per period&rdquo;
            and &ldquo;per year&rdquo; — amortization included.
          </>
        ),
        formula: <>{'PERIODS_PER_YEAR = 365 days / 30 days = 12.1666...'}</>,
      },
      {
        term: 'Levelized interest',
        def: 'The protocol’s own, separate internal figure: instead of recognizing the true declining interest each period, it recognizes one flat number every period, computed once at origination from the loan’s total lifetime interest. This is what feeds the yield curve, and what current_balance/outstanding_principal now pay down against too — not just the yield split.',
        formula: <>{'levelized_interest = (M × term_months − principal) / term_months'}</>,
        example: <>Same $100K/15%/36mo loan: total interest over its life ÷ 36 = <b>{fmtUSD2(levInt)}</b>/period, flat.</>,
      },
      {
        term: 'Origination fee',
        def: 'A one-time fee the BORROWER pays at origination, on top of their own equity contribution — sized as a fraction of the loan capital being deployed to them (1% by default here; the real system today defaults to 30 bps, admin-configurable per contract up to 500 bps — see /open-questions for the gap between that live default and this round’s proposed 1%). Paid alongside the equity deposit, both handled off-chain in the borrower/admin backend, outside the pinocchio program entirely — confirmed against the real repo’s loanApplications flow (requestedEquity + originationFeeBps, "total_due_to_borrower" = both combined). Unlike every other fee in this design, it never touches v_fyc/v_ffc or mints anything: it’s new money from outside the pool, routed straight to the protocol wallet — 100%, insurance gets none of it.',
        formula: <>{'origination_fee = loan_amount × fee_pct   (paid by borrower, 100% → protocol wallet)'}</>,
        example: (
          <>
            A $100,000 loan at the 1% default: origination fee = <b>{fmtUSD2(100000 * ORIGINATION_FEE_FRACTION)}</b>,
            paid by the borrower alongside their equity deposit, landing entirely in the protocol wallet — FYC, FFC,
            and total supply are all completely unaffected.
          </>
        ),
      },
      {
        term: 'Net yield / gross yield',
        symbol: 'the 85/15 fee split',
        def: 'Every yield stream — loan interest and reserve/yield-token appreciation alike — has a 15% protocol fee taken off the top before any tranche split happens. The remaining 85% ("net yield") is what actually gets divided between FYC and FFC. The 15% fee mints new FYC tokens, split 2:1 protocol:insurance. Unchanged throughout every iteration of this redesign.',
      },
      {
        term: 'Reserve / yield-token yield split',
        def: 'The pool’s idle capital (not deployed as loans) earns yield from holding a yield-bearing token — USDY, syrupUSDC, or any other registered source. This yield is split flat pro-rata by tranche size — each tranche gets exactly its share of the combined pool, no curve, no coverage or severity involved. This is the ONE place a simple "your share of the pool" split still applies directly — everywhere else in this redesign, the split is risk-adjusted. The reason: reserve appreciation carries no loan-specific risk, so there is nothing for a first-loss premium to compensate for.',
        formula: <>{'fyc_share = net_yield × FYC / (FYC + FFC)\nffc_share = net_yield − fyc_share'}</>,
        example: <>A $10,000 net reserve-yield month, FYC $600K / FFC $400K: FYC gets <b style={{ color: 'var(--fyc)' }}>{fmtUSD(reserveSplit.fycShare)}</b> (60%), FFC gets <b style={{ color: 'var(--ffc)' }}>{fmtUSD(reserveSplit.ffcShare)}</b> (40%) — exactly their pool share, nothing more.</>,
      },
    ],
  },
  {
    group: 'Redemption & liquidity (round 2)',
    items: [
      {
        term: 'ELB',
        symbol: 'Excess Liquidity Balance',
        def: 'The pool’s idle capital sitting in a yield-bearing reserve token, not deployed as loans and not already earmarked against a loan that’s reached "equity received." Split pro-rata by each tranche’s share of the combined pool — the same flat pool-share formula the reserve-yield split already uses, applied to capital instead of yield.',
        formula: <>{'elb_total = (FYC + FFC) − outstanding − earmarked\nelb_tranche = elb_total × V_tranche / (FYC + FFC)'}</>,
        example: <>Running example, no earmarks: ELB = {fmtUSD(FYC + FFC - OUT)}, split <b style={{ color: 'var(--fyc)' }}>{fmtUSD(elb.elbFyc)}</b> FYC / <b style={{ color: 'var(--ffc)' }}>{fmtUSD(elb.elbFfc)}</b> FFC.</>,
      },
      {
        term: 'Instant vs. scheduled redemption',
        def: 'Instant (accelerated) redemption pays out immediately from a tranche’s own ELB share at a liquidity-scaled fee, and is only available up to that tranche’s available ELB — never partially served beyond it. Scheduled redemption is the existing 30d (FYC) / 90d (FFC) queue: no fee, but priced at whatever the conservative price is when it’s actually processed, not when it was submitted, so any yield or loss during the wait is the redeemer’s.',
      },
      {
        term: 'Instant-redemption fee scale',
        def: 'The fee rate charged on the WHOLE redemption is read off where the amount lands within that tranche’s available ELB, then applied flat. FYC’s band (10–50 bps) sits below FFC’s (50–100 bps) — junior liquidity is scarcer and riskier to hand out on demand.',
        formula: <>{'fee_bps = fee_min + (amount / elb_tranche) × (fee_max − fee_min)'}</>,
        example: <>$40K ELB<sub>FYC</sub>, redeeming {fmtUSD(20000)} (the midpoint): fee = <b>{exampleFee.feeBps.toFixed(0)} bps</b>, fee value {fmtUSD(exampleFee.feeValue)}, net payout {fmtUSD(exampleFee.netPayout)}.</>,
      },
      {
        term: 'jr_to_sr / sr_to_jr',
        symbol: 'tranche conversion',
        def: 'Burns one tranche’s tokens at ITS conservative price and mints the other’s at ITS conservative price — V_pool is unchanged by construction, value moves between tranches, none is invented. Used directly by the FFC-side redemption fee (burn fee-portion FFC, mint equivalent FYC into the fee wallets) — see /tranche-swap.',
        formula: <>{'value = tokens_in × price_source\ntokens_out = value / price_dest'}</>,
        example: <>Converting 10,000 FFC @ $0.97 (FYC @ $1.04): burns {fmtUSD(exampleConvert.valueUsd)}, mints <b>{exampleConvert.tokensMinted.toFixed(2)}</b> new FYC tokens — same {fmtUSD(exampleConvert.valueUsd)}, now in FYC.</>,
      },
      {
        term: 'Redemption fee settlement',
        def: 'Every redemption fee is settled as FYC, split 50/50 between protocol_wallet and insurance_wallet. Redeeming FYC: fee-portion tokens are transferred, never burned. Redeeming FFC: fee-portion tokens ARE burned and the same value is minted as new FYC via jr_to_sr — deliberate: treasuries should never carry first-loss (FFC) exposure.',
      },
      {
        term: 'Earmarked loan capital',
        def: 'Capital reserved out of ELB the moment a loan reaches the off-chain "equity received" pipeline stage — before it actually originates on-chain — so it can’t be instantly redeemed out from under a loan that’s already committed. Released either when the loan originates (moves into outstanding_principal) or is cancelled; carries an expiry so a forgotten cancellation can’t permanently over-reserve capital.',
      },
      {
        term: 'Multi-source registry',
        symbol: 'many YieldSourceState PDAs',
        def: 'Extends the single registered reserve token (see "Yield source" above) into a full registry — admin-gated to initialize (assert_admin, same as set_redemption_fees) and admin-gated to disable. A disabled source stops receiving new deposits and is prioritized for unwinding on the next redemption that needs to swap yield-token → stable.',
      },
      {
        term: 'Per-source observed APY',
        symbol: 'the building block',
        def: 'Each yield source tracks its OWN observed APY independently — not a shared estimate. Computed once per epoch tick (run_yield_epoch), the exact same price-delta method the pool already used for its one original reserve token, just run once per registered source now instead of once for the whole pool. price_i_now and price_i_last both come from a Pyth price feed read on-chain (a Pyth price account address stored per YieldSourceState at initialize_yield_source) — never a client-supplied or admin-set number, so a source can’t be mispriced by anything other than the oracle itself. Since these tokens start pegged at $1.00 (see "Yield source" above), price_i_last is effectively "$1.00 plus whatever’s accrued since the source was registered or last ticked," not an arbitrary market price.',
        formula: <>{'apy_i = (price_i_now − price_i_last) / price_i_last × (SECONDS_PER_YEAR / elapsed_i)'}</>,
      },
      {
        term: 'Blended portfolio APY',
        def: 'The capital-weighted average of every per-source APY above — structurally identical to Hylo’s published "Average SOL Reserve Yield" equation. Every source with capital still deployed counts, ENABLED or DISABLED — a disabled source is still earning real yield on whatever it hasn’t been unwound out of yet, so excluding it would understate what the pool is actually earning. Only a source with zero capital left drops out, and it does so for free (a $0 term contributes zero to both the top and bottom of the average) — enabled/disabled only matters for "Target yield range" below, which decides where NEW capital routes, a different question from "what is this pool earning right now."',
        formula: <>{'blended_apy = Σ(capital_i × apy_i) / Σ capital_i     (every source with capital > 0)'}</>,
        example: <>USDY $600K @ 4.2% + syrupUSDC $300K @ 2.8%: blended = <b>{fmtPct(exampleBlend, 2)}</b>.</>,
      },
      {
        term: 'Target yield range',
        def: 'New capital routes to whichever enabled source moves the blended APY closest to the target, among candidates landing inside [min, max]. The floor exists purely so "couldn’t reach it" is never an error; the ceiling is soft — overshooting is fine, and routing reaches for the highest available APY if nothing lands in range at all.',
        example: <>[min, target, max] = [{fmtPct(YIELD_TARGET.min, 0)}, {fmtPct(YIELD_TARGET.target, 1)}, {fmtPct(YIELD_TARGET.max, 0)}].</>,
      },
      {
        term: 'Yield epoch',
        def: `The RESERVE side (run_yield_epoch) ticks its price observation once every 24 hours — far finer-grained than the ${'30-day'} loan repayment cycle, and a fixed, periodic cadence. The LOAN side is NOT epoch-ticked at all — see Reward-per-second accrual above, an event-driven, continuous accumulator with no periodic tick of its own; two different mechanisms for two different reasons (a reserve token's price only actually moves when its oracle updates, but loan interest accrues every instant regardless of when anyone looks). /simulator samples yield once per 30-day period for both, a deliberate scope simplification: because every APY figure here annualizes off a real ACT/365 day-count regardless of how often it's sampled, the annualized RATE barely moves (about 0.5 bps difference at 3.5% over a year) — what the coarser sampling can't represent is anything that reads mid-period on-chain state, like a loan originating on day 17 of a cycle. See /open-questions.`,
        example: <>{`YIELD_EPOCH_SECONDS = ${YIELD_EPOCH_SECONDS.toLocaleString()} (${YIELD_EPOCH_SECONDS / SECONDS_PER_DAY} day), vs. SECONDS_PER_PERIOD's 30 days.`}</>,
      },
      {
        term: 'Blended loan-book APY',
        def: 'The balance-weighted average of every active loan’s OWN stated APR — a portfolio-composition figure, not a yield-collection one. Distinct from the pool’s realized collection rate (see /simulator’s "Loan book APY — blended" readout), which runs the same interest through the severity-scaled premium curve first; the two only coincide when every loan shares one APR and the curve multiplier is exactly 1×.',
        formula: <>{'blended_loan_apy = Σ(balance_i × apr_i) / Σ balance_i'}</>,
        example: <>$300K loan @ 15% + $150K loan @ 18%: blended = <b>{fmtPct(exampleLoanBlend, 2)}</b>.</>,
      },
      {
        term: 'Protocol blended APY',
        def: 'One level up from Blended portfolio APY and Blended loan-book APY: the capital-weighted average of the loan book’s realized rate and the reserve’s blended rate, weighted by how much capital sits in each — outstanding loans vs. idle/deployed reserve. "What is the protocol, as a whole, earning right now," across both yield streams at once.',
        formula: <>{'protocol_blended_apy = (loan_capital × loan_apy + reserve_capital × reserve_apy) / (loan_capital + reserve_capital)'}</>,
        example: (
          <>
            {fmtUSD(OUT)} loans @ {fmtPct(exampleLoanBlend, 2)} + {fmtUSD(FYC + FFC - OUT)} reserve @{' '}
            {fmtPct(exampleBlend, 2)}: blended = <b>{fmtPct(exampleProtocolBlend, 2)}</b>.
          </>
        ),
      },
    ],
  },
];

export default function GlossaryPage() {
  // Deep-linked from /latex and /code-diff ("View in glossary"). Scrolls to
  // the target entry and flashes a highlight so landing here from another
  // page is never "where did it go" — works on first load AND on same-page
  // hash changes (clicking a second glossary link while already here).
  useEffect(() => {
    let cleanupTimeout: (() => void) | undefined;
    const jumpToHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const el = document.getElementById(hash);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('gloss-highlight');
      const t = setTimeout(() => el.classList.remove('gloss-highlight'), 2200);
      cleanupTimeout = () => clearTimeout(t);
    };
    jumpToHash();
    window.addEventListener('hashchange', jumpToHash);
    return () => {
      window.removeEventListener('hashchange', jumpToHash);
      cleanupTimeout?.();
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="reference"
        title="Glossary & formulas"
        lede="Every term used across this app, defined in full — plain-English meaning, the formula, and a worked example using the same $600K FYC / $400K FFC / $450K outstanding running scenario used everywhere else."
      />
      {entries.map((g) => (
        <div key={g.group} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18 }}>{g.group}</h2>
          {g.items.map((e) => (
            <Entry key={e.term} e={e} />
          ))}
        </div>
      ))}
    </>
  );
}
