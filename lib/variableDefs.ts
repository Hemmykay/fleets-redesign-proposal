/**
 * One entry per named symbol that appears in any formula on /latex — the
 * data clicking a variable inside a rendered equation looks up. Kept
 * separate from lib/model.ts (the actual math) on purpose: this file is
 * pure explanatory text, never imported by anything that computes a real
 * number, so it can never accidentally drift into being "the" definition —
 * /glossary and lib/model.ts's own doc comments still are.
 */

export interface VariableDef {
  /** Display name shown in the popover header — usually just the symbol. */
  symbol: string;
  /** One or two plain-English sentences: what this IS. */
  def: string;
  /** Optional: HOW it came about, when that's non-obvious (a calibration,
   * a design decision, a derivation) — omitted when the def above already
   * says everything there is to say. */
  derivation?: string;
  /** Exact term string from /glossary, if one exists — powers the "view
   * full definition" link. Omit when this symbol is too formula-local to
   * have its own glossary entry (e.g. a generic "n" for term length). */
  glossaryTerm?: string;
}

export const VARIABLE_DEFS: Record<string, VariableDef> = {
  FYC: {
    symbol: 'FYC',
    def: 'The senior tranche’s total value (USD). Gets paid first out of loan interest and reserve yield, and only takes a loss once FFC is fully exhausted.',
    glossaryTerm: 'FYC',
  },
  FFC: {
    symbol: 'FFC',
    def: 'The junior, first-loss tranche’s total value (USD). Absorbs every dollar of loan default first, up to its own value, before FYC feels anything — in exchange for a premium rate on loan interest.',
    glossaryTerm: 'FFC',
  },
  Outstanding: {
    symbol: 'Outstanding',
    def: 'The sum of every currently-active loan’s remaining balance — the loan book. Not the same as total pool value: some of the pool sits as idle reserve, not exposed to loan-default risk at all.',
    glossaryTerm: 'Outstanding principal',
  },
  Coverage: {
    symbol: 'Coverage',
    def: 'What fraction of the outstanding loan book FFC alone could absorb before FYC starts taking losses — the attachment point.',
    derivation: 'min(1, FFC / Outstanding) — capped at 100% since coverage past "FFC could cover the whole book twice over" isn’t a meaningfully different risk state.',
    glossaryTerm: 'Coverage',
  },
  Severity: {
    symbol: 'Severity',
    def: 'If FFC’s protection is exhausted, what fraction of FYC’s own value is still at risk in the worst case. Coverage alone can’t answer this — FYC’s size is a free variable, so two pools at identical coverage can have very different severity.',
    derivation: 'max(0, Outstanding − FFC) / FYC — whatever spills past FFC, as a fraction of FYC.',
    glossaryTerm: 'Severity',
  },
  k: {
    symbol: 'k',
    def: 'The premium multiplier — how many times greater FFC’s per-dollar rate is than FYC’s, on loan interest specifically. Always strictly greater than 1.',
    glossaryTerm: 'k (premium multiplier)',
  },
  FFC_share: {
    symbol: 'FFC_share',
    def: 'FFC’s slice of this period’s net loan interest — boosted above a flat pool-share split by the premium multiplier k.',
    glossaryTerm: 'k (premium multiplier)',
  },
  FYC_share: {
    symbol: 'FYC_share',
    def: 'FYC’s slice of this period’s yield — whatever’s left after FFC’s share (for loan interest), or FYC’s flat pro-rata share (for reserve/yield-token yield, which doesn’t use the premium curve at all).',
    glossaryTerm: 'k (premium multiplier)',
  },
  k_base: {
    symbol: 'k_base',
    def: 'The part of k that depends only on coverage — a piecewise-linear lookup over five stored breakpoints, before severity scales it.',
    derivation: 'Three of the five breakpoints are ratios of REAL observed junior/senior rates on a comparable live tranche market (e.g. at 20.41% coverage: junior earned 34.18%, senior earned 4.87%, so k_base = 34.18÷4.87 = 7.02). The other two (80% and 0% coverage) are labeled, deliberate guesses, not measurements — see /coverage-severity-k for the full breakdown with all three real data points.',
    glossaryTerm: 'k_base',
  },
  w: {
    symbol: 'w',
    def: 'The coverage weight — how much of k_base’s premium actually applies this period, scaled up by severity from a guaranteed floor.',
    glossaryTerm: 'COVERAGE_WEIGHT_FLOOR',
  },
  K_MIN: {
    symbol: 'K_MIN',
    def: 'The absolute floor on k, currently 1.25. Even at negligible severity, FFC is still first-loss on its own capital, so it never earns a rate exactly equal to FYC’s.',
    derivation: 'Raised from an initial 1.10, which made the FYC/FFC spread nearly invisible whenever severity was near zero.',
    glossaryTerm: 'K_MIN',
  },
  SEVERITY_REF: {
    symbol: 'SEVERITY_REF',
    def: 'The severity level at which the full k_base premium engages. Above this, more severity stops increasing k further — it’s already fully weighted in.',
    derivation: 'Set to 8%, lowered from an initial 20% (which was pinned to SEVERITY_GATE_MAX, meaning full premium only ever engaged right at the edge of the origination gate). Deliberately decoupled now: this is a "how fast the premium ramps in" knob, the gate is a separate safety cap.',
    glossaryTerm: 'SEVERITY_REF',
  },
  COVERAGE_WEIGHT_FLOOR: {
    symbol: 'COVERAGE_WEIGHT_FLOOR',
    def: 'The minimum share of k_base that always applies, even at zero severity — set to 0.5, so coverage always keeps at least half its say over k regardless of how safe severity looks.',
    derivation: 'Without this floor, a pool with a very large FYC could have low, risky-looking coverage but earn almost no premium, because severity (which shrinks as FYC grows) would crush coverage’s own signal down to nearly nothing.',
    glossaryTerm: 'COVERAGE_WEIGHT_FLOOR',
  },
  SEVERITY_GATE_MAX: {
    symbol: 'SEVERITY_GATE_MAX',
    def: 'Loan origination is blocked once the projected severity from adding a new loan would exceed this threshold (20% by default) — replaces the old flat 80%-coverage floor.',
    glossaryTerm: 'SEVERITY_GATE_MAX — origination gate',
  },
  SEVERITY_MINT_FLOOR: {
    symbol: 'SEVERITY_MINT_FLOOR',
    def: 'New FFC deposits are blocked once severity drops to 2% or below — the point where FFC is already covering the book so thoroughly that more junior capital buys no further real protection.',
    glossaryTerm: 'SEVERITY_MINT_FLOOR — minting ceiling',
  },
  NetYield: {
    symbol: 'NetYield',
    def: 'Gross yield (loan interest or reserve appreciation) after the flat 15% protocol fee is taken off the top — the 85% that actually gets split between FYC and FFC.',
    glossaryTerm: 'Net yield / gross yield',
  },
  GrossYield: {
    symbol: 'GrossYield',
    def: 'The full yield collected this period, before any fee is skimmed — loan interest or reserve/yield-token appreciation, whichever this formula is splitting.',
    glossaryTerm: 'Net yield / gross yield',
  },
  M: {
    symbol: 'M',
    def: 'The borrower’s level monthly payment — the same fixed amount every period for the life of the loan, standard amortization.',
    glossaryTerm: 'True amortization',
  },
  P: {
    symbol: 'P',
    def: 'Principal — the original loan amount at origination.',
  },
  r: {
    symbol: 'r',
    def: 'The per-period interest rate — the stated APR converted down to a single 30-day period’s worth, using the real day-count (not a flat /12).',
    derivation: 'r = APR × (SECONDS_PER_PERIOD ÷ SECONDS_PER_YEAR). Fixed in this round from a hardcoded /12, which implicitly treated a 30-day period as exactly 1/12 of a year (it isn’t — 12 periods is only 360 days).',
    glossaryTerm: 'PERIODS_PER_YEAR',
  },
  n: {
    symbol: 'n',
    def: 'Loan term, in periods (30-day cycles) — despite sometimes being called "months" in field names, it counts periods, not calendar months.',
  },
  APR: {
    symbol: 'APR',
    def: 'The loan’s stated annual percentage rate, set at origination.',
  },
  SECONDS_PER_PERIOD: {
    symbol: 'SECONDS_PER_PERIOD',
    def: 'Exactly 30 days, in seconds — the fixed length of one repayment/epoch period, never a calendar month.',
    glossaryTerm: 'PERIODS_PER_YEAR',
  },
  SECONDS_PER_YEAR: {
    symbol: 'SECONDS_PER_YEAR',
    def: 'Exactly 365 days, in seconds — the real-year denominator every per-period rate gets annualized against.',
    glossaryTerm: 'PERIODS_PER_YEAR',
  },
  PERIODS_PER_YEAR: {
    symbol: 'PERIODS_PER_YEAR',
    def: 'How many 30-day periods fit in a real 365-day year — 365÷30 ≈ 12.1667, not a flat 12.',
    derivation: 'A 30-day period isn’t 1/12 of a year (12 periods is only 360 days). Before this round, loan amortization hardcoded /12 while yield annualization already used a real 365-day year — two different implicit calendars for the same word "period." This constant closes that gap.',
    glossaryTerm: 'PERIODS_PER_YEAR',
  },
  LevelizedInterest: {
    symbol: 'LevelizedInterest',
    def: 'The protocol’s own flat per-period interest figure — computed once at origination from the loan’s total lifetime interest, instead of the true, declining per-period interest.',
    glossaryTerm: 'Levelized interest',
  },
  ELB_total: {
    symbol: 'ELB (total)',
    def: 'Excess Liquidity Balance — idle reserve, net of outstanding loans AND any capital earmarked for loans that haven’t originated yet. What’s actually available for instant redemption right now.',
    glossaryTerm: 'ELB',
  },
  ELB_FYC: {
    symbol: 'ELB (FYC)',
    def: 'FYC’s pro-rata share of the total ELB, by pool-value weight.',
    glossaryTerm: 'ELB',
  },
  ELB_FFC: {
    symbol: 'ELB (FFC)',
    def: 'FFC’s pro-rata share of the total ELB, by pool-value weight.',
    glossaryTerm: 'ELB',
  },
  ELB_tranche: {
    symbol: 'ELB (tranche)',
    def: 'Whichever tranche’s ELB share is relevant to this particular redemption — the ceiling an instant redemption from that tranche can’t exceed.',
    glossaryTerm: 'ELB',
  },
  Earmarked: {
    symbol: 'Earmarked',
    def: 'Capital reserved out of ELB the moment a loan reaches the "equity received" pipeline stage, before it actually originates on-chain — so it can’t be instantly redeemed out from under a loan that’s already committed.',
    glossaryTerm: 'Earmarked loan capital',
  },
  fee_bps: {
    symbol: 'fee_bps',
    def: 'The instant-redemption fee rate, in basis points — scales linearly between fee_min and fee_max based on how much of the tranche’s available ELB this redemption is drawing.',
    glossaryTerm: 'Instant-redemption fee scale',
  },
  fee_min: {
    symbol: 'fee_min',
    def: 'The floor fee rate, charged when redeeming a negligible sliver of available liquidity. FYC: 10 bps. FFC: 50 bps.',
    glossaryTerm: 'Instant-redemption fee scale',
  },
  fee_max: {
    symbol: 'fee_max',
    def: 'The ceiling fee rate, charged when redeeming the full available ELB in one instant redemption. FYC: 50 bps. FFC: 100 bps.',
    glossaryTerm: 'Instant-redemption fee scale',
  },
  amount: {
    symbol: 'amount',
    def: 'The dollar amount being redeemed in this specific instant-redemption request.',
  },
  fee: {
    symbol: 'fee',
    def: 'The total dollar fee charged on this redemption — the area under the marginal fee-rate curve from $0 up to the full amount being redeemed.',
    glossaryTerm: 'Instant-redemption fee scale',
  },
  jrToSrValue: {
    symbol: 'value',
    def: 'The USD value being moved from one tranche to the other — tokens_in priced at the SOURCE tranche’s own conservative price.',
    glossaryTerm: 'jr_to_sr / sr_to_jr',
  },
  tokens_in: {
    symbol: 'tokens_in',
    def: 'How many tokens of the source tranche are being burned in this conversion.',
    glossaryTerm: 'jr_to_sr / sr_to_jr',
  },
  tokens_out: {
    symbol: 'tokens_out',
    def: 'How many tokens of the destination tranche get minted — exactly enough to represent the same USD value moved, priced at the destination’s own conservative price. No value is invented.',
    glossaryTerm: 'jr_to_sr / sr_to_jr',
  },
  price_cons: {
    symbol: 'price (conservative)',
    def: 'The price paid out when REDEEMING — counts only value that has actually been collected into v_tranche, none of the optimistic assumptions the mint price makes.',
    glossaryTerm: 'Conservative price',
  },
  fee_value: {
    symbol: 'fee_value',
    def: 'The dollar value of a redemption fee, already computed — the amount being split between the protocol and insurance wallets.',
    glossaryTerm: 'Redemption fee settlement',
  },
  Protocol_FYC: {
    symbol: 'Protocol (FYC)',
    def: 'The protocol treasury’s share of a redemption fee, always settled as FYC — never first-loss FFC exposure.',
    glossaryTerm: 'Redemption fee settlement',
  },
  Insurance_FYC: {
    symbol: 'Insurance (FYC)',
    def: 'The insurance wallet’s share of a redemption fee, always settled as FYC — same reasoning as the protocol wallet’s share.',
    glossaryTerm: 'Redemption fee settlement',
  },
  Pending_FYC: {
    symbol: 'Pending (FYC)',
    def: 'FYC redemptions already submitted to the scheduled (30d) queue but not yet paid out — netted out before a new loan can be approved, so a queued redeemer can’t be starved by a fresh origination.',
  },
  Pending_FFC: {
    symbol: 'Pending (FFC)',
    def: 'FFC redemptions already submitted to the scheduled (90d) queue but not yet paid out — same protection as Pending (FYC), for the junior tranche.',
  },
  new_loan_amount: {
    symbol: 'new_loan_amount',
    def: 'The size of the loan being considered for origination right now — the gate checks whether the pool can actually afford to fund it without starving pending redemptions.',
  },
  APY_i: {
    symbol: 'APY_i',
    def: 'One registered yield source’s own observed annualized rate — computed independently per source, not a shared pool-wide estimate.',
    glossaryTerm: 'Per-source observed APY',
  },
  price_i_now: {
    symbol: 'price (now)',
    def: 'A yield source’s token price as of this epoch tick. Fetched on-chain via a Pyth price feed — see /yield-sources for how a real oracle price gets read.',
  },
  price_i_last: {
    symbol: 'price (last epoch)',
    def: 'The same yield source’s token price as of the previous epoch tick — the baseline the current price is measured against.',
  },
  elapsed_i: {
    symbol: 'elapsed',
    def: 'Real time (seconds) since this source’s last epoch tick — usually one day, but read live rather than assumed, so a delayed tick doesn’t silently over- or under-annualize.',
  },
  Capital_i: {
    symbol: 'Capital_i',
    def: 'How much USD value one registered yield source currently holds — its weight in the blended-APY average.',
    glossaryTerm: 'Blended portfolio APY',
  },
  APY_bar: {
    symbol: 'blended APY',
    def: 'The capital-weighted average APY across every yield source that still has capital deployed — enabled or disabled. A disabled source keeps counting fully until it’s actually unwound to zero capital; only a zero-capital source drops out, and it does so for free (it contributes zero to both the top and bottom of the average).',
    glossaryTerm: 'Blended portfolio APY',
  },
  price_opt: {
    symbol: 'price (optimistic)',
    def: 'The price charged when MINTING new FYC/FFC — deliberately assumes yield that has genuinely accrued but hasn’t been formally collected yet is already in the tranche’s value, so a same-period depositor can’t dilute existing holders.',
    glossaryTerm: 'Optimistic price',
  },
  V_tranche: {
    symbol: 'V_tranche',
    def: 'The tranche’s current recorded value — v_fyc or v_ffc, whichever this formula is pricing.',
  },
  yield_estimate: {
    symbol: 'yield_estimate',
    def: 'The reserve token’s own unrealized price appreciation since its last epoch tick — real, already-accrued value that just hasn’t been swept into v_tranche yet.',
    glossaryTerm: 'Optimistic price',
  },
  loan_estimate: {
    symbol: 'loan_estimate',
    def: 'A real per-active-loan interest accrual estimate, read off the reward-per-second accumulator — not a proxy.',
    glossaryTerm: 'Reward-per-second accrual',
  },
  total_supply: {
    symbol: 'total_supply',
    def: 'How many tokens of this tranche currently exist — the denominator that turns a dollar value into a per-token price.',
  },
  rollup: {
    symbol: 'rollup(now)',
    def: 'The total interest accrued-but-not-yet-collected across the whole loan book, as of any instant — read without mutating the underlying accumulator.',
    glossaryTerm: 'Reward-per-second accrual',
  },
  now: {
    symbol: 'now',
    def: 'The timestamp being queried against — any instant at all, not tied to any particular loan’s own schedule.',
    glossaryTerm: 'Reward-per-second accrual',
  },
  checkpoint: {
    symbol: 'checkpoint',
    def: 'Interest already banked into the accumulator as of the last time it was updated — rolled forward and adjusted on every loan lifecycle event.',
    glossaryTerm: 'Reward-per-second accrual',
  },
  rate: {
    symbol: 'rate',
    def: 'The pool-wide $/second accrual rate — the sum of every currently-active loan’s own levelized_interest ÷ its period length.',
    glossaryTerm: 'Reward-per-second accrual',
  },
  updated_at: {
    symbol: 'updated_at',
    def: 'The timestamp the accumulator was last rolled forward — the reference point "now minus this" measures elapsed time from.',
    glossaryTerm: 'Reward-per-second accrual',
  },
  balance_i: {
    symbol: 'balance_i',
    def: 'One active loan’s current outstanding balance — its weight in the loan book’s blended-APR average.',
    glossaryTerm: 'Blended loan-book APY',
  },
  apr_i: {
    symbol: 'apr_i',
    def: 'One active loan’s own stated APR, set at its origination.',
    glossaryTerm: 'Blended loan-book APY',
  },
  APR_bar_loans: {
    symbol: 'blended loan-book APR',
    def: 'The loan book’s own average stated rate, balance-weighted — a portfolio-composition figure, not a yield-collection one.',
    glossaryTerm: 'Blended loan-book APY',
  },
  APY_bar_protocol: {
    symbol: 'protocol blended APY',
    def: 'One level up from the two blends below it: the capital-weighted average across BOTH yield streams the pool has — loan interest and reserve/yield-token appreciation.',
    glossaryTerm: 'Protocol blended APY',
  },
  Capital_loans: {
    symbol: 'Capital (loans)',
    def: 'Total outstanding loan principal — the loan book’s weight in the protocol-wide blended APY.',
    glossaryTerm: 'Protocol blended APY',
  },
  APY_loans: {
    symbol: 'APY (loans)',
    def: 'The loan book’s realized or stated blended rate — whichever this particular calculation is using.',
    glossaryTerm: 'Protocol blended APY',
  },
  Capital_reserve: {
    symbol: 'Capital (reserve)',
    def: 'Total idle/deployed reserve value across all registered yield sources — the reserve side’s weight in the protocol-wide blended APY.',
    glossaryTerm: 'Protocol blended APY',
  },
  APY_reserve: {
    symbol: 'APY (reserve)',
    def: 'The reserve’s own blended APY across every enabled yield source.',
    glossaryTerm: 'Protocol blended APY',
  },
  choice: {
    symbol: 'choice',
    def: 'Which registered yield source a new deposit gets routed into.',
    glossaryTerm: 'Target yield range',
  },
  target: {
    symbol: 'target',
    def: 'The blended APY the pool is aiming for — 3.5% by default, a soft reference point, not a hard requirement.',
    glossaryTerm: 'Target yield range',
  },
  rangeMin: {
    symbol: 'min',
    def: 'The low end of the acceptable blended-APY range (3%) — exists purely so "couldn’t reach it" is never treated as an error.',
    glossaryTerm: 'Target yield range',
  },
  rangeMax: {
    symbol: 'max',
    def: 'The high end of the acceptable blended-APY range (7%) — a soft ceiling; overshooting it is fine.',
    glossaryTerm: 'Target yield range',
  },
  ReserveTargetFraction: {
    symbol: 'ReserveTargetFraction',
    def: 'The fraction of total pool value that always stays as idle reserve, never loaned out — 20%.',
  },
  AllocationCeilingFraction: {
    symbol: 'AllocationCeilingFraction',
    def: 'The fraction of total pool value that’s allowed to be deployed as loans — 80%, the complement of ReserveTargetFraction.',
  },
  MAX_FYC_APY: {
    symbol: 'MAX_FYC_APY',
    def: 'An admin-configurable ceiling on FYC’s TOTAL blended APY (loan interest + reserve/yield-token yield combined) — 6% by default here, whatever the admin sets on-chain in the real proposal.',
    derivation: 'Enforced by throttling ONLY the loan-interest split, never the reserve/yield-token split — see capFycLoanShare in lib/model.ts.',
    glossaryTerm: 'FYC APY cap',
  },
  FycReserveShare: {
    symbol: 'FYC_reserve',
    def: 'FYC’s share of the reserve/yield-token yield THIS PERIOD — computed independently by splitBaseYieldTokenYield, unaffected by the loan-interest cap.',
    glossaryTerm: 'Reserve / yield-token yield split',
  },
  UncappedFycLoanShare: {
    symbol: 'FYC_loan (uncapped)',
    def: 'What FYC’s loan-interest share would have been with no APY cap at all — the severity-curve output (distributeLoanInterest) before capFycLoanShare gets a chance to throttle it.',
    glossaryTerm: 'k (premium multiplier)',
  },
  FycLoanShareCapped: {
    symbol: 'FYC_loan',
    def: 'FYC’s ACTUAL loan-interest share this period, after the APY cap — equal to the uncapped share whenever the cap doesn’t bind, otherwise clamped down to whatever headroom is left below MAX_FYC_APY once FYC’s reserve share is accounted for.',
    glossaryTerm: 'FYC APY cap',
  },
};
