export interface DiffFile {
  path: string;
  status: 'M' | 'U';
  /** Which part of the monorepo this file lives in — drives the /code-diff
   * category toggle. Every file up to this round's redemption/liquidity
   * additions is 'pinocchio' (the on-chain program); backend/frontend
   * entries were added for the redemption-liquidity design round. */
  category: 'frontend' | 'backend' | 'pinocchio';
  why: string;
  original: string;
  proposed: string;
  /** Authored, open follow-ups specific to this file — distinct from `why`
   * (explains what the diff already does) and from the derived, read-only
   * per-line notes (extractLineNotes, regenerated from source comments).
   * Optional: most files have none. */
  suggestions?: string[];
}

export const FILES: DiffFile[] = [
{
  path: "pinochio/src/constants.rs",
  status: "M",
  category: "pinocchio",
  why: "Adds the six severity-curve constants (K_MIN, SEVERITY_REF, COVERAGE_WEIGHT_FLOOR, SEVERITY_MINT_FLOOR, SEVERITY_GATE_MAX, K_BREAKPOINTS) that back the new curve. FFC_COVERAGE_NUMERATOR/DENOMINATOR — the old flat 80% floor — are removed; only coverage.rs referenced them, so nothing else breaks. Also adds ALLOWED_SWAP_PROGRAMS (Jupiter + Titan, for helpers/jupiter.rs) and the yield-source seed/tag (for the new multi-yield-token mechanism — see state.rs). Round 2 (redemption/liquidity): adds the instant-redemption fee-scale bounds per tranche, the yield target range, and the earmark expiry window — see helpers/liquidity.rs and /redemption on the design tool. Round 5 (loan lifecycle): CURE_PERIOD_DAYS is REDEFINED — it used to mean the full 30-day window after an admin-flagged delinquency before pending-default; it now means only the cure stage's own duration (15 days), paired with the new GRACE_PERIOD_DAYS (15 days). Total time from a missed payment to automatic DEFAULTED is unchanged at 30 days, but the internal split is new — see /loan-lifecycle and helpers/loan_lifecycle.rs.",
  original: `//! Protocol constants (mirrors \`program/programs/fleet-finance/src/constants.rs\`).

use pinocchio::Address;

/// Hard-coded gate-lock for \`initialize_contract\`. Only this key may
/// bootstrap the singleton \`ProtocolConfig\` PDA. Rotation requires redeploy.
pub const INIT_ADMIN: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("4JmCmjs3vXHu6C3bbemq5PnQvQpyMYzMB1Rv2MvErvn9"));

/// Program id (must match \`target/deploy/fleet_finance_pinocchio-keypair.json\`).
pub const PROGRAM_ID: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("FLeetQcBqbZZ1Re2BVEdABCfchKcPpv4vEDHHECmM9SN"));

/// Pyth Solana Pull-Oracle "Receiver" program id.
pub const PYTH_RECEIVER_PROGRAM_ID: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ"));

/// Jupiter Aggregator V6 program id (mainnet-beta).
pub const JUPITER_V6_PROGRAM_ID: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"));

/// Metaplex Token Metadata program id.
pub const TOKEN_METADATA_PROGRAM_ID: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"));

/// SPL Associated Token Account program id.
pub const ASSOCIATED_TOKEN_PROGRAM_ID: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"));

pub const PRECISION: u64 = 1_000_000;
pub const PRECISION_U128: u128 = 1_000_000;
pub const BPS_DENOMINATOR: u64 = 10_000;

pub const SECONDS_PER_DAY: i64 = 86_400;
pub const SECONDS_PER_PERIOD: i64 = 30 * SECONDS_PER_DAY;

pub const FYC_REDEMPTION_LOCK_SECS: i64 = 30 * SECONDS_PER_DAY;
pub const FFC_REDEMPTION_LOCK_SECS: i64 = 90 * SECONDS_PER_DAY;
pub const CURE_PERIOD_DAYS: i64 = 30;

pub const FFC_COVERAGE_NUMERATOR: u64 = 8_000;
pub const FFC_COVERAGE_DENOMINATOR: u64 = 10_000;

pub const LOAN_ALLOCATION_BPS: u64 = 8_000;
pub const NET_YIELD_BPS: u64 = 8_500;
pub const FEE_LIABILITY_BPS: u64 = 1_500;

pub const PROTOCOL_FEE_SHARE_NUMERATOR: u64 = 2;
pub const PROTOCOL_FEE_SHARE_DENOMINATOR: u64 = 3;

pub const SLIPPAGE_BPS_MIN: u64 = 10;
pub const SLIPPAGE_BPS_MAX: u64 = 300;
pub const COMBINED_FEE_BPS_MAX: u64 = 1_500;

pub const TRANCHE_FYC: u8 = 0;
pub const TRANCHE_FFC: u8 = 1;

// PDA seed prefixes.
pub const POOL_SEED: &[u8] = b"pool";
pub const CONFIG_SEED: &[u8] = b"config";
pub const TRANCHE_SEED: &[u8] = b"tranche";
pub const LOAN_SEED: &[u8] = b"loan";
pub const REDEEM_SEED: &[u8] = b"redeem";
pub const ESCROW_SEED: &[u8] = b"escrow";

// Account-data type tags (1 byte at offset 0 of each program-owned account).
// Replaces Anchor's 8-byte sha256 discriminator.
pub const TAG_CONFIG: u8 = 1;
pub const TAG_POOL: u8 = 2;
pub const TAG_TRANCHE: u8 = 3;
pub const TAG_LOAN: u8 = 4;
pub const TAG_REDEMPTION: u8 = 5;

// Pyth \`PriceUpdateV2\` account discriminator (Anchor sha256("account:PriceUpdateV2")[..8]).
pub const PRICE_UPDATE_V2_DISCRIMINATOR: [u8; 8] = [34, 241, 35, 99, 157, 126, 244, 205];
pub const MAX_PRICE_AGE_SECS: i64 = 60;
pub const MAX_CONF_BPS: u128 = 100;`,
  proposed: `//! Protocol constants (mirrors \`program/programs/fleet-finance/src/constants.rs\`).

use pinocchio::Address;

/// Hard-coded gate-lock for \`initialize_contract\`. Only this key may
/// bootstrap the singleton \`ProtocolConfig\` PDA. Rotation requires redeploy.
pub const INIT_ADMIN: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("4JmCmjs3vXHu6C3bbemq5PnQvQpyMYzMB1Rv2MvErvn9"));

/// Program id (must match \`target/deploy/fleet_finance_pinocchio-keypair.json\`).
pub const PROGRAM_ID: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("FLeetQcBqbZZ1Re2BVEdABCfchKcPpv4vEDHHECmM9SN"));

/// Pyth Solana Pull-Oracle "Receiver" program id.
pub const PYTH_RECEIVER_PROGRAM_ID: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ"));

/// Jupiter Aggregator V6 program id (mainnet-beta).
pub const JUPITER_V6_PROGRAM_ID: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"));

/// Metaplex Token Metadata program id.
pub const TOKEN_METADATA_PROGRAM_ID: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"));

/// SPL Associated Token Account program id.
pub const ASSOCIATED_TOKEN_PROGRAM_ID: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"));

pub const PRECISION: u64 = 1_000_000;
pub const PRECISION_U128: u128 = 1_000_000;
pub const BPS_DENOMINATOR: u64 = 10_000;

pub const SECONDS_PER_DAY: i64 = 86_400;
pub const SECONDS_PER_PERIOD: i64 = 30 * SECONDS_PER_DAY;

pub const FYC_REDEMPTION_LOCK_SECS: i64 = 30 * SECONDS_PER_DAY;
pub const FFC_REDEMPTION_LOCK_SECS: i64 = 90 * SECONDS_PER_DAY;

// --- Loan lifecycle: grace -> cure -> default (round 5) ---
// A missed payment starts GRACE automatically the instant next_due passes —
// no admin call, no stored status change, purely a function of Clock vs
// LoanAccount.next_payment_due_ts(). No APR bump during grace; the loan
// still counts toward pool.loan_accrual_rate (still presumed likely to pay).
pub const GRACE_PERIOD_DAYS: i64 = 15;
/// CURE starts automatically the instant GRACE_PERIOD_DAYS elapses — the APR
/// bump (CURE_APR_MULTIPLIER_BPS) starts applying, and the loan should stop
/// contributing to pool.loan_accrual_rate (see helpers/loan_lifecycle.rs /
/// instructions/finalize_default.rs — the design tool's /open-questions
/// flags this as the exact same "stop counting once risk is real" principle
/// the old flag_pending_default.rs already used, just retimed to CURE entry
/// instead of a manually-flagged pending-default). CURE_PERIOD_DAYS is its
/// own duration from cure entry, not from the original due date — total
/// time from missed payment to DEFAULTED is GRACE_PERIOD_DAYS +
/// CURE_PERIOD_DAYS = 30 days, deliberately equal to SECONDS_PER_PERIOD, so
/// a loan always reaches DEFAULTED before a second payment could
/// independently fall due — no loan is ever more than one payment behind
/// when it defaults.
pub const CURE_PERIOD_DAYS: i64 = 15;
/// 1.25x the loan's own apr_bps, applied only during CURE — see
/// helpers/loan_lifecycle.rs::cure_fee.
pub const CURE_APR_MULTIPLIER_NUM: u64 = 5;
pub const CURE_APR_MULTIPLIER_DEN: u64 = 4;
/// NEW (round 5) — the origination fee borrower-side concept from the
/// design tool's lib/model.ts (ORIGINATION_FEE_FRACTION, 1%) gets its
/// first real Rust implementation here, used by
/// instructions/relist_defaulted_loan.rs. Paid ON TOP of the new
/// borrower's own equity, 100% to the protocol wallet — never touches
/// fyc/ffc, same as the TS model's splitOriginationFee.
pub const ORIGINATION_FEE_BPS: u64 = 100;

pub const LOAN_ALLOCATION_BPS: u64 = 8_000;
pub const NET_YIELD_BPS: u64 = 8_500;
pub const FEE_LIABILITY_BPS: u64 = 1_500;

// --- Coverage/severity premium curve (yield-distribution redesign) ---
// Mirrors lib/model.ts on the design tool 1:1. All illustrative — not signed
// off; see /open-questions on the design tool for the exact same callout.

/// Absolute floor on k (1.2500x) — FFC's own capital is still first-loss
/// regardless of severity, so k never collapses to 1 (parity).
pub const K_MIN_BPS: u64 = 12_500;

/// Severity at which the full coverage-driven premium applies (8%).
/// Deliberately decoupled from SEVERITY_GATE_MAX below — this is a
/// ramp-to-full-premium knob (economics), the gate is a safety cap.
pub const SEVERITY_REF_BPS: u64 = 800;

/// Minimum share of k_base that always applies, even at zero severity (50%),
/// so a large-FYC pool can't earn near-zero premium just because its own
/// severity happens to be small.
pub const COVERAGE_WEIGHT_FLOOR_BPS: u64 = 5_000;

/// Below this severity, FFC minting is blocked (2%) — protection is already
/// more than sufficient, more FFC would only dilute existing holders.
pub const SEVERITY_MINT_FLOOR_BPS: u64 = 200;

/// Above this severity, loan origination is blocked (50%) — replaces the
/// old flat 80% coverage floor below. FYC can absorb up to half its own
/// value in the worst case before new origination stops; matches
/// lib/model.ts's SEVERITY_GATE_MAX.
pub const SEVERITY_GATE_MAX_BPS: u64 = 5_000;

/// Premium-multiplier breakpoints (k_base), keyed on coverage bps, values in
/// k-bps (10_000 = 1.00x). Piecewise-linear between points; real observed
/// Junior/Senior spreads at 3 points, one interpolated, one extrapolated.
pub const K_BREAKPOINTS: [(u64, u64); 5] = [
    (0,      120_000), // 12.00x — extrapolated tail
    (2_000,   70_200), //  7.02x — observed @ 20.41% coverage
    (4_100,   19_400), //  1.94x — observed @ 40.78% coverage
    (8_000,   18_500), //  1.85x — interpolated, widened from 1.50
    (10_000,  13_300), //  1.33x — observed @ 99.90% coverage
];

pub const PROTOCOL_FEE_SHARE_NUMERATOR: u64 = 2;
pub const PROTOCOL_FEE_SHARE_DENOMINATOR: u64 = 3;

pub const SLIPPAGE_BPS_MIN: u64 = 10;
pub const SLIPPAGE_BPS_MAX: u64 = 300;
pub const COMBINED_FEE_BPS_MAX: u64 = 1_500;

pub const TRANCHE_FYC: u8 = 0;
pub const TRANCHE_FFC: u8 = 1;

// PDA seed prefixes.
pub const POOL_SEED: &[u8] = b"pool";
pub const CONFIG_SEED: &[u8] = b"config";
pub const TRANCHE_SEED: &[u8] = b"tranche";
pub const LOAN_SEED: &[u8] = b"loan";
pub const REDEEM_SEED: &[u8] = b"redeem";
pub const ESCROW_SEED: &[u8] = b"escrow";
pub const EARMARK_SEED: &[u8] = b"earmark"; // NEW (round 2) — see state.rs::EarmarkRecord

// Account-data type tags (1 byte at offset 0 of each program-owned account).
// Replaces Anchor's 8-byte sha256 discriminator.
pub const TAG_CONFIG: u8 = 1;
pub const TAG_POOL: u8 = 2;
pub const TAG_TRANCHE: u8 = 3;
pub const TAG_LOAN: u8 = 4;
pub const TAG_REDEMPTION: u8 = 5;
pub const TAG_YIELD_SOURCE: u8 = 6;
pub const TAG_EARMARK: u8 = 7; // NEW (round 2)

// Pyth \`PriceUpdateV2\` account discriminator (Anchor sha256("account:PriceUpdateV2")[..8]).
pub const PRICE_UPDATE_V2_DISCRIMINATOR: [u8; 8] = [34, 241, 35, 99, 157, 126, 244, 205];
pub const MAX_PRICE_AGE_SECS: i64 = 60;
pub const MAX_CONF_BPS: u128 = 100;

// --- Multi-yield-source registry (add USDY, syrupUSDC, ... without a
// PoolState layout change) — see state.rs::YieldSourceState. ---
pub const YIELD_SOURCE_SEED: &[u8] = b"yield_source";
/// Compute-budget guard on helpers/allocation.rs::harmonized_reserve_apy_bps
/// — how many sources one blended-APY read can cover in a single call.
pub const MAX_HARMONIZED_SOURCES: usize = 8;

// --- Swap aggregator allow-list — CPI target is validated against this
// list instead of a single hardcoded program id, so a second aggregator
// (or a third, later) is additive, not a rewrite. See helpers/jupiter.rs. ---

/// Titan Exchange's execution program id. PLACEHOLDER — Titan's public docs
/// (titan-exchange.gitbook.io) describe an off-chain quote/routing API
/// (Titan Direct over websocket, Titan Gateway over REST) that returns a
/// ready-to-sign transaction; they do not publish a single fixed on-chain
/// program id in the public docs, and API/integration access is gated
/// ("released soon" as of this writing). Deliberately set to the System
/// Program id — inert, can never authorize a real swap CPI — so this
/// can't accidentally ship as a live value if someone forgets to replace
/// it. Swap in the real id(s) once Titan integration access confirms what
/// their routes actually execute against; see /open-questions.
pub const TITAN_PROGRAM_ID: Address =
    Address::new_from_array(pinocchio_pubkey::from_str("11111111111111111111111111111111"));

pub const ALLOWED_SWAP_PROGRAMS: [Address; 2] = [JUPITER_V6_PROGRAM_ID, TITAN_PROGRAM_ID];

// --- Redemption liquidity & tranche conversion (round 2) — see
// helpers/liquidity.rs, helpers/tranche_convert.rs, /redemption. ---

/// Instant (accelerated) redemption fee band, in bps, per tranche —
/// [fee_min, fee_max]. FFC sits strictly above FYC: junior liquidity is
/// scarcer and riskier to hand out on demand. Admin-tunable within
/// [0, MAX_INSTANT_FEE_BPS] via set_redemption_fees (extended this round).
pub const INSTANT_FEE_BPS_FYC: (u64, u64) = (10, 50);   // 0.10% – 0.50%
pub const INSTANT_FEE_BPS_FFC: (u64, u64) = (50, 100);  // 0.50% – 1.00%
pub const MAX_INSTANT_FEE_BPS: u64 = 200;

/// Multi-yield-source target band, in bps of annualized yield — see
/// helpers/liquidity.rs::pick_rebalance_target. MIN is a soft reference, not
/// a hard requirement: routing never errors just because it's unreachable.
pub const YIELD_TARGET_MIN_BPS: u64 = 300;   // 3.00%
pub const YIELD_TARGET_BPS: u64 = 350;       // 3.50%
pub const YIELD_TARGET_MAX_BPS: u64 = 700;   // 7.00%

/// How long an equity-received earmark reserves capital before a
/// permissionless sweep can release it — guards against a forgotten
/// cancel_earmark permanently over-reserving liquidity. Deliberately longer
/// than FFC's own redemption lock (90d) so a slow-moving loan disbursement
/// is never the reason a legitimate earmark expires early.
pub const EARMARK_EXPIRY_SECS: i64 = 120 * SECONDS_PER_DAY;

// --- FYC APY cap (round 3) — see helpers/waterfall.rs::distribute_loan_interest,
// instructions/set_max_fyc_apy.rs. ---

/// Sanity ceiling on what set_max_fyc_apy.rs will accept — NOT the actual
/// working cap (that's PoolState.max_fyc_apy_bps, admin-set per pool, 0 =
/// uncapped). Added after a security review found the original version of
/// this instruction had no bound at all: distribute_loan_interest's ceiling
/// math is mul_div_u64(headroom_bps, fyc.v_tranche, BPS_DENOMINATOR), and
/// headroom_bps derives from max_fyc_apy_bps — an admin fat-fingering (or a
/// malicious admin deliberately setting) something near u64::MAX, combined
/// with a large fyc.v_tranche, pushes the u128 intermediate uncomfortably
/// close to its own ceiling. 100_000 bps (1,000% APY) is comfortably above
/// any real ceiling an admin would ever actually want while leaving no
/// realistic path to that overflow.
pub const MAX_FYC_APY_BPS: u64 = 100_000;

/// 365-day year — matches observed_source_apy_bps's own annualization
/// factor (not a flat ×12 over 30-day periods). Used by run_yield_epoch.rs
/// to derive each YieldSourceState's observed_apy_bps.
pub const SECONDS_PER_YEAR: i64 = 365 * SECONDS_PER_DAY;`
},
{
  path: "pinochio/src/errors.rs",
  status: "M",
  category: "pinocchio",
  why: "Adds three new variants — two for the severity gates, one for the multi-yield-source registry — changed from the monorepo baseline. Round 2 adds five more — instant-redemption liquidity, the origination liquidity gate, the tranche-conversion re-checks, and earmark lifecycle. Round 5 (loan lifecycle) adds three more for the new grace/cure/default flow, reusing the existing LoanNotDefaulted (5) rather than adding a duplicate. ROUND 8 (greenfield cleanup — nothing is deployed yet, see END_TO_END_PROTOCOL_SIMULATION.md's findings-verification pass): dropped InstructionDeprecated — it existed only to give approve_default.rs/record_recovery.rs's old ix_tags a clear error for a 'live client' that doesn't exist yet; those two instructions are removed outright this round instead (see their own files). Slot 50 is reused for the new IncompleteYieldSourceList instead of leaving a gap — with no live deployment to preserve discriminants against, there's no reason to. The numeric values below are otherwise stable purely because renumbering the whole list for its own sake isn't worth the churn, not because anything is already live.",
  original: `//! Program errors (mirrors Anchor \`FleetError\`). Mapped to \`ProgramError::Custom(u32)\`.

use pinocchio::error::ProgramError;

#[repr(u32)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FleetError {
    FfcCoverageViolation = 0,
    LoanAllocationExceeded = 1,
    LoanNotActive = 2,
    LoanNotDelinquent = 3,
    LoanNotPendingDefault = 4,
    LoanNotDefaulted = 5,
    CurePeriodNotExpired = 6,
    PaymentNotYetDue = 7,
    RecoveryAlreadyRecorded = 8,
    InsufficientLiquidity = 9,
    RedemptionNotEligible = 10,
    RedemptionNotPending = 11,
    RedemptionAlreadyEligible = 12,
    StaleOraclePrice = 13,
    UsdcDepeg = 14,
    InvalidSlippage = 15,
    SwapOutputBelowMinimum = 16,
    InsuranceFundBelowFloor = 17,
    InvalidFeeParam = 18,
    Overflow = 19,
    Unauthorized = 20,
    ProtocolPaused = 21,
    InvalidTrancheType = 22,
    EmptyTranche = 23,
    GenesisAlreadyInitialized = 24,
    TrancheMismatch = 25,
    InvalidAcceleratedFee = 26,
    AcceleratedSwapBelowMinimum = 27,
    AlreadyInitialized = 28,
    InvalidAccountData = 29,
    InvalidAccountOwner = 30,
    SeedsConstraintViolated = 31,
    BumpMismatch = 32,
    NotSigner = 33,
    NotWritable = 34,
    InvalidProgramId = 35,
    InvalidInstructionData = 36,
    AccountNotInitialized = 37,
}

impl From<FleetError> for ProgramError {
    fn from(e: FleetError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

#[macro_export]
macro_rules! require {
    ($cond:expr, $err:expr $(,)?) => {
        if !$cond {
            return Err($crate::errors::FleetError::from($err).into());
        }
    };
}

#[macro_export]
macro_rules! require_keys_eq {
    ($a:expr, $b:expr, $err:expr $(,)?) => {
        if $a != $b {
            return Err($crate::errors::FleetError::from($err).into());
        }
    };
}`,
  proposed: `//! Program errors (mirrors Anchor \`FleetError\`). Mapped to \`ProgramError::Custom(u32)\`.

use pinocchio::error::ProgramError;

#[repr(u32)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FleetError {
    /// Dead since the coverage/severity redesign — assert_origination_allowed
    /// now returns SeverityGateExceeded instead. Left in place at 0 rather
    /// than removed, purely to avoid renumbering the whole list for its own
    /// sake — not because anything is deployed against this discriminant.
    FfcCoverageViolation = 0,
    LoanAllocationExceeded = 1,
    LoanNotActive = 2,
    LoanNotDelinquent = 3,
    LoanNotPendingDefault = 4,
    LoanNotDefaulted = 5,
    CurePeriodNotExpired = 6,
    PaymentNotYetDue = 7,
    RecoveryAlreadyRecorded = 8,
    InsufficientLiquidity = 9,
    RedemptionNotEligible = 10,
    RedemptionNotPending = 11,
    RedemptionAlreadyEligible = 12,
    StaleOraclePrice = 13,
    UsdcDepeg = 14,
    InvalidSlippage = 15,
    SwapOutputBelowMinimum = 16,
    InsuranceFundBelowFloor = 17,
    InvalidFeeParam = 18,
    Overflow = 19,
    Unauthorized = 20,
    ProtocolPaused = 21,
    InvalidTrancheType = 22,
    EmptyTranche = 23,
    GenesisAlreadyInitialized = 24,
    TrancheMismatch = 25,
    InvalidAcceleratedFee = 26,
    AcceleratedSwapBelowMinimum = 27,
    AlreadyInitialized = 28,
    InvalidAccountData = 29,
    InvalidAccountOwner = 30,
    SeedsConstraintViolated = 31,
    BumpMismatch = 32,
    NotSigner = 33,
    NotWritable = 34,
    InvalidProgramId = 35,
    InvalidInstructionData = 36,
    AccountNotInitialized = 37,
    /// NEW — origination blocked, projected severity > SEVERITY_GATE_MAX_BPS.
    SeverityGateExceeded = 38,
    /// NEW — FFC mint blocked, severity <= SEVERITY_MINT_FLOOR_BPS.
    MintFloorNotMet = 39,
    /// NEW — run_yield_epoch called against a YieldSourceState that's been
    /// paused/retired (is_active == 0).
    YieldSourceInactive = 40,
    /// NEW (round 2) — instant (accelerated) redemption requested for more
    /// than that tranche's currently available ELB share; must use the
    /// scheduled 30d/90d queue instead.
    InsufficientInstantLiquidity = 41,
    /// NEW (round 2) — assert_liquidity_available_for_origination: new loan
    /// would draw on capital already needed for submitted redemptions or
    /// undisbursed earmarks.
    InsufficientLiquidityForOrigination = 42,
    /// NEW (round 2) — jr_to_sr would push severity, against the EXISTING
    /// loan book, above SEVERITY_GATE_MAX_BPS.
    ConversionWouldExceedSeverityGate = 43,
    /// NEW (round 2) — sr_to_jr would violate assert_mint_allowed on the
    /// resulting pool (same floor as an external FFC deposit).
    ConversionBelowMintFloor = 44,
    /// NEW (round 2) — cancel_earmark called by a non-admin before
    /// expires_ts; only a permissionless sweep after expiry is allowed.
    EarmarkNotYetExpired = 45,
    /// NEW (security review) — jr_to_sr/sr_to_jr would leave elb_fyc or
    /// elb_ffc below that side's own pending_fyc_redemptions/
    /// pending_ffc_redemptions; a conversion can't be allowed to strand an
    /// already-queued redeemer even if it clears the severity/mint-floor
    /// check on its own.
    ConversionWouldStrandPendingRedemption = 46,
    /// NEW (round 5, loan lifecycle) — repay_loan called after the 30-day
    /// grace+cure window has fully elapsed; the loan is only resolvable via
    /// finalize_default from here, never via a borrower repayment.
    LoanPastDefaultThreshold = 47,
    /// NEW (round 5) — finalize_default called before GRACE_PERIOD_DAYS +
    /// CURE_PERIOD_DAYS has actually elapsed since next_payment_due_ts.
    LoanNotYetDefaultable = 48,
    /// NEW (round 5) — a resell/relist attempted on a loan whose status is
    /// already RESOLVED — the mutual-exclusion guard for the three
    /// first-come-first-served resolution paths (resell / relist / IOU).
    /// resell_defaulted_loan / originate_loan's relist path reuse the
    /// existing LoanNotDefaulted (5) for "not DEFAULTED yet"; this is
    /// specifically for "DEFAULTED already came and went."
    LoanAlreadyResolved = 49,
    /// NEW (round 8) — deposit.rs / deposit_yield_token.rs / run_yield_epoch.rs
    /// called with an incomplete other_source_accounts tail: the caller
    /// supplied fewer (yield_source, oracle) pairs than pool.yield_source_count
    /// actually has registered. A partial list used to silently produce a
    /// valid mint/tick priced against less than the pool's real total —
    /// closing that hole (see helpers/allocation.rs::require_complete_source_list).
    IncompleteYieldSourceList = 50,
}

impl From<FleetError> for ProgramError {
    fn from(e: FleetError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

#[macro_export]
macro_rules! require {
    ($cond:expr, $err:expr $(,)?) => {
        if !$cond {
            return Err($crate::errors::FleetError::from($err).into());
        }
    };
}

#[macro_export]
macro_rules! require_keys_eq {
    ($a:expr, $b:expr, $err:expr $(,)?) => {
        if $a != $b {
            return Err($crate::errors::FleetError::from($err).into());
        }
    };
}`
},
{
  path: "pinochio/src/state.rs",
  status: "M",
  category: "pinocchio",
  why: "LoanAccount gets one new field — levelized_interest, the flat per-period figure computed once at origination. This grows the repr(C) struct by 8 bytes, so LOAN_SPACE changes and any already-deployed LoanAccount PDAs need a migration (realloc + backfill) before this ships — flagged directly in /open-questions on the design tool. PoolState gets one new byte, yield_source_count, carved out of what was _padding — the struct's total size is unchanged, so this one is NOT a breaking change (existing accounts already read that byte as zero, which is the correct starting count). PoolState ALSO gets three new fields — loan_accrual_rate/loan_accrual_checkpoint/loan_accrual_updated_ts, a reward-per-second accumulator that makes compute_optimistic_price's loan-interest estimate a real per-active-loan accrual instead of the old cap-based proxy (see helpers/allocation.rs) — this IS a breaking 24-byte growth, same realloc + backfill migration story as LoanAccount's field, not folded into the free-padding trick above. New: YieldSourceState, one PDA per registered yield-bearing reserve token — see helpers/allocation.rs and instructions/initialize_yield_source.rs. (Its impl_account_io! registration and the RedemptionRequest struct/load-save-helpers tail of the real file are outside this excerpt — same as they were before this round.) Round 2 (redemption/liquidity): PoolState gains pending_fyc_redemptions and earmarked_loan_capital (both breaking, same realloc+backfill story); YieldSourceState gains observed_apy_bps (not breaking — nothing is deployed against its layout yet) and repurposes is_active as the disable-source flag; new EarmarkRecord PDA carries each individual earmark's own expiry so a forgotten cancel_earmark can't permanently over-reserve capital. Round 3 (FYC APY cap): PoolState gains max_fyc_apy_bps (admin-configurable ceiling on FYC's TOTAL blended APY — set via the new set_max_fyc_apy.rs, see helpers/waterfall.rs::distribute_loan_interest) and last_observed_base_apy_bps (the PRIMARY reserve's own observed-APY figure, mirroring YieldSourceState.observed_apy_bps but for the original single-reserve slot, refreshed every instructions/run_yield_epoch.rs 5-account tick) — both breaking, same realloc+backfill story, backfilling both to 0 is safe: max_fyc_apy_bps == 0 is the deliberate 'uncapped' sentinel (preserves today's real behavior for every existing pool until an admin opts in), and the cap logic short-circuits before ever reading last_observed_base_apy_bps while uncapped. ROUND 8 (greenfield cleanup — nothing is deployed yet, see END_TO_END_PROTOCOL_SIMULATION.md's findings-verification pass): every 'breaking growth, needs a realloc + backfill migration' note above described a real concern IF this were live — it isn't. Since there's no already-written LoanAccount/PoolState PDA anywhere to migrate, this round drops the two loan_status values (DELINQUENT, PENDING_DEFAULT) and the delinquency_start_ts field outright instead of keeping them as inert-but-present compatibility scaffolding — they were already unused by any new code (see loan_status's own doc comments), so removing them shrinks the struct and the state machine to only what's actually used, with no live account layout to answer to.",
  suggestions: [
    "Two concurrent equity-received events can each pass the origination liquidity gate before either one's earmark_loan_capital call actually lands, both drawing on the same slice of ELB — EARMARK_EXPIRY_SECS + sweep_expired_earmark bounds the damage but doesn't prevent it; the real fix is serializing equity-received processing in the backend, not something this PDA layout alone can guarantee.",
    "loan_ref on EarmarkRecord is an opaque off-chain id supplied by the backend — nothing on-chain currently verifies it corresponds to a real application-pipeline loan. Low risk since only admin can call earmark_loan_capital, but worth a decision on whether that's sufficient.",
  ],
  original: `//! Zero-copy account state.
//!
//! Each program-owned account uses a 1-byte tag at offset 0 (no Anchor
//! 8-byte sha256 discriminator). Bytes 1.. hold the C-layout struct.
//!
//! Read/write through \`load_*\`/\`save_*\` helpers (copies into a stack-local
//! \`#[repr(C)]\` struct via \`bytemuck::pod_read_unaligned\`).

use bytemuck::{Pod, Zeroable};
use core::mem::size_of;
use pinocchio::{account::AccountView, error::ProgramError};

use crate::constants::*;
use crate::errors::FleetError;

pub type RawKey = [u8; 32];

// ---------------------------------------------------------------------------
// ProtocolConfig
// ---------------------------------------------------------------------------

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable, Debug)]
pub struct ProtocolConfig {
    pub super_admin: RawKey,
    pub pool: RawKey,
    pub pool_initialized: u8, // bool
    pub bump: u8,
    pub _padding: [u8; 6],
}

// ---------------------------------------------------------------------------
// PoolState
// ---------------------------------------------------------------------------

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable, Debug)]
pub struct PoolState {
    pub authority: RawKey,
    pub admin: RawKey,

    pub deposit_token_mint: RawKey,
    pub deposit_token_vault: RawKey,
    pub deposit_token_oracle: RawKey,

    pub base_yield_token_mint: RawKey,
    pub base_yield_token_vault: RawKey,
    pub base_yield_token_oracle: RawKey,

    pub fyc_tranche: RawKey,
    pub ffc_tranche: RawKey,

    pub c_tokens: u64,
    pub last_base_yield_token_price: u64,
    pub outstanding_principal: u64,
    pub realized_losses: u64,
    pub pending_ffc_redemptions: u64,

    pub last_epoch_ts: i64,
    pub loan_counter: u64,
    pub active_loan_count: u64,

    pub full_cap_bps: u64,
    pub protocol_fee_bps: u64,
    pub insurance_fee_bps: u64,
    pub min_peg_bps: u64,
    pub insurance_floor_bps: u64,
    pub standard_redemption_fee_bps: u64,
    pub accelerated_redemption_fee_bps: u64,
    pub max_standard_redemption_fee_bps: u64,
    pub max_accelerated_redemption_fee_bps: u64,
    pub protocol_fee_recipient: RawKey,
    pub epoch_interval_secs: i64,

    pub fyc_initialized: u8,
    pub ffc_initialized: u8,
    pub is_paused: u8,
    pub bump: u8,
    pub _padding: [u8; 4],
}

impl PoolState {
    #[inline]
    pub fn assert_authority(&self, signer: &RawKey) -> bool { self.authority == *signer }
    #[inline]
    pub fn assert_admin(&self, signer: &RawKey) -> bool {
        self.admin == *signer || self.authority == *signer
    }
}

// ---------------------------------------------------------------------------
// TrancheState
// ---------------------------------------------------------------------------

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable, Debug)]
pub struct TrancheState {
    pub pool: RawKey,
    pub tranche_type: u8,
    pub _pad0: [u8; 7],
    pub token_mint: RawKey,

    pub v_tranche: u64,
    pub total_supply: u64,

    pub conservative_price: u64,
    pub optimistic_price: u64,
    pub last_collection_ts: i64,

    pub protocol_wallet: RawKey,
    pub insurance_wallet: RawKey,
    pub protocol_token_balance: u64,
    pub insurance_token_balance: u64,

    pub cumulative_yield: u64,
    pub cumulative_losses: u64,

    pub monthly_loan_allocation: u64,

    pub bump: u8,
    pub _pad1: [u8; 7],
}

// ---------------------------------------------------------------------------
// LoanAccount
// ---------------------------------------------------------------------------

pub mod loan_status {
    pub const ACTIVE: u8 = 0;
    pub const DELINQUENT: u8 = 1;
    pub const PENDING_DEFAULT: u8 = 2;
    pub const DEFAULTED: u8 = 3;
    pub const REPAID: u8 = 4;
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable, Debug)]
pub struct LoanAccount {
    pub pool: RawKey,
    pub loan_id: u64,
    pub borrower: RawKey,
    pub status: u8,
    pub _pad0: [u8; 7],

    pub principal: u64,
    pub apr_bps: u64,
    pub term_months: u16,
    pub _pad1: [u8; 6],

    pub origination_ts: i64,
    pub disbursement_ts: i64,

    pub monthly_payment: u64,
    pub current_balance: u64,
    pub months_paid: u16,
    pub _pad2: [u8; 6],
    pub last_payment_ts: i64,
    pub delinquency_start_ts: i64,

    pub gross_loss_at_default: u64,
    pub recovery_amount: u64,

    pub bump: u8,
    pub _pad3: [u8; 7],
}

impl LoanAccount {
    pub fn next_payment_due_ts(&self) -> i64 {
        self.disbursement_ts + (self.months_paid as i64 + 1) * SECONDS_PER_PERIOD
    }
}`,
  proposed: `//! Zero-copy account state.
//!
//! Each program-owned account uses a 1-byte tag at offset 0 (no Anchor
//! 8-byte sha256 discriminator). Bytes 1.. hold the C-layout struct.
//!
//! Read/write through \`load_*\`/\`save_*\` helpers (copies into a stack-local
//! \`#[repr(C)]\` struct via \`bytemuck::pod_read_unaligned\`).

use bytemuck::{Pod, Zeroable};
use core::mem::size_of;
use pinocchio::{account::AccountView, error::ProgramError};

use crate::constants::*;
use crate::errors::FleetError;

pub type RawKey = [u8; 32];

// ---------------------------------------------------------------------------
// ProtocolConfig
// ---------------------------------------------------------------------------

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable, Debug)]
pub struct ProtocolConfig {
    pub super_admin: RawKey,
    pub pool: RawKey,
    pub pool_initialized: u8, // bool
    pub bump: u8,
    pub _padding: [u8; 6],
}

// ---------------------------------------------------------------------------
// PoolState
// ---------------------------------------------------------------------------

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable, Debug)]
pub struct PoolState {
    pub authority: RawKey,
    pub admin: RawKey,

    pub deposit_token_mint: RawKey,
    pub deposit_token_vault: RawKey,
    pub deposit_token_oracle: RawKey,

    pub base_yield_token_mint: RawKey,
    pub base_yield_token_vault: RawKey,
    pub base_yield_token_oracle: RawKey,

    pub fyc_tranche: RawKey,
    pub ffc_tranche: RawKey,

    pub c_tokens: u64,
    pub last_base_yield_token_price: u64,
    pub outstanding_principal: u64,
    pub realized_losses: u64,
    pub pending_ffc_redemptions: u64,
    /// NEW (round 2) — mirrors pending_ffc_redemptions for FYC. Before this,
    /// submit_redemption only tracked the FFC side; a queued FYC redemption
    /// was invisible to both the ELB liquidity split and the new
    /// origination liquidity gate (helpers/coverage.rs). BREAKING — grows
    /// PoolState, same realloc + backfill (= 0) story as loan_accrual_rate
    /// below.
    pub pending_fyc_redemptions: u64,
    /// NEW (round 2) — capital reserved against loans that reached the
    /// off-chain "equity received" pipeline stage but haven't originated
    /// on-chain yet. Netted out of ELB (helpers/liquidity.rs::compute_elb)
    /// so it can't be instantly redeemed out from under a committed loan.
    /// The aggregate lives here; each individual earmark (with its own
    /// expiry) is its own EarmarkRecord PDA — see below.
    pub earmarked_loan_capital: u64,

    pub last_epoch_ts: i64,
    pub loan_counter: u64,
    pub active_loan_count: u64,

    // --- Real per-active-loan interest accrual, for compute_optimistic_price
    // (helpers/allocation.rs) — a reward-per-second accumulator, not a live
    // iteration over every loan. loan_accrual_rate is the live sum of
    // levelized_interest_i / SECONDS_PER_PERIOD across every loan still
    // assumed to be paying; loan_accrual_checkpoint rolls up whatever had
    // already accrued as of loan_accrual_updated_ts. Kept current by
    // instructions/originate_loan.rs, repay_loan.rs, and
    // flag_pending_default.rs. BREAKING -- grows PoolState by 24 bytes, same
    // migration story as LoanAccount's levelized_interest field below:
    // already-deployed PoolState PDAs need a realloc + backfill before this
    // ships (backfill: rate = 0, checkpoint = 0, updated_ts = now -- safe
    // since it only ever under-estimates until the first loan touches it).
    pub loan_accrual_rate: u64,
    pub loan_accrual_checkpoint: u64,
    pub loan_accrual_updated_ts: i64,

    pub full_cap_bps: u64,
    pub protocol_fee_bps: u64,
    pub insurance_fee_bps: u64,
    pub min_peg_bps: u64,
    pub insurance_floor_bps: u64,
    pub standard_redemption_fee_bps: u64,
    pub accelerated_redemption_fee_bps: u64,
    pub max_standard_redemption_fee_bps: u64,
    pub max_accelerated_redemption_fee_bps: u64,
    /// NEW (round 3) — admin-configurable ceiling on FYC's TOTAL blended APY
    /// (loan interest + reserve/yield-token yield combined), set via
    /// instructions/set_max_fyc_apy.rs. 0 is a deliberate sentinel meaning
    /// "uncapped" — every already-deployed pool backfills to 0 and keeps
    /// today's real behavior exactly until an admin explicitly opts in.
    /// Enforced in helpers/waterfall.rs::distribute_loan_interest by
    /// throttling ONLY the loan-interest leg; the reserve/yield-token split
    /// (split_base_yield_token_yield) is never touched. BREAKING — same
    /// realloc + backfill (= 0) story as the fields above.
    pub max_fyc_apy_bps: u64,
    /// NEW (round 3) — the PRIMARY reserve's own last-observed annualized
    /// APY, mirroring YieldSourceState.observed_apy_bps (which only covers
    /// ADDITIONAL registered sources) for the original single-reserve slot.
    /// Refreshed every instructions/run_yield_epoch.rs 5-account tick, using
    /// the identical price-delta method observed_source_apy_bps already
    /// uses. distribute_loan_interest reads this directly instead of
    /// re-deriving an annualized rate from a dollar figure at repay time —
    /// repay_loan.rs and run_yield_epoch.rs are async, unrelated-cadence
    /// instructions (a borrower can repay at any moment; the epoch tick
    /// runs on its own admin-triggered schedule), so there is no "this same
    /// period's reserve share" to hand distribute_loan_interest the way the
    /// design tool's own lib/model.ts simulator can (it steps both streams
    /// together every 30-day period) — reading the pool's last observed
    /// rate is the honest on-chain equivalent. BREAKING — same
    /// realloc + backfill (= 0) story as the fields above.
    pub last_observed_base_apy_bps: u64,
    pub protocol_fee_recipient: RawKey,
    pub epoch_interval_secs: i64,

    pub fyc_initialized: u8,
    pub ffc_initialized: u8,
    pub is_paused: u8,
    pub bump: u8,
    pub yield_source_count: u8,
    pub _padding: [u8; 3],
}

impl PoolState {
    #[inline]
    pub fn assert_authority(&self, signer: &RawKey) -> bool { self.authority == *signer }
    #[inline]
    pub fn assert_admin(&self, signer: &RawKey) -> bool {
        self.admin == *signer || self.authority == *signer
    }
}

// ---------------------------------------------------------------------------
// TrancheState
// ---------------------------------------------------------------------------

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable, Debug)]
pub struct TrancheState {
    pub pool: RawKey,
    pub tranche_type: u8,
    pub _pad0: [u8; 7],
    pub token_mint: RawKey,

    pub v_tranche: u64,
    pub total_supply: u64,

    pub conservative_price: u64,
    pub optimistic_price: u64,
    pub last_collection_ts: i64,

    pub protocol_wallet: RawKey,
    pub insurance_wallet: RawKey,
    pub protocol_token_balance: u64,
    pub insurance_token_balance: u64,

    pub cumulative_yield: u64,
    pub cumulative_losses: u64,

    pub monthly_loan_allocation: u64,

    /// NEW (security review) — USD value parked here when a jr_to_sr call
    /// inside accelerated_redeem.rs can't complete the fee's FFC->FYC leg
    /// (e.g. would breach the severity gate), instead of the fee's value
    /// being silently dropped. USD-denominated, not a token count: the
    /// investor's tokens backing that fee slice are burned unconditionally
    /// (real SPL burn happens before the conversion is attempted), but the
    /// VALUE they represented is deliberately left sitting in v_tranche —
    /// this field is just the ledger entry marking it as still earmarked
    /// for FYC rather than a permanent windfall to remaining FFC holders.
    /// Only meaningful on FFC (that's the only tranche accelerated_redeem
    /// converts fee value FROM); left at 0 on FYC. Breaking 8-byte growth,
    /// same realloc + backfill migration story as this round's other new
    /// fields — backfilling to 0 is safe, it just means "nothing parked".
    /// A permissionless sweep_fee_suspense instruction that retries the
    /// jr_to_sr conversion once severity headroom exists (and zeroes this
    /// back out) is follow-up work, not included in this excerpt — see
    /// /open-questions.
    pub suspense_fee_value: u64,

    pub bump: u8,
    pub _pad1: [u8; 7],
}

// ---------------------------------------------------------------------------
// LoanAccount
// ---------------------------------------------------------------------------

pub mod loan_status {
    pub const ACTIVE: u8 = 0;
    // 1, 2 — REMOVED (round 8, greenfield cleanup). Were DELINQUENT /
    // PENDING_DEFAULT: GRACE and CURE are purely time-derived (see
    // helpers/loan_lifecycle.rs) rather than stored — a loan stays ACTIVE
    // the entire way through grace and cure, right up until it's
    // automatically finalized DEFAULTED. With nothing deployed yet there's
    // no already-written LoanAccount PDA whose old status byte needs these
    // values to still mean something, so the values are freed rather than
    // kept as unused discriminants.
    pub const DEFAULTED: u8 = 3;
    pub const REPAID: u8 = 4;
    /// NEW (round 5) — one of the three first-come-first-served resolution
    /// paths (resell / relist / IOU) has closed this loan out. Terminal,
    /// same as REPAID — nothing transitions out of RESOLVED.
    pub const RESOLVED: u8 = 5;
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable, Debug)]
pub struct LoanAccount {
    pub pool: RawKey,
    pub loan_id: u64,
    pub borrower: RawKey,
    pub status: u8,
    pub _pad0: [u8; 7],

    pub principal: u64,
    pub apr_bps: u64,
    pub term_months: u16,
    pub _pad1: [u8; 6],

    pub origination_ts: i64,
    pub disbursement_ts: i64,

    pub monthly_payment: u64,
    /// NEW — flat, levelized interest for one period, computed once at
    /// origination: (monthly_payment * term_months - principal) / term_months.
    /// repay_loan.rs reads this directly instead of recomputing true
    /// declining-balance interest every payment. Grows LoanAccount by 8
    /// bytes — LOAN_SPACE changes, existing PDAs need a migration.
    pub levelized_interest: u64,
    pub current_balance: u64,
    pub months_paid: u16,
    pub _pad2: [u8; 6],
    pub last_payment_ts: i64,
    // delinquency_start_ts — REMOVED (round 8). Grace/cure are derived live
    // from next_payment_due_ts(), never stamped; with nothing deployed yet
    // there's no already-written account whose old value needs a home.

    pub gross_loss_at_default: u64,
    pub recovery_amount: u64,
    /// NEW (round 5) — the FULL amount owed the instant finalize_default
    /// runs: current_balance + the final period's levelized_interest + its
    /// cure_fee (see helpers/loan_lifecycle.rs). Computed ONCE, at
    /// finalize_default time, and never touched again — resell_defaulted_loan
    /// measures recovery against THIS number, not against current_balance
    /// directly, so the accrued-but-uncollected interest for the loan's
    /// final unpaid period is included in what counts as owed rather than
    /// silently written off. Breaking 8-byte growth, same realloc+backfill
    /// (=0) story as levelized_interest above; 0 is never a valid real
    /// value here once DEFAULTED (see finalize_default.rs's own zero-check).
    pub owed_at_default: u64,

    pub bump: u8,
    /// NEW (round 5) — carved out of what was _padding (was [u8; 7], now
    /// [u8; 6]) — NOT a breaking change, existing accounts already read
    /// this byte as zero, which is the correct starting value (0 = rate
    /// currently counted normally). Set to 1 by finalize_default.rs when it
    /// removes this loan's contribution from pool.loan_accrual_rate during
    /// CURE; repay_loan.rs checks it on every successful payment and, if
    /// set, re-adds the contribution and resets it to 0 — otherwise a loan
    /// that gets excluded mid-cure but then actually pays would stay
    /// permanently and silently missing from the accrual estimate.
    pub accrual_excluded: u8,
    pub _pad3: [u8; 6],
}

impl LoanAccount {
    pub fn next_payment_due_ts(&self) -> i64 {
        self.disbursement_ts + (self.months_paid as i64 + 1) * SECONDS_PER_PERIOD
    }
}

// ---------------------------------------------------------------------------
// YieldSourceState — NEW. One PDA per registered yield-bearing reserve
// token (USDY, syrupUSDC, ...). Adding a source is calling
// instructions/initialize_yield_source.rs to create one more of these — it
// never touches PoolState's layout, so it's never a breaking change.
// Seeds: [YIELD_SOURCE_SEED, pool, mint].
// ---------------------------------------------------------------------------

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable, Debug)]
pub struct YieldSourceState {
    pub pool: RawKey,
    pub mint: RawKey,
    pub vault: RawKey,
    pub oracle: RawKey,

    pub c_tokens: u64,
    pub last_price: u64,
    pub last_epoch_ts: i64,
    /// NEW (round 2) — this source's own observed annualized yield, derived
    /// by run_yield_epoch.rs the same price-delta method
    /// observed_source_apy_bps already uses for the single primary reserve.
    /// Feeds helpers/liquidity.rs::blended_apy and pick_rebalance_target.
    /// Not a breaking change — YieldSourceState is proposed-only, nothing is
    /// deployed against the old layout yet.
    pub observed_apy_bps: u64,

    /// is_active doubles as the round-2 "enabled" flag: disable_yield_source.rs
    /// (admin-only) flips it to 0, at which point this source stops
    /// receiving new deposits/rebalance routing and is prioritized for
    /// unwinding on the next redemption that swaps yield-token → stable
    /// (helpers/liquidity.rs::pick_unwind_source).
    pub is_active: u8,
    pub bump: u8,
    pub _pad: [u8; 6],
}

// ---------------------------------------------------------------------------
// EarmarkRecord — one PDA per equity-received earmark (round 2). PoolState's
// earmarked_loan_capital above is the aggregate; each record here is what
// actually carries an individual expiry, so sweep_expired_earmark can release
// one forgotten earmark without needing to touch any other loan's.
// Seeds: [EARMARK_SEED, pool, loan_ref].
// ---------------------------------------------------------------------------

pub mod earmark_status {
    pub const ACTIVE: u8 = 0;
    pub const RELEASED: u8 = 1;   // loan actually originated — capital moved to outstanding_principal
    pub const CANCELLED: u8 = 2;  // admin cancel_earmark, or permissionless sweep after expiry
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable, Debug)]
pub struct EarmarkRecord {
    pub pool: RawKey,
    /// Off-chain loan/application id this earmark backs — opaque to the
    /// program, just a correlation key the backend supplies.
    pub loan_ref: u64,
    pub amount: u64,
    pub created_ts: i64,
    pub expires_ts: i64,
    pub status: u8,
    pub bump: u8,
    pub _pad: [u8; 6],
}`
},
{
  path: "pinochio/src/helpers/amortization.rs",
  status: "M",
  category: "pinocchio",
  why: "Adds levelized_interest — the flat per-period figure. period_interest (true declining-balance) stays put: it's still correct for the borrower-facing schedule, it's just no longer what the pool collects against. Round 2 (found during a math review of this round's own formulas, not introduced by it): both compute_monthly_payment and period_interest hardcode '/ 12', implicitly treating a 30-day period as 1/12 of a year (a 30/360 day-count) — while helpers/allocation.rs's observed_source_apy_bps already annualizes reserve yield against a real 365-day year (ACT/365). A stated 15% APR loan was actually costing ~15.21% once measured against a true year. Fixed by using the exact SECONDS_PER_PERIOD/SECONDS_PER_YEAR fraction instead of an assumed /12 — see /open-questions and /glossary#PERIODS_PER_YEAR for the full writeup, including why 30/360 wasn't 'wrong' so much as inconsistent with a choice already made elsewhere.",
  original: `//! Loan amortization (mirrors helpers/amortization.rs).

use pinocchio::error::ProgramError;
use crate::constants::BPS_DENOMINATOR;
use crate::errors::FleetError;
use crate::helpers::math::fixed_pow;

const PRICE_SCALE: u128 = 1_000_000_000;

pub fn compute_monthly_payment(principal: u64, apr_bps: u64, term_months: u16) -> Result<u64, ProgramError> {
    if term_months == 0 { return Err(FleetError::Overflow.into()); }
    let rate_per_period = (apr_bps as u128).checked_mul(PRICE_SCALE).ok_or(ProgramError::from(FleetError::Overflow))?
        / 12 / BPS_DENOMINATOR as u128;
    if rate_per_period == 0 {
        return Ok(principal / term_months as u64);
    }
    let one_plus_r = PRICE_SCALE.checked_add(rate_per_period).ok_or(ProgramError::from(FleetError::Overflow))?;
    let pow = fixed_pow(one_plus_r, term_months as u32, PRICE_SCALE);
    if pow == 0 { return Err(FleetError::Overflow.into()); }
    let inverse = PRICE_SCALE.checked_mul(PRICE_SCALE).ok_or(ProgramError::from(FleetError::Overflow))? / pow;
    let denominator = PRICE_SCALE.checked_sub(inverse).ok_or(ProgramError::from(FleetError::Overflow))?;
    if denominator == 0 { return Err(FleetError::Overflow.into()); }
    let payment = (principal as u128).checked_mul(rate_per_period).ok_or(ProgramError::from(FleetError::Overflow))? / denominator;
    u64::try_from(payment).map_err(|_| FleetError::Overflow.into())
}

pub fn period_interest(current_balance: u64, apr_bps: u64) -> Result<u64, ProgramError> {
    let interest = (current_balance as u128).checked_mul(apr_bps as u128).ok_or(ProgramError::from(FleetError::Overflow))?
        / 12 / BPS_DENOMINATOR as u128;
    u64::try_from(interest).map_err(|_| FleetError::Overflow.into())
}`,
  proposed: `//! Loan amortization (mirrors helpers/amortization.rs).
//! ROUND 2: rate_per_period no longer assumes a period is 1/12 of a year
//! (30/360) — it uses the exact SECONDS_PER_PERIOD/SECONDS_PER_YEAR fraction
//! instead, matching the day-count observed_source_apy_bps already uses for
//! reserve yield (ACT/365). See /open-questions for the full writeup.

use pinocchio::error::ProgramError;
use crate::constants::{BPS_DENOMINATOR, SECONDS_PER_PERIOD, SECONDS_PER_YEAR};
use crate::errors::FleetError;
use crate::helpers::math::fixed_pow;

const PRICE_SCALE: u128 = 1_000_000_000;

/// CHANGED (round 2) — rate_per_period used to divide by a flat 12
/// (implicitly a 30/360 day-count: 12 periods of exactly 1/12 year each,
/// i.e. 360 days, not 365). Now multiplies by the exact
/// SECONDS_PER_PERIOD/SECONDS_PER_YEAR fraction instead — the same
/// day-count observed_source_apy_bps already uses for reserve yield. A
/// stated 15% APR loan was actually costing ~15.21% once measured against
/// a real calendar year; this makes the stated rate the actual rate.
pub fn compute_monthly_payment(principal: u64, apr_bps: u64, term_months: u16) -> Result<u64, ProgramError> {
    if term_months == 0 { return Err(FleetError::Overflow.into()); }
    let rate_per_period = (apr_bps as u128)
        .checked_mul(PRICE_SCALE).ok_or(ProgramError::from(FleetError::Overflow))?
        .checked_mul(SECONDS_PER_PERIOD as u128).ok_or(ProgramError::from(FleetError::Overflow))?
        / SECONDS_PER_YEAR as u128
        / BPS_DENOMINATOR as u128;
    if rate_per_period == 0 {
        return Ok(principal / term_months as u64);
    }
    let one_plus_r = PRICE_SCALE.checked_add(rate_per_period).ok_or(ProgramError::from(FleetError::Overflow))?;
    let pow = fixed_pow(one_plus_r, term_months as u32, PRICE_SCALE);
    if pow == 0 { return Err(FleetError::Overflow.into()); }
    let inverse = PRICE_SCALE.checked_mul(PRICE_SCALE).ok_or(ProgramError::from(FleetError::Overflow))? / pow;
    let denominator = PRICE_SCALE.checked_sub(inverse).ok_or(ProgramError::from(FleetError::Overflow))?;
    if denominator == 0 { return Err(FleetError::Overflow.into()); }
    let payment = (principal as u128).checked_mul(rate_per_period).ok_or(ProgramError::from(FleetError::Overflow))? / denominator;
    u64::try_from(payment).map_err(|_| FleetError::Overflow.into())
}

/// True, declining-balance interest for one period. Still correct — kept for
/// the borrower-facing amortization schedule. No longer used to compute what
/// the pool actually collects/splits; see \`levelized_interest\` below.
/// CHANGED (round 2) — same SECONDS_PER_PERIOD/SECONDS_PER_YEAR fix as
/// compute_monthly_payment above, for the identical reason: this must stay
/// consistent with the schedule monthly_payment produces, or the borrower's
/// declining-balance schedule and the pool's own internal schedule quietly
/// diverge on total interest over the loan's life.
pub fn period_interest(current_balance: u64, apr_bps: u64) -> Result<u64, ProgramError> {
    let interest = (current_balance as u128)
        .checked_mul(apr_bps as u128).ok_or(ProgramError::from(FleetError::Overflow))?
        .checked_mul(SECONDS_PER_PERIOD as u128).ok_or(ProgramError::from(FleetError::Overflow))?
        / SECONDS_PER_YEAR as u128
        / BPS_DENOMINATOR as u128;
    u64::try_from(interest).map_err(|_| FleetError::Overflow.into())
}

/// NEW — flat, levelized interest over the life of the loan, computed once
/// at origination and stored on LoanAccount. Total interest paid over the
/// full term is identical to the declining-balance schedule; only the
/// period-by-period shape changes, from front-loaded to flat.
pub fn levelized_interest(principal: u64, apr_bps: u64, term_months: u16) -> Result<u64, ProgramError> {
    if term_months == 0 { return Err(FleetError::Overflow.into()); }
    let monthly_payment = compute_monthly_payment(principal, apr_bps, term_months)?;
    let total_paid = (monthly_payment as u128).checked_mul(term_months as u128).ok_or(ProgramError::from(FleetError::Overflow))?;
    let total_interest = total_paid.checked_sub(principal as u128).ok_or(ProgramError::from(FleetError::Overflow))?;
    let per_period = total_interest / term_months as u128;
    u64::try_from(per_period).map_err(|_| FleetError::Overflow.into())
}`
},
{
  path: "pinochio/src/helpers/coverage.rs",
  status: "M",
  category: "pinocchio",
  why: "assert_origination_allowed's flat 80% coverage floor becomes a severity gate — origination capacity now scales with FYC's actual size instead of assuming it's 1:1 with FFC. New: assert_mint_allowed, which didn't exist before this round at all. Round 2 adds a second, independent origination check — assert_liquidity_available_for_origination — so a new loan can't be funded out of capital already needed to cover submitted redemptions or earmarked-but-undisbursed loans; both it and the severity gate must pass, whichever is stricter binds. FIXED (security review): the insurance floor check still read ffc.insurance_token_balance after the redesign moved to a three-tier waterfall that burns FYC-held insurance (helpers/waterfall.rs) — checking the wrong wallet could pass on an empty FYC-insurance fund or fail on an irrelevant legacy FFC balance. Now reads fyc.insurance_token_balance, matching what the waterfall actually burns. Also fixes fyc_v == 0 in severity_bps failing OPEN (returned severity 0, reading as fully-safe) instead of closed — see that function's own comment.",
  original: `//! Loan-origination guardrails: FFC coverage, allocation ceiling,
//! insurance-floor checks (mirrors helpers/coverage.rs).

use pinocchio::error::ProgramError;
use crate::constants::{
    BPS_DENOMINATOR, FFC_COVERAGE_DENOMINATOR, FFC_COVERAGE_NUMERATOR, LOAN_ALLOCATION_BPS,
};
use crate::errors::FleetError;
use crate::helpers::math::{checked_add_u64, mul_div_u64};
use crate::helpers::pricing::usd_for_tokens;
use crate::state::{PoolState, TrancheState};

pub fn assert_origination_allowed(
    pool: &PoolState,
    fyc: &TrancheState,
    ffc: &TrancheState,
    new_loan_amount: u64,
) -> Result<(), ProgramError> {
    let projected_outstanding = checked_add_u64(pool.outstanding_principal, new_loan_amount)?;
    let v_pool = checked_add_u64(fyc.v_tranche, ffc.v_tranche)?;

    let effective_ffc = ffc.v_tranche.saturating_sub(pool.pending_ffc_redemptions);

    let coverage_lhs = (effective_ffc as u128) * (FFC_COVERAGE_DENOMINATOR as u128);
    let coverage_rhs = (projected_outstanding as u128) * (FFC_COVERAGE_NUMERATOR as u128);
    if coverage_lhs < coverage_rhs { return Err(FleetError::FfcCoverageViolation.into()); }

    let allocation_ceiling = mul_div_u64(v_pool, LOAN_ALLOCATION_BPS, BPS_DENOMINATOR)?;
    if projected_outstanding > allocation_ceiling { return Err(FleetError::LoanAllocationExceeded.into()); }

    let insurance_value = usd_for_tokens(ffc.insurance_token_balance, ffc.conservative_price)?;
    let floor_value = mul_div_u64(v_pool, pool.insurance_floor_bps, BPS_DENOMINATOR)?;
    if insurance_value < floor_value { return Err(FleetError::InsuranceFundBelowFloor.into()); }

    Ok(())
}`,
  proposed: `//! Loan-origination guardrails: severity gate, allocation ceiling,
//! insurance-floor checks — plus the new FFC-minting ceiling.
//! (mirrors helpers/coverage.rs).

use pinocchio::error::ProgramError;
use crate::constants::{
    BPS_DENOMINATOR, LOAN_ALLOCATION_BPS, SEVERITY_GATE_MAX_BPS, SEVERITY_MINT_FLOOR_BPS,
};
use crate::errors::FleetError;
use crate::helpers::liquidity::compute_elb;
use crate::helpers::math::{checked_add_u64, mul_div_u64};
use crate::helpers::pricing::usd_for_tokens;
use crate::state::{PoolState, TrancheState};

/// severity = max(0, outstanding - effective_ffc) / fyc.v_tranche, in bps.
/// The impact dial: how much of FYC's own TVL is at risk in the worst case,
/// once FFC's protection is exhausted. See helpers/curve.rs for the full
/// coverage + severity write-up.
///
/// FIXED (security review): fyc_v == 0 used to return Ok(0), which reads as
/// "fully safe" and let assert_origination_allowed's \`severity >
/// SEVERITY_GATE_MAX_BPS\` check pass unconditionally for a wiped/uninitialized
/// FYC — the opposite of fail-closed. A missing senior tranche is not a safe
/// state; it means there's nothing left to divide the impact by. Now: if the
/// loan book is still fully covered by FFC alone (outstanding <=
/// effective_ffc), severity really is 0. Otherwise there is FYC-side exposure
/// with no FYC to absorb it, so this returns u64::MAX — guaranteed to trip
/// every severity gate in the program, matching lib/model.ts's severityOf.
fn severity_bps(outstanding: u64, effective_ffc: u64, fyc_v: u64) -> Result<u64, ProgramError> {
    if fyc_v == 0 { return Ok(if outstanding <= effective_ffc { 0 } else { u64::MAX }); }
    let shortfall = outstanding.saturating_sub(effective_ffc);
    mul_div_u64(shortfall, BPS_DENOMINATOR, fyc_v)
}

/// Origination gate. Replaces the old flat 80%-coverage floor: blocks a new
/// loan only if it would push severity above SEVERITY_GATE_MAX_BPS, measured
/// against FYC's actual size instead of assuming it's 1:1 with FFC's.
pub fn assert_origination_allowed(
    pool: &PoolState,
    fyc: &TrancheState,
    ffc: &TrancheState,
    new_loan_amount: u64,
) -> Result<(), ProgramError> {
    let projected_outstanding = checked_add_u64(pool.outstanding_principal, new_loan_amount)?;
    let v_pool = checked_add_u64(fyc.v_tranche, ffc.v_tranche)?;
    let effective_ffc = ffc.v_tranche.saturating_sub(pool.pending_ffc_redemptions);

    let severity = severity_bps(projected_outstanding, effective_ffc, fyc.v_tranche)?;
    if severity > SEVERITY_GATE_MAX_BPS { return Err(FleetError::SeverityGateExceeded.into()); }

    let allocation_ceiling = mul_div_u64(v_pool, LOAN_ALLOCATION_BPS, BPS_DENOMINATOR)?;
    if projected_outstanding > allocation_ceiling { return Err(FleetError::LoanAllocationExceeded.into()); }

    // FIXED (security review): this used to read ffc.insurance_token_balance
    // — the OLD (pre-redesign) insurance wallet. helpers/waterfall.rs's new
    // three-tier apply_default_waterfall burns FYC held in the insurance
    // wallet, not FFC (see that file) — so the floor here was checking a
    // balance the new waterfall never touches, and could pass on an empty
    // FYC-insurance fund (nothing left to absorb the second-loss tier) or
    // fail on a full-but-irrelevant legacy FFC-insurance balance. Now reads
    // the same fyc.insurance_token_balance the waterfall actually burns.
    let insurance_value = usd_for_tokens(fyc.insurance_token_balance, fyc.conservative_price)?;
    let floor_value = mul_div_u64(v_pool, pool.insurance_floor_bps, BPS_DENOMINATOR)?;
    if insurance_value < floor_value { return Err(FleetError::InsuranceFundBelowFloor.into()); }

    Ok(())
}

/// NEW — FFC-minting ceiling. Did not exist before this round. Blocks new
/// FFC deposits once severity is already at or below SEVERITY_MINT_FLOOR_BPS:
/// protection is already more than sufficient, more FFC only dilutes
/// existing holders. Call from instructions/deposit.rs's FFC-mint path.
pub fn assert_mint_allowed(
    pool: &PoolState,
    fyc: &TrancheState,
    ffc: &TrancheState,
) -> Result<(), ProgramError> {
    let effective_ffc = ffc.v_tranche.saturating_sub(pool.pending_ffc_redemptions);
    let severity = severity_bps(pool.outstanding_principal, effective_ffc, fyc.v_tranche)?;
    if severity <= SEVERITY_MINT_FLOOR_BPS { return Err(FleetError::MintFloorNotMet.into()); }
    Ok(())
}

/// NEW (round 2) — a new loan can't be funded out of capital that's needed
/// to cover redemptions already submitted (queued, not yet eligible OR
/// eligible-but-not-yet-processed) across BOTH tranches, or capital already
/// earmarked against a different loan that hasn't originated yet.
/// Independent of the severity gate above — both must pass; whichever is
/// stricter binds. Call this from instructions/originate_loan.rs right
/// alongside assert_origination_allowed.
pub fn assert_liquidity_available_for_origination(
    pool: &PoolState,
    fyc: &TrancheState,
    ffc: &TrancheState,
    new_loan_amount: u64,
) -> Result<(), ProgramError> {
    let elb = compute_elb(pool, fyc, ffc)?;
    let reserved = checked_add_u64(
        checked_add_u64(pool.pending_fyc_redemptions, pool.pending_ffc_redemptions)?,
        pool.earmarked_loan_capital,
    )?;
    let available = elb.total.saturating_sub(reserved);
    if new_loan_amount > available {
        return Err(FleetError::InsufficientLiquidityForOrigination.into());
    }
    Ok(())
}`
},
{
  path: "pinochio/src/helpers/curve.rs",
  status: "U",
  category: "pinocchio",
  why: "New file — didn't exist before this round. The coverage → k_base lookup and the k_from_coverage_and_severity blend live here, isolated from waterfall.rs so the curve itself can get property tests (monotonic k_base, k always >= K_MIN) independent of the yield-split plumbing.",
  original: "",
  proposed: `//! Coverage → premium-multiplier curve (new file — yield-distribution
//! redesign). Coverage sets the base curve; severity scales how much of it
//! applies on top of a guaranteed floor, so coverage always keeps at least
//! COVERAGE_WEIGHT_FLOOR_BPS of its own say even when severity is low.
//! Mirrors lib/model.ts's kBase / kFromCoverageAndSeverity exactly.

use pinocchio::error::ProgramError;
use crate::constants::{
    BPS_DENOMINATOR, COVERAGE_WEIGHT_FLOOR_BPS, K_BREAKPOINTS, K_MIN_BPS, SEVERITY_REF_BPS,
};
use crate::errors::FleetError;
use crate::helpers::math::mul_div_u64;

/// Piecewise-linear interpolation of k_base over the stored breakpoints.
/// K_BREAKPOINTS is ascending in coverage; that invariant is checked by
/// k_breakpoints_are_monotonic in the property tests, not enforced here.
pub fn k_base_bps(coverage_bps: u64) -> Result<u64, ProgramError> {
    let bps = &K_BREAKPOINTS;
    if coverage_bps <= bps[0].0 { return Ok(bps[0].1); }
    for w in bps.windows(2) {
        let (cov_a, k_a) = w[0];
        let (cov_b, k_b) = w[1];
        if coverage_bps >= cov_a && coverage_bps <= cov_b {
            let span = cov_b - cov_a;
            if span == 0 { return Ok(k_a); }
            let f_num = (coverage_bps - cov_a) as i128;
            let diff = k_b as i128 - k_a as i128;
            let interp = (diff * f_num) / span as i128;
            return u64::try_from(k_a as i128 + interp).map_err(|_| FleetError::Overflow.into());
        }
    }
    Ok(bps[bps.len() - 1].1)
}

/// k = K_MIN + (k_base(coverage) - K_MIN) * weight
/// weight = COVERAGE_WEIGHT_FLOOR + (1 - COVERAGE_WEIGHT_FLOOR) * min(1, severity / SEVERITY_REF)
///
/// property: ffc_share/ffc.v_tranche == k * (fyc_share/fyc.v_tranche) exactly,
/// for any pool split — see helpers/waterfall.rs::distribute_loan_interest.
pub fn k_from_coverage_and_severity(coverage_bps: u64, severity_bps: u64) -> Result<u64, ProgramError> {
    let base = k_base_bps(coverage_bps)?;

    let severity_factor_bps = severity_bps
        .saturating_mul(BPS_DENOMINATOR)
        .checked_div(SEVERITY_REF_BPS)
        .ok_or(ProgramError::from(FleetError::Overflow))?
        .min(BPS_DENOMINATOR);

    let weight_bps = COVERAGE_WEIGHT_FLOOR_BPS
        + mul_div_u64(BPS_DENOMINATOR - COVERAGE_WEIGHT_FLOOR_BPS, severity_factor_bps, BPS_DENOMINATOR)?;

    let base_diff = base as i128 - K_MIN_BPS as i128;
    let scaled = (base_diff * weight_bps as i128) / BPS_DENOMINATOR as i128;
    u64::try_from(K_MIN_BPS as i128 + scaled).map_err(|_| FleetError::Overflow.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn k_base_matches_stored_breakpoints_exactly() {
        for &(cov, k) in K_BREAKPOINTS.iter() {
            assert_eq!(k_base_bps(cov).unwrap(), k);
        }
    }

    #[test]
    fn k_never_below_k_min() {
        for cov in (0..=10_000).step_by(137) {
            for sev in (0..=20_000).step_by(211) {
                assert!(k_from_coverage_and_severity(cov, sev).unwrap() >= K_MIN_BPS);
            }
        }
    }

    #[test]
    fn k_at_full_severity_equals_k_base() {
        let cov = 4_100; // 41.00%
        let full = k_from_coverage_and_severity(cov, SEVERITY_REF_BPS).unwrap();
        assert_eq!(full, k_base_bps(cov).unwrap());
    }
}`
},
{
  path: "pinochio/src/helpers/waterfall.rs",
  status: "M",
  category: "pinocchio",
  why: "distribute_loan_interest's fyc_target/residual split — the actual bug: FYC's rate can invert below its own reserve-only baseline once FFC is oversized relative to the epoch cap — is replaced with the severity-scaled curve from curve.rs. Signature drops base_yield_token_price/now_ts: coverage and severity are read directly off pool + tranche state, no epoch snapshot needed. apply_default_waterfall is also redesigned into a three-tier order: FFC absorbs the loss first, same as before; once FFC is exhausted the remainder now burns FYC tokens held in the insurance wallet (a real loss absorption — v_tranche and total_supply both drop by the burned amount) instead of the old version's post-hoc price smoothing; only once the insurance fund's own FYC is exhausted does the loss finally reduce general fyc.v_tranche. approve_default.rs needs no changes — it already discards apply_default_waterfall's return value. Round 3: distribute_loan_interest now also enforces max_fyc_apy_bps (PoolState) — after the severity-curve split above, FYC's loan-interest share is clamped so its TOTAL blended APY (this share plus pool.last_observed_base_apy_bps) never exceeds the admin-configured ceiling; every dollar clamped off redirects to ffc_share, never burned or sent to a wallet. 0 (the sentinel/backfill value) means uncapped, so this is a no-op for every pool until an admin calls the new set_max_fyc_apy.rs. Mirrors capFycLoanShare in the design tool's lib/model.ts, with one deliberate divergence: the design tool passes an explicit per-period reserve-share dollar figure since its simulator steps loan and reserve accrual together; on-chain, repay_loan.rs (this function's real caller) and run_yield_epoch.rs fire on unrelated cadences, so this reads pool.last_observed_base_apy_bps — an already-annualized rate, refreshed every epoch tick — directly instead. Discussed during security review: coverage_bps/severity_bps here deliberately read raw ffc.v_tranche, NOT effective_ffc the way assert_origination_allowed does — a first pass wrongly netted out pool.pending_ffc_redemptions here too, but the gate and this split answer different questions. The gate is forward-looking (protecting a NEW loan's whole future life against capital that's scheduled to leave); this split is about who bore risk THIS period — FFC pending redemption is still fully in the pool, still earning yield, and still first-loss (a default before the redemption processes still marks down the price the pending redeemer is eventually paid at) until the moment it's actually paid out. Netting it here would underpay capital that was, in fact, fully at risk. Also applies the same fail-closed fyc.v_tranche==0 fix as helpers/coverage.rs::severity_bps.",
  original: `//! Yield distribution + default waterfall + price refresh + pause check
//! (mirrors helpers/waterfall.rs).

use pinocchio::error::ProgramError;
use crate::constants::{BPS_DENOMINATOR, PRECISION};
use crate::errors::FleetError;
use crate::helpers::allocation::build_snapshot;
use crate::helpers::fees::{mint_fee_value_into_fyc, split_gross_yield};
use crate::helpers::math::{checked_add_u64, checked_sub_u64, mul_div_u64};
use crate::helpers::pricing::live_price;
use crate::state::{PoolState, TrancheState};

pub struct InterestDistribution { pub fyc_share: u64, pub ffc_share: u64, pub fee_value: u64 }

pub fn distribute_loan_interest(
    pool: &PoolState,
    fyc: &mut TrancheState,
    ffc: &mut TrancheState,
    gross_interest: u64,
    base_yield_token_price: u64,
    now_ts: i64,
) -> Result<InterestDistribution, ProgramError> {
    let split = split_gross_yield(gross_interest)?;

    let snapshot = build_snapshot(pool, fyc, base_yield_token_price, now_ts)?;
    let cap_diff_bps = snapshot.effective_cap_bps.saturating_sub(snapshot.base_cap_bps);
    let fyc_target = mul_div_u64(fyc.v_tranche, cap_diff_bps, BPS_DENOMINATOR * 12)?;

    let fyc_share = fyc_target.min(split.net_yield);
    let ffc_share = split.net_yield.saturating_sub(fyc_share);

    fyc.v_tranche = checked_add_u64(fyc.v_tranche, fyc_share)?;
    ffc.v_tranche = checked_add_u64(ffc.v_tranche, ffc_share)?;
    fyc.cumulative_yield = checked_add_u64(fyc.cumulative_yield, fyc_share)?;
    ffc.cumulative_yield = checked_add_u64(ffc.cumulative_yield, ffc_share)?;

    mint_fee_value_into_fyc(fyc, split.fee_value)?;

    Ok(InterestDistribution { fyc_share, ffc_share, fee_value: split.fee_value })
}

pub fn split_base_yield_token_yield(
    fyc: &mut TrancheState,
    ffc: &mut TrancheState,
    net_yield: u64,
    v_pool: u64,
) -> Result<(u64, u64), ProgramError> {
    if v_pool == 0 || net_yield == 0 { return Ok((0, 0)); }
    let fyc_share = mul_div_u64(net_yield, fyc.v_tranche, v_pool)?;
    let ffc_share = net_yield.saturating_sub(fyc_share);
    fyc.v_tranche = checked_add_u64(fyc.v_tranche, fyc_share)?;
    ffc.v_tranche = checked_add_u64(ffc.v_tranche, ffc_share)?;
    fyc.cumulative_yield = checked_add_u64(fyc.cumulative_yield, fyc_share)?;
    ffc.cumulative_yield = checked_add_u64(ffc.cumulative_yield, ffc_share)?;
    Ok((fyc_share, ffc_share))
}

pub struct DefaultAbsorption {
    pub ffc_absorbed: u64,
    pub fyc_absorbed: u64,
    pub insurance_burned_tokens: u64,
    pub fyc_price_before: u64,
    pub fyc_price_after: u64,
}

pub fn apply_default_waterfall(
    fyc: &mut TrancheState,
    ffc: &mut TrancheState,
    gross_loss: u64,
) -> Result<DefaultAbsorption, ProgramError> {
    let fyc_price_before = live_price(fyc)?;

    let ffc_absorbed = gross_loss.min(ffc.v_tranche);
    ffc.v_tranche = checked_sub_u64(ffc.v_tranche, ffc_absorbed)?;
    ffc.cumulative_losses = checked_add_u64(ffc.cumulative_losses, ffc_absorbed)?;

    let mut remaining = gross_loss.saturating_sub(ffc_absorbed);
    let mut burned_tokens: u64 = 0;

    if remaining > 0 {
        let fyc_absorbable = remaining.min(fyc.v_tranche);
        fyc.v_tranche = checked_sub_u64(fyc.v_tranche, fyc_absorbable)?;
        remaining = remaining.saturating_sub(fyc_absorbable);

        if fyc_price_before > 0 && fyc.total_supply > 0 {
            let target_supply = mul_div_u64(fyc.v_tranche, PRECISION, fyc_price_before)?;
            let needed = fyc.total_supply.saturating_sub(target_supply);

            if fyc.insurance_token_balance >= needed {
                fyc.insurance_token_balance = checked_sub_u64(fyc.insurance_token_balance, needed)?;
                fyc.total_supply = checked_sub_u64(fyc.total_supply, needed)?;
                burned_tokens = needed;
            } else {
                burned_tokens = fyc.insurance_token_balance;
                fyc.total_supply = checked_sub_u64(fyc.total_supply, burned_tokens)?;
                fyc.insurance_token_balance = 0;
            }
        }
    }

    let fyc_absorbed = gross_loss.saturating_sub(ffc_absorbed).saturating_sub(remaining);
    let fyc_price_after = live_price(fyc)?;

    Ok(DefaultAbsorption {
        ffc_absorbed,
        fyc_absorbed,
        insurance_burned_tokens: burned_tokens,
        fyc_price_before,
        fyc_price_after,
    })
}

pub fn refresh_conservative_prices(fyc: &mut TrancheState, ffc: &mut TrancheState) -> Result<(), ProgramError> {
    fyc.conservative_price = live_price(fyc)?;
    ffc.conservative_price = live_price(ffc)?;
    Ok(())
}

pub fn ensure_not_paused(pool: &PoolState) -> Result<(), ProgramError> {
    if pool.is_paused != 0 { return Err(FleetError::ProtocolPaused.into()); }
    Ok(())
}`,
  proposed: `//! Yield distribution + default waterfall + price refresh + pause check
//! (mirrors helpers/waterfall.rs).

use pinocchio::error::ProgramError;
use crate::constants::{BPS_DENOMINATOR, PRECISION, SECONDS_PER_PERIOD, SECONDS_PER_YEAR};
use crate::errors::FleetError;
use crate::helpers::curve::k_from_coverage_and_severity;
use crate::helpers::fees::{mint_fee_value_into_fyc, split_gross_yield};
use crate::helpers::math::{checked_add_u64, checked_sub_u64, mul_div_u64};
use crate::helpers::pricing::live_price;
use crate::state::{PoolState, TrancheState};

pub struct InterestDistribution { pub fyc_share: u64, pub ffc_share: u64, pub fee_value: u64 }

/// NEW — replaces the fyc_target/residual split AND the earlier pool-share
/// parity anchor. gross_interest here is always the LEVELIZED figure
/// (LoanAccount::levelized_interest), never true declining-balance interest.
///
/// coverage        = min(1, effective_ffc / outstanding_principal)
/// severity        = max(0, outstanding_principal - effective_ffc) / fyc.v_tranche
/// k               = k_from_coverage_and_severity(coverage, severity)   -- curve.rs
/// ffc_share_pct   = (k * ffc.v_tranche) / (fyc.v_tranche + k * ffc.v_tranche)
///
/// property: ffc_share/ffc.v_tranche == k * (fyc_share/fyc.v_tranche) exactly.
/// FFC's rate can only equal FYC's if k == 1, which needs severity == 0 AND
/// K_MIN == 1 — neither happens except the trivial zero-interest case.
pub fn distribute_loan_interest(
    pool: &PoolState,
    fyc: &mut TrancheState,
    ffc: &mut TrancheState,
    gross_interest: u64,
) -> Result<InterestDistribution, ProgramError> {
    let split = split_gross_yield(gross_interest)?;

    // DELIBERATELY raw ffc.v_tranche, not effective_ffc — discussed and
    // resolved after a first pass wrongly netted out pool.pending_ffc_redemptions
    // here (matching assert_origination_allowed). The gate and this split
    // answer different questions: the gate is forward-looking ("will this
    // capital still be here to protect a NEW loan over its whole life" —
    // capital that's scheduled to leave correctly shouldn't count). This
    // split is about THIS PERIOD's risk-bearing — FFC pending redemption is
    // still fully in the pool, still earning yield, and still first-loss
    // (a default before the redemption processes still marks down the
    // price the pending redeemer is paid at) right up until the moment
    // it's actually paid out. Netting it here would underpay capital that
    // was, in fact, fully at risk for the period it's being paid for.
    let coverage_bps = if pool.outstanding_principal == 0 {
        10_000
    } else {
        mul_div_u64(ffc.v_tranche, 10_000, pool.outstanding_principal)?.min(10_000)
    };
    let severity_bps = if fyc.v_tranche == 0 {
        if pool.outstanding_principal <= ffc.v_tranche { 0 } else { u64::MAX }
    } else {
        let shortfall = pool.outstanding_principal.saturating_sub(ffc.v_tranche);
        mul_div_u64(shortfall, 10_000, fyc.v_tranche)?
    };
    let k_bps = k_from_coverage_and_severity(coverage_bps, severity_bps)?;

    let k_ffc = mul_div_u64(ffc.v_tranche, k_bps, 10_000)?;
    let denom = checked_add_u64(fyc.v_tranche, k_ffc)?;
    let ffc_share = if denom == 0 { 0 } else { mul_div_u64(split.net_yield, k_ffc, denom)? };
    let fyc_share = split.net_yield.saturating_sub(ffc_share);

    // NEW (round 3) — FYC APY cap. 0 is the "uncapped" sentinel: skip
    // entirely rather than reading last_observed_base_apy_bps for no
    // reason. Throttles ONLY this loan-interest leg; the reserve/yield-
    // token split (split_base_yield_token_yield below) is never touched.
    let (fyc_share, ffc_share) = if pool.max_fyc_apy_bps == 0 {
        (fyc_share, ffc_share)
    } else {
        // Headroom is whatever's left of the ceiling after FYC's reserve
        // share (already annualized, unlike fyc_share/ffc_share above which
        // are still per-period dollar amounts) — floors at 0 rather than
        // going negative, matching capFycLoanShare's max(0, ...) in
        // lib/model.ts: if the reserve leg alone already exceeds the cap,
        // 100% of loan interest redirects to FFC, but the cap stays
        // breached overall regardless (this lever can't claw back reserve
        // yield, only loan interest).
        let headroom_bps = pool.max_fyc_apy_bps.saturating_sub(pool.last_observed_base_apy_bps);
        let annualized_ceiling = mul_div_u64(headroom_bps, fyc.v_tranche, BPS_DENOMINATOR)?;
        let loan_share_ceiling = mul_div_u64(annualized_ceiling, SECONDS_PER_PERIOD as u64, SECONDS_PER_YEAR as u64)?;

        if fyc_share <= loan_share_ceiling {
            (fyc_share, ffc_share)
        } else {
            let redirected_to_ffc = fyc_share - loan_share_ceiling;
            (loan_share_ceiling, checked_add_u64(ffc_share, redirected_to_ffc)?)
        }
    };

    fyc.v_tranche = checked_add_u64(fyc.v_tranche, fyc_share)?;
    ffc.v_tranche = checked_add_u64(ffc.v_tranche, ffc_share)?;
    fyc.cumulative_yield = checked_add_u64(fyc.cumulative_yield, fyc_share)?;
    ffc.cumulative_yield = checked_add_u64(ffc.cumulative_yield, ffc_share)?;

    mint_fee_value_into_fyc(fyc, split.fee_value)?;

    Ok(InterestDistribution { fyc_share, ffc_share, fee_value: split.fee_value })
}

/// Unchanged — reserve/USDY yield still splits flat pro-rata by tranche
/// size. This stream carries no loan-specific risk, so there's no coverage
/// curve here, just each tranche's share of the combined pool.
pub fn split_base_yield_token_yield(
    fyc: &mut TrancheState,
    ffc: &mut TrancheState,
    net_yield: u64,
    v_pool: u64,
) -> Result<(u64, u64), ProgramError> {
    if v_pool == 0 || net_yield == 0 { return Ok((0, 0)); }
    let fyc_share = mul_div_u64(net_yield, fyc.v_tranche, v_pool)?;
    let ffc_share = net_yield.saturating_sub(fyc_share);
    fyc.v_tranche = checked_add_u64(fyc.v_tranche, fyc_share)?;
    ffc.v_tranche = checked_add_u64(ffc.v_tranche, ffc_share)?;
    fyc.cumulative_yield = checked_add_u64(fyc.cumulative_yield, fyc_share)?;
    ffc.cumulative_yield = checked_add_u64(ffc.cumulative_yield, ffc_share)?;
    Ok((fyc_share, ffc_share))
}

pub struct DefaultAbsorption {
    pub ffc_absorbed: u64,
    pub insurance_absorbed: u64,
    pub fyc_absorbed: u64,
    pub insurance_burned_tokens: u64,
    pub fyc_price_before: u64,
    pub fyc_price_after: u64,
}

/// CHANGED — order and meaning both shift. FFC absorbs first, up to its
/// full value, same as before. The remainder is now covered by BURNING FYC
/// tokens held in the insurance wallet — a real loss absorption (v_tranche
/// AND total_supply both drop by the burned amount, extracting actual
/// value), not the old version's post-hoc price-smoothing trick (which
/// reduced fyc.v_tranche for EVERYONE first, then burned insurance tokens
/// only to make the resulting price look better). Only once the insurance
/// fund's own FYC holdings are exhausted does the loss reach general FYC
/// holders — v_tranche drops, total_supply doesn't, so that's a real price
/// hit for whoever's left holding FYC.
pub fn apply_default_waterfall(
    fyc: &mut TrancheState,
    ffc: &mut TrancheState,
    gross_loss: u64,
) -> Result<DefaultAbsorption, ProgramError> {
    let fyc_price_before = live_price(fyc)?;

    let ffc_absorbed = gross_loss.min(ffc.v_tranche);
    ffc.v_tranche = checked_sub_u64(ffc.v_tranche, ffc_absorbed)?;
    ffc.cumulative_losses = checked_add_u64(ffc.cumulative_losses, ffc_absorbed)?;

    let mut remaining = gross_loss.saturating_sub(ffc_absorbed);

    // NEW — insurance fund's own FYC burns to cover the next slice, before
    // general holders are touched at all.
    let mut insurance_absorbed = 0u64;
    let mut burned_tokens = 0u64;
    if remaining > 0 && fyc_price_before > 0 {
        let insurance_value = mul_div_u64(fyc.insurance_token_balance, fyc_price_before, PRECISION)?;
        insurance_absorbed = remaining.min(insurance_value);
        if insurance_absorbed > 0 {
            burned_tokens = mul_div_u64(insurance_absorbed, PRECISION, fyc_price_before)?
                .min(fyc.insurance_token_balance);
            fyc.v_tranche = checked_sub_u64(fyc.v_tranche, insurance_absorbed)?;
            fyc.total_supply = checked_sub_u64(fyc.total_supply, burned_tokens)?;
            fyc.insurance_token_balance = checked_sub_u64(fyc.insurance_token_balance, burned_tokens)?;
            remaining = remaining.saturating_sub(insurance_absorbed);
        }
    }

    let fyc_absorbed = remaining.min(fyc.v_tranche);
    fyc.v_tranche = checked_sub_u64(fyc.v_tranche, fyc_absorbed)?;

    let fyc_price_after = live_price(fyc)?;

    Ok(DefaultAbsorption {
        ffc_absorbed,
        insurance_absorbed,
        fyc_absorbed,
        insurance_burned_tokens: burned_tokens,
        fyc_price_before,
        fyc_price_after,
    })
}

pub fn refresh_conservative_prices(fyc: &mut TrancheState, ffc: &mut TrancheState) -> Result<(), ProgramError> {
    fyc.conservative_price = live_price(fyc)?;
    ffc.conservative_price = live_price(ffc)?;
    Ok(())
}

pub fn ensure_not_paused(pool: &PoolState) -> Result<(), ProgramError> {
    if pool.is_paused != 0 { return Err(FleetError::ProtocolPaused.into()); }
    Ok(())
}`
},
{
  path: "pinochio/src/helpers/jupiter.rs",
  status: "M",
  category: "pinocchio",
  why: "invoke_jupiter_swap hardcodes JUPITER_V6_PROGRAM_ID twice — once as the allow-check, once again as the literal CPI target — so Jupiter is the only program this file can ever call. Renamed invoke_aggregator_swap checks the caller-supplied program against the new ALLOWED_SWAP_PROGRAMS list (constants.rs) and invokes THAT account, not a hardcoded constant. That's what makes Titan (titan-exchange.gitbook.io) — or any future aggregator — an allow-list entry away instead of a rewrite of this file. Titan publishes an off-chain quote/routing API (no fixed on-chain program ID in their public docs), so ALLOWED_SWAP_PROGRAMS carries an explicitly-flagged placeholder until real integration access lands — see constants.rs.",
  original: `//! Jupiter V6 raw CPI builder. Stack-allocated metas (no heap).

use core::mem::MaybeUninit;
use pinocchio::{
    account::AccountView,
    cpi::{self, Signer},
    error::ProgramError,
    instruction::{InstructionAccount, InstructionView},
    Address,
};

use crate::constants::JUPITER_V6_PROGRAM_ID;
use crate::errors::FleetError;

pub const MAX_ROUTE_ACCOUNTS: usize = 48;

pub fn invoke_jupiter_swap(
    jupiter_program: &AccountView,
    accounts: &[AccountView],
    data: &[u8],
    signer_addresses: &[&Address],
    signer_seeds: &[Signer],
) -> Result<(), ProgramError> {
    if jupiter_program.address() != &JUPITER_V6_PROGRAM_ID {
        return Err(FleetError::Unauthorized.into());
    }
    if accounts.len() > MAX_ROUTE_ACCOUNTS {
        return Err(FleetError::InvalidAccountData.into());
    }

    let mut metas: [MaybeUninit<InstructionAccount>; MAX_ROUTE_ACCOUNTS] =
        unsafe { MaybeUninit::uninit().assume_init() };
    for (i, a) in accounts.iter().enumerate() {
        let mut is_signer = a.is_signer();
        if !is_signer {
            for s in signer_addresses {
                if a.address() == *s { is_signer = true; break; }
            }
        }
        metas[i].write(InstructionAccount::new(a.address(), a.is_writable(), is_signer));
    }
    // SAFETY: first \`accounts.len()\` entries initialized.
    let metas_slice: &[InstructionAccount] = unsafe {
        core::slice::from_raw_parts(metas.as_ptr() as *const InstructionAccount, accounts.len())
    };

    let ix = InstructionView {
        program_id: &JUPITER_V6_PROGRAM_ID,
        data,
        accounts: metas_slice,
    };

    cpi::invoke_signed_with_bounds::<MAX_ROUTE_ACCOUNTS, AccountView>(&ix, accounts, signer_seeds)
}
`,
  proposed: `//! Aggregator-agnostic swap CPI builder (Jupiter V6, Titan, ...). Stack-allocated
//! metas (no heap). The program invoked is whichever account the caller passes,
//! checked against ALLOWED_SWAP_PROGRAMS — not a single hardcoded ID.

use core::mem::MaybeUninit;
use pinocchio::{
    account::AccountView,
    cpi::{self, Signer},
    error::ProgramError,
    instruction::{InstructionAccount, InstructionView},
    Address,
};

use crate::constants::ALLOWED_SWAP_PROGRAMS;
use crate::errors::FleetError;

pub const MAX_ROUTE_ACCOUNTS: usize = 48;

// NEW — was invoke_jupiter_swap, hardcoded to a single JUPITER_V6_PROGRAM_ID
// check. is_allowed_swap_program checks against the new ALLOWED_SWAP_PROGRAMS
// list (constants.rs) instead, and the renamed invoke_aggregator_swap below
// takes swap_program as a caller-supplied account rather than a fixed name —
// together these two are the entire generalization from Jupiter-only to any
// allow-listed aggregator.
fn is_allowed_swap_program(program: &Address) -> bool {
    ALLOWED_SWAP_PROGRAMS.iter().any(|p| p == program)
}

pub fn invoke_aggregator_swap(
    swap_program: &AccountView,
    accounts: &[AccountView],
    data: &[u8],
    signer_addresses: &[&Address],
    signer_seeds: &[Signer],
) -> Result<(), ProgramError> {
    if !is_allowed_swap_program(swap_program.address()) {
        return Err(FleetError::Unauthorized.into());
    }
    if accounts.len() > MAX_ROUTE_ACCOUNTS {
        return Err(FleetError::InvalidAccountData.into());
    }

    let mut metas: [MaybeUninit<InstructionAccount>; MAX_ROUTE_ACCOUNTS] =
        unsafe { MaybeUninit::uninit().assume_init() };
    for (i, a) in accounts.iter().enumerate() {
        let mut is_signer = a.is_signer();
        if !is_signer {
            for s in signer_addresses {
                if a.address() == *s { is_signer = true; break; }
            }
        }
        metas[i].write(InstructionAccount::new(a.address(), a.is_writable(), is_signer));
    }
    // SAFETY: first \`accounts.len()\` entries initialized.
    let metas_slice: &[InstructionAccount] = unsafe {
        core::slice::from_raw_parts(metas.as_ptr() as *const InstructionAccount, accounts.len())
    };

    // CHANGED — program_id now comes from the caller-supplied, allow-list-checked
    // account, not a hardcoded Jupiter constant. This is what makes a second
    // aggregator (Titan, or any future one) an ALLOWED_SWAP_PROGRAMS entry away,
    // not a rewrite of this file.
    let ix = InstructionView {
        program_id: swap_program.address(),
        data,
        accounts: metas_slice,
    };

    cpi::invoke_signed_with_bounds::<MAX_ROUTE_ACCOUNTS, AccountView>(&ix, accounts, signer_seeds)
}
`
},
{
  path: "pinochio/src/helpers/swap.rs",
  status: "M",
  category: "pinocchio",
  why: "Renamed to match jupiter.rs's invoke_aggregator_swap — swap_jupiter_with_snapshots/execute_jupiter_swap/execute_jupiter_swap_to_deposit become swap_via_aggregator_with_snapshots/execute_aggregator_swap/execute_aggregator_swap_to_deposit, and every jupiter_program/base_yield_token_* name drops the aggregator- and token-specific naming (swap_program, yield_token_*) since deposit.rs, originate_loan.rs and repay_loan.rs now call through this file for either Jupiter or Titan, against whichever yield-bearing reserve token the pool is routing through.",
  original: `//! Generic Jupiter V6 swap with pre/post snapshots on source + dest vaults.

use pinocchio::{account::AccountView, error::ProgramError, cpi::Signer, Address};

use crate::constants::PRECISION;
use crate::errors::FleetError;
use crate::helpers::jupiter::invoke_jupiter_swap;
use crate::helpers::math::mul_div_u64;
use crate::helpers::token_account::token_account_amount;

pub fn swap_jupiter_with_snapshots(
    jupiter_program: &AccountView,
    source_vault: &AccountView,
    dest_vault: &AccountView,
    route_accounts: &[AccountView],
    route_data: &[u8],
    signer_addresses: &[&Address],
    signer_seeds: &[Signer],
) -> Result<(u64, u64), ProgramError> {
    let pre_source = token_account_amount(source_vault)?;
    let pre_dest = token_account_amount(dest_vault)?;

    invoke_jupiter_swap(jupiter_program, route_accounts, route_data, signer_addresses, signer_seeds)?;

    let post_source = token_account_amount(source_vault)?;
    let post_dest = token_account_amount(dest_vault)?;
    let source_spent = pre_source.saturating_sub(post_source);
    let dest_received = post_dest.saturating_sub(pre_dest);

    if source_spent == 0 || dest_received == 0 {
        return Err(FleetError::SwapOutputBelowMinimum.into());
    }
    Ok((source_spent, dest_received))
}

/// USDC → USYC. Returns base-yield tokens received.
#[allow(clippy::too_many_arguments)]
pub fn execute_jupiter_swap(
    jupiter_program: &AccountView,
    deposit_token_vault: &AccountView,
    base_yield_token_vault: &AccountView,
    base_yield_token_price: u64,
    min_base_yield_token_usd: u64,
    route_accounts: &[AccountView],
    route_data: &[u8],
    signer_addresses: &[&Address],
    signer_seeds: &[Signer],
) -> Result<u64, ProgramError> {
    if base_yield_token_price == 0 { return Err(FleetError::StaleOraclePrice.into()); }

    let (_spent, received) = swap_jupiter_with_snapshots(
        jupiter_program,
        deposit_token_vault,
        base_yield_token_vault,
        route_accounts,
        route_data,
        signer_addresses,
        signer_seeds,
    )?;

    let actual_usd = mul_div_u64(received, base_yield_token_price, PRECISION)?;
    if actual_usd < min_base_yield_token_usd {
        return Err(FleetError::SwapOutputBelowMinimum.into());
    }
    Ok(received)
}

/// USYC → USDC. Returns (usyc_spent, usdc_received).
#[allow(clippy::too_many_arguments)]
pub fn execute_jupiter_swap_to_deposit(
    jupiter_program: &AccountView,
    base_yield_token_vault: &AccountView,
    deposit_token_vault: &AccountView,
    min_deposit_token_amount: u64,
    route_accounts: &[AccountView],
    route_data: &[u8],
    signer_addresses: &[&Address],
    signer_seeds: &[Signer],
) -> Result<(u64, u64), ProgramError> {
    let (spent, received) = swap_jupiter_with_snapshots(
        jupiter_program,
        base_yield_token_vault,
        deposit_token_vault,
        route_accounts,
        route_data,
        signer_addresses,
        signer_seeds,
    )?;
    if received < min_deposit_token_amount {
        return Err(FleetError::SwapOutputBelowMinimum.into());
    }
    Ok((spent, received))
}
`,
  proposed: `//! Generic aggregator swap (Jupiter, Titan, ...) with pre/post snapshots on
//! source + dest vaults. Works with any allow-listed program — see
//! helpers/jupiter.rs's invoke_aggregator_swap.

use pinocchio::{account::AccountView, error::ProgramError, cpi::Signer, Address};

use crate::constants::PRECISION;
use crate::errors::FleetError;
use crate::helpers::jupiter::invoke_aggregator_swap;
use crate::helpers::math::mul_div_u64;
use crate::helpers::token_account::token_account_amount;

// CHANGED — was swap_jupiter_with_snapshots, hardcoded to Jupiter by name
// only (the actual CPI is already generic via invoke_aggregator_swap below).
// Renamed to match: this snapshots before/after balances around whichever
// allow-listed aggregator swap_program names, Jupiter or Titan alike.
pub fn swap_via_aggregator_with_snapshots(
    swap_program: &AccountView,
    source_vault: &AccountView,
    dest_vault: &AccountView,
    route_accounts: &[AccountView],
    route_data: &[u8],
    signer_addresses: &[&Address],
    signer_seeds: &[Signer],
) -> Result<(u64, u64), ProgramError> {
    let pre_source = token_account_amount(source_vault)?;
    let pre_dest = token_account_amount(dest_vault)?;

    invoke_aggregator_swap(swap_program, route_accounts, route_data, signer_addresses, signer_seeds)?;

    let post_source = token_account_amount(source_vault)?;
    let post_dest = token_account_amount(dest_vault)?;
    let source_spent = pre_source.saturating_sub(post_source);
    let dest_received = post_dest.saturating_sub(pre_dest);

    if source_spent == 0 || dest_received == 0 {
        return Err(FleetError::SwapOutputBelowMinimum.into());
    }
    Ok((source_spent, dest_received))
}

/// USDC → yield-bearing token (USDY, syrupUSDC, ...). Returns tokens received.
#[allow(clippy::too_many_arguments)]
pub fn execute_aggregator_swap(
    swap_program: &AccountView,
    deposit_token_vault: &AccountView,
    yield_token_vault: &AccountView,
    yield_token_price: u64,
    min_yield_token_usd: u64,
    route_accounts: &[AccountView],
    route_data: &[u8],
    signer_addresses: &[&Address],
    signer_seeds: &[Signer],
) -> Result<u64, ProgramError> {
    if yield_token_price == 0 { return Err(FleetError::StaleOraclePrice.into()); }

    let (_spent, received) = swap_via_aggregator_with_snapshots(
        swap_program,
        deposit_token_vault,
        yield_token_vault,
        route_accounts,
        route_data,
        signer_addresses,
        signer_seeds,
    )?;

    let actual_usd = mul_div_u64(received, yield_token_price, PRECISION)?;
    if actual_usd < min_yield_token_usd {
        return Err(FleetError::SwapOutputBelowMinimum.into());
    }
    Ok(received)
}

/// yield-bearing token → USDC. Returns (yield_token_spent, usdc_received).
#[allow(clippy::too_many_arguments)]
pub fn execute_aggregator_swap_to_deposit(
    swap_program: &AccountView,
    yield_token_vault: &AccountView,
    deposit_token_vault: &AccountView,
    min_deposit_token_amount: u64,
    route_accounts: &[AccountView],
    route_data: &[u8],
    signer_addresses: &[&Address],
    signer_seeds: &[Signer],
) -> Result<(u64, u64), ProgramError> {
    let (spent, received) = swap_via_aggregator_with_snapshots(
        swap_program,
        yield_token_vault,
        deposit_token_vault,
        route_accounts,
        route_data,
        signer_addresses,
        signer_seeds,
    )?;
    if received < min_deposit_token_amount {
        return Err(FleetError::SwapOutputBelowMinimum.into());
    }
    Ok((spent, received))
}
`
},
{
  path: "pinochio/src/helpers/pricing.rs",
  status: "M",
  category: "pinocchio",
  why: "NEW this round (round 6, multi-source pricing + loss identity) — this file didn't exist anywhere in the handoff before now; every reference to compute_v_pool in allocation.rs / deposit.rs / etc. was a call site with no defined body in files-data.ts, flagged explicitly by an external review as a discipline gap (\"don't invent a proposed pricing.rs without pasting the real one as original first\"). The original below is pasted verbatim from the real, currently-deployed pinochio/src/helpers/pricing.rs. Two fixes, decided together since they're the same function: (1) MULTI-SOURCE — compute_v_pool/_true summed only pool.c_tokens (the primary reserve) at the deployed price; every registered YieldSourceState's real capital was invisible to TVL, so the pro-rata split denominator (and the allocation ceiling, and anything else that reads v_pool) understated the pool by however much sat in non-primary sources. Now sums primary + every source in the caller-supplied slice (capped at MAX_HARMONIZED_SOURCES, already defined in constants.rs for the yield-source registry itself). (2) LOSS IDENTITY — the deployed version computes `c_tokens×price + outstanding_principal − realized_losses`, but approve_default.rs already shrinks outstanding_principal by the SAME defaulted balance it adds to realized_losses — a full write-off was being subtracted from V_pool twice, permanently understating every tranche price after any default. Decided fix: drop the `− realized_losses` term from the pricing formula entirely; the field itself is UNCHANGED and keeps being written by approve_default.rs / resell_defaulted_loan.rs / relist_defaulted_loan.rs — it's just no longer read by pricing, kept as an analytics-only running total of lifetime realized losses. See /optimistic-price for the worked comparison and the documented (not implemented) reserve-accrual-checkpoint alternative to the account-list approach used here.",
  original: `//! Tranche pricing math.

use pinocchio::error::ProgramError;
use crate::constants::{BPS_DENOMINATOR, FEE_LIABILITY_BPS, PRECISION};
use crate::errors::FleetError;
use crate::helpers::math::{checked_add_u64, checked_sub_u64, mul_div_u64};
use crate::state::{PoolState, TrancheState};

pub fn compute_v_pool(pool: &PoolState, base_yield_token_price: u64) -> Result<u64, ProgramError> {
    let cash_value = mul_div_u64(pool.c_tokens, base_yield_token_price, PRECISION)?;
    let with_loans = checked_add_u64(cash_value, pool.outstanding_principal)?;
    Ok(with_loans.saturating_sub(pool.realized_losses))
}

pub fn compute_v_pool_true(pool: &PoolState, base_yield_token_price: u64) -> Result<u64, ProgramError> {
    let cash_value = mul_div_u64(pool.c_tokens, base_yield_token_price, PRECISION)?;
    let gross_gain = mul_div_u64(
        pool.c_tokens,
        base_yield_token_price.saturating_sub(pool.last_base_yield_token_price),
        PRECISION,
    )?;
    let fee_liability = mul_div_u64(gross_gain, FEE_LIABILITY_BPS, BPS_DENOMINATOR)?;
    let net_cash = checked_sub_u64(cash_value, fee_liability)?;
    let with_loans = checked_add_u64(net_cash, pool.outstanding_principal)?;
    Ok(with_loans.saturating_sub(pool.realized_losses))
}

pub fn live_price(tranche: &TrancheState) -> Result<u64, ProgramError> {
    if tranche.total_supply == 0 { return Ok(PRECISION); }
    mul_div_u64(tranche.v_tranche, PRECISION, tranche.total_supply)
}

pub fn tokens_for_usd(_tranche: &TrancheState, usd_value: u64, price: u64) -> Result<u64, ProgramError> {
    if price == 0 { return Err(FleetError::Overflow.into()); }
    mul_div_u64(usd_value, PRECISION, price)
}

pub fn usd_for_tokens(tokens: u64, price: u64) -> Result<u64, ProgramError> {
    mul_div_u64(tokens, price, PRECISION)
}
`,
  proposed: `//! Tranche pricing math.
//! ROUND 6 (multi-source pricing + loss identity) — see this file's own why
//! for both fixes. New helper params (sources / source_prices) are additive:
//! every existing caller with an empty slice reproduces the OLD primary-only
//! number for the reserve-sum term, but no caller is ever left on the old
//! double-counted loss formula, since that term is simply gone.

use pinocchio::error::ProgramError;
use crate::constants::{BPS_DENOMINATOR, FEE_LIABILITY_BPS, MAX_HARMONIZED_SOURCES, PRECISION};
use crate::errors::FleetError;
use crate::helpers::math::{checked_add_u64, checked_sub_u64, mul_div_u64};
use crate::state::{PoolState, TrancheState, YieldSourceState};

/// Sums cash value across the primary reserve AND every OTHER registered
/// source — \`sources\`/\`source_prices\` are parallel slices (same length,
/// same order), one entry per non-primary YieldSourceState with capital.
/// Capped by the caller at MAX_HARMONIZED_SOURCES (already the ceiling the
/// yield-source registry itself enforces at initialize_yield_source.rs, so
/// this never has to reject on length — there physically cannot be more).
///
/// FIXED (round 6): no longer subtracts realized_losses. approve_default.rs
/// / resell_defaulted_loan.rs / relist_defaulted_loan.rs already remove a
/// defaulted loan's balance from outstanding_principal — subtracting the
/// same loss again here double-counted every default, permanently
/// understating V_pool. realized_losses is UNCHANGED as a stored field
/// (still written by all three of those instructions) — just no longer
/// read here. Treat it as a lifetime-losses analytics counter, not a
/// pricing input.
pub fn compute_v_pool(
    pool: &PoolState,
    base_yield_token_price: u64,
    sources: &[YieldSourceState],
    source_prices: &[u64],
) -> Result<u64, ProgramError> {
    if sources.len() != source_prices.len() || sources.len() > MAX_HARMONIZED_SOURCES {
        return Err(FleetError::InvalidAccountData.into());
    }
    let mut cash_value = mul_div_u64(pool.c_tokens, base_yield_token_price, PRECISION)?;
    for (s, &price) in sources.iter().zip(source_prices.iter()) {
        if s.c_tokens == 0 { continue; }
        cash_value = checked_add_u64(cash_value, mul_div_u64(s.c_tokens, price, PRECISION)?)?;
    }
    checked_add_u64(cash_value, pool.outstanding_principal)
}

/// Same two fixes as compute_v_pool above: sums fee liability on EVERY
/// source's own unrealized gain (not just primary's), and no longer
/// subtracts realized_losses.
pub fn compute_v_pool_true(
    pool: &PoolState,
    base_yield_token_price: u64,
    sources: &[YieldSourceState],
    source_prices: &[u64],
) -> Result<u64, ProgramError> {
    if sources.len() != source_prices.len() || sources.len() > MAX_HARMONIZED_SOURCES {
        return Err(FleetError::InvalidAccountData.into());
    }
    let cash_value = mul_div_u64(pool.c_tokens, base_yield_token_price, PRECISION)?;
    let mut gross_gain = mul_div_u64(
        pool.c_tokens,
        base_yield_token_price.saturating_sub(pool.last_base_yield_token_price),
        PRECISION,
    )?;
    let mut sources_cash_value: u64 = 0;
    for (s, &price) in sources.iter().zip(source_prices.iter()) {
        if s.c_tokens == 0 { continue; }
        sources_cash_value = checked_add_u64(sources_cash_value, mul_div_u64(s.c_tokens, price, PRECISION)?)?;
        gross_gain = checked_add_u64(
            gross_gain,
            mul_div_u64(s.c_tokens, price.saturating_sub(s.last_price), PRECISION)?,
        )?;
    }
    let fee_liability = mul_div_u64(gross_gain, FEE_LIABILITY_BPS, BPS_DENOMINATOR)?;
    let total_cash = checked_add_u64(cash_value, sources_cash_value)?;
    let net_cash = checked_sub_u64(total_cash, fee_liability)?;
    checked_add_u64(net_cash, pool.outstanding_principal)
}

pub fn live_price(tranche: &TrancheState) -> Result<u64, ProgramError> {
    if tranche.total_supply == 0 { return Ok(PRECISION); }
    mul_div_u64(tranche.v_tranche, PRECISION, tranche.total_supply)
}

pub fn tokens_for_usd(_tranche: &TrancheState, usd_value: u64, price: u64) -> Result<u64, ProgramError> {
    if price == 0 { return Err(FleetError::Overflow.into()); }
    mul_div_u64(usd_value, PRECISION, price)
}

pub fn usd_for_tokens(tokens: u64, price: u64) -> Result<u64, ProgramError> {
    mul_div_u64(tokens, price, PRECISION)
}
`
},
{
  path: "pinochio/src/helpers/reserve_checkpoint_sketch.rs",
  status: "U",
  category: "pinocchio",
  why: "Decision 2 was 'pass all accounts' (see helpers/allocation.rs::load_other_sources) — this file is the alternative that decision passed over, written up on request so it's on record for later, NOT wired into the program. It is deliberately absent from helpers/mod.rs — no instruction calls into it, it compiles to nothing reachable, and it should be read as a design memo with real signatures attached, not as shipped code. Trade-off it makes explicit: 'pass all accounts' costs every deposit/epoch-tick instruction 2 extra accounts per additional registered source (real, bounded by MAX_HARMONIZED_SOURCES=8, so worst case +16 accounts — within Solana's per-transaction account limit but not free), and costs one extra account-owner-checked oracle read per source per call. The checkpoint alternative below trades that recurring per-call cost for a recurring PER-MUTATION-SITE discipline cost instead: every place that changes ANY source's capital or price must remember to nudge a pool-wide running total, mirroring the loan_accrual_rate/checkpoint/updated_ts pattern already shipped for loan interest (state.rs, originate_loan.rs, repay_loan.rs, instructions/finalize_default.rs). That's a real ongoing maintenance burden — a future PR that adds a 9th source type or a new capital-moving instruction and forgets to touch the checkpoint silently reintroduces exactly the under-count bug Decision 1/2 just fixed, with no compiler error to catch the omission. 'Pass all accounts' has no equivalent silent-failure mode: an omitted source account just means that source's capital is visibly, obviously absent from the specific call that omitted it, not permanently wrong pool-wide state. That asymmetry — loud-and-local failure vs silent-and-global drift — is why 'pass all accounts' was chosen as the real fix and this stays a sketch.",
  original: "",
  proposed: `//! SKETCH ONLY — NOT WIRED IN. See this file's own \`why\` for the decision
//! that passed this over in favor of helpers/allocation.rs::load_other_sources.
//! Kept here as a fully-typed reference for later, not as shipped code: no
//! instruction calls anything below, and it is deliberately NOT registered in
//! helpers/mod.rs.
//!
//! THE IDEA: instead of every deposit/epoch-tick instruction re-reading and
//! re-summing every registered YieldSourceState's price on every call ("pass
//! all accounts"), PoolState keeps a running, continuously-valid total value
//! across ALL sources — reserve_value_checkpoint — refreshed incrementally at
//! whichever single source actually changed, the same shape as the
//! loan_accrual_rate/checkpoint/updated_ts accumulator already shipped for
//! loan interest (state.rs). Reading v_pool then becomes O(1): no other-source
//! accounts, no extra oracle reads, regardless of how many sources exist.
//!
//! THE COST: every mutation site must remember to call reserve_checkpoint_bump
//! for the ONE source it touched, immediately before or after that source's
//! own c_tokens/last_price changes. Miss one call site — a new instruction, a
//! future 9th source type, a refactor that moves a field write — and
//! reserve_value_checkpoint silently drifts from the truth, with no compiler
//! error and no obviously-wrong single call to point at (see why).

use pinocchio::error::ProgramError;
use crate::helpers::math::{checked_add_u64, checked_sub_u64, mul_div_u64};
use crate::state::PoolState;

pub const PRECISION: u64 = 1_000_000;

// NEW (sketch) — would live on PoolState alongside loan_accrual_rate/
// loan_accrual_checkpoint/loan_accrual_updated_ts (state.rs), same
// breaking-growth/realloc-migration story as those three fields.
//
//   pub reserve_value_checkpoint: u64,  // last-known-good sum of every
//                                       // source's (c_tokens * price), primary
//                                       // reserve included, updated_ts-stamped
//   pub reserve_value_updated_ts: i64,  // when the checkpoint was last bumped
//
// Unlike loan_accrual_rate (a continuous per-second RATE, because loan
// interest accrues between checkpoints even with no on-chain call), reserve
// value only changes at a discrete event — a deposit, a withdrawal, or an
// epoch tick's fresh oracle price — so there is no "elapsed time since last
// bump" term to project forward. reserve_value_checkpoint IS v_pool's cash
// term at all times between bumps, not an estimate of it.

/// Called once, at the single source whose c_tokens or price just changed —
/// origination/deposit/epoch-tick call sites, one call each, immediately
/// around their own state mutation. delta_value is SIGNED: positive for a
/// deposit or a price increase's unrealized gain, negative for a withdrawal.
/// This is the one function every future capital-moving instruction MUST
/// remember to call — the discipline cost flagged in this file's why.
pub fn reserve_checkpoint_bump(pool: &mut PoolState, delta_value: i64, now_ts: i64) -> Result<(), ProgramError> {
    pool.reserve_value_checkpoint = if delta_value >= 0 {
        checked_add_u64(pool.reserve_value_checkpoint, delta_value as u64)?
    } else {
        pool.reserve_value_checkpoint.saturating_sub((-delta_value) as u64)
    };
    pool.reserve_value_updated_ts = now_ts;
    Ok(())
}

/// Reads the running total directly — O(1), no other-source accounts, no
/// extra oracle reads. This is the entire payoff: every v_pool call site in
/// helpers/allocation.rs / helpers/pricing.rs would collapse to this single
/// field read instead of a loop over a caller-supplied slice.
pub fn compute_v_pool_from_checkpoint(pool: &PoolState) -> Result<u64, ProgramError> {
    checked_add_u64(pool.reserve_value_checkpoint, pool.outstanding_principal)
    // NO realized_losses subtraction — same Decision 1 fix as pricing.rs,
    // orthogonal to which of the two designs (this one or "pass all
    // accounts") ends up reading the number.
}

/// Example call site — what originate_loan.rs / repay_loan.rs / deposit.rs
/// would each gain a single extra line for, right next to their own existing
/// c_tokens/price mutation. Included so the shape of the "discipline cost" in
/// this file's why is concrete, not hand-wavy.
pub fn example_deposit_bump(pool: &mut PoolState, deposited_tokens: u64, price: u64, now_ts: i64) -> Result<(), ProgramError> {
    let deposit_value = mul_div_u64(deposited_tokens, price, PRECISION)? as i64;
    reserve_checkpoint_bump(pool, deposit_value, now_ts)
}
`
},
{
  path: "pinochio/src/helpers/allocation.rs",
  status: "M",
  category: "pinocchio",
  why: "observed_source_apy_bps generalizes observed_base_yield_token_apy_bps to any registered YieldSourceState; new harmonized_reserve_apy_bps value-weights every source's APY into one blended figure. compute_optimistic_price is substantially rewritten, not re-parameterized — auditing it against the design intent (mint assuming not-yet-collected yield already accrued, from BOTH loan interest and yield-token appreciation) found the real contract got both wrong: loan side used a cap-based days-elapsed/30 proxy unrelated to any real loan's schedule; yield-token side wasn't reflected in optimistic pricing AT ALL, so minting right after a price move but before the next epoch tick priced new tokens off stale value, at existing holders' expense. Fixed: loan side now reads a real reward-per-second accrual off PoolState's three new fields (state.rs), split through the same severity curve real collection uses; yield-token side computes the live unrealized delta on source_c_tokens, split the same flat pro-rata way split_base_yield_token_yield does. Both read distribute_loan_interest's InterestDistribution.fyc_share/ffc_share directly rather than diffing v_tranche, so mint_fee_value_into_fyc's price-neutral fee mint is never double-counted. Also drops deposit_value — a per-token price shouldn't depend on any one depositor's amount. ROUND 6 (was flagged here as a tracked follow-up, now actually fixed): compute_v_pool (pricing.rs) used to only sum the primary reserve, so this function's own split denominator under-counted every non-primary source's real capital. build_snapshot and compute_optimistic_price both now take an explicit other_sources/other_source_prices slice and forward it straight to the fixed compute_v_pool/compute_v_pool_true — this is 'pass all accounts' (decided over the alternative running-total-checkpoint design; see helpers/reserve_checkpoint_sketch.rs for that alternative, written up but NOT wired in). New load_other_sources reads a trailing (yield_source, oracle) pair per additional registered source directly off the accounts already passed into deposit.rs / deposit_yield_token.rs / run_yield_epoch.rs — every non-primary source's real, live capital is now visible to every v_pool read, not just the one instruction that happens to be depositing into it. ROUND 7: round 6 only fixed the TVL denominator — compute_optimistic_price's yield_estimate NUMERATOR (part 1) stayed scoped to whichever single source the deposit actually targeted, still under-crediting depositors for other sources' real unrealized gains. Caught in an end-to-end review (END_TO_END_PROTOCOL_SIMULATION.md), tagged BREAKS/P0 for multi-source honesty — fixed by summing every source's own delta (primary read straight off PoolState, every other off other_sources/other_source_prices) into one total before splitting, and the now-redundant source_c_tokens/source_last_price/source_price_now params are dropped from the signature. ROUND 8: even with the round-6/7 math fixed, a caller was still free to pass an INCOMPLETE other_sources tail and get a validly-priced-but-partial mint/tick — the P1 an independent findings-verification pass flagged as the top remaining risk. New require_complete_source_list hard-rejects (IncompleteYieldSourceList) any call whose final other_source_count doesn't exactly match pool.yield_source_count, called by deposit.rs / deposit_yield_token.rs / run_yield_epoch.rs right after each assembles its final count.",
  original: `//! Allocation snapshot + optimistic deposit price.

use pinocchio::error::ProgramError;
use crate::constants::{BPS_DENOMINATOR, LOAN_ALLOCATION_BPS, PRECISION};
use crate::errors::FleetError;
use crate::helpers::math::{checked_add_u64, mul_div_u64};
use crate::helpers::pricing::compute_v_pool;
use crate::state::{PoolState, TrancheState};

pub struct AllocationSnapshot {
    pub v_pool: u64,
    pub elb: u64,
    pub base_cap_bps: u64,
    pub effective_cap_bps: u64,
    pub deploy_ratio: u64,
    pub fyc_monthly_loan_target: u64,
}

pub fn observed_base_yield_token_apy_bps(pool: &PoolState, base_yield_token_price: u64, now_ts: i64) -> u64 {
    if pool.last_base_yield_token_price == 0
        || pool.last_epoch_ts == 0
        || base_yield_token_price <= pool.last_base_yield_token_price
    {
        return 0;
    }
    let elapsed = (now_ts - pool.last_epoch_ts).max(1) as u128;
    let delta_bps = ((base_yield_token_price - pool.last_base_yield_token_price) as u128)
        * BPS_DENOMINATOR as u128
        / pool.last_base_yield_token_price as u128;
    let seconds_per_year: u128 = 365 * 86_400;
    let annualised = delta_bps * seconds_per_year / elapsed;
    u64::try_from(annualised).unwrap_or(u64::MAX)
}

pub fn build_snapshot(
    pool: &PoolState,
    fyc: &TrancheState,
    base_yield_token_price: u64,
    now_ts: i64,
) -> Result<AllocationSnapshot, ProgramError> {
    let v_pool = compute_v_pool(pool, base_yield_token_price)?;
    let elb = v_pool.saturating_sub(pool.outstanding_principal);

    let apy_bps = observed_base_yield_token_apy_bps(pool, base_yield_token_price, now_ts);
    let base_cap_bps = if v_pool == 0 { 0 } else { mul_div_u64(elb, apy_bps, v_pool)? };

    let loan_alloc = mul_div_u64(v_pool, LOAN_ALLOCATION_BPS, BPS_DENOMINATOR)?;
    let deploy_ratio = if loan_alloc == 0 { 0 }
        else { mul_div_u64(pool.outstanding_principal, PRECISION, loan_alloc)?.min(PRECISION) };

    let spread = pool.full_cap_bps.saturating_sub(base_cap_bps);
    let cap_increment = mul_div_u64(spread, deploy_ratio, PRECISION)?;
    let effective_cap_bps = checked_add_u64(base_cap_bps, cap_increment)?;

    let fyc_monthly_loan_target = if fyc.v_tranche == 0 { 0 } else {
        let cap_diff_bps = effective_cap_bps.saturating_sub(base_cap_bps);
        mul_div_u64(fyc.v_tranche, cap_diff_bps, BPS_DENOMINATOR * 12)?
    };

    Ok(AllocationSnapshot { v_pool, elb, base_cap_bps, effective_cap_bps, deploy_ratio, fyc_monthly_loan_target })
}

pub fn compute_optimistic_price(
    tranche: &TrancheState,
    pool: &PoolState,
    deposit_value: u64,
    base_yield_token_price: u64,
    now_ts: i64,
) -> Result<u64, ProgramError> {
    if tranche.total_supply == 0 { return Ok(PRECISION); }

    let v_pool = compute_v_pool(pool, base_yield_token_price)?;
    let v_pool_post = checked_add_u64(v_pool, deposit_value)?;
    let v_tranche_post = checked_add_u64(tranche.v_tranche, deposit_value)?;
    let elb_post = v_pool_post.saturating_sub(pool.outstanding_principal);

    let apy_bps = observed_base_yield_token_apy_bps(pool, base_yield_token_price, now_ts);
    let base_cap_post_bps = if v_pool_post == 0 { 0 } else { mul_div_u64(elb_post, apy_bps, v_pool_post)? };

    let loan_alloc_post = mul_div_u64(v_pool_post, LOAN_ALLOCATION_BPS, BPS_DENOMINATOR)?;
    let deploy_ratio_post = if loan_alloc_post == 0 { 0 } else {
        mul_div_u64(pool.outstanding_principal, PRECISION, loan_alloc_post)?.min(PRECISION)
    };
    let spread_post = pool.full_cap_bps.saturating_sub(base_cap_post_bps);
    let cap_increment_post = mul_div_u64(spread_post, deploy_ratio_post, PRECISION)?;
    let effective_cap_post_bps = checked_add_u64(base_cap_post_bps, cap_increment_post)?;

    let cap_diff_bps = effective_cap_post_bps.saturating_sub(base_cap_post_bps);
    let tranche_monthly_post = mul_div_u64(v_tranche_post, cap_diff_bps, BPS_DENOMINATOR * 12)?;

    let elapsed_seconds = (now_ts - tranche.last_collection_ts).max(0) as u64;
    let days_elapsed = (elapsed_seconds / 86_400).min(30);
    let loan_estimate = mul_div_u64(tranche_monthly_post, days_elapsed, 30)?;

    let augmented_value = checked_add_u64(tranche.v_tranche, loan_estimate)?;
    if augmented_value == 0 { return Err(FleetError::EmptyTranche.into()); }
    mul_div_u64(augmented_value, PRECISION, tranche.total_supply)
}
`,
  proposed: `//! Allocation snapshot + optimistic deposit price. Yield-source-agnostic: the
//! APY estimate takes explicit scalars, so the same function serves the pool's
//! primary reserve AND any additional registered YieldSourceState (USDY,
//! syrupUSDC, ...) — see helpers/mod.rs and instructions/initialize_yield_source.rs.
//! ROUND 6 — load_other_sources reads every additional registered source
//! straight off whatever trailing accounts the calling instruction was given,
//! and every v_pool read below forwards that slice into the now-multi-source
//! compute_v_pool/compute_v_pool_true (helpers/pricing.rs). See that file's
//! own why for the two fixes (multi-source sum, dropped realized_losses
//! double-count) — this file is just the caller-side wiring for both.

use bytemuck::Zeroable;
use pinocchio::{account::AccountView, error::ProgramError};
use crate::constants::{BPS_DENOMINATOR, LOAN_ALLOCATION_BPS, MAX_HARMONIZED_SOURCES, NET_YIELD_BPS, PRECISION};
use crate::errors::FleetError;
use crate::helpers::math::{checked_add_u64, mul_div_u64};
use crate::helpers::oracle::fetch_base_yield_token_price;
use crate::helpers::pricing::compute_v_pool;
use crate::helpers::waterfall::distribute_loan_interest;
use crate::state::{load_yield_source, PoolState, TrancheState, YieldSourceState};

// NEW — every caller that needs a complete v_pool (build_snapshot,
// compute_optimistic_price) reads its "other sources" the same way: a
// trailing (yield_source, oracle) account pair per additional registered
// source, appended after that instruction's own fixed accounts. Each source
// is verified to belong to THIS pool before its price is trusted — the same
// ownership check run_yield_epoch.rs already does per-source. Capped at
// MAX_HARMONIZED_SOURCES, the same ceiling initialize_yield_source.rs
// enforces on registration, so this never silently drops a real source.
pub fn load_other_sources(
    trailing_accounts: &[AccountView],
    pool_key: &[u8; 32],
) -> Result<([YieldSourceState; MAX_HARMONIZED_SOURCES], [u64; MAX_HARMONIZED_SOURCES], usize), ProgramError> {
    let mut sources = [YieldSourceState::zeroed(); MAX_HARMONIZED_SOURCES];
    let mut prices = [0u64; MAX_HARMONIZED_SOURCES];
    let mut count = 0usize;
    let mut i = 0;
    while i + 1 < trailing_accounts.len() && count < MAX_HARMONIZED_SOURCES {
        let ys_account = &trailing_accounts[i];
        let oracle_account = &trailing_accounts[i + 1];
        let ys = load_yield_source(ys_account)?;
        if ys.pool != *pool_key || ys.oracle != *oracle_account.address().as_array() {
            return Err(FleetError::Unauthorized.into());
        }
        prices[count] = fetch_base_yield_token_price(oracle_account)?;
        sources[count] = ys;
        count += 1;
        i += 2;
    }
    Ok((sources, prices, count))
}

// NEW (round 8) — closes the "optional tail" hole flagged in
// END_TO_END_PROTOCOL_SIMULATION.md's findings-verification pass: omitting
// some of the trailing source accounts used to be a silently VALID call,
// just priced against less than the pool's real total. Every caller that
// assembles a final other_sources count (after any fold-in of its own
// deposit/tick target) must call this before trusting v_pool — the count
// must equal pool.yield_source_count exactly, since that's the ground truth
// of how many non-primary sources are actually registered.
pub fn require_complete_source_list(pool: &PoolState, other_source_count: usize) -> Result<(), ProgramError> {
    if other_source_count != pool.yield_source_count as usize {
        return Err(FleetError::IncompleteYieldSourceList.into());
    }
    Ok(())
}

pub struct AllocationSnapshot {
    pub v_pool: u64,
    pub elb: u64,
    pub base_cap_bps: u64,
    pub effective_cap_bps: u64,
    pub deploy_ratio: u64,
    pub fyc_monthly_loan_target: u64,
}

// CHANGED — was observed_base_yield_token_apy_bps(pool, price, now_ts), reading
// pool.last_base_yield_token_price/last_epoch_ts directly. Same 24h-epoch-anchored
// estimate (immune to mid-window deposit distortion — it's keyed on the ORACLE
// price snapshot, never on pool token balance), now takes those two as explicit
// scalars so it works for the pool's primary reserve AND any additional
// YieldSourceState.
pub fn observed_source_apy_bps(last_price: u64, last_epoch_ts: i64, price_now: u64, now_ts: i64) -> u64 {
    if last_price == 0 || last_epoch_ts == 0 || price_now <= last_price {
        return 0;
    }
    let elapsed = (now_ts - last_epoch_ts).max(1) as u128;
    let delta_bps = ((price_now - last_price) as u128) * BPS_DENOMINATOR as u128 / last_price as u128;
    let seconds_per_year: u128 = 365 * 86_400;
    let annualised = delta_bps * seconds_per_year / elapsed;
    u64::try_from(annualised).unwrap_or(u64::MAX)
}

// NEW — value-weighted blend across every registered yield source, so the pool
// quotes one APY figure once USDY, syrupUSDC, etc. are all live at once. Each
// source's own 24h-epoch estimate is weighted by the USD value it currently
// holds; a source holding zero value contributes nothing to the blend.
pub fn harmonized_reserve_apy_bps(source_apys_bps: &[u64], source_values_usd: &[u64]) -> Result<u64, ProgramError> {
    if source_apys_bps.len() != source_values_usd.len() {
        return Err(FleetError::InvalidAccountData.into());
    }
    let mut total_value: u128 = 0;
    let mut weighted_sum: u128 = 0;
    for (apy, value) in source_apys_bps.iter().zip(source_values_usd.iter()) {
        total_value += *value as u128;
        weighted_sum += *apy as u128 * *value as u128;
    }
    if total_value == 0 { return Ok(0); }
    u64::try_from(weighted_sum / total_value).map_err(|_| FleetError::Overflow.into())
}

pub fn build_snapshot(
    pool: &PoolState,
    fyc: &TrancheState,
    base_yield_token_price: u64,
    now_ts: i64,
    other_sources: &[YieldSourceState],
    other_source_prices: &[u64],
) -> Result<AllocationSnapshot, ProgramError> {
    let v_pool = compute_v_pool(pool, base_yield_token_price, other_sources, other_source_prices)?;
    let elb = v_pool.saturating_sub(pool.outstanding_principal);

    let apy_bps = observed_source_apy_bps(pool.last_base_yield_token_price, pool.last_epoch_ts, base_yield_token_price, now_ts);
    let base_cap_bps = if v_pool == 0 { 0 } else { mul_div_u64(elb, apy_bps, v_pool)? };

    let loan_alloc = mul_div_u64(v_pool, LOAN_ALLOCATION_BPS, BPS_DENOMINATOR)?;
    let deploy_ratio = if loan_alloc == 0 { 0 }
        else { mul_div_u64(pool.outstanding_principal, PRECISION, loan_alloc)?.min(PRECISION) };

    let spread = pool.full_cap_bps.saturating_sub(base_cap_bps);
    let cap_increment = mul_div_u64(spread, deploy_ratio, PRECISION)?;
    let effective_cap_bps = checked_add_u64(base_cap_bps, cap_increment)?;

    let fyc_monthly_loan_target = if fyc.v_tranche == 0 { 0 } else {
        let cap_diff_bps = effective_cap_bps.saturating_sub(base_cap_bps);
        mul_div_u64(fyc.v_tranche, cap_diff_bps, BPS_DENOMINATOR * 12)?
    };

    Ok(AllocationSnapshot { v_pool, elb, base_cap_bps, effective_cap_bps, deploy_ratio, fyc_monthly_loan_target })
}

// CHANGED — substantially rewritten, not just re-parameterized. The old
// version got both accrual sources wrong: the loan side used a cap-based
// days-elapsed/30 proxy tied to an unrelated allocation-capacity formula,
// disconnected from any real loan's own payment schedule; the yield-token
// side wasn't reflected in optimistic pricing AT ALL — v_tranche only
// carried whatever the last run_yield_epoch call had already captured, so
// minting right after a price move but before the next epoch tick priced
// new tokens off stale value, at existing holders' expense.
//
// (1) Yield-token side — the live unrealized appreciation on THIS source's
// own reserve since its last epoch tick, split the same flat pro-rata way
// split_base_yield_token_yield does at real collection time.
//
// (2) Loan side — a real reward-per-second accrual off PoolState's
// loan_accrual_rate/loan_accrual_checkpoint (state.rs), split through the
// SAME severity curve real collection uses (distribute_loan_interest). This
// is the actual per-active-loan, elapsed-time-into-current-period estimate
// the design calls for — a reward-per-second accumulator gets there without
// iterating every loan on-chain, since keeping the rate current only takes
// an O(1) update at originate_loan.rs / repay_loan.rs / flag_pending_default.rs.
//
// Both previews stop short of simulating mint_fee_value_into_fyc's
// price-neutral fee mint — reading distribute_loan_interest's own returned
// InterestDistribution.fyc_share/ffc_share, not diffing v_tranche after the
// call — so the estimate never double-counts fee-mint value that doesn't
// move price. That mirrors the same "never invent value that doesn't
// exist" invariant mint_fee_value_into_fyc itself already guarantees.
//
// v_pool_now — ROUND 6: now the REAL pool-wide total. base_yield_token_price
// is the primary reserve's own current/cached price (compute_v_pool's first
// term); other_sources/other_source_prices is every additional registered
// source the caller assembled via load_other_sources — if the deposit's own
// target IS a non-primary source, the caller includes it in that slice too
// (with its just-fetched live price), so v_pool_now is complete either way.
//
// ROUND 7 — part (1)'s yield-delta numerator now matches v_pool_now's
// denominator: every source's own unrealized appreciation is summed, not
// just whichever one this particular deposit targets. Flagged as an
// incomplete fix in END_TO_END_PROTOCOL_SIMULATION.md §2/§6/§10 ("BREAKS —
// P0 for multi-source honesty") after round 6 only fixed the TVL sum. The
// dedicated source_c_tokens/source_last_price/source_price_now params from
// round 6 are gone — redundant now that primary's own delta reads straight
// off pool (pool.c_tokens vs pool.last_base_yield_token_price/
// base_yield_token_price) and every other source's delta reads off its own
// entry in other_sources/other_source_prices. No double count: a caller
// that includes a non-primary target in other_sources (deposit_yield_token.rs)
// never passes it a second time anywhere else; primary's term is 0 whenever
// a caller hasn't refreshed the primary price this call (deposit_yield_token.rs,
// which has no primary oracle account) and real whenever one has (deposit.rs).
//
// deposit_value is gone from the signature — a per-token price shouldn't
// depend on any one depositor's amount, and it never actually reached the
// final dollar figure even before this rewrite (it only fed the removed
// cap-ratio chain).
#[allow(clippy::too_many_arguments)]
pub fn compute_optimistic_price(
    fyc: &TrancheState,
    ffc: &TrancheState,
    target_is_fyc: bool,
    pool: &PoolState,
    base_yield_token_price: u64,
    other_sources: &[YieldSourceState],
    other_source_prices: &[u64],
    now_ts: i64,
) -> Result<u64, ProgramError> {
    let tranche = if target_is_fyc { fyc } else { ffc };
    if tranche.total_supply == 0 { return Ok(PRECISION); }

    // (1) Yield-token side — summed across every source.
    let v_pool_now = compute_v_pool(pool, base_yield_token_price, other_sources, other_source_prices)?;
    let primary_gross_yield = if base_yield_token_price > pool.last_base_yield_token_price {
        mul_div_u64(pool.c_tokens, base_yield_token_price - pool.last_base_yield_token_price, PRECISION)?
    } else { 0 };
    let mut total_gross_yield = primary_gross_yield;
    for (src, &live_price) in other_sources.iter().zip(other_source_prices.iter()) {
        if live_price <= src.last_price { continue; }
        let gross = mul_div_u64(src.c_tokens, live_price - src.last_price, PRECISION)?;
        total_gross_yield = checked_add_u64(total_gross_yield, gross)?;
    }
    let total_net_yield = mul_div_u64(total_gross_yield, NET_YIELD_BPS, BPS_DENOMINATOR)?;
    let fyc_yield_share = if v_pool_now == 0 { 0 } else { mul_div_u64(total_net_yield, fyc.v_tranche, v_pool_now)? };
    let yield_estimate = if target_is_fyc { fyc_yield_share } else { total_net_yield.saturating_sub(fyc_yield_share) };

    // (2) Loan side.
    let elapsed_since_rollup = (now_ts - pool.loan_accrual_updated_ts).max(0) as u64;
    let gross_loan_accrual = checked_add_u64(
        pool.loan_accrual_checkpoint,
        mul_div_u64(pool.loan_accrual_rate, elapsed_since_rollup, PRECISION)?,
    )?;
    let mut fyc_preview = *fyc;
    let mut ffc_preview = *ffc;
    let dist = distribute_loan_interest(pool, &mut fyc_preview, &mut ffc_preview, gross_loan_accrual)?;
    let loan_estimate = if target_is_fyc { dist.fyc_share } else { dist.ffc_share };

    let augmented_value = checked_add_u64(tranche.v_tranche, checked_add_u64(yield_estimate, loan_estimate)?)?;
    if augmented_value == 0 { return Err(FleetError::EmptyTranche.into()); }
    mul_div_u64(augmented_value, PRECISION, tranche.total_supply)
}
`
},
{
  path: "pinochio/src/instructions/deposit.rs",
  status: "M",
  category: "pinocchio",
  why: "jupiter_program (account 12) becomes swap_program, checked against ALLOWED_SWAP_PROGRAMS instead of only Jupiter — an investor's route_data can now come from either aggregator's off-chain quote, forwarded to whichever program they name. execute_jupiter_swap becomes execute_aggregator_swap. compute_optimistic_price's call site is also updated for that function's own real rewrite (see helpers/allocation.rs why) — now passes both fyc_st/ffc_st plus target_is_fyc (the severity-curve loan-interest preview needs both tranches, not just the target) and p.c_tokens as this path's source token count, and no longer passes min_base_usd at all (a per-token price shouldn't depend on this depositor's amount). The direct-collateral path — depositing USDY/syrupUSDC straight in, skipping the swap entirely — is a new sibling instruction, instructions/deposit_yield_token.rs, not a branch inside this file. ROUND 6: the account list grows an OPTIONAL trailing tail — zero or more (yield_source, oracle) pairs, one per additional registered source beyond the primary reserve. load_other_sources (helpers/allocation.rs) reads them, and both compute_optimistic_price and build_snapshot now see the pool's REAL total value, not just the primary reserve's. ROUND 8: the tail was 'optional' in the sense that omitting it didn't fail the transaction — it just silently priced the mint against less than the pool's real total, the top P1 an independent findings-verification pass flagged. require_complete_source_list now rejects an incomplete tail outright (IncompleteYieldSourceList) instead of relying on accounts UIs to remember to pass the full list.",
  original: `//! Investor deposit: USDC → swap to USYC → mint tranche tokens at optimistic price.
//!
//! Accounts (Anchor order):
//!   0  investor (signer, writable)
//!   1  pool (writable)
//!   2  fyc (writable)
//!   3  ffc (writable)
//!   4  tranche_mint (writable)
//!   5  investor_tranche_account (writable)
//!   6  deposit_token_vault (writable)
//!   7  investor_deposit_token_account (writable)
//!   8  base_yield_token_vault (writable)
//!   9  investor_base_yield_token_account (writable, for dust)
//!  10  deposit_token_oracle
//!  11  base_yield_token_oracle
//!  12  jupiter_program
//!  13  token_program
//!  14.. route accounts (forwarded to Jupiter)
//!
//! Data: deposit_token_amount (u64) + slippage_bps (u64) + tranche_type (u8) + var route_data

use pinocchio::{
    account::AccountView,
    cpi::{Seed, Signer},
    sysvars::{clock::Clock, Sysvar},
    ProgramResult,
};
use pinocchio_token::instructions::{MintTo, Transfer};
use pinocchio_log::log;

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::allocation::{build_snapshot, compute_optimistic_price};
use crate::helpers::math::{checked_add_u64, mul_div_u64};
use crate::helpers::oracle::{
    assert_oracle_keys, deposit_token_to_usd_value, fetch_base_yield_token_price,
    fetch_deposit_token_price,
};
use crate::helpers::swap::execute_jupiter_swap;
use crate::helpers::token_account::token_account_owner;
use crate::helpers::waterfall::{ensure_not_paused, refresh_conservative_prices};
use crate::pda::*;
use crate::state::{load_pool_mut, load_tranche_mut, save_pool, save_tranche};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    if accounts.len() < 14 { return Err(FleetError::InvalidAccountData.into()); }
    let investor = &accounts[0];
    let pool = &accounts[1];
    let fyc = &accounts[2];
    let ffc = &accounts[3];
    let tranche_mint = &accounts[4];
    let investor_tranche_acc = &accounts[5];
    let deposit_vault = &accounts[6];
    let investor_dep_acc = &accounts[7];
    let base_vault = &accounts[8];
    let investor_base_acc = &accounts[9];
    let deposit_oracle = &accounts[10];
    let base_oracle = &accounts[11];
    let jupiter_program = &accounts[12];
    let _token_program = &accounts[13];
    let route_accounts = &accounts[14..];

    let mut c = 0;
    let deposit_token_amount = read_u64(data, &mut c)?;
    let slippage_bps = read_u64(data, &mut c)?;
    let tranche_type = read_u8(data, &mut c)?;
    let route_data = read_var(data, &mut c)?;

    require_signer(investor)?;
    let mut p = load_pool_mut(pool)?;
    ensure_not_paused(&p)?;
    if !(SLIPPAGE_BPS_MIN..=SLIPPAGE_BPS_MAX).contains(&slippage_bps) {
        return Err(FleetError::InvalidSlippage.into());
    }
    if deposit_token_amount == 0 { return Err(FleetError::Overflow.into()); }
    if route_data.is_empty() { return Err(FleetError::SwapOutputBelowMinimum.into()); }

    assert_oracle_keys(&p, deposit_oracle.address().as_array(), base_oracle.address().as_array())?;
    if p.deposit_token_vault != *deposit_vault.address().as_array()
        || p.base_yield_token_vault != *base_vault.address().as_array()
    { return Err(FleetError::Unauthorized.into()); }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }

    let mut fyc_st = load_tranche_mut(fyc)?;
    let mut ffc_st = load_tranche_mut(ffc)?;

    let target_is_fyc = tranche_type == fyc_st.tranche_type;
    let target_is_ffc = tranche_type == ffc_st.tranche_type;
    if !(target_is_fyc || target_is_ffc) { return Err(FleetError::TrancheMismatch.into()); }
    let expected_mint = if target_is_fyc { fyc_st.token_mint } else { ffc_st.token_mint };
    if *tranche_mint.address().as_array() != expected_mint {
        return Err(FleetError::TrancheMismatch.into());
    }

    let deposit_price = fetch_deposit_token_price(deposit_oracle, p.min_peg_bps)?;
    let base_price = fetch_base_yield_token_price(base_oracle)?;
    let now_ts = Clock::get()?.unix_timestamp;

    let dep_usd = deposit_token_to_usd_value(deposit_token_amount, deposit_price)?;
    let min_base_usd = mul_div_u64(dep_usd, BPS_DENOMINATOR.saturating_sub(slippage_bps), BPS_DENOMINATOR)?;
    if min_base_usd == 0 { return Err(FleetError::SwapOutputBelowMinimum.into()); }

    let target_tranche = if target_is_fyc { &fyc_st } else { &ffc_st };
    let optimistic_price = compute_optimistic_price(target_tranche, &p, min_base_usd, base_price, now_ts)?;
    if optimistic_price == 0 { return Err(FleetError::EmptyTranche.into()); }
    let tokens_to_mint = mul_div_u64(min_base_usd, PRECISION, optimistic_price)?;
    if tokens_to_mint == 0 { return Err(FleetError::Overflow.into()); }

    // Re-check peg right before swap.
    fetch_deposit_token_price(deposit_oracle, p.min_peg_bps)?;

    // Pull USDC into vault.
    Transfer::new(investor_dep_acc, deposit_vault, investor, deposit_token_amount).invoke()?;

    // Build pool signer.
    let auth_key = p.authority;
    let pool_bump_arr = [p.bump];
    let pool_seeds: [Seed; 3] = [
        Seed::from(POOL_SEED),
        Seed::from(&auth_key[..]),
        Seed::from(&pool_bump_arr[..]),
    ];
    let pool_signer = [Signer::from(&pool_seeds[..])];

    // Jupiter swap USDC -> USYC.
    let actual_base = execute_jupiter_swap(
        jupiter_program, deposit_vault, base_vault,
        base_price, min_base_usd,
        route_accounts, route_data,
        &[pool.address()], &pool_signer,
    )?;

    let actual_base_usd = mul_div_u64(actual_base, base_price, PRECISION)?;
    let dust_usd = actual_base_usd.saturating_sub(min_base_usd);
    let dust_tokens = if dust_usd > 0 { mul_div_u64(dust_usd, PRECISION, base_price)? } else { 0 };
    let pool_base_tokens = actual_base.saturating_sub(dust_tokens);

    // Mint tranche tokens to investor (signed by tranche PDA).
    let pool_key = *pool.address().as_array();
    let (tranche_acc, type_byte, t_bump) = if target_is_fyc {
        (fyc, fyc_st.tranche_type, fyc_st.bump)
    } else {
        (ffc, ffc_st.tranche_type, ffc_st.bump)
    };
    let type_arr = [type_byte];
    let t_bump_arr = [t_bump];
    let tranche_seeds: [Seed; 4] = [
        Seed::from(TRANCHE_SEED),
        Seed::from(&pool_key[..]),
        Seed::from(&type_arr[..]),
        Seed::from(&t_bump_arr[..]),
    ];
    let tranche_signer = [Signer::from(&tranche_seeds[..])];

    MintTo::new(tranche_mint, investor_tranche_acc, tranche_acc, tokens_to_mint).invoke_signed(&tranche_signer)?;

    // Refund dust USYC to investor.
    if dust_tokens > 0 {
        let owner = token_account_owner(investor_base_acc)?;
        let _ = owner; // owner check delegated to token program (mint check is implicit)
        Transfer::new(base_vault, investor_base_acc, pool, dust_tokens).invoke_signed(&pool_signer)?;
    }

    // Pool + tranche accounting.
    p.c_tokens = checked_add_u64(p.c_tokens, pool_base_tokens)?;

    let target = if target_is_fyc { &mut fyc_st } else { &mut ffc_st };
    target.v_tranche = checked_add_u64(target.v_tranche, min_base_usd)?;
    target.total_supply = checked_add_u64(target.total_supply, tokens_to_mint)?;
    target.optimistic_price = optimistic_price;

    refresh_conservative_prices(&mut fyc_st, &mut ffc_st)?;

    let snapshot = build_snapshot(&p, &fyc_st, base_price, now_ts)?;
    fyc_st.monthly_loan_allocation = snapshot.fyc_monthly_loan_target;

    save_pool(pool, &p)?;
    save_tranche(fyc, &fyc_st)?;
    save_tranche(ffc, &ffc_st)?;

    log!("ff:deposit");
    Ok(())
}
`,
  proposed: `//! Investor deposit: USDC → swap (Jupiter or Titan) to USYC → mint tranche tokens at optimistic price.
//!
//! Accounts (Anchor order):
//!   0  investor (signer, writable)
//!   1  pool (writable)
//!   2  fyc (writable)
//!   3  ffc (writable)
//!   4  tranche_mint (writable)
//!   5  investor_tranche_account (writable)
//!   6  deposit_token_vault (writable)
//!   7  investor_deposit_token_account (writable)
//!   8  base_yield_token_vault (writable)
//!   9  investor_base_yield_token_account (writable, for dust)
//!  10  deposit_token_oracle
//!  11  base_yield_token_oracle
//!  12  swap_program — CHANGED, was jupiter_program; any account in ALLOWED_SWAP_PROGRAMS
//!  13  token_program
//!  14.. route_account_count (from data) route accounts (forwarded to the named aggregator),
//!       THEN zero or more (yield_source, oracle) pairs — NEW (round 6) — one pair per
//!       additional registered YieldSourceState, so v_pool sees the pool's real total.
//!
//! Data: deposit_token_amount (u64) + slippage_bps (u64) + tranche_type (u8)
//!       + route_account_count (u8) — NEW (round 6), makes the accounts-array split
//!       between route accounts and trailing source pairs explicit instead of assumed
//!       + var route_data
//!
//! For depositors who already hold the yield-bearing token itself (USDY, syrupUSDC, ...),
//! see instructions/deposit_yield_token.rs instead — same mint-at-optimistic-price math,
//! no swap leg at all.

use pinocchio::{
    account::AccountView,
    cpi::{Seed, Signer},
    sysvars::{clock::Clock, Sysvar},
    ProgramResult,
};
use pinocchio_token::instructions::{MintTo, Transfer};
use pinocchio_log::log;

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::allocation::{
    build_snapshot, compute_optimistic_price, load_other_sources, require_complete_source_list,
};
use crate::helpers::math::{checked_add_u64, mul_div_u64};
use crate::helpers::oracle::{
    assert_oracle_keys, deposit_token_to_usd_value, fetch_base_yield_token_price,
    fetch_deposit_token_price,
};
use crate::helpers::swap::execute_aggregator_swap;
use crate::helpers::token_account::token_account_owner;
use crate::helpers::waterfall::{ensure_not_paused, refresh_conservative_prices};
use crate::pda::*;
use crate::state::{load_pool_mut, load_tranche_mut, save_pool, save_tranche};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    if accounts.len() < 14 { return Err(FleetError::InvalidAccountData.into()); }
    let investor = &accounts[0];
    let pool = &accounts[1];
    let fyc = &accounts[2];
    let ffc = &accounts[3];
    let tranche_mint = &accounts[4];
    let investor_tranche_acc = &accounts[5];
    let deposit_vault = &accounts[6];
    let investor_dep_acc = &accounts[7];
    let base_vault = &accounts[8];
    let investor_base_acc = &accounts[9];
    let deposit_oracle = &accounts[10];
    let base_oracle = &accounts[11];
    let swap_program = &accounts[12];
    let _token_program = &accounts[13];

    let mut c = 0;
    let deposit_token_amount = read_u64(data, &mut c)?;
    let slippage_bps = read_u64(data, &mut c)?;
    let tranche_type = read_u8(data, &mut c)?;
    // NEW (round 6) — makes the split between route accounts and the trailing
    // other-source pairs explicit; route_data alone doesn't encode an account count.
    let route_account_count = read_u8(data, &mut c)? as usize;
    let route_data = read_var(data, &mut c)?;
    if accounts.len() < 14 + route_account_count { return Err(FleetError::InvalidAccountData.into()); }
    let route_accounts = &accounts[14..14 + route_account_count];
    let other_source_accounts = &accounts[14 + route_account_count..];

    require_signer(investor)?;
    let mut p = load_pool_mut(pool)?;
    ensure_not_paused(&p)?;
    if !(SLIPPAGE_BPS_MIN..=SLIPPAGE_BPS_MAX).contains(&slippage_bps) {
        return Err(FleetError::InvalidSlippage.into());
    }
    if deposit_token_amount == 0 { return Err(FleetError::Overflow.into()); }
    if route_data.is_empty() { return Err(FleetError::SwapOutputBelowMinimum.into()); }

    assert_oracle_keys(&p, deposit_oracle.address().as_array(), base_oracle.address().as_array())?;
    if p.deposit_token_vault != *deposit_vault.address().as_array()
        || p.base_yield_token_vault != *base_vault.address().as_array()
    { return Err(FleetError::Unauthorized.into()); }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }

    let mut fyc_st = load_tranche_mut(fyc)?;
    let mut ffc_st = load_tranche_mut(ffc)?;

    let target_is_fyc = tranche_type == fyc_st.tranche_type;
    let target_is_ffc = tranche_type == ffc_st.tranche_type;
    if !(target_is_fyc || target_is_ffc) { return Err(FleetError::TrancheMismatch.into()); }
    let expected_mint = if target_is_fyc { fyc_st.token_mint } else { ffc_st.token_mint };
    if *tranche_mint.address().as_array() != expected_mint {
        return Err(FleetError::TrancheMismatch.into());
    }

    let deposit_price = fetch_deposit_token_price(deposit_oracle, p.min_peg_bps)?;
    let base_price = fetch_base_yield_token_price(base_oracle)?;
    let now_ts = Clock::get()?.unix_timestamp;

    let dep_usd = deposit_token_to_usd_value(deposit_token_amount, deposit_price)?;
    let min_base_usd = mul_div_u64(dep_usd, BPS_DENOMINATOR.saturating_sub(slippage_bps), BPS_DENOMINATOR)?;
    if min_base_usd == 0 { return Err(FleetError::SwapOutputBelowMinimum.into()); }

    // CHANGED — compute_optimistic_price now takes both tranches (the k-curve
    // split needs both), instead of reaching into PoolState/a single tranche
    // itself. No longer takes min_base_usd — a per-token price doesn't
    // depend on this depositor's amount, only tokens_to_mint below does.
    // NEW (round 6) — other_sources/other_source_prices come from
    // load_other_sources, so v_pool (and therefore this price) reflects
    // every registered source's real capital, not just the primary reserve
    // being swapped into here. ROUND 7 — the same other_sources slice now
    // also feeds the yield-estimate numerator, not just v_pool's
    // denominator, so depositors are credited for every source's unrealized
    // gain, not just the primary reserve's. ROUND 8 — the tail is no longer
    // optional in practice: require_complete_source_list rejects a call that
    // omits any registered source outright, instead of silently minting at
    // a partial price.
    let (other_sources, other_source_prices, other_source_count) =
        load_other_sources(other_source_accounts, pool.address().as_array())?;
    require_complete_source_list(&p, other_source_count)?;
    let optimistic_price = compute_optimistic_price(
        &fyc_st, &ffc_st, target_is_fyc, &p,
        base_price, &other_sources[..other_source_count], &other_source_prices[..other_source_count],
        now_ts,
    )?;
    if optimistic_price == 0 { return Err(FleetError::EmptyTranche.into()); }
    let tokens_to_mint = mul_div_u64(min_base_usd, PRECISION, optimistic_price)?;
    if tokens_to_mint == 0 { return Err(FleetError::Overflow.into()); }

    // Re-check peg right before swap.
    fetch_deposit_token_price(deposit_oracle, p.min_peg_bps)?;

    // Pull USDC into vault.
    Transfer::new(investor_dep_acc, deposit_vault, investor, deposit_token_amount).invoke()?;

    // Build pool signer.
    let auth_key = p.authority;
    let pool_bump_arr = [p.bump];
    let pool_seeds: [Seed; 3] = [
        Seed::from(POOL_SEED),
        Seed::from(&auth_key[..]),
        Seed::from(&pool_bump_arr[..]),
    ];
    let pool_signer = [Signer::from(&pool_seeds[..])];

    // Aggregator swap USDC -> USYC — swap_program is checked against
    // ALLOWED_SWAP_PROGRAMS inside execute_aggregator_swap, so this line is
    // identical whether the investor routed through Jupiter or Titan.
    let actual_base = execute_aggregator_swap(
        swap_program, deposit_vault, base_vault,
        base_price, min_base_usd,
        route_accounts, route_data,
        &[pool.address()], &pool_signer,
    )?;

    let actual_base_usd = mul_div_u64(actual_base, base_price, PRECISION)?;
    let dust_usd = actual_base_usd.saturating_sub(min_base_usd);
    let dust_tokens = if dust_usd > 0 { mul_div_u64(dust_usd, PRECISION, base_price)? } else { 0 };
    let pool_base_tokens = actual_base.saturating_sub(dust_tokens);

    // Mint tranche tokens to investor (signed by tranche PDA).
    let pool_key = *pool.address().as_array();
    let (tranche_acc, type_byte, t_bump) = if target_is_fyc {
        (fyc, fyc_st.tranche_type, fyc_st.bump)
    } else {
        (ffc, ffc_st.tranche_type, ffc_st.bump)
    };
    let type_arr = [type_byte];
    let t_bump_arr = [t_bump];
    let tranche_seeds: [Seed; 4] = [
        Seed::from(TRANCHE_SEED),
        Seed::from(&pool_key[..]),
        Seed::from(&type_arr[..]),
        Seed::from(&t_bump_arr[..]),
    ];
    let tranche_signer = [Signer::from(&tranche_seeds[..])];

    MintTo::new(tranche_mint, investor_tranche_acc, tranche_acc, tokens_to_mint).invoke_signed(&tranche_signer)?;

    // Refund dust USYC to investor.
    if dust_tokens > 0 {
        let owner = token_account_owner(investor_base_acc)?;
        let _ = owner; // owner check delegated to token program (mint check is implicit)
        Transfer::new(base_vault, investor_base_acc, pool, dust_tokens).invoke_signed(&pool_signer)?;
    }

    // Pool + tranche accounting.
    p.c_tokens = checked_add_u64(p.c_tokens, pool_base_tokens)?;

    let target = if target_is_fyc { &mut fyc_st } else { &mut ffc_st };
    target.v_tranche = checked_add_u64(target.v_tranche, min_base_usd)?;
    target.total_supply = checked_add_u64(target.total_supply, tokens_to_mint)?;
    target.optimistic_price = optimistic_price;

    refresh_conservative_prices(&mut fyc_st, &mut ffc_st)?;

    // NEW (round 6) — same other_sources this deposit already loaded above,
    // so the post-deposit snapshot's v_pool (and fyc_monthly_loan_target) is
    // computed against the real pool-wide total too.
    let snapshot = build_snapshot(
        &p, &fyc_st, base_price, now_ts,
        &other_sources[..other_source_count], &other_source_prices[..other_source_count],
    )?;
    fyc_st.monthly_loan_allocation = snapshot.fyc_monthly_loan_target;

    save_pool(pool, &p)?;
    save_tranche(fyc, &fyc_st)?;
    save_tranche(ffc, &ffc_st)?;

    log!("ff:deposit");
    Ok(())
}
`
},
{
  path: "pinochio/src/instructions/originate_loan.rs",
  status: "M",
  category: "pinocchio",
  why: "Computes levelized_interest at origination time (same moment monthly_payment is already computed) and stores it on the new LoanAccount field, so repay_loan.rs never has to recompute it. jupiter_program (account 10) also becomes swap_program: execute_jupiter_swap_to_deposit becomes execute_aggregator_swap_to_deposit, callable with either allow-listed aggregator. Also adds this loan to pool.loan_accrual_rate — the reward-per-second accumulator compute_optimistic_price reads (helpers/allocation.rs) to give optimistic pricing a real per-active-loan accrual estimate instead of the old cap-based proxy. See state.rs for the three new PoolState fields and instructions/repay_loan.rs / flag_pending_default.rs for the other two places that keep the rate current.",
  original: `//! Originate a loan: swap USYC→USDC, transfer principal to borrower, write loan PDA.
//!
//! Accounts (Anchor order):
//!   0  admin (signer, writable)
//!   1  pool (writable)
//!   2  fyc (writable)
//!   3  ffc (writable)
//!   4  loan (init PDA, writable)
//!   5  borrower
//!   6  borrower_deposit_token_account (writable)
//!   7  deposit_token_vault (writable)
//!   8  base_yield_token_vault (writable)
//!   9  base_yield_token_oracle
//!  10  jupiter_program
//!  11  token_program
//!  12  system_program
//!  13.. route accounts
//!
//! Data: loan_bump (u8) + loan_id (u64) + principal (u64) + apr_bps (u64) +
//!       term_months (u16) + var route_data

use pinocchio::{
    account::AccountView,
    cpi::{Seed, Signer},
    sysvars::{clock::Clock, Sysvar},
    ProgramResult,
};
use pinocchio_token::instructions::Transfer;

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::amortization::compute_monthly_payment;
use crate::helpers::coverage::assert_origination_allowed;
use crate::helpers::math::{checked_add_u64, checked_sub_u64, mul_div_u64};
use crate::helpers::oracle::fetch_base_yield_token_price;
use crate::helpers::swap::execute_jupiter_swap_to_deposit;
use crate::helpers::sysprog::{create_pda_account, rent_exempt_minimum};
use crate::helpers::token_account::token_account_amount;
use crate::helpers::waterfall::ensure_not_paused;
use crate::pda::*;
use crate::state::{
    load_pool_mut, load_tranche, loan_status, save_loan, save_pool, LoanAccount, LOAN_SPACE,
};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    if accounts.len() < 13 { return Err(FleetError::InvalidAccountData.into()); }
    let admin = &accounts[0];
    let pool = &accounts[1];
    let fyc = &accounts[2];
    let ffc = &accounts[3];
    let loan = &accounts[4];
    let borrower = &accounts[5];
    let borrower_dep_acc = &accounts[6];
    let deposit_vault = &accounts[7];
    let base_vault = &accounts[8];
    let base_oracle = &accounts[9];
    let jupiter_program = &accounts[10];
    let _token_program = &accounts[11];
    let _system_program = &accounts[12];
    let route_accounts = &accounts[13..];

    let mut c = 0;
    let loan_bump = read_u8(data, &mut c)?;
    let loan_id = read_u64(data, &mut c)?;
    let principal = read_u64(data, &mut c)?;
    let apr_bps = read_u64(data, &mut c)?;
    let term_months = read_u16(data, &mut c)?;
    let route_data = read_var(data, &mut c)?;

    require_signer(admin)?;
    let mut p = load_pool_mut(pool)?;
    ensure_not_paused(&p)?;
    if !p.assert_admin(admin.address().as_array()) { return Err(FleetError::Unauthorized.into()); }
    if principal == 0 || term_months == 0 { return Err(FleetError::Overflow.into()); }
    if loan_id != p.loan_counter { return Err(FleetError::Unauthorized.into()); }
    if route_data.is_empty() { return Err(FleetError::SwapOutputBelowMinimum.into()); }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }
    if p.base_yield_token_oracle != *base_oracle.address().as_array() {
        return Err(FleetError::Unauthorized.into());
    }
    if p.deposit_token_vault != *deposit_vault.address().as_array()
        || p.base_yield_token_vault != *base_vault.address().as_array()
    { return Err(FleetError::Unauthorized.into()); }

    let fyc_st = load_tranche(fyc)?;
    let ffc_st = load_tranche(ffc)?;
    assert_origination_allowed(&p, &fyc_st, &ffc_st, principal)?;

    let base_price = fetch_base_yield_token_price(base_oracle)?;
    let required_usyc = mul_div_u64(principal, PRECISION, base_price)?;
    if token_account_amount(base_vault)? < required_usyc {
        return Err(FleetError::InsufficientLiquidity.into());
    }

    let monthly_payment = compute_monthly_payment(principal, apr_bps, term_months)?;
    let now_ts = Clock::get()?.unix_timestamp;

    // Build pool signer.
    let auth_key = p.authority;
    let pool_bump_arr = [p.bump];
    let pool_seeds: [Seed; 3] = [
        Seed::from(POOL_SEED),
        Seed::from(&auth_key[..]),
        Seed::from(&pool_bump_arr[..]),
    ];
    let pool_signer = [Signer::from(&pool_seeds[..])];

    // Swap USYC → USDC.
    let (usyc_spent, _usdc_received) = execute_jupiter_swap_to_deposit(
        jupiter_program, base_vault, deposit_vault,
        principal, route_accounts, route_data,
        &[pool.address()], &pool_signer,
    )?;

    // Transfer principal to borrower.
    Transfer::new(deposit_vault, borrower_dep_acc, pool, principal).invoke_signed(&pool_signer)?;

    // Create loan PDA.
    let pool_key = *pool.address().as_array();
    let id_le = loan_id.to_le_bytes();
    let bump_arr = [loan_bump];
    let loan_seeds: [Seed; 4] = [
        Seed::from(LOAN_SEED),
        Seed::from(&pool_key[..]),
        Seed::from(&id_le[..]),
        Seed::from(&bump_arr[..]),
    ];
    verify_pda(loan, &[LOAN_SEED, &pool_key[..], &id_le[..]], loan_bump)?;
    let loan_signer = [Signer::from(&loan_seeds[..])];
    create_pda_account(admin, loan, LOAN_SPACE as u64, &PROGRAM_ID,
        rent_exempt_minimum(LOAN_SPACE as u64), &loan_signer)?;

    let l = LoanAccount {
        pool: pool_key,
        loan_id,
        borrower: *borrower.address().as_array(),
        status: loan_status::ACTIVE,
        _pad0: [0u8; 7],
        principal,
        apr_bps,
        term_months,
        _pad1: [0u8; 6],
        origination_ts: now_ts,
        disbursement_ts: now_ts,
        monthly_payment,
        current_balance: principal,
        months_paid: 0,
        _pad2: [0u8; 6],
        last_payment_ts: 0,
        delinquency_start_ts: 0,
        gross_loss_at_default: 0,
        recovery_amount: 0,
        bump: loan_bump,
        _pad3: [0u8; 7],
    };
    save_loan(loan, &l)?;

    p.outstanding_principal = checked_add_u64(p.outstanding_principal, principal)?;
    p.c_tokens = checked_sub_u64(p.c_tokens, usyc_spent)?;
    p.loan_counter = checked_add_u64(p.loan_counter, 1)?;
    p.active_loan_count = checked_add_u64(p.active_loan_count, 1)?;
    save_pool(pool, &p)?;
    Ok(())
}`,
  proposed: `//! Originate a loan: swap USYC→USDC, transfer principal to borrower, write loan PDA.
//!
//! Accounts (Anchor order):
//!   0  admin (signer, writable)
//!   1  pool (writable)
//!   2  fyc (writable)
//!   3  ffc (writable)
//!   4  loan (init PDA, writable)
//!   5  borrower
//!   6  borrower_deposit_token_account (writable)
//!   7  deposit_token_vault (writable)
//!   8  base_yield_token_vault (writable)
//!   9  base_yield_token_oracle
//!  10  swap_program — CHANGED, was jupiter_program; any account in ALLOWED_SWAP_PROGRAMS
//!  11  token_program
//!  12  system_program
//!  13.. route accounts
//!
//! Data: loan_bump (u8) + loan_id (u64) + principal (u64) + apr_bps (u64) +
//!       term_months (u16) + var route_data

use pinocchio::{
    account::AccountView,
    cpi::{Seed, Signer},
    sysvars::{clock::Clock, Sysvar},
    ProgramResult,
};
use pinocchio_token::instructions::Transfer;

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::amortization::{compute_monthly_payment, levelized_interest};
use crate::helpers::coverage::assert_origination_allowed;
use crate::helpers::math::{checked_add_u64, checked_sub_u64, mul_div_u64};
use crate::helpers::oracle::fetch_base_yield_token_price;
use crate::helpers::swap::execute_aggregator_swap_to_deposit;
use crate::helpers::sysprog::{create_pda_account, rent_exempt_minimum};
use crate::helpers::token_account::token_account_amount;
use crate::helpers::waterfall::ensure_not_paused;
use crate::pda::*;
use crate::state::{
    load_pool_mut, load_tranche, loan_status, save_loan, save_pool, LoanAccount, LOAN_SPACE,
};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    if accounts.len() < 13 { return Err(FleetError::InvalidAccountData.into()); }
    let admin = &accounts[0];
    let pool = &accounts[1];
    let fyc = &accounts[2];
    let ffc = &accounts[3];
    let loan = &accounts[4];
    let borrower = &accounts[5];
    let borrower_dep_acc = &accounts[6];
    let deposit_vault = &accounts[7];
    let base_vault = &accounts[8];
    let base_oracle = &accounts[9];
    let swap_program = &accounts[10];
    let _token_program = &accounts[11];
    let _system_program = &accounts[12];
    let route_accounts = &accounts[13..];

    let mut c = 0;
    let loan_bump = read_u8(data, &mut c)?;
    let loan_id = read_u64(data, &mut c)?;
    let principal = read_u64(data, &mut c)?;
    let apr_bps = read_u64(data, &mut c)?;
    let term_months = read_u16(data, &mut c)?;
    let route_data = read_var(data, &mut c)?;

    require_signer(admin)?;
    let mut p = load_pool_mut(pool)?;
    ensure_not_paused(&p)?;
    if !p.assert_admin(admin.address().as_array()) { return Err(FleetError::Unauthorized.into()); }
    if principal == 0 || term_months == 0 { return Err(FleetError::Overflow.into()); }
    if loan_id != p.loan_counter { return Err(FleetError::Unauthorized.into()); }
    if route_data.is_empty() { return Err(FleetError::SwapOutputBelowMinimum.into()); }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }
    if p.base_yield_token_oracle != *base_oracle.address().as_array() {
        return Err(FleetError::Unauthorized.into());
    }
    if p.deposit_token_vault != *deposit_vault.address().as_array()
        || p.base_yield_token_vault != *base_vault.address().as_array()
    { return Err(FleetError::Unauthorized.into()); }

    let fyc_st = load_tranche(fyc)?;
    let ffc_st = load_tranche(ffc)?;
    assert_origination_allowed(&p, &fyc_st, &ffc_st, principal)?;

    let base_price = fetch_base_yield_token_price(base_oracle)?;
    let required_usyc = mul_div_u64(principal, PRECISION, base_price)?;
    if token_account_amount(base_vault)? < required_usyc {
        return Err(FleetError::InsufficientLiquidity.into());
    }

    let monthly_payment = compute_monthly_payment(principal, apr_bps, term_months)?;
    // NEW — flat, levelized interest for this loan's life, stored on the
    // account so repay_loan.rs reads it instead of recomputing declining
    // balance interest every payment.
    let levelized_interest_amt = levelized_interest(principal, apr_bps, term_months)?;
    let now_ts = Clock::get()?.unix_timestamp;

    // Build pool signer.
    let auth_key = p.authority;
    let pool_bump_arr = [p.bump];
    let pool_seeds: [Seed; 3] = [
        Seed::from(POOL_SEED),
        Seed::from(&auth_key[..]),
        Seed::from(&pool_bump_arr[..]),
    ];
    let pool_signer = [Signer::from(&pool_seeds[..])];

    // Aggregator swap USYC → USDC (Jupiter or Titan, whichever swap_program names).
    let (usyc_spent, _usdc_received) = execute_aggregator_swap_to_deposit(
        swap_program, base_vault, deposit_vault,
        principal, route_accounts, route_data,
        &[pool.address()], &pool_signer,
    )?;

    // Transfer principal to borrower.
    Transfer::new(deposit_vault, borrower_dep_acc, pool, principal).invoke_signed(&pool_signer)?;

    // Create loan PDA.
    let pool_key = *pool.address().as_array();
    let id_le = loan_id.to_le_bytes();
    let bump_arr = [loan_bump];
    let loan_seeds: [Seed; 4] = [
        Seed::from(LOAN_SEED),
        Seed::from(&pool_key[..]),
        Seed::from(&id_le[..]),
        Seed::from(&bump_arr[..]),
    ];
    verify_pda(loan, &[LOAN_SEED, &pool_key[..], &id_le[..]], loan_bump)?;
    let loan_signer = [Signer::from(&loan_seeds[..])];
    create_pda_account(admin, loan, LOAN_SPACE as u64, &PROGRAM_ID,
        rent_exempt_minimum(LOAN_SPACE as u64), &loan_signer)?;

    let l = LoanAccount {
        pool: pool_key,
        loan_id,
        borrower: *borrower.address().as_array(),
        status: loan_status::ACTIVE,
        _pad0: [0u8; 7],
        principal,
        apr_bps,
        term_months,
        _pad1: [0u8; 6],
        origination_ts: now_ts,
        disbursement_ts: now_ts,
        monthly_payment,
        levelized_interest: levelized_interest_amt,
        current_balance: principal,
        months_paid: 0,
        _pad2: [0u8; 6],
        last_payment_ts: 0,
        gross_loss_at_default: 0,
        recovery_amount: 0,
        owed_at_default: 0,
        bump: loan_bump,
        accrual_excluded: 0,
        _pad3: [0u8; 6],
    };
    save_loan(loan, &l)?;

    p.outstanding_principal = checked_add_u64(p.outstanding_principal, principal)?;
    p.c_tokens = checked_sub_u64(p.c_tokens, usyc_spent)?;
    p.loan_counter = checked_add_u64(p.loan_counter, 1)?;
    p.active_loan_count = checked_add_u64(p.active_loan_count, 1)?;

    // NEW -- this loan joins the reward-per-second accrual pool.rs
    // compute_optimistic_price reads (see helpers/allocation.rs). Roll the
    // checkpoint up to now at the OLD rate first, then add this loan's own
    // contribution to the rate going forward.
    let elapsed = (now_ts - p.loan_accrual_updated_ts).max(0) as u64;
    p.loan_accrual_checkpoint = checked_add_u64(
        p.loan_accrual_checkpoint,
        mul_div_u64(p.loan_accrual_rate, elapsed, PRECISION)?,
    )?;
    p.loan_accrual_rate = checked_add_u64(
        p.loan_accrual_rate,
        mul_div_u64(levelized_interest_amt, PRECISION, SECONDS_PER_PERIOD as u64)?,
    )?;
    p.loan_accrual_updated_ts = now_ts;
    save_pool(pool, &p)?;
    Ok(())
}`
},
{
  path: "pinochio/src/instructions/repay_loan.rs",
  status: "M",
  category: "pinocchio",
  why: "Reads l.levelized_interest instead of calling period_interest — the core behavior change. Every downstream line (principal_portion, total_payment, balance paydown) is untouched; only the interest figure's source changes, from live declining-balance to the flat figure stored at origination. jupiter_program (account 9) also becomes swap_program: execute_jupiter_swap becomes execute_aggregator_swap, callable with either allow-listed aggregator. Also keeps pool.loan_accrual_checkpoint/rate current: this payment's `interest` comes out of the checkpoint (it's realized now, not still-accruing), and if this was the loan's last payment its rate contribution is removed entirely — the other two of the three places that keep compute_optimistic_price's real accrual estimate correct (helpers/allocation.rs), alongside originate_loan.rs and flag_pending_default.rs. Round 5 (loan lifecycle): the DELINQUENT guard branch and delinquency_start_ts reset are removed — see state.rs, grace/cure are time-derived now, never stored. Adds the day-30 LoanPastDefaultThreshold lockout, the CURE-stage extra charge (helpers/loan_lifecycle.rs::cure_fee, added on top of levelized_interest without touching principal_portion), and restores a loan's loan_accrual_rate contribution if it had been excluded mid-cure and just paid — see /loan-lifecycle.",
  original: `//! Borrower repays a monthly installment; interest is split FYC/FFC and fee minted.
//!
//! Accounts (Anchor order):
//!   0  borrower (signer, writable)
//!   1  pool (writable)
//!   2  fyc (writable)
//!   3  ffc (writable)
//!   4  loan (writable)
//!   5  borrower_deposit_token_account (writable)
//!   6  deposit_token_vault (writable)
//!   7  base_yield_token_vault (writable)
//!   8  base_yield_token_oracle
//!   9  jupiter_program
//!  10  token_program
//!  11.. route accounts
//!
//! Data: var route_data

use pinocchio::{
    account::AccountView,
    cpi::{Seed, Signer},
    sysvars::{clock::Clock, Sysvar},
    ProgramResult,
};
use pinocchio_token::instructions::Transfer;

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::amortization::period_interest;
use crate::helpers::math::{checked_add_u64, checked_sub_u64};
use crate::helpers::oracle::fetch_base_yield_token_price;
use crate::helpers::swap::execute_jupiter_swap;
use crate::helpers::waterfall::{distribute_loan_interest, refresh_conservative_prices};
use crate::pda::*;
use crate::state::{
    load_loan_mut, load_pool_mut, load_tranche_mut, loan_status, save_loan, save_pool, save_tranche,
};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    if accounts.len() < 11 { return Err(FleetError::InvalidAccountData.into()); }
    let borrower = &accounts[0];
    let pool = &accounts[1];
    let fyc = &accounts[2];
    let ffc = &accounts[3];
    let loan = &accounts[4];
    let borrower_dep_acc = &accounts[5];
    let deposit_vault = &accounts[6];
    let base_vault = &accounts[7];
    let base_oracle = &accounts[8];
    let jupiter_program = &accounts[9];
    let _token_program = &accounts[10];
    let route_accounts = &accounts[11..];

    let mut c = 0;
    let route_data = read_var(data, &mut c)?;

    require_signer(borrower)?;
    let mut p = load_pool_mut(pool)?;
    let mut l = load_loan_mut(loan)?;

    if l.borrower != *borrower.address().as_array() || l.pool != *pool.address().as_array() {
        return Err(FleetError::Unauthorized.into());
    }
    if l.status != loan_status::ACTIVE && l.status != loan_status::DELINQUENT {
        return Err(FleetError::LoanNotActive.into());
    }
    if route_data.is_empty() { return Err(FleetError::SwapOutputBelowMinimum.into()); }
    if p.base_yield_token_oracle != *base_oracle.address().as_array()
        || p.deposit_token_vault != *deposit_vault.address().as_array()
        || p.base_yield_token_vault != *base_vault.address().as_array()
    { return Err(FleetError::Unauthorized.into()); }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }

    let base_price = fetch_base_yield_token_price(base_oracle)?;
    let now_ts = Clock::get()?.unix_timestamp;

    let interest = period_interest(l.current_balance, l.apr_bps)?;
    let principal_portion = l.monthly_payment.saturating_sub(interest);
    let principal_paid = principal_portion.min(l.current_balance);
    let total_payment = checked_add_u64(principal_paid, interest)?;

    Transfer::new(borrower_dep_acc, deposit_vault, borrower, total_payment).invoke()?;

    let new_balance = checked_sub_u64(l.current_balance, principal_paid)?;
    l.current_balance = new_balance;
    l.months_paid = l.months_paid.saturating_add(1);
    l.last_payment_ts = now_ts;
    l.delinquency_start_ts = 0;
    if l.status == loan_status::DELINQUENT { l.status = loan_status::ACTIVE; }
    if new_balance == 0 || l.months_paid >= l.term_months { l.status = loan_status::REPAID; }

    // Swap USDC -> USYC.
    let auth_key = p.authority;
    let pool_bump_arr = [p.bump];
    let pool_seeds: [Seed; 3] = [
        Seed::from(POOL_SEED),
        Seed::from(&auth_key[..]),
        Seed::from(&pool_bump_arr[..]),
    ];
    let pool_signer = [Signer::from(&pool_seeds[..])];
    let received = execute_jupiter_swap(
        jupiter_program, deposit_vault, base_vault,
        base_price, total_payment,
        route_accounts, route_data,
        &[pool.address()], &pool_signer,
    )?;

    p.outstanding_principal = checked_sub_u64(p.outstanding_principal, principal_paid)?;
    p.c_tokens = checked_add_u64(p.c_tokens, received)?;
    if l.status == loan_status::REPAID {
        p.active_loan_count = p.active_loan_count.saturating_sub(1);
    }

    let mut fyc_st = load_tranche_mut(fyc)?;
    let mut ffc_st = load_tranche_mut(ffc)?;
    distribute_loan_interest(&p, &mut fyc_st, &mut ffc_st, interest, base_price, now_ts)?;
    fyc_st.last_collection_ts = now_ts;
    ffc_st.last_collection_ts = now_ts;
    refresh_conservative_prices(&mut fyc_st, &mut ffc_st)?;

    save_pool(pool, &p)?;
    save_tranche(fyc, &fyc_st)?;
    save_tranche(ffc, &ffc_st)?;
    save_loan(loan, &l)?;
    Ok(())
}`,
  proposed: `//! Borrower repays a monthly installment; interest is split FYC/FFC and fee minted.
//!
//! Accounts (Anchor order):
//!   0  borrower (signer, writable)
//!   1  pool (writable)
//!   2  fyc (writable)
//!   3  ffc (writable)
//!   4  loan (writable)
//!   5  borrower_deposit_token_account (writable)
//!   6  deposit_token_vault (writable)
//!   7  base_yield_token_vault (writable)
//!   8  base_yield_token_oracle
//!   9  swap_program — CHANGED, was jupiter_program; any account in ALLOWED_SWAP_PROGRAMS
//!  10  token_program
//!  11.. route accounts
//!
//! Data: var route_data

use pinocchio::{
    account::AccountView,
    cpi::{Seed, Signer},
    sysvars::{clock::Clock, Sysvar},
    ProgramResult,
};
use pinocchio_token::instructions::Transfer;

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::loan_lifecycle::{cure_fee, is_defaultable, is_in_cure};
use crate::helpers::math::{checked_add_u64, checked_sub_u64, mul_div_u64};
use crate::helpers::oracle::fetch_base_yield_token_price;
use crate::helpers::swap::execute_aggregator_swap;
use crate::helpers::waterfall::{distribute_loan_interest, refresh_conservative_prices};
use crate::pda::*;
use crate::state::{
    load_loan_mut, load_pool_mut, load_tranche_mut, loan_status, save_loan, save_pool, save_tranche,
};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    if accounts.len() < 11 { return Err(FleetError::InvalidAccountData.into()); }
    let borrower = &accounts[0];
    let pool = &accounts[1];
    let fyc = &accounts[2];
    let ffc = &accounts[3];
    let loan = &accounts[4];
    let borrower_dep_acc = &accounts[5];
    let deposit_vault = &accounts[6];
    let base_vault = &accounts[7];
    let base_oracle = &accounts[8];
    let swap_program = &accounts[9];
    let _token_program = &accounts[10];
    let route_accounts = &accounts[11..];

    let mut c = 0;
    let route_data = read_var(data, &mut c)?;

    require_signer(borrower)?;
    let mut p = load_pool_mut(pool)?;
    let mut l = load_loan_mut(loan)?;

    if l.borrower != *borrower.address().as_array() || l.pool != *pool.address().as_array() {
        return Err(FleetError::Unauthorized.into());
    }
    // CHANGED (round 5) — a loan stays ACTIVE the entire way through grace
    // and cure (see state.rs's loan_status doc comments), so this guard
    // never needed a second branch for a DELINQUENT status. Round 8 dropped
    // that enum value entirely — see state.rs.
    if l.status != loan_status::ACTIVE {
        return Err(FleetError::LoanNotActive.into());
    }
    if route_data.is_empty() { return Err(FleetError::SwapOutputBelowMinimum.into()); }
    if p.base_yield_token_oracle != *base_oracle.address().as_array()
        || p.deposit_token_vault != *deposit_vault.address().as_array()
        || p.base_yield_token_vault != *base_vault.address().as_array()
    { return Err(FleetError::Unauthorized.into()); }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }

    let base_price = fetch_base_yield_token_price(base_oracle)?;
    let now_ts = Clock::get()?.unix_timestamp;
    let next_due = l.next_payment_due_ts();

    // NEW (round 5) — past the full 30-day grace+cure window, this loan is
    // only resolvable via finalize_default; no amount of cash showing up
    // here reopens it. Computed fresh off Clock, not off any stored status
    // — see helpers/loan_lifecycle.rs.
    if is_defaultable(now_ts, next_due) {
        return Err(FleetError::LoanPastDefaultThreshold.into());
    }

    // NEW (round 5) — during CURE, the borrower owes an EXTRA charge on top
    // of the normal payment: true declining-balance interest at 1.25x the
    // loan's own rate, minus the same at its real rate, for this one
    // period (helpers/loan_lifecycle.rs::cure_fee). Pure interest —
    // principal_portion below is still sized off l.levelized_interest
    // alone, so the cure fee never eats into principal paydown, and
    // total_payment simply comes out larger by exactly the cure fee.
    let cure_charge = if is_in_cure(now_ts, next_due) {
        cure_fee(l.current_balance, l.apr_bps)?
    } else {
        0
    };
    // CHANGED — flat, levelized interest stored at origination, plus this
    // period's cure charge if any. Was: period_interest(l.current_balance,
    // l.apr_bps), true declining-balance, recomputed live every payment.
    let interest = checked_add_u64(l.levelized_interest, cure_charge)?;
    let principal_portion = l.monthly_payment.saturating_sub(l.levelized_interest);
    let principal_paid = principal_portion.min(l.current_balance);
    let total_payment = checked_add_u64(principal_paid, interest)?;

    Transfer::new(borrower_dep_acc, deposit_vault, borrower, total_payment).invoke()?;

    let new_balance = checked_sub_u64(l.current_balance, principal_paid)?;
    l.current_balance = new_balance;
    l.months_paid = l.months_paid.saturating_add(1);
    l.last_payment_ts = now_ts;
    if new_balance == 0 || l.months_paid >= l.term_months { l.status = loan_status::REPAID; }

    // Aggregator swap USDC -> USYC (Jupiter or Titan, whichever swap_program names).
    let auth_key = p.authority;
    let pool_bump_arr = [p.bump];
    let pool_seeds: [Seed; 3] = [
        Seed::from(POOL_SEED),
        Seed::from(&auth_key[..]),
        Seed::from(&pool_bump_arr[..]),
    ];
    let pool_signer = [Signer::from(&pool_seeds[..])];
    let received = execute_aggregator_swap(
        swap_program, deposit_vault, base_vault,
        base_price, total_payment,
        route_accounts, route_data,
        &[pool.address()], &pool_signer,
    )?;

    p.outstanding_principal = checked_sub_u64(p.outstanding_principal, principal_paid)?;
    p.c_tokens = checked_add_u64(p.c_tokens, received)?;
    if l.status == loan_status::REPAID {
        p.active_loan_count = p.active_loan_count.saturating_sub(1);
    }

    // NEW -- this payment just realized \`interest\` for real, so it comes out
    // of the still-accruing checkpoint (roll up to now at the OLD rate
    // first, then subtract what just got paid). If this was the loan's last
    // payment, it also leaves the accrual pool entirely -- remove its rate
    // contribution the same way originate_loan.rs added it.
    //
    // CHANGED (round 5) — subtracts l.levelized_interest here, NOT the
    // bumped \`interest\` used for the actual cash payment above. The cure
    // charge was never part of pool.loan_accrual_rate's continuous rate (it's
    // a one-off per-payment charge, not a rate change), so it was never
    // accrued into the checkpoint either — subtracting the bumped total
    // here would over-remove and silently corrupt the checkpoint for every
    // OTHER loan sharing this same pool-wide accumulator.
    let elapsed = (now_ts - p.loan_accrual_updated_ts).max(0) as u64;
    p.loan_accrual_checkpoint = checked_add_u64(
        p.loan_accrual_checkpoint,
        mul_div_u64(p.loan_accrual_rate, elapsed, PRECISION)?,
    )?.saturating_sub(l.levelized_interest);
    let rate_contribution = mul_div_u64(l.levelized_interest, PRECISION, SECONDS_PER_PERIOD as u64)?;
    if l.status == loan_status::REPAID {
        // Only remove if finalize_default.rs's early CURE-stage exclusion
        // hasn't already done it — otherwise this loan's contribution gets
        // subtracted twice.
        if l.accrual_excluded == 0 {
            p.loan_accrual_rate = p.loan_accrual_rate.saturating_sub(rate_contribution);
        }
    } else if l.accrual_excluded == 1 {
        // NEW (round 5) — this loan's rate was pulled out mid-CURE
        // (finalize_default.rs's early exclusion sync, see
        // helpers/loan_lifecycle.rs); it just paid and is current again,
        // so restore its contribution instead of leaving it silently
        // missing from the estimate forever.
        p.loan_accrual_rate = checked_add_u64(p.loan_accrual_rate, rate_contribution)?;
        l.accrual_excluded = 0;
    }
    p.loan_accrual_updated_ts = now_ts;

    let mut fyc_st = load_tranche_mut(fyc)?;
    let mut ffc_st = load_tranche_mut(ffc)?;
    // CHANGED — distribute_loan_interest no longer needs base_price/now_ts;
    // coverage and severity are read directly off pool + tranche state.
    distribute_loan_interest(&p, &mut fyc_st, &mut ffc_st, interest)?;
    fyc_st.last_collection_ts = now_ts;
    ffc_st.last_collection_ts = now_ts;
    refresh_conservative_prices(&mut fyc_st, &mut ffc_st)?;

    save_pool(pool, &p)?;
    save_tranche(fyc, &fyc_st)?;
    save_tranche(ffc, &ffc_st)?;
    save_loan(loan, &l)?;
    Ok(())
}`
},
{
  path: "pinochio/src/instructions/finalize_default.rs",
  status: "M",
  category: "pinocchio",
  why: "RENAMED from flag_pending_default.rs (round 5, loan lifecycle) — the ix_tag NUMERIC discriminant (6) is unchanged, this is a same-slot rename + full behavior swap, not a new instruction (see lib.rs). The old version was admin-only and staged (call once to flag DELINQUENT, call again after CURE_PERIOD_DAYS to reach PENDING_DEFAULT). The new version is permissionless — every check is a deterministic read of Clock against LoanAccount.next_payment_due_ts(), never a stored status, so there's no privileged judgment call left to gate behind an admin — and does two different jobs depending on how late the loan actually is: (1) during CURE, pulls the loan's contribution out of pool.loan_accrual_rate the same way the old version did at pending-default, just retimed earlier — bounds how long a since-defaulted loan's interest can inflate a same-window mint's optimistic price to at most GRACE_PERIOD_DAYS instead of the old full cure window; (2) past the full 30-day grace+cure window, finalizes the loan to DEFAULTED, computing owed_at_default = current_balance + levelized_interest + one period's cure_fee — the accrued-but-uncollected interest for the loan's final unpaid period, folded into what's owed rather than written off. See helpers/loan_lifecycle.rs and /loan-lifecycle.",
  original: `//! Flag a delinquent loan as PendingDefault after the cure period elapses.
//! Accounts: [admin, pool, loan]
//! Data: ()

use pinocchio::{account::AccountView, sysvars::{clock::Clock, Sysvar}, ProgramResult};

use crate::constants::{CURE_PERIOD_DAYS, SECONDS_PER_DAY, SECONDS_PER_PERIOD};
use crate::errors::FleetError;
use crate::pda::*;
use crate::state::{load_loan_mut, load_pool, loan_status, save_loan};

pub fn process(accounts: &[AccountView], _data: &[u8]) -> ProgramResult {
    let [admin, pool, loan, ..] = accounts else { return Err(FleetError::InvalidAccountData.into()) };
    require_signer(admin)?;
    let p = load_pool(pool)?;
    if !p.assert_admin(admin.address().as_array()) { return Err(FleetError::Unauthorized.into()); }

    let mut l = load_loan_mut(loan)?;
    if l.pool != *pool.address().as_array() { return Err(FleetError::Unauthorized.into()); }

    let now_ts = Clock::get()?.unix_timestamp;
    if l.status == loan_status::ACTIVE {
        let next_due = l.disbursement_ts + (l.months_paid as i64 + 1) * SECONDS_PER_PERIOD;
        if now_ts > next_due {
            l.status = loan_status::DELINQUENT;
            l.delinquency_start_ts = next_due;
        }
    }
    if l.status != loan_status::DELINQUENT { return Err(FleetError::LoanNotDelinquent.into()); }

    let days_overdue = (now_ts - l.delinquency_start_ts) / SECONDS_PER_DAY;
    if days_overdue < CURE_PERIOD_DAYS { return Err(FleetError::CurePeriodNotExpired.into()); }

    l.status = loan_status::PENDING_DEFAULT;
    save_loan(loan, &l)?;
    Ok(())
}
`,
  proposed: `//! Permissionless: advances a loan's on-chain bookkeeping to match its
//! real, time-derived stage. No admin, no signer required — every branch
//! is a deterministic read of Clock against LoanAccount.next_payment_due_ts(),
//! never a stored status, so there's no privileged judgment call to gate.
//! Two jobs depending on how late the loan actually is:
//!   - CURE: pull this loan's contribution out of pool.loan_accrual_rate.
//!   - past grace+cure (30 days): finalize DEFAULTED, compute owed_at_default.
//! RENAMED from flag_pending_default.rs — ix_tag discriminant (6) unchanged.
//! Accounts: [payer, pool, loan]
//! Data: ()

use pinocchio::{account::AccountView, sysvars::{clock::Clock, Sysvar}, ProgramResult};

use crate::constants::{PRECISION, SECONDS_PER_PERIOD};
use crate::errors::FleetError;
use crate::helpers::loan_lifecycle::{cure_fee, is_defaultable, is_in_cure};
use crate::helpers::math::{checked_add_u64, mul_div_u64};
use crate::pda::*;
use crate::state::{load_loan_mut, load_pool_mut, loan_status, save_loan, save_pool};

pub fn process(accounts: &[AccountView], _data: &[u8]) -> ProgramResult {
    let [_payer, pool, loan, ..] = accounts else { return Err(FleetError::InvalidAccountData.into()) };
    // Deliberately no require_signer/admin check — every branch below is a
    // deterministic function of Clock and fields the loan already carries;
    // there's no judgment call being made, so anyone can trigger it.
    let mut p = load_pool_mut(pool)?;
    let mut l = load_loan_mut(loan)?;
    if l.pool != *pool.address().as_array() { return Err(FleetError::Unauthorized.into()); }
    if l.status != loan_status::ACTIVE { return Err(FleetError::LoanNotActive.into()); }

    let now_ts = Clock::get()?.unix_timestamp;
    let next_due = l.next_payment_due_ts();

    if is_defaultable(now_ts, next_due) {
        // The full 30-day grace+cure window elapsed with no payment.
        // owed_at_default folds in the accrued-but-uncollected interest for
        // the loan's final unpaid period — see state.rs's doc comment —
        // rather than silently writing it off.
        let charge = cure_fee(l.current_balance, l.apr_bps)?;
        let owed = checked_add_u64(
            checked_add_u64(l.current_balance, l.levelized_interest)?,
            charge,
        )?;
        l.owed_at_default = owed;
        l.status = loan_status::DEFAULTED;

        let elapsed = (now_ts - p.loan_accrual_updated_ts).max(0) as u64;
        p.loan_accrual_checkpoint = p.loan_accrual_checkpoint
            .saturating_add(mul_div_u64(p.loan_accrual_rate, elapsed, PRECISION)?);
        if l.accrual_excluded == 0 {
            let rate_contribution = mul_div_u64(l.levelized_interest, PRECISION, SECONDS_PER_PERIOD as u64)?;
            p.loan_accrual_rate = p.loan_accrual_rate.saturating_sub(rate_contribution);
            l.accrual_excluded = 1;
        }
        p.loan_accrual_updated_ts = now_ts;
        save_pool(pool, &p)?;
    } else if is_in_cure(now_ts, next_due) && l.accrual_excluded == 0 {
        // Early exclusion — stop counting this loan's assumed accrual the
        // moment it's genuinely at risk (CURE entry), not the full 30 days
        // later at finalize. Bounds how long a since-defaulted loan's
        // interest could still be inflating a same-window mint's price to
        // at most GRACE_PERIOD_DAYS — see /loan-lifecycle.
        let elapsed = (now_ts - p.loan_accrual_updated_ts).max(0) as u64;
        p.loan_accrual_checkpoint = p.loan_accrual_checkpoint
            .saturating_add(mul_div_u64(p.loan_accrual_rate, elapsed, PRECISION)?);
        let rate_contribution = mul_div_u64(l.levelized_interest, PRECISION, SECONDS_PER_PERIOD as u64)?;
        p.loan_accrual_rate = p.loan_accrual_rate.saturating_sub(rate_contribution);
        p.loan_accrual_updated_ts = now_ts;
        l.accrual_excluded = 1;
        save_pool(pool, &p)?;
    } else {
        // Still in plain GRACE, or already excluded during CURE with
        // nothing new to do — nothing for this call to advance yet.
        return Err(FleetError::LoanNotYetDefaultable.into());
    }

    save_loan(loan, &l)?;
    Ok(())
}
`
},
{
  path: "pinochio/src/instructions/resell_defaulted_loan.rs",
  status: "U",
  category: "pinocchio",
  why: "New file (round 5, loan lifecycle) — one of the three first-come-first-served resolution paths for a DEFAULTED loan (resell / relist via originate_loan / IOU — see /loan-lifecycle; IOU has no on-chain instruction yet, deliberately unspecified). Admin supplies the ACTUAL sale/repossession proceeds (recovery_amount) after the vehicle is sold; loss is computed FROM that number against owed_at_default (current_balance + the final period's levelized_interest + cure_fee, set once by finalize_default.rs), not assumed upfront the way approve_default.rs used to. If recovery covers the full amount owed, there's no loss at all and any surplus is transferred back to the borrower — repossession law standard practice, and explicit per this round's design discussion. If recovery falls short, only the deficit runs through apply_default_waterfall (FFC -> insurance-held FYC -> general FYC — the three-tier order already fixed in helpers/waterfall.rs, see that file's own why for the insurance-first correction vs the live contract's post-hoc price-smoothing). Sets status = RESOLVED, the terminal marker the other two resolution paths (relist, IOU) must check to enforce mutual exclusion — whichever of the three paths lands first wins, and the other two must reject a loan that's already RESOLVED. ROUND 7 FIX: the round-5 version never actually moved recovery_amount into the pool — it only transferred surplus OUT (overpay case) and ran the deficit through the waterfall (underpay case), but the recovered cash itself was just a number in instruction data the admin asserted, with no matching token transfer. outstanding_principal dropped by the full current_balance regardless, so the books marked the debt collected without any cash landing — a real value-invention/leakage path, caught during an end-to-end review (see END_TO_END_PROTOCOL_SIMULATION.md §9). Fixed by adding admin_proceeds_acc — a new account holding the actual sale proceeds (already converted to the deposit token off-chain, e.g. the vehicle sold for cash then converted to USDC) — and an unconditional Transfer of the full recovery_amount from it into deposit_vault, BEFORE the existing surplus/deficit branch. Net effect unchanged from what round 5 already computed for surplus and loss; what's new is that the vault's real token balance now actually reflects it.",
  original: "",
  proposed: `//! Resell a DEFAULTED loan's repossessed collateral for actual cash
//! proceeds. One of three first-come-first-served resolution paths for a
//! defaulted loan (resell / relist / IOU) — see /loan-lifecycle. Admin-only:
//! this attests to a real-world sale price, a genuine judgment call, unlike
//! finalize_default.rs's fully mechanical Clock checks.
//! Accounts: [admin, pool, fyc, ffc, loan, admin_proceeds_account,
//!            borrower_deposit_token_account, deposit_token_vault, token_program]
//! admin_proceeds_account — NEW (round 7) — holds the actual sale proceeds
//! (already converted to the deposit token off-chain); the FULL
//! recovery_amount moves from here into deposit_vault before any
//! surplus/deficit accounting. Without this leg, recovery_amount was only
//! ever a number in instruction data — nothing moved it into the pool.
//! Data: recovery_amount (u64)

use pinocchio::{account::AccountView, cpi::{Seed, Signer}, ProgramResult};
use pinocchio_token::instructions::Transfer;

use crate::errors::FleetError;
use crate::helpers::math::{checked_add_u64, checked_sub_u64};
use crate::helpers::waterfall::{apply_default_waterfall, refresh_conservative_prices};
use crate::pda::*;
use crate::state::{
    load_loan_mut, load_pool_mut, load_tranche_mut, loan_status, save_loan, save_pool, save_tranche,
};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    let [
        admin, pool, fyc, ffc, loan, admin_proceeds_acc, borrower_dep_acc, deposit_vault,
        _token_program, ..
    ] = accounts else {
        return Err(FleetError::InvalidAccountData.into());
    };
    let mut c = 0;
    let recovery_amount = read_u64(data, &mut c)?;

    require_signer(admin)?;
    let mut p = load_pool_mut(pool)?;
    if !p.assert_admin(admin.address().as_array()) { return Err(FleetError::Unauthorized.into()); }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }

    let mut l = load_loan_mut(loan)?;
    if l.pool != *pool.address().as_array() { return Err(FleetError::Unauthorized.into()); }
    // NEW (round 5) — mutual exclusion across the three resolution paths.
    // Reuses the existing LoanNotDefaulted for "not DEFAULTED yet" (covers
    // ACTIVE/REPAID too) and the new LoanAlreadyResolved for "already
    // closed by whichever of the three paths got there first."
    if l.status == loan_status::RESOLVED { return Err(FleetError::LoanAlreadyResolved.into()); }
    if l.status != loan_status::DEFAULTED { return Err(FleetError::LoanNotDefaulted.into()); }

    // NEW (round 7) — the actual cash-in leg. Pulls the FULL recovery_amount
    // from the admin's own proceeds account into deposit_vault, admin-signed
    // (not pool-signed — this is money moving INTO the pool, not out of it),
    // BEFORE any surplus/deficit accounting below. Without this, the vault's
    // real balance never reflected what was supposedly recovered.
    if recovery_amount > 0 {
        Transfer::new(admin_proceeds_acc, deposit_vault, admin, recovery_amount).invoke()?;
    }

    let auth_key = p.authority;
    let pool_bump_arr = [p.bump];
    let pool_seeds: [Seed; 3] = [
        Seed::from(POOL_SEED),
        Seed::from(&auth_key[..]),
        Seed::from(&pool_bump_arr[..]),
    ];
    let pool_signer = [Signer::from(&pool_seeds[..])];

    let owed = l.owed_at_default;
    if recovery_amount >= owed {
        // NEW (round 5) — surplus goes back to the borrower, not the pool;
        // standard repossession practice, explicit per design discussion.
        // No loss at all: nothing touches fyc/ffc. The surplus being paid
        // back out here was part of what round 7 just deposited above.
        let surplus = recovery_amount - owed;
        if surplus > 0 {
            Transfer::new(deposit_vault, borrower_dep_acc, pool, surplus).invoke_signed(&pool_signer)?;
        }
        l.gross_loss_at_default = 0;
    } else {
        // NEW (round 5) — loss is the DEFICIT after actual recovery, not an
        // upfront-assumed figure (see approve_default.rs's deprecation why).
        let loss = owed - recovery_amount;
        let mut fyc_st = load_tranche_mut(fyc)?;
        let mut ffc_st = load_tranche_mut(ffc)?;
        apply_default_waterfall(&mut fyc_st, &mut ffc_st, loss)?;
        refresh_conservative_prices(&mut fyc_st, &mut ffc_st)?;
        save_tranche(fyc, &fyc_st)?;
        save_tranche(ffc, &ffc_st)?;
        p.realized_losses = checked_add_u64(p.realized_losses, loss)?;
        l.gross_loss_at_default = loss;
    }

    p.outstanding_principal = checked_sub_u64(p.outstanding_principal, l.current_balance)?;
    p.active_loan_count = p.active_loan_count.saturating_sub(1);
    l.recovery_amount = recovery_amount;
    l.status = loan_status::RESOLVED;

    save_pool(pool, &p)?;
    save_loan(loan, &l)?;
    Ok(())
}
`
},
{
  path: "pinochio/src/instructions/relist_defaulted_loan.rs",
  status: "U",
  category: "pinocchio",
  why: "New file (round 5, loan lifecycle) — the second of three first-come-first-served resolution paths for a DEFAULTED loan (resell / relist / IOU — see /loan-lifecycle; IOU has no on-chain instruction yet, deliberately unspecified). Deliberately its OWN instruction rather than a branch bolted onto originate_loan.rs: a relist's cash flow is fundamentally different from a normal origination — the collateral is already repossessed, so there's no swap-to-deposit leg and no principal disbursed to anyone. The new borrower's new_principal directly REPLACES the old loan's owed_at_default (the pool's outstanding book stays economically whole, old debt swapped for new); only the DEFICIT if new_principal falls short runs through the same insurance-first three-tier waterfall resell_defaulted_loan.rs uses. Equity and the origination fee (ORIGINATION_FEE_BPS, constants.rs — the design tool's lib/model.ts ORIGINATION_FEE_FRACTION concept getting its first real Rust implementation) are both charged, same as any other origination. ASSUMPTION, flagged for explicit sign-off on /loan-lifecycle: close-out-old + originate-new happen ATOMICALLY in this one instruction, and relisting still re-clears assert_origination_allowed's severity gate — both were open questions during design, defaulted here rather than left unbuilt. Simplification: equity is deposited as-is (no swap into the yield-bearing reserve), unlike a real deposit's swap leg — reasonable to defer, not core to the mechanism.",
  original: "",
  proposed: `//! Relist a DEFAULTED loan's repossessed collateral as a new loan for a
//! new (or the same) borrower. Closes the old loan out and originates the
//! new one atomically — see this file's own why for the atomicity and
//! severity-gate assumptions flagged for sign-off. One of three first-
//! come-first-served resolution paths for a defaulted loan (resell /
//! relist / IOU) — see /loan-lifecycle.
//! Accounts: [admin, pool, fyc, ffc, old_loan, new_loan (init PDA),
//!            new_borrower, new_borrower_token_account, deposit_token_vault,
//!            protocol_wallet_token_account, token_program, system_program]
//! Data: loan_bump (u8) + loan_id (u64) + new_principal (u64) + apr_bps (u64)
//!       + term_months (u16) + equity_amount (u64)

use pinocchio::{
    account::AccountView,
    cpi::{Seed, Signer},
    sysvars::{clock::Clock, Sysvar},
    ProgramResult,
};
use pinocchio_token::instructions::Transfer;

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::amortization::{compute_monthly_payment, levelized_interest};
use crate::helpers::coverage::assert_origination_allowed;
use crate::helpers::math::{checked_add_u64, checked_sub_u64, mul_div_u64};
use crate::helpers::sysprog::{create_pda_account, rent_exempt_minimum};
use crate::helpers::waterfall::{apply_default_waterfall, refresh_conservative_prices};
use crate::pda::*;
use crate::state::{
    load_loan_mut, load_pool_mut, load_tranche, load_tranche_mut, loan_status, save_loan, save_pool,
    save_tranche, LoanAccount, LOAN_SPACE,
};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    let [admin, pool, fyc, ffc, old_loan, new_loan, new_borrower, new_borrower_acc,
         deposit_vault, protocol_wallet_acc, _token_program, _system_program, ..] = accounts else {
        return Err(FleetError::InvalidAccountData.into());
    };
    let mut c = 0;
    let loan_bump = read_u8(data, &mut c)?;
    let loan_id = read_u64(data, &mut c)?;
    let new_principal = read_u64(data, &mut c)?;
    let apr_bps = read_u64(data, &mut c)?;
    let term_months = read_u16(data, &mut c)?;
    let equity_amount = read_u64(data, &mut c)?;

    require_signer(admin)?;
    let mut p = load_pool_mut(pool)?;
    if !p.assert_admin(admin.address().as_array()) { return Err(FleetError::Unauthorized.into()); }
    if loan_id != p.loan_counter { return Err(FleetError::Unauthorized.into()); }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }

    let mut old = load_loan_mut(old_loan)?;
    if old.pool != *pool.address().as_array() { return Err(FleetError::Unauthorized.into()); }
    // Mutual exclusion — same guard as resell_defaulted_loan.rs.
    if old.status == loan_status::RESOLVED { return Err(FleetError::LoanAlreadyResolved.into()); }
    if old.status != loan_status::DEFAULTED { return Err(FleetError::LoanNotDefaulted.into()); }

    // ASSUMPTION (flagged on /loan-lifecycle for sign-off): a relist still
    // has to clear the same severity gate a brand-new loan would, even
    // though it's economically replacing existing debt rather than adding
    // fresh risk — protects against relisting into an already-unsafe pool.
    let fyc_st_ro = load_tranche(fyc)?;
    let ffc_st_ro = load_tranche(ffc)?;
    assert_origination_allowed(&p, &fyc_st_ro, &ffc_st_ro, new_principal)?;

    // NEW (round 5) — equity and the origination fee, same as any other
    // origination would charge (ORIGINATION_FEE_BPS — ORIGINATION_FEE_FRACTION's
    // first real Rust implementation). Simplification: deposited as-is, no
    // swap into the yield-bearing reserve — see this file's own why.
    let origination_fee = mul_div_u64(new_principal, ORIGINATION_FEE_BPS, BPS_DENOMINATOR)?;
    Transfer::new(new_borrower_acc, deposit_vault, new_borrower, equity_amount).invoke()?;
    Transfer::new(new_borrower_acc, protocol_wallet_acc, new_borrower, origination_fee).invoke()?;

    // NEW (round 5) — new_principal directly replaces owed_at_default; only
    // the shortfall (if any) is a real loss, same insurance-first waterfall
    // resell_defaulted_loan.rs uses. Equity above is separate — it doesn't
    // offset the old debt, it's the new loan's own normal underwriting.
    let owed = old.owed_at_default;
    if new_principal < owed {
        let deficit = owed - new_principal;
        let mut fyc_st = load_tranche_mut(fyc)?;
        let mut ffc_st = load_tranche_mut(ffc)?;
        apply_default_waterfall(&mut fyc_st, &mut ffc_st, deficit)?;
        refresh_conservative_prices(&mut fyc_st, &mut ffc_st)?;
        save_tranche(fyc, &fyc_st)?;
        save_tranche(ffc, &ffc_st)?;
        p.realized_losses = checked_add_u64(p.realized_losses, deficit)?;
        old.gross_loss_at_default = deficit;
    } else {
        old.gross_loss_at_default = 0;
    }
    old.recovery_amount = new_principal;
    old.status = loan_status::RESOLVED;
    p.outstanding_principal = checked_sub_u64(p.outstanding_principal, old.current_balance)?;
    p.active_loan_count = p.active_loan_count.saturating_sub(1);
    save_loan(old_loan, &old)?;

    // Create the new loan PDA — same shape as originate_loan.rs, no
    // swap/disbursement leg (the collateral is already repossessed, there's
    // no fresh cash to hand anyone).
    let now_ts = Clock::get()?.unix_timestamp;
    let monthly_payment = compute_monthly_payment(new_principal, apr_bps, term_months)?;
    let levelized_interest_amt = levelized_interest(new_principal, apr_bps, term_months)?;

    let pool_key = *pool.address().as_array();
    let id_le = loan_id.to_le_bytes();
    let bump_arr = [loan_bump];
    let loan_seeds: [Seed; 4] = [
        Seed::from(LOAN_SEED),
        Seed::from(&pool_key[..]),
        Seed::from(&id_le[..]),
        Seed::from(&bump_arr[..]),
    ];
    verify_pda(new_loan, &[LOAN_SEED, &pool_key[..], &id_le[..]], loan_bump)?;
    let loan_signer = [Signer::from(&loan_seeds[..])];
    create_pda_account(admin, new_loan, LOAN_SPACE as u64, &PROGRAM_ID,
        rent_exempt_minimum(LOAN_SPACE as u64), &loan_signer)?;

    let l = LoanAccount {
        pool: pool_key,
        loan_id,
        borrower: *new_borrower.address().as_array(),
        status: loan_status::ACTIVE,
        _pad0: [0u8; 7],
        principal: new_principal,
        apr_bps,
        term_months,
        _pad1: [0u8; 6],
        origination_ts: now_ts,
        disbursement_ts: now_ts,
        monthly_payment,
        levelized_interest: levelized_interest_amt,
        current_balance: new_principal,
        months_paid: 0,
        _pad2: [0u8; 6],
        last_payment_ts: 0,
        gross_loss_at_default: 0,
        recovery_amount: 0,
        owed_at_default: 0,
        bump: loan_bump,
        accrual_excluded: 0,
        _pad3: [0u8; 6],
    };
    save_loan(new_loan, &l)?;

    p.outstanding_principal = checked_add_u64(p.outstanding_principal, new_principal)?;
    p.loan_counter = checked_add_u64(p.loan_counter, 1)?;
    p.active_loan_count = checked_add_u64(p.active_loan_count, 1)?;

    let elapsed = (now_ts - p.loan_accrual_updated_ts).max(0) as u64;
    p.loan_accrual_checkpoint = checked_add_u64(
        p.loan_accrual_checkpoint,
        mul_div_u64(p.loan_accrual_rate, elapsed, PRECISION)?,
    )?;
    p.loan_accrual_rate = checked_add_u64(
        p.loan_accrual_rate,
        mul_div_u64(levelized_interest_amt, PRECISION, SECONDS_PER_PERIOD as u64)?,
    )?;
    p.loan_accrual_updated_ts = now_ts;
    save_pool(pool, &p)?;
    Ok(())
}
`
},
{
  path: "pinochio/src/instructions/run_yield_epoch.rs",
  status: "M",
  category: "pinocchio",
  why: "Two modes, one instruction: mode=0 ticks the pool's primary reserve, byte-for-byte the same math as the monorepo baseline, still writing PoolState's own c_tokens/last_base_yield_token_price/last_epoch_ts. mode=1 — a yield_source account inserted before the oracle — ticks THAT registered YieldSourceState (USDY, syrupUSDC, ...) instead, using the same observed_source_apy_bps-style 24h-epoch math from helpers/allocation.rs, without ever touching PoolState. Adding a source's epoch tick is a mode flag, not a new instruction or a new tag. Round 2: the 6-account branch now also writes the derived rate into YieldSourceState.observed_apy_bps, feeding helpers/liquidity.rs::blended_apy — WHICH source new capital should route into (the [3%, 3.5%, 7%] target-range logic) is deliberately kept an off-chain preview computation, not folded into this instruction; this instruction only ever ticks the one source it's given. Deliberately NOT gated on is_active: a disabled source still gets ticked here (fresh Pyth price, fresh observed_apy_bps, its net yield still split into FYC/FFC) for as long as it holds capital — disabling only stops new deposits (deposit_yield_token.rs) and new-capital routing (helpers/liquidity.rs::pick_rebalance_target), not the source's own yield accrual. Gating the tick on is_active would have frozen a disabled source's reported APY and stopped distributing yield it's still genuinely earning, which is exactly the bug helpers/liquidity.rs::blended_apy_bps was also fixed to stop assuming (see that file's own why). Round 3: the 5-account (primary reserve) branch NOW ALSO writes an annualized rate into the new PoolState.last_observed_base_apy_bps, the same way the 6-account branch already does for YieldSourceState.observed_apy_bps — this WAS the one asymmetry left after round 2 (every additional source tracked its own observed APY; the original primary reserve never did), and it's what lets distribute_loan_interest (helpers/waterfall.rs) enforce the new FYC APY cap without needing its own oracle read at repay time. ROUND 6: v_pool used to only sum the primary reserve here regardless of branch — flagged in this file's own round-3 comment as a tracked helpers/pricing.rs follow-up, now actually fixed. The old 'count the accounts array' trick that disambiguated the 5-vs-6-account branch no longer works once a variable-length trailing tail of other-source pairs is allowed, so Data gains an explicit mode byte (0 = primary tick, 1 = source tick) and the account list becomes [authority, pool, fyc, ffc, base_oracle, ...other pairs] or [authority, pool, fyc, ffc, yield_source, oracle, ...other pairs]. Whichever source this call actually ticks contributes its own just-refreshed price to v_pool directly; load_other_sources (helpers/allocation.rs) supplies every other registered source's live price for the rest of the sum. ROUND 8: require_complete_source_list now rejects either branch's call if its final source count falls short of pool.yield_source_count — an epoch tick can no longer silently split yield against a partial pool-wide total.",
  original: `//! Distribute newly-accrued base-yield-token yield (epoch tick).
//! Accounts: [authority, pool, fyc, ffc, base_yield_token_oracle]
//! Data: ()

use pinocchio::{account::AccountView, sysvars::{clock::Clock, Sysvar}, ProgramResult};

use crate::constants::{BPS_DENOMINATOR, NET_YIELD_BPS, PRECISION};
use crate::errors::FleetError;
use crate::helpers::fees::mint_fee_value_into_fyc;
use crate::helpers::math::mul_div_u64;
use crate::helpers::oracle::fetch_base_yield_token_price;
use crate::helpers::pricing::compute_v_pool;
use crate::helpers::waterfall::{refresh_conservative_prices, split_base_yield_token_yield};
use crate::pda::*;
use crate::state::{load_pool_mut, load_tranche_mut, save_pool, save_tranche};

pub fn process(accounts: &[AccountView], _data: &[u8]) -> ProgramResult {
    let [authority, pool, fyc, ffc, base_oracle, ..] = accounts else {
        return Err(FleetError::InvalidAccountData.into());
    };
    require_signer(authority)?;
    let mut p = load_pool_mut(pool)?;
    if !p.assert_authority(authority.address().as_array()) { return Err(FleetError::Unauthorized.into()); }
    if p.base_yield_token_oracle != *base_oracle.address().as_array() {
        return Err(FleetError::Unauthorized.into());
    }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }

    let now_ts = Clock::get()?.unix_timestamp;
    let price_now = fetch_base_yield_token_price(base_oracle)?;
    let price_last = p.last_base_yield_token_price;
    if price_now < price_last { return Err(FleetError::StaleOraclePrice.into()); }

    let price_delta = price_now - price_last;
    let gross_yield = mul_div_u64(p.c_tokens, price_delta, PRECISION)?;
    let net_yield = mul_div_u64(gross_yield, NET_YIELD_BPS, BPS_DENOMINATOR)?;
    let fee_value = gross_yield.saturating_sub(net_yield);

    let v_pool = compute_v_pool(&p, price_now)?;
    let mut fyc_st = load_tranche_mut(fyc)?;
    let mut ffc_st = load_tranche_mut(ffc)?;

    split_base_yield_token_yield(&mut fyc_st, &mut ffc_st, net_yield, v_pool)?;
    mint_fee_value_into_fyc(&mut fyc_st, fee_value)?;
    refresh_conservative_prices(&mut fyc_st, &mut ffc_st)?;

    p.last_base_yield_token_price = price_now;
    p.last_epoch_ts = now_ts;

    save_pool(pool, &p)?;
    save_tranche(fyc, &fyc_st)?;
    save_tranche(ffc, &ffc_st)?;
    Ok(())
}
`,
  proposed: `//! Distribute newly-accrued yield (epoch tick). mode=0 ticks the pool's
//! original primary reserve exactly as before (PoolState's own c_tokens/
//! last_base_yield_token_price/last_epoch_ts). mode=1 ticks one registered
//! non-primary YieldSourceState instead (USDY, syrupUSDC, ...), so adding a
//! source never requires a new instruction or a new tag.
//! Accounts: [authority, pool, fyc, ffc, base_oracle, ...other_source_pairs]
//!        or [authority, pool, fyc, ffc, yield_source, oracle, ...other_source_pairs]
//! other_source_pairs — NEW (round 6) — zero or more trailing (yield_source, oracle)
//! pairs, one per OTHER registered source, so v_pool sums the pool's real total
//! instead of just whichever single source this call ticks.
//! Data: mode (u8) — NEW (round 6): the accounts-array length alone no longer
//! disambiguates the branch once a variable-length trailing tail is allowed.

use pinocchio::{account::AccountView, cpi::Seed, sysvars::{clock::Clock, Sysvar}, ProgramResult};

use crate::constants::{BPS_DENOMINATOR, MAX_HARMONIZED_SOURCES, NET_YIELD_BPS, PRECISION, SECONDS_PER_YEAR};
use crate::errors::FleetError;
use crate::helpers::allocation::{load_other_sources, require_complete_source_list};
use crate::helpers::fees::mint_fee_value_into_fyc;
use crate::helpers::math::mul_div_u64;
use crate::helpers::oracle::fetch_base_yield_token_price;
use crate::helpers::pricing::compute_v_pool;
use crate::helpers::waterfall::{refresh_conservative_prices, split_base_yield_token_yield};
use crate::pda::*;
use crate::state::{
    load_pool_mut, load_tranche_mut, load_yield_source_mut, save_pool, save_tranche, save_yield_source,
};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    let [authority, pool, fyc, ffc, rest @ ..] = accounts else {
        return Err(FleetError::InvalidAccountData.into());
    };
    require_signer(authority)?;
    let mut p = load_pool_mut(pool)?;
    if !p.assert_authority(authority.address().as_array()) { return Err(FleetError::Unauthorized.into()); }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }

    let mut c = 0;
    let mode = read_u8(data, &mut c)?;

    let now_ts = Clock::get()?.unix_timestamp;
    let mut fyc_st = load_tranche_mut(fyc)?;
    let mut ffc_st = load_tranche_mut(ffc)?;

    // mode=1: tick one registered non-primary YieldSourceState.
    let (net_yield, fee_value, v_pool) = if mode == 1 {
        let [yield_source, oracle, tail @ ..] = rest else { return Err(FleetError::InvalidAccountData.into()); };
        let mut ys = load_yield_source_mut(yield_source)?;
        if ys.pool != *pool.address().as_array() || ys.oracle != *oracle.address().as_array() {
            return Err(FleetError::Unauthorized.into());
        }
        // CHANGED (round 2) — deliberately NOT gated on ys.is_active. Disabled
        // only means "stop accepting new deposits" (deposit_yield_token.rs)
        // and "don't route new capital here" (pick_rebalance_target below) —
        // a disabled source keeps earning real yield on whatever capital it
        // hasn't been unwound out of yet, and blocking its tick here would
        // freeze that yield mid-flight instead of letting it keep splitting
        // into FYC/FFC until the position is actually wound down to zero.
        // Harmless once c_tokens reaches 0 too: gross_yield is c_tokens ×
        // price_delta, so a fully-unwound source just ticks its price/APY
        // observation forward for free, contributing nothing to net_yield.

        let price_now = fetch_base_yield_token_price(oracle)?;
        if price_now < ys.last_price { return Err(FleetError::StaleOraclePrice.into()); }
        let price_delta = price_now - ys.last_price;
        let gross_yield = mul_div_u64(ys.c_tokens, price_delta, PRECISION)?;
        let net_yield = mul_div_u64(gross_yield, NET_YIELD_BPS, BPS_DENOMINATOR)?;
        let fee_value = gross_yield.saturating_sub(net_yield);

        // NEW (round 2) — annualize this epoch's rate into observed_apy_bps,
        // the same 365-day-year method observed_source_apy_bps already uses;
        // helpers/liquidity.rs::blended_apy reads this across every source.
        let elapsed = (now_ts - ys.last_epoch_ts).max(1);
        ys.observed_apy_bps = mul_div_u64(
            mul_div_u64(price_delta, BPS_DENOMINATOR, ys.last_price.max(1))?,
            SECONDS_PER_YEAR as u64,
            elapsed as u64,
        )?;
        ys.last_price = price_now;
        ys.last_epoch_ts = now_ts;
        save_yield_source(yield_source, &ys)?;

        // NEW (round 6) — v_pool needs THIS source's own just-refreshed value
        // too, so it's folded in manually alongside whatever load_other_sources
        // reads off the trailing tail (every OTHER registered source).
        let (mut other_sources, mut other_source_prices, mut count) =
            load_other_sources(tail, pool.address().as_array())?;
        if count < MAX_HARMONIZED_SOURCES {
            other_sources[count] = ys;
            other_source_prices[count] = price_now;
            count += 1;
        }
        // ROUND 8 — same completeness check as deposit.rs/deposit_yield_token.rs.
        require_complete_source_list(&p, count)?;
        let v_pool = compute_v_pool(
            &p, p.last_base_yield_token_price, &other_sources[..count], &other_source_prices[..count],
        )?;
        (net_yield, fee_value, v_pool)
    } else {
        // Mostly UNCHANGED — mode=0, the pool's original primary reserve,
        // identical yield/fee math to the pre-redesign version of this file.
        // CHANGED (round 3): also refreshes last_observed_base_apy_bps, the
        // SAME annualization method the mode=1 branch above already uses for
        // YieldSourceState.observed_apy_bps — this is what
        // distribute_loan_interest (helpers/waterfall.rs) reads to enforce
        // the FYC APY cap, since repay_loan.rs (an unrelated-cadence
        // instruction) has no other way to know "the reserve's current rate"
        // without its own oracle read.
        let [base_oracle, tail @ ..] = rest else { return Err(FleetError::InvalidAccountData.into()); };
        if p.base_yield_token_oracle != *base_oracle.address().as_array() {
            return Err(FleetError::Unauthorized.into());
        }
        let price_now = fetch_base_yield_token_price(base_oracle)?;
        let price_last = p.last_base_yield_token_price;
        if price_now < price_last { return Err(FleetError::StaleOraclePrice.into()); }
        let price_delta = price_now - price_last;
        let gross_yield = mul_div_u64(p.c_tokens, price_delta, PRECISION)?;
        let net_yield = mul_div_u64(gross_yield, NET_YIELD_BPS, BPS_DENOMINATOR)?;
        let fee_value = gross_yield.saturating_sub(net_yield);

        // NEW (round 3) — see the comment above this branch.
        let elapsed = (now_ts - p.last_epoch_ts).max(1);
        p.last_observed_base_apy_bps = mul_div_u64(
            mul_div_u64(price_delta, BPS_DENOMINATOR, price_last.max(1))?,
            SECONDS_PER_YEAR as u64,
            elapsed as u64,
        )?;

        p.last_base_yield_token_price = price_now;
        p.last_epoch_ts = now_ts;

        // NEW (round 6) — primary reserve is already compute_v_pool's own
        // first term (price_now); every other registered source comes
        // straight off the trailing tail. ROUND 8 — completeness enforced.
        let (other_sources, other_source_prices, count) = load_other_sources(tail, pool.address().as_array())?;
        require_complete_source_list(&p, count)?;
        let v_pool = compute_v_pool(&p, price_now, &other_sources[..count], &other_source_prices[..count])?;
        (net_yield, fee_value, v_pool)
    };

    split_base_yield_token_yield(&mut fyc_st, &mut ffc_st, net_yield, v_pool)?;
    mint_fee_value_into_fyc(&mut fyc_st, fee_value)?;
    refresh_conservative_prices(&mut fyc_st, &mut ffc_st)?;

    save_pool(pool, &p)?;
    save_tranche(fyc, &fyc_st)?;
    save_tranche(ffc, &ffc_st)?;
    Ok(())
}
`
},
{
  path: "pinochio/src/instructions/initialize_yield_source.rs",
  status: "U",
  category: "pinocchio",
  why: "New instruction (ix_tag::INITIALIZE_YIELD_SOURCE, tag 16). Registers one more YieldSourceState PDA for a yield-bearing reserve token (USDY, syrupUSDC, ...) — the mechanism the user asked for to support more than one yield-bearing token without a breaking change. Structurally mirrors initialize_tranche.rs: verify_pda + create_pda_account + a fresh zero-copy struct write, admin-gated the same way originate_loan.rs gates itself (p.assert_admin). Never touches PoolState's layout — only increments its new yield_source_count byte. Already satisfies 'only an admin can add a yield-bearing collateral token' — confirmed p.assert_admin gates this in round 1, unchanged this round. Round 2 just zero-initializes the new observed_apy_bps field alongside the others. The `oracle` account stored here (a Pyth PriceUpdateV2 account, same discriminator check as every other oracle read in this program — see constants.rs) is what run_yield_epoch.rs reads every tick via fetch_base_yield_token_price; almost every realistic candidate token for this slot (USDY, syrupUSDC, and yield-bearing stable-value wrappers generally) starts priced at $1.00 and appreciates slowly from there, so last_price on a freshly-initialized source is effectively \"$1.00 until the first epoch tick,\" not an arbitrary number an admin picks.",
  original: "",
  proposed: `//! Register a new yield-bearing reserve token (USDY, syrupUSDC, ...) as an
//! additional YieldSourceState PDA. Adding a source never touches PoolState's
//! layout — see state.rs and helpers/allocation.rs.
//!
//! Accounts (Anchor order):
//!   0  authority (signer, writable)
//!   1  pool (writable)
//!   2  yield_source (init PDA, writable)
//!   3  mint — the yield-bearing token's SPL mint
//!   4  vault — token account holding this source's tokens, owned by the pool PDA
//!   5  oracle — Pyth price account for this source
//!   6  system_program
//!
//! Data: yield_source_bump (u8)

use pinocchio::{account::AccountView, cpi::{Seed, Signer}, ProgramResult};
use pinocchio_log::log;

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::sysprog::{create_pda_account, rent_exempt_minimum};
use crate::pda::*;
use crate::state::{load_pool_mut, save_pool, save_yield_source, YieldSourceState, YIELD_SOURCE_SPACE};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    let [authority, pool, yield_source, mint, vault, oracle, _system_program, ..] =
        accounts else { return Err(FleetError::InvalidAccountData.into()) };

    let mut c = 0;
    let yield_source_bump = read_u8(data, &mut c)?;

    require_signer(authority)?;
    let mut p = load_pool_mut(pool)?;
    if !p.assert_admin(authority.address().as_array()) { return Err(FleetError::Unauthorized.into()); }
    if p.yield_source_count >= MAX_HARMONIZED_SOURCES as u8 {
        return Err(FleetError::InvalidAccountData.into());
    }

    let pool_key = *pool.address().as_array();
    let mint_key = *mint.address().as_array();
    let bump_arr = [yield_source_bump];
    let seeds: [Seed; 4] = [
        Seed::from(YIELD_SOURCE_SEED),
        Seed::from(&pool_key[..]),
        Seed::from(&mint_key[..]),
        Seed::from(&bump_arr[..]),
    ];
    verify_pda(yield_source, &[YIELD_SOURCE_SEED, &pool_key[..], &mint_key[..]], yield_source_bump)?;
    let signer = [Signer::from(&seeds[..])];
    create_pda_account(
        authority, yield_source, YIELD_SOURCE_SPACE as u64, &PROGRAM_ID,
        rent_exempt_minimum(YIELD_SOURCE_SPACE as u64), &signer,
    )?;

    let ys = YieldSourceState {
        pool: pool_key,
        mint: mint_key,
        vault: *vault.address().as_array(),
        oracle: *oracle.address().as_array(),
        c_tokens: 0,
        last_price: 0,
        last_epoch_ts: 0,
        observed_apy_bps: 0, // NEW (round 2) — first run_yield_epoch tick populates it
        is_active: 1,
        bump: yield_source_bump,
        _pad: [0u8; 6],
    };
    save_yield_source(yield_source, &ys)?;

    p.yield_source_count = p.yield_source_count.saturating_add(1);
    save_pool(pool, &p)?;

    log!("ff:init_yield_source");
    Ok(())
}
`
},
{
  path: "pinochio/src/instructions/deposit_yield_token.rs",
  status: "U",
  category: "pinocchio",
  why: "New instruction (ix_tag::DEPOSIT_YIELD_TOKEN, tag 17) — the direct-collateral deposit path the user asked for: 'we won't need to swap via titan or jupiter, we just deposit them straight into our pool.' Same mint-at-optimistic-price math as instructions/deposit.rs, minus the swap leg entirely — the investor's own yield-bearing tokens go straight into that source's vault. Prices off the target YieldSourceState's own c_tokens/last_price (compute_optimistic_price's real signature — see helpers/allocation.rs), not the pool's primary reserve, so this is correct even for a second or third registered source. ROUND 6: previously this correctly priced the TARGET source's own accrual, but the v_pool split denominator underneath it still only summed the primary reserve — misleadingly described in this file's own round-1 why as pricing 'correctly here.' It didn't: any OTHER non-primary source's real capital was invisible to the split ratio. Fixed the same way as deposit.rs — an optional trailing tail of (yield_source, oracle) pairs for every source besides the one being deposited into, read via load_other_sources and folded together with this call's own already-loaded ys so v_pool sums the pool's real total. ROUND 7: the yield-estimate numerator now also sums every source (not just ys) via the same other_sources slice — compute_optimistic_price no longer takes separate source_c_tokens/source_last_price/source_price_now. ROUND 8: require_complete_source_list now rejects a call whose trailing tail (plus ys) doesn't cover every registered source — the tail stopped being genuinely optional.",
  original: "",
  proposed: `//! Investor deposit: yield-bearing token (USDY, syrupUSDC, ...) straight into
//! its registered YieldSourceState vault — no swap leg. Same mint-at-
//! optimistic-price math as instructions/deposit.rs, just skipping Jupiter or
//! Titan entirely when the depositor already holds the target asset.
//!
//! Accounts (Anchor order):
//!   0  investor (signer, writable)
//!   1  pool
//!   2  fyc (writable)
//!   3  ffc (writable)
//!   4  tranche_mint (writable)
//!   5  investor_tranche_account (writable)
//!   6  yield_source (writable)
//!   7  yield_source_vault (writable)
//!   8  investor_yield_token_account (writable)
//!   9  yield_source_oracle
//!  10  token_program
//!  11.. zero or more (yield_source, oracle) pairs — NEW (round 6) — one pair
//!       per OTHER registered source (not this deposit's own target), so
//!       v_pool sees the pool's real total, not just this one source.
//!
//! Data: token_amount (u64) + tranche_type (u8)

use pinocchio::{
    account::AccountView,
    cpi::{Seed, Signer},
    sysvars::{clock::Clock, Sysvar},
    ProgramResult,
};
use pinocchio_token::instructions::{MintTo, Transfer};
use pinocchio_log::log;

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::allocation::{
    build_snapshot, compute_optimistic_price, load_other_sources, require_complete_source_list,
};
use crate::helpers::math::{checked_add_u64, mul_div_u64};
use crate::helpers::oracle::fetch_base_yield_token_price;
use crate::helpers::waterfall::{ensure_not_paused, refresh_conservative_prices};
use crate::pda::*;
use crate::state::{
    load_pool, load_tranche_mut, load_yield_source_mut, save_pool, save_tranche, save_yield_source,
};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    let [
        investor, pool, fyc, ffc, tranche_mint, investor_tranche_acc,
        yield_source, yield_source_vault, investor_yield_acc, yield_source_oracle,
        _token_program, other_source_accounts @ ..
    ] = accounts else { return Err(FleetError::InvalidAccountData.into()) };

    let mut c = 0;
    let token_amount = read_u64(data, &mut c)?;
    let tranche_type = read_u8(data, &mut c)?;

    require_signer(investor)?;
    let p = load_pool(pool)?;
    ensure_not_paused(&p)?;
    if token_amount == 0 { return Err(FleetError::Overflow.into()); }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }

    let mut ys = load_yield_source_mut(yield_source)?;
    if ys.pool != *pool.address().as_array()
        || ys.vault != *yield_source_vault.address().as_array()
        || ys.oracle != *yield_source_oracle.address().as_array()
    { return Err(FleetError::Unauthorized.into()); }
    if ys.is_active == 0 { return Err(FleetError::YieldSourceInactive.into()); }

    let mut fyc_st = load_tranche_mut(fyc)?;
    let mut ffc_st = load_tranche_mut(ffc)?;

    let target_is_fyc = tranche_type == fyc_st.tranche_type;
    let target_is_ffc = tranche_type == ffc_st.tranche_type;
    if !(target_is_fyc || target_is_ffc) { return Err(FleetError::TrancheMismatch.into()); }
    let expected_mint = if target_is_fyc { fyc_st.token_mint } else { ffc_st.token_mint };
    if *tranche_mint.address().as_array() != expected_mint {
        return Err(FleetError::TrancheMismatch.into());
    }

    let source_price = fetch_base_yield_token_price(yield_source_oracle)?;
    let now_ts = Clock::get()?.unix_timestamp;
    let deposit_value = mul_div_u64(token_amount, source_price, PRECISION)?;
    if deposit_value == 0 { return Err(FleetError::Overflow.into()); }

    // No swap leg — the deposited token IS the yield-bearing reserve token,
    // so this prices directly off THIS source's own token count and epoch
    // numbers, not the primary reserve's. NEW (round 6) — other_sources folds
    // in every OTHER registered source (from the trailing accounts) PLUS this
    // source's own just-fetched live price, so v_pool inside
    // compute_optimistic_price sums the pool's real total, not just ys.
    // ROUND 7 — that same fold-in is now also what credits THIS source's own
    // unrealized delta into the yield-estimate numerator (compute_optimistic_price
    // no longer takes separate source_c_tokens/source_last_price/source_price_now
    // params — ys's entry in other_sources IS how it's seen now, for both
    // v_pool and the yield estimate). p.last_base_yield_token_price passed
    // twice over (as both "current" and read again inside compute_v_pool as
    // "last") is deliberate: this instruction has no primary oracle account,
    // so primary's own delta term correctly resolves to 0 rather than a guess.
    // ROUND 8 — same require_complete_source_list check as deposit.rs, after
    // ys is folded in: other_source_count must reach pool.yield_source_count
    // exactly (ys plus every other registered source), not just "some".
    let (mut other_sources, mut other_source_prices, mut other_source_count) =
        load_other_sources(other_source_accounts, pool.address().as_array())?;
    if other_source_count < MAX_HARMONIZED_SOURCES {
        other_sources[other_source_count] = ys;
        other_source_prices[other_source_count] = source_price;
        other_source_count += 1;
    }
    require_complete_source_list(&p, other_source_count)?;
    let optimistic_price = compute_optimistic_price(
        &fyc_st, &ffc_st, target_is_fyc, &p,
        p.last_base_yield_token_price, &other_sources[..other_source_count], &other_source_prices[..other_source_count],
        now_ts,
    )?;
    if optimistic_price == 0 { return Err(FleetError::EmptyTranche.into()); }
    let tokens_to_mint = mul_div_u64(deposit_value, PRECISION, optimistic_price)?;
    if tokens_to_mint == 0 { return Err(FleetError::Overflow.into()); }

    // Pull the yield-bearing token straight into this source's own vault.
    Transfer::new(investor_yield_acc, yield_source_vault, investor, token_amount).invoke()?;

    // Mint tranche tokens to investor (signed by tranche PDA).
    let pool_key = *pool.address().as_array();
    let (tranche_acc, type_byte, t_bump) = if target_is_fyc {
        (fyc, fyc_st.tranche_type, fyc_st.bump)
    } else {
        (ffc, ffc_st.tranche_type, ffc_st.bump)
    };
    let type_arr = [type_byte];
    let t_bump_arr = [t_bump];
    let tranche_seeds: [Seed; 4] = [
        Seed::from(TRANCHE_SEED),
        Seed::from(&pool_key[..]),
        Seed::from(&type_arr[..]),
        Seed::from(&t_bump_arr[..]),
    ];
    let tranche_signer = [Signer::from(&tranche_seeds[..])];
    MintTo::new(tranche_mint, investor_tranche_acc, tranche_acc, tokens_to_mint).invoke_signed(&tranche_signer)?;

    // Source + tranche accounting.
    ys.c_tokens = checked_add_u64(ys.c_tokens, token_amount)?;
    save_yield_source(yield_source, &ys)?;

    let target = if target_is_fyc { &mut fyc_st } else { &mut ffc_st };
    target.v_tranche = checked_add_u64(target.v_tranche, deposit_value)?;
    target.total_supply = checked_add_u64(target.total_supply, tokens_to_mint)?;
    target.optimistic_price = optimistic_price;

    refresh_conservative_prices(&mut fyc_st, &mut ffc_st)?;

    // NEW (round 6) — same other_sources this deposit already assembled above
    // (this source included), so the post-deposit snapshot's v_pool is
    // computed against the real pool-wide total too.
    let snapshot = build_snapshot(
        &p, &fyc_st, p.last_base_yield_token_price, now_ts,
        &other_sources[..other_source_count], &other_source_prices[..other_source_count],
    )?;
    fyc_st.monthly_loan_allocation = snapshot.fyc_monthly_loan_target;

    save_pool(pool, &p)?;
    save_tranche(fyc, &fyc_st)?;
    save_tranche(ffc, &ffc_st)?;

    log!("ff:deposit_yield_token");
    Ok(())
}
`
},
{
  path: "pinochio/src/instructions/burn_insurance_for_ffc.rs",
  status: "U",
  category: "pinocchio",
  why: "New instruction (ix_tag::BURN_INSURANCE_FOR_FFC, tag 18) — the manual function the user asked for: 'a function that we can call to help cover some FFC losses even when the loss did not hit insurance fund... we input how much FYC we want to burn... it will increase the price of FFC.' Admin-gated, input is fyc_burn_amount (tokens, not USD). Burns that many FYC tokens out of the insurance wallet's own holdings — fyc.v_tranche and fyc.total_supply both drop, same real-burn shape as the insurance tier of the redesigned apply_default_waterfall (helpers/waterfall.rs) — and moves the USD value they were worth straight into ffc.v_tranche. FFC's total_supply is untouched, so that value increase lands entirely in FFC's price, not as new tokens.",
  original: "",
  proposed: `//! Manual admin action: burn some of the insurance wallet's own FYC holdings
//! to top up FFC — usable even when the loss never went through
//! apply_default_waterfall (helpers/waterfall.rs). Input is the amount of FYC
//! TOKENS to burn; the USD value they're worth at FYC's live price moves
//! straight into ffc.v_tranche, raising FFC's price (no new FFC tokens are
//! minted — same total_supply, more value backing each one).
//!
//! Accounts (Anchor order):
//!   0  authority (signer, writable)
//!   1  pool
//!   2  fyc (writable)
//!   3  ffc (writable)
//!
//! Data: fyc_burn_amount (u64)

use pinocchio::{account::AccountView, ProgramResult};
use pinocchio_log::log;

use crate::constants::PRECISION;
use crate::errors::FleetError;
use crate::helpers::math::{checked_add_u64, checked_sub_u64, mul_div_u64};
use crate::helpers::pricing::live_price;
use crate::helpers::waterfall::refresh_conservative_prices;
use crate::pda::*;
use crate::state::{load_pool, load_tranche_mut, save_tranche};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    let [authority, pool, fyc, ffc, ..] = accounts else {
        return Err(FleetError::InvalidAccountData.into());
    };

    let mut c = 0;
    let fyc_burn_amount = read_u64(data, &mut c)?;

    require_signer(authority)?;
    let p = load_pool(pool)?;
    if !p.assert_admin(authority.address().as_array()) { return Err(FleetError::Unauthorized.into()); }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }
    if fyc_burn_amount == 0 { return Err(FleetError::Overflow.into()); }

    let mut fyc_st = load_tranche_mut(fyc)?;
    let mut ffc_st = load_tranche_mut(ffc)?;

    if fyc_burn_amount > fyc_st.insurance_token_balance {
        return Err(FleetError::InsuranceFundBelowFloor.into());
    }

    let fyc_price = live_price(&fyc_st)?;
    let burned_value = mul_div_u64(fyc_burn_amount, fyc_price, PRECISION)?;

    fyc_st.v_tranche = checked_sub_u64(fyc_st.v_tranche, burned_value)?;
    fyc_st.total_supply = checked_sub_u64(fyc_st.total_supply, fyc_burn_amount)?;
    fyc_st.insurance_token_balance = checked_sub_u64(fyc_st.insurance_token_balance, fyc_burn_amount)?;

    ffc_st.v_tranche = checked_add_u64(ffc_st.v_tranche, burned_value)?;

    refresh_conservative_prices(&mut fyc_st, &mut ffc_st)?;

    save_tranche(fyc, &fyc_st)?;
    save_tranche(ffc, &ffc_st)?;

    log!("ff:burn_insurance_for_ffc");
    Ok(())
}
`
},
{
  path: "pinochio/src/lib.rs",
  status: "M",
  category: "pinocchio",
  why: "Three new ix_tag discriminators and dispatch arms for the multi-yield-source + direct-deposit + manual-insurance-burn instructions, added after ACCELERATED_REDEEM (15). Round 5 (loan lifecycle): FLAG_PENDING_DEFAULT renamed to FINALIZE_DEFAULT (6). Two new tags added: RESELL_DEFAULTED_LOAN (19), RELIST_DEFAULTED_LOAN (20). ROUND 8 (greenfield cleanup — nothing is deployed yet): APPROVE_DEFAULT (7) and RECORD_RECOVERY (8) are REMOVED outright, not kept as deprecation stubs — that pattern only earns its keep against an old client that might still encode those tags, which doesn't exist yet for this program. Both tags are simply unassigned now; a future instruction is free to claim either.",
  original: `//! Fleet Finance — Pinocchio-native port of the Anchor program.

#![cfg_attr(target_os = "solana", no_std)]
#![allow(unexpected_cfgs)]

pub mod constants;
pub mod errors;
pub mod helpers;
pub mod instructions;
pub mod pda;
pub mod state;

use pinocchio::{
    account::AccountView, Address,
    ProgramResult,
};

use crate::errors::FleetError;

#[cfg(feature = "bpf-entrypoint")]
pinocchio::program_entrypoint!(process_instruction);
#[cfg(feature = "bpf-entrypoint")]
pinocchio::nostd_panic_handler!();
#[cfg(feature = "bpf-entrypoint")]
pinocchio::no_allocator!();

/// Instruction discriminator tags. Must match the client encoder.
pub mod ix_tag {
    pub const INITIALIZE_CONTRACT: u8 = 0;
    pub const INITIALIZE_POOL: u8 = 1;
    pub const INITIALIZE_TRANCHE: u8 = 2;
    pub const SET_PAUSED: u8 = 3;
    pub const SET_REDEMPTION_FEES: u8 = 4;
    pub const SUBMIT_REDEMPTION: u8 = 5;
    pub const FLAG_PENDING_DEFAULT: u8 = 6;
    pub const APPROVE_DEFAULT: u8 = 7;
    pub const RECORD_RECOVERY: u8 = 8;
    pub const RECALCULATE_ALLOCATION: u8 = 9;
    pub const RUN_YIELD_EPOCH: u8 = 10;
    pub const DEPOSIT: u8 = 11;
    pub const ORIGINATE_LOAN: u8 = 12;
    pub const REPAY_LOAN: u8 = 13;
    pub const PROCESS_REDEMPTION: u8 = 14;
    pub const ACCELERATED_REDEEM: u8 = 15;
}

pub fn process_instruction(
    program_id: &Address,
    accounts: &mut [AccountView],
    data: &[u8],
) -> ProgramResult {
    if program_id != &constants::PROGRAM_ID {
        return Err(FleetError::InvalidProgramId.into());
    }
    if data.is_empty() {
        return Err(FleetError::InvalidInstructionData.into());
    }
    let tag = data[0];
    let payload = &data[1..];

    use ix_tag::*;
    match tag {
        INITIALIZE_CONTRACT => instructions::initialize_contract::process(accounts, payload),
        INITIALIZE_POOL => instructions::initialize_pool::process(accounts, payload),
        INITIALIZE_TRANCHE => instructions::initialize_tranche::process(accounts, payload),
        SET_PAUSED => instructions::set_paused::process(accounts, payload),
        SET_REDEMPTION_FEES => instructions::set_redemption_fees::process(accounts, payload),
        SUBMIT_REDEMPTION => instructions::submit_redemption::process(accounts, payload),
        FLAG_PENDING_DEFAULT => instructions::flag_pending_default::process(accounts, payload),
        APPROVE_DEFAULT => instructions::approve_default::process(accounts, payload),
        RECORD_RECOVERY => instructions::record_recovery::process(accounts, payload),
        RECALCULATE_ALLOCATION => instructions::recalculate_allocation::process(accounts, payload),
        RUN_YIELD_EPOCH => instructions::run_yield_epoch::process(accounts, payload),
        DEPOSIT => instructions::deposit::process(accounts, payload),
        ORIGINATE_LOAN => instructions::originate_loan::process(accounts, payload),
        REPAY_LOAN => instructions::repay_loan::process(accounts, payload),
        PROCESS_REDEMPTION => instructions::process_redemption::process(accounts, payload),
        ACCELERATED_REDEEM => instructions::accelerated_redeem::process(accounts, payload),
        _ => Err(FleetError::InvalidInstructionData.into()),
    }
}
`,
  proposed: `//! Fleet Finance — Pinocchio-native port of the Anchor program.

#![cfg_attr(target_os = "solana", no_std)]
#![allow(unexpected_cfgs)]

pub mod constants;
pub mod errors;
pub mod helpers;
pub mod instructions;
pub mod pda;
pub mod state;

use pinocchio::{
    account::AccountView, Address,
    ProgramResult,
};

use crate::errors::FleetError;

#[cfg(feature = "bpf-entrypoint")]
pinocchio::program_entrypoint!(process_instruction);
#[cfg(feature = "bpf-entrypoint")]
pinocchio::nostd_panic_handler!();
#[cfg(feature = "bpf-entrypoint")]
pinocchio::no_allocator!();

/// Instruction discriminator tags. Must match the client encoder.
pub mod ix_tag {
    pub const INITIALIZE_CONTRACT: u8 = 0;
    pub const INITIALIZE_POOL: u8 = 1;
    pub const INITIALIZE_TRANCHE: u8 = 2;
    pub const SET_PAUSED: u8 = 3;
    pub const SET_REDEMPTION_FEES: u8 = 4;
    pub const SUBMIT_REDEMPTION: u8 = 5;
    /// RENAMED (round 5) from FLAG_PENDING_DEFAULT. See
    /// instructions/finalize_default.rs's own why.
    pub const FINALIZE_DEFAULT: u8 = 6;
    // 7, 8 — REMOVED (round 8): were APPROVE_DEFAULT / RECORD_RECOVERY,
    // superseded by RESELL_DEFAULTED_LOAN below. Unassigned, not reserved —
    // nothing is deployed yet, so there's no old client's encoding to keep
    // a dead slot for. Free for a future instruction to claim.
    pub const RECALCULATE_ALLOCATION: u8 = 9;
    pub const RUN_YIELD_EPOCH: u8 = 10;
    pub const DEPOSIT: u8 = 11;
    pub const ORIGINATE_LOAN: u8 = 12;
    pub const REPAY_LOAN: u8 = 13;
    pub const PROCESS_REDEMPTION: u8 = 14;
    pub const ACCELERATED_REDEEM: u8 = 15;
    /// NEW — registers one more YieldSourceState PDA (USDY, syrupUSDC, ...).
    pub const INITIALIZE_YIELD_SOURCE: u8 = 16;
    /// NEW — deposit a yield-bearing token directly, no swap leg.
    pub const DEPOSIT_YIELD_TOKEN: u8 = 17;
    /// NEW — manually burn insurance-held FYC to cover an FFC loss that
    /// never went through apply_default_waterfall.
    pub const BURN_INSURANCE_FOR_FFC: u8 = 18;
    /// NEW (round 5) — resell a DEFAULTED loan's repossessed collateral for
    /// actual cash proceeds; loss = max(0, owed_at_default - recovery).
    pub const RESELL_DEFAULTED_LOAN: u8 = 19;
    /// NEW (round 5) — relist a DEFAULTED loan's collateral as a new loan
    /// for a new (or the same) borrower, atomically closing the old one.
    pub const RELIST_DEFAULTED_LOAN: u8 = 20;
}

pub fn process_instruction(
    program_id: &Address,
    accounts: &mut [AccountView],
    data: &[u8],
) -> ProgramResult {
    if program_id != &constants::PROGRAM_ID {
        return Err(FleetError::InvalidProgramId.into());
    }
    if data.is_empty() {
        return Err(FleetError::InvalidInstructionData.into());
    }
    let tag = data[0];
    let payload = &data[1..];

    use ix_tag::*;
    match tag {
        INITIALIZE_CONTRACT => instructions::initialize_contract::process(accounts, payload),
        INITIALIZE_POOL => instructions::initialize_pool::process(accounts, payload),
        INITIALIZE_TRANCHE => instructions::initialize_tranche::process(accounts, payload),
        SET_PAUSED => instructions::set_paused::process(accounts, payload),
        SET_REDEMPTION_FEES => instructions::set_redemption_fees::process(accounts, payload),
        SUBMIT_REDEMPTION => instructions::submit_redemption::process(accounts, payload),
        FINALIZE_DEFAULT => instructions::finalize_default::process(accounts, payload),
        RECALCULATE_ALLOCATION => instructions::recalculate_allocation::process(accounts, payload),
        RUN_YIELD_EPOCH => instructions::run_yield_epoch::process(accounts, payload),
        DEPOSIT => instructions::deposit::process(accounts, payload),
        ORIGINATE_LOAN => instructions::originate_loan::process(accounts, payload),
        REPAY_LOAN => instructions::repay_loan::process(accounts, payload),
        PROCESS_REDEMPTION => instructions::process_redemption::process(accounts, payload),
        ACCELERATED_REDEEM => instructions::accelerated_redeem::process(accounts, payload),
        INITIALIZE_YIELD_SOURCE => instructions::initialize_yield_source::process(accounts, payload),
        DEPOSIT_YIELD_TOKEN => instructions::deposit_yield_token::process(accounts, payload),
        BURN_INSURANCE_FOR_FFC => instructions::burn_insurance_for_ffc::process(accounts, payload),
        RESELL_DEFAULTED_LOAN => instructions::resell_defaulted_loan::process(accounts, payload),
        RELIST_DEFAULTED_LOAN => instructions::relist_defaulted_loan::process(accounts, payload),
        _ => Err(FleetError::InvalidInstructionData.into()),
    }
}
`
},
{
  path: "pinochio/src/instructions/mod.rs",
  status: "M",
  category: "pinocchio",
  why: "Registers the three new instruction modules — initialize_yield_source, deposit_yield_token, burn_insurance_for_ffc — alphabetically, matching this file's existing convention. Round 2 registers five more: jr_to_sr, sr_to_jr, disable_yield_source, earmark_loan_capital, cancel_earmark. Round 3 registers one more: set_max_fyc_apy. Round 5 (loan lifecycle): flag_pending_default renamed to finalize_default (same module slot, same file, full behavior swap — see that file's own why); registers two new modules, resell_defaulted_loan and relist_defaulted_loan. ROUND 8 (greenfield cleanup): approve_default and record_recovery modules are removed — those instructions are deleted outright (see lib.rs's own why), not kept as deprecation stubs.",
  original: `pub mod accelerated_redeem;
pub mod approve_default;
pub mod deposit;
pub mod flag_pending_default;
pub mod initialize_contract;
pub mod initialize_pool;
pub mod initialize_tranche;
pub mod originate_loan;
pub mod process_redemption;
pub mod recalculate_allocation;
pub mod record_recovery;
pub mod repay_loan;
pub mod run_yield_epoch;
pub mod set_paused;
pub mod set_redemption_fees;
pub mod submit_redemption;
`,
  proposed: `pub mod accelerated_redeem;
pub mod burn_insurance_for_ffc;
pub mod cancel_earmark;
pub mod deposit;
pub mod deposit_yield_token;
pub mod disable_yield_source;
pub mod earmark_loan_capital;
pub mod finalize_default;
pub mod initialize_contract;
pub mod initialize_pool;
pub mod initialize_tranche;
pub mod initialize_yield_source;
pub mod jr_to_sr;
pub mod originate_loan;
pub mod process_redemption;
pub mod recalculate_allocation;
pub mod relist_defaulted_loan;
pub mod repay_loan;
pub mod resell_defaulted_loan;
pub mod run_yield_epoch;
pub mod set_max_fyc_apy;
pub mod set_paused;
pub mod set_redemption_fees;
pub mod sr_to_jr;
pub mod submit_redemption;
`
},
{
  path: "pinochio/src/helpers/mod.rs",
  status: "M",
  category: "pinocchio",
  why: "Registers the new curve module so helpers::curve::* resolves. Round 2 registers liquidity (ELB, instant-fee scale, yield-target routing) and tranche_convert (jr_to_sr/sr_to_jr shared logic). Round 5 registers loan_lifecycle (grace/cure/default stage classification and the cure-period APR bump) — see /loan-lifecycle.",
  original: `pub mod allocation;
pub mod amortization;
pub mod coverage;
pub mod fees;
pub mod jupiter;
pub mod math;
pub mod metaplex;
pub mod oracle;
pub mod pricing;
pub mod redemption;
pub mod swap;
pub mod sysprog;
pub mod token_account;
pub mod waterfall;`,
  proposed: `pub mod allocation;
pub mod amortization;
pub mod coverage;
pub mod curve;
pub mod fees;
pub mod jupiter;
pub mod liquidity;
pub mod loan_lifecycle;
pub mod math;
pub mod metaplex;
pub mod oracle;
pub mod pricing;
pub mod redemption;
pub mod swap;
pub mod sysprog;
pub mod token_account;
pub mod tranche_convert;
pub mod waterfall;`
},
{
  path: "pinochio/src/helpers/loan_lifecycle.rs",
  status: "U",
  category: "pinocchio",
  why: "New file (round 5) — grace/cure/default stage classification, purely time-derived from LoanAccount.next_payment_due_ts() and Clock, and the cure-period APR bump. Split into its own module for the same reason curve.rs and liquidity.rs are split out: independently property-testable, no coupling to instruction-level account handling. Deliberately has NO notion of a stored 'grace' or 'cure' status — see state.rs's loan_status doc comments: a loan stays ACTUAL ACTIVE the whole way through, and every caller (repay_loan.rs, finalize_default.rs) just asks 'what stage would this loan be in right now' fresh, off Clock. See /loan-lifecycle for the full writeup and worked examples.",
  original: "",
  proposed: `//! Loan lifecycle: grace -> cure -> default, entirely time-derived from
//! LoanAccount.next_payment_due_ts() and Clock — no stored status change
//! for grace/cure (see state.rs's loan_status doc comments). New this
//! round — see /loan-lifecycle.

use pinocchio::error::ProgramError;

use crate::constants::{CURE_APR_MULTIPLIER_DEN, CURE_APR_MULTIPLIER_NUM, CURE_PERIOD_DAYS, GRACE_PERIOD_DAYS, SECONDS_PER_DAY};
use crate::errors::FleetError;
use crate::helpers::amortization::period_interest;

/// Whole days past due; 0 if not yet due or exactly on time. Anchored to
/// next_due_ts itself, never to whenever some instruction happens to run —
/// nobody can shift this clock just by calling (or not calling) anything.
pub fn days_late(now_ts: i64, next_due_ts: i64) -> i64 {
    if now_ts <= next_due_ts { return 0; }
    (now_ts - next_due_ts) / SECONDS_PER_DAY
}

/// GRACE: late, but no APR bump yet — still counted in
/// pool.loan_accrual_rate, still presumed likely to pay.
pub fn is_in_grace(now_ts: i64, next_due_ts: i64) -> bool {
    let d = days_late(now_ts, next_due_ts);
    d > 0 && d <= GRACE_PERIOD_DAYS
}

/// CURE: the APR bump applies, and the loan should stop counting toward
/// pool.loan_accrual_rate (see instructions/finalize_default.rs — the same
/// permissionless instruction handles both the early accrual-exclusion
/// sync at CURE entry and the eventual DEFAULTED transition, since both
/// are just different thresholds on this same days_late computation).
pub fn is_in_cure(now_ts: i64, next_due_ts: i64) -> bool {
    let d = days_late(now_ts, next_due_ts);
    d > GRACE_PERIOD_DAYS && d <= GRACE_PERIOD_DAYS + CURE_PERIOD_DAYS
}

/// Past the full grace+cure window (30 days total) with no payment —
/// eligible for finalize_default, and repay_loan.rs must refuse a payment
/// from here on (LoanPastDefaultThreshold).
pub fn is_defaultable(now_ts: i64, next_due_ts: i64) -> bool {
    days_late(now_ts, next_due_ts) > GRACE_PERIOD_DAYS + CURE_PERIOD_DAYS
}

/// The extra interest CURE adds on top of levelized_interest for one
/// period: true declining-balance interest at the bumped (1.25x) rate,
/// minus the same at the loan's own real rate — off the actual outstanding
/// balance, for one period, exactly like period_interest already computes
/// for the borrower-facing schedule. Deliberately NOT day-counted and NOT
/// scaled against the whole remaining term — just "what would this one
/// period cost at the bumped rate instead," added onto the pool-facing
/// levelized figure alongside it. Zero outside CURE (callers only call
/// this when is_in_cure is true).
pub fn cure_fee(current_balance: u64, apr_bps: u64) -> Result<u64, ProgramError> {
    let bumped = (apr_bps as u128)
        .checked_mul(CURE_APR_MULTIPLIER_NUM as u128).ok_or(ProgramError::from(FleetError::Overflow))?
        / CURE_APR_MULTIPLIER_DEN as u128;
    let bumped_apr_bps = u64::try_from(bumped).map_err(|_| FleetError::Overflow.into())?;
    let normal_interest = period_interest(current_balance, apr_bps)?;
    let bumped_interest = period_interest(current_balance, bumped_apr_bps)?;
    Ok(bumped_interest.saturating_sub(normal_interest))
}`
},
{
  path: "pinochio/src/helpers/liquidity.rs",
  status: "U",
  category: "pinocchio",
  why: "New file (round 2) — ELB (excess liquidity balance), the instant-redemption fee scale, and multi-yield-source blended-yield routing. Split into its own module rather than folded into coverage.rs, same reasoning /implementation gives for curve.rs: keeps this math independently property-testable. Follows the struct/pure-inner pattern from /implementation pattern 1 — pick_rebalance_target is explicitly #[cfg(feature = \"offchain\")], the same trust boundary Jupiter/Titan route selection already uses; the on-chain instructions here only ever receive an already-chosen source id. blended_apy_bps deliberately does NOT filter on is_active (it did in an earlier draft — fixed here): a disabled source is still earning real, Pyth-priced yield on whatever capital hasn't been unwound out of it yet (instructions/run_yield_epoch.rs keeps ticking it precisely so this stays true), so folding it out of the blend would understate the pool's actual return. Only c_tokens == 0 excludes a source, and it does so for free via the weighted-sum math, not a special case. is_active still gates pick_rebalance_target (never route NEW capital to a source being wound down) and pick_unwind_source (only a disabled source is ever a withdrawal-order candidate) — both routing/ordering decisions, not yield measurement, which is exactly why they keep the flag and blended_apy_bps doesn't.",
  original: "",
  proposed: `//! Redemption liquidity — ELB (excess liquidity balance), the instant-
//! redemption fee scale, and multi-yield-source blended-yield routing.
//! New this round — see /redemption, /tranche-swap, /yield-sources.

use pinocchio::error::ProgramError;

use crate::constants::{
    BPS_DENOMINATOR, INSTANT_FEE_BPS_FFC, INSTANT_FEE_BPS_FYC, TRANCHE_FFC,
    YIELD_TARGET_BPS, YIELD_TARGET_MAX_BPS, YIELD_TARGET_MIN_BPS,
};
use crate::errors::FleetError;
use crate::helpers::math::{checked_add_u64, mul_div_u64};
use crate::state::{PoolState, TrancheState, YieldSourceState};

pub struct Elb {
    pub total: u64,
    pub fyc: u64,
    pub ffc: u64,
}

/// elb_total = (FYC + FFC) − outstanding − earmarked_loan_capital, split
/// pro-rata by pool share — the same flat formula split_base_yield_token_yield
/// already uses for reserve YIELD, applied here to reserve CAPITAL instead.
pub fn compute_elb(pool: &PoolState, fyc: &TrancheState, ffc: &TrancheState) -> Result<Elb, ProgramError> {
    let v_pool = checked_add_u64(fyc.v_tranche, ffc.v_tranche)?;
    let reserved = checked_add_u64(pool.outstanding_principal, pool.earmarked_loan_capital)?;
    let total = v_pool.saturating_sub(reserved);
    if v_pool == 0 || total == 0 {
        return Ok(Elb { total: 0, fyc: 0, ffc: 0 });
    }
    let elb_fyc = mul_div_u64(total, fyc.v_tranche, v_pool)?;
    Ok(Elb { total, fyc: elb_fyc, ffc: total.saturating_sub(elb_fyc) })
}

pub struct InstantFee {
    pub fee_bps: u64,
    pub fee_value: u64,
    pub net_payout: u64,
}

/// fee_value = fee_min·amount/BPS_DENOMINATOR
///           + (fee_max−fee_min)·amount²/(2·elb_tranche·BPS_DENOMINATOR)
///
/// FIXED (security review): this is the closed-form integral of the
/// marginal rate \`fee_min + (fee_max-fee_min)·(u/elb_tranche)\` from u=0 to
/// u=amount. The previous version applied the ENDPOINT rate (the marginal
/// rate AT u=amount) flat to the whole redemption — quadratic in amount,
/// but not split-invariant: splitting one redemption into several smaller
/// ones against the same elb_tranche converges the average rate paid
/// toward fee_min (probe: one $50k redeem paid $150, two $25k redeems at
/// the same elb paid $100 total — a 33% discount for no economic change).
/// Integrating the same marginal rate over the actual amount redeemed
/// removes that gap — see /open-questions for the derivation. Redeeming
/// more than elb_tranche isn't discounted or partially served — it's
/// simply ineligible for the instant path; the caller must fall back to
/// submit_redemption's 30d/90d queue instead.
pub fn instant_redemption_fee(tranche: u8, amount: u64, elb_tranche: u64) -> Result<InstantFee, ProgramError> {
    instant_redemption_fee_inner(tranche, amount, elb_tranche)
        .ok_or_else(|| FleetError::InsufficientInstantLiquidity.into())
}

fn instant_redemption_fee_inner(tranche: u8, amount: u64, elb_tranche: u64) -> Option<InstantFee> {
    if amount == 0 || elb_tranche == 0 || amount > elb_tranche {
        return None;
    }
    let (fee_min, fee_max) = if tranche == TRANCHE_FFC { INSTANT_FEE_BPS_FFC } else { INSTANT_FEE_BPS_FYC };
    let spread = fee_max - fee_min;

    // Both terms combined over one common denominator before dividing, so
    // they don't round independently:
    //   fee_value = (2·elb_tranche·fee_min·amount + spread·amount²)
    //               / (2·elb_tranche·BPS_DENOMINATOR)
    let numerator = (2u128 * elb_tranche as u128 * fee_min as u128 * amount as u128)
        + (spread as u128 * amount as u128 * amount as u128);
    let denominator = 2u128 * elb_tranche as u128 * BPS_DENOMINATOR as u128;
    let fee_value = (numerator / denominator) as u64;

    // The AVERAGE effective rate this fee_value represents, for
    // display/logging only — not fed back into fee_value above (doing so
    // would reintroduce the endpoint formula's rounding, not just reuse
    // its shape).
    let fee_bps = if amount > 0 { ((fee_value as u128 * BPS_DENOMINATOR as u128) / amount as u128) as u64 } else { 0 };

    Some(InstantFee { fee_bps, fee_value, net_payout: amount.saturating_sub(fee_value) })
}

/// Capital-weighted blended APY across every source that still holds
/// capital — is_active is NOT part of this weighting. A disabled source is
/// still earning real yield on whatever hasn't been unwound out of it yet
/// (run_yield_epoch keeps ticking it — see instructions/run_yield_epoch.rs
/// — so its last_price/observed_apy_bps stay current, both read straight
/// off that source's own Pyth price account, same as every enabled source),
/// so excluding it here would understate the pool's actual blended return.
/// is_active only matters to pick_rebalance_target/pick_unwind_source below
/// — where NEW capital should go, and which source unwinds first — a
/// separate question from "what is the pool earning right now." A source
/// with zero capital contributes zero to both total_capital and weighted,
/// so it drops out on its own; the c_tokens > 0 filter below is a
/// defensive skip (avoids a stray 0×apy term), not a correctness gate.
pub fn blended_apy_bps(sources: &[YieldSourceState]) -> u64 {
    let mut total_capital: u128 = 0;
    let mut weighted: u128 = 0;
    for s in sources.iter().filter(|s| s.c_tokens > 0) {
        let capital = s.c_tokens as u128 * s.last_price as u128;
        total_capital += capital;
        weighted += capital * s.observed_apy_bps as u128;
    }
    if total_capital == 0 { return 0; }
    (weighted / total_capital) as u64
}

/// Which ENABLED source new capital should route into: whichever lands the
/// resulting blended APY closest to YIELD_TARGET_BPS among candidates inside
/// [YIELD_TARGET_MIN_BPS, YIELD_TARGET_MAX_BPS]; if none land in range,
/// whichever gets the HIGHEST resulting APY instead. Never errors just
/// because the target is unreachable — that's exactly why the min exists.
pub fn pick_rebalance_target(sources: &[YieldSourceState], deposit_amount: u64) -> Option<usize> {
    let mut best_in_range: Option<(usize, u64)> = None;
    let mut best_overall: Option<(usize, u64)> = None;
    for (i, s) in sources.iter().enumerate() {
        if s.is_active == 0 { continue; }
        let mut hypothetical: Vec<YieldSourceState> = sources.to_vec();
        hypothetical[i].c_tokens = hypothetical[i].c_tokens.saturating_add(deposit_amount);
        let apy = blended_apy_bps(&hypothetical);
        if apy >= YIELD_TARGET_MIN_BPS && apy <= YIELD_TARGET_MAX_BPS {
            let dist = apy.abs_diff(YIELD_TARGET_BPS);
            if best_in_range.map_or(true, |(_, d)| dist < d) {
                best_in_range = Some((i, dist));
            }
        }
        if best_overall.map_or(true, |(_, a)| apy > a) {
            best_overall = Some((i, apy));
        }
    }
    best_in_range.map(|(i, _)| i).or(best_overall.map(|(i, _)| i))
}

/// Redemption payout draws from a DISABLED source before touching any
/// enabled one, so a retired token actually winds down over time instead of
/// sitting inert once flagged. Tiebreak among multiple disabled sources:
/// lowest observed_apy_bps first (unwind the least-productive one first).
pub fn pick_unwind_source(sources: &[YieldSourceState]) -> Option<usize> {
    sources
        .iter()
        .enumerate()
        .filter(|(_, s)| s.is_active == 0 && s.c_tokens > 0)
        .min_by_key(|(_, s)| s.observed_apy_bps)
        .map(|(i, _)| i)
}`
},
{
  path: "pinochio/src/helpers/tranche_convert.rs",
  status: "U",
  category: "pinocchio",
  why: "New file (round 2) — jr_to_sr / sr_to_jr, the shared conversion primitive. Burns one tranche at ITS conservative price, mints the other at ITS conservative price, so V_pool is exactly unchanged. Used by the two thin instructions (jr_to_sr.rs / sr_to_jr.rs) AND internally by accelerated_redeem.rs's FFC-fee settlement — one audited primitive, not two hand-rolled burn/mint paths. See /tranche-swap.",
  original: "",
  proposed: `//! jr_to_sr / sr_to_jr — burn one tranche's tokens, mint the other's, both
//! legs at CONSERVATIVE price, so V_pool is exactly unchanged. New this
//! round — see /tranche-swap.

use pinocchio::error::ProgramError;

use crate::constants::{BPS_DENOMINATOR, PRECISION, SEVERITY_GATE_MAX_BPS};
use crate::errors::FleetError;
use crate::helpers::coverage::assert_mint_allowed;
use crate::helpers::liquidity::compute_elb;
use crate::helpers::math::mul_div_u64;
use crate::helpers::pricing::usd_for_tokens;
use crate::state::{PoolState, TrancheState};

pub struct ConversionResult {
    pub value_usd: u64,
    pub tokens_out: u64,
}

/// Burns \`tokens_in\` of FFC at its conservative price, mints the same USD
/// value of FYC at ITS conservative price. Re-checks severity against the
/// EXISTING loan book afterward — a conversion shrinks FFC's first-loss
/// cover for loans that already exist, not just future originations.
///
/// FIXED (security review): the previous version mutated \`fyc\`/\`ffc\`
/// FIRST and validated after. Because they're passed by \`&mut\`, an early
/// \`Err\` return did NOT undo those writes — the caller was left with a
/// half-applied conversion (value already moved FFC→FYC, fyc.total_supply
/// already inflated) even though the function reported failure. Every
/// check now runs against local copies (\`_after\`); \`fyc\`/\`ffc\` are only
/// written once every check has passed, so a failed call leaves both
/// tranches byte-for-byte unchanged, matching what \`if let Ok(..) = ...\`
/// callers (accelerated_redeem.rs) actually assume.
pub fn jr_to_sr(
    pool: &PoolState,
    fyc: &mut TrancheState,
    ffc: &mut TrancheState,
    tokens_in: u64,
) -> Result<ConversionResult, ProgramError> {
    let value_usd = usd_for_tokens(tokens_in, ffc.conservative_price)?;
    let tokens_out = if fyc.conservative_price > 0 { mul_div_u64(value_usd, PRECISION, fyc.conservative_price)? } else { 0 };

    let mut ffc_after = *ffc;
    let mut fyc_after = *fyc;
    ffc_after.v_tranche = ffc_after.v_tranche.saturating_sub(value_usd);
    ffc_after.total_supply = ffc_after.total_supply.saturating_sub(tokens_in);
    fyc_after.v_tranche = fyc_after.v_tranche.saturating_add(value_usd);
    fyc_after.total_supply = fyc_after.total_supply.saturating_add(tokens_out);

    if severity_bps_after(pool.outstanding_principal, ffc_after.v_tranche, fyc_after.v_tranche)? > SEVERITY_GATE_MAX_BPS {
        return Err(FleetError::ConversionWouldExceedSeverityGate.into());
    }

    // NEW (security review) — a conversion instantly reweights each
    // tranche's share of ELB. Without this, jr_to_sr could pass the
    // severity check above while stranding an already-queued FYC or FFC
    // redeemer behind a post-conversion ELB that's no longer enough to
    // cover them.
    let elb_after = compute_elb(pool, &fyc_after, &ffc_after)?;
    if elb_after.fyc < pool.pending_fyc_redemptions || elb_after.ffc < pool.pending_ffc_redemptions {
        return Err(FleetError::ConversionWouldStrandPendingRedemption.into());
    }

    *ffc = ffc_after;
    *fyc = fyc_after;
    Ok(ConversionResult { value_usd, tokens_out })
}

/// Mirror image — burns FYC, mints FFC. Re-checked against assert_mint_allowed
/// instead of the severity gate: this is "new" FFC supply from the pool's
/// perspective, same floor as an external deposit. Same validate-on-a-copy
/// fix as jr_to_sr above, for the same reason — see that function's comment.
pub fn sr_to_jr(
    pool: &PoolState,
    fyc: &mut TrancheState,
    ffc: &mut TrancheState,
    tokens_in: u64,
) -> Result<ConversionResult, ProgramError> {
    let value_usd = usd_for_tokens(tokens_in, fyc.conservative_price)?;
    let tokens_out = if ffc.conservative_price > 0 { mul_div_u64(value_usd, PRECISION, ffc.conservative_price)? } else { 0 };

    let mut fyc_after = *fyc;
    let mut ffc_after = *ffc;
    fyc_after.v_tranche = fyc_after.v_tranche.saturating_sub(value_usd);
    fyc_after.total_supply = fyc_after.total_supply.saturating_sub(tokens_in);
    ffc_after.v_tranche = ffc_after.v_tranche.saturating_add(value_usd);
    ffc_after.total_supply = ffc_after.total_supply.saturating_add(tokens_out);

    assert_mint_allowed(pool, &fyc_after, &ffc_after)
        .map_err(|_| ProgramError::from(FleetError::ConversionBelowMintFloor))?;

    // NEW (security review) — same ELB-vs-pending re-check as jr_to_sr;
    // see that function's comment.
    let elb_after = compute_elb(pool, &fyc_after, &ffc_after)?;
    if elb_after.fyc < pool.pending_fyc_redemptions || elb_after.ffc < pool.pending_ffc_redemptions {
        return Err(FleetError::ConversionWouldStrandPendingRedemption.into());
    }

    *fyc = fyc_after;
    *ffc = ffc_after;
    Ok(ConversionResult { value_usd, tokens_out })
}

/// Same fail-closed fix as helpers/coverage.rs::severity_bps — see that
/// function's comment. A conversion that drains FYC to zero while loans are
/// still outstanding must trip the post-conversion severity check in
/// jr_to_sr, not read as severity-0-therefore-safe.
fn severity_bps_after(outstanding: u64, ffc_v: u64, fyc_v: u64) -> Result<u64, ProgramError> {
    if fyc_v == 0 { return Ok(if outstanding <= ffc_v { 0 } else { u64::MAX }); }
    let shortfall = outstanding.saturating_sub(ffc_v);
    mul_div_u64(shortfall, BPS_DENOMINATOR, fyc_v)
}`,
  suggestions: [
    "FIXED (security review): jr_to_sr/sr_to_jr now re-check the post-conversion ELB split against pending_fyc_redemptions/pending_ffc_redemptions before committing (ConversionWouldStrandPendingRedemption), and validate on local copies instead of mutating fyc/ffc before the check — a failed conversion no longer leaves a half-applied state behind. See errors.rs.",
    "Whether jr_to_sr/sr_to_jr should be blocked from composing atomically with originate_loan in the same transaction (temporarily satisfying a gate, originating, then reversing) isn't decided — every check here reads live state so it's likely low-risk, but deserves an explicit answer. See /open-questions.",
  ],
},
{
  path: "pinochio/src/instructions/jr_to_sr.rs",
  status: "U",
  category: "pinocchio",
  why: "New instruction (round 2) — investor-initiated tranche conversion, thin wrapper around helpers/tranche_convert.rs::jr_to_sr. Burns the investor's FFC up front, then mints FYC only if the post-conversion severity check inside the helper actually passes — so a rejected conversion never leaves the investor's FFC burned with nothing minted in return.",
  original: "",
  proposed: `//! jr_to_sr — investor-initiated tranche conversion: burn FFC, mint FYC at
//! conservative price on both legs. New this round — see /tranche-swap.
//!
//! Accounts: [investor, pool, fyc_tranche, ffc_tranche, fyc_mint, ffc_mint,
//!            investor_ffc_account, investor_fyc_account, token_program]
//! Data: tokens_in (u64)

use pinocchio::{account::AccountView, cpi::{Seed, Signer}, ProgramResult};
use pinocchio_token::instructions::{Burn, MintTo};

use crate::constants::POOL_SEED;
use crate::errors::FleetError;
use crate::helpers::tranche_convert::jr_to_sr as convert;
use crate::helpers::waterfall::ensure_not_paused;
use crate::pda::*;
use crate::state::{load_pool_mut, load_tranche_mut, save_pool, save_tranche};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    let [investor, pool, fyc_tranche, ffc_tranche, fyc_mint, ffc_mint,
         investor_ffc_acc, investor_fyc_acc, _token_program, ..] =
        accounts else { return Err(FleetError::InvalidAccountData.into()) };

    let mut c = 0;
    let tokens_in = read_u64(data, &mut c)?;

    require_signer(investor)?;
    let p = load_pool_mut(pool)?;
    ensure_not_paused(&p)?;
    if tokens_in == 0 { return Err(FleetError::Overflow.into()); }

    let mut fyc = load_tranche_mut(fyc_tranche)?;
    let mut ffc = load_tranche_mut(ffc_tranche)?;

    // 1. Burn the investor's FFC up front — mint only happens once the
    // post-conversion severity check inside convert() actually passes.
    Burn::new(investor_ffc_acc, ffc_mint, investor, tokens_in).invoke()?;
    let result = convert(&p, &mut fyc, &mut ffc, tokens_in)?;

    // 2. Mint the investor's new FYC — pool PDA is the mint authority.
    let auth_key = p.authority;
    let pool_bump_arr = [p.bump];
    let pool_seeds: [Seed; 3] = [Seed::from(POOL_SEED), Seed::from(&auth_key[..]), Seed::from(&pool_bump_arr[..])];
    let pool_signer = [Signer::from(&pool_seeds[..])];
    MintTo::new(fyc_mint, investor_fyc_acc, pool, result.tokens_out).invoke_signed(&pool_signer)?;

    save_tranche(fyc_tranche, &fyc)?;
    save_tranche(ffc_tranche, &ffc)?;
    save_pool(pool, &p)?;
    Ok(())
}`
},
{
  path: "pinochio/src/instructions/sr_to_jr.rs",
  status: "U",
  category: "pinocchio",
  why: "New instruction (round 2) — mirror image of jr_to_sr.rs: burn FYC, mint FFC, gated on assert_mint_allowed instead of the severity gate. Same account shape and burn-before-mint ordering.",
  original: "",
  proposed: `//! sr_to_jr — investor-initiated tranche conversion: burn FYC, mint FFC at
//! conservative price on both legs. New this round — see /tranche-swap.
//!
//! Accounts: [investor, pool, fyc_tranche, ffc_tranche, fyc_mint, ffc_mint,
//!            investor_fyc_account, investor_ffc_account, token_program]
//! Data: tokens_in (u64)

use pinocchio::{account::AccountView, cpi::{Seed, Signer}, ProgramResult};
use pinocchio_token::instructions::{Burn, MintTo};

use crate::constants::POOL_SEED;
use crate::errors::FleetError;
use crate::helpers::tranche_convert::sr_to_jr as convert;
use crate::helpers::waterfall::ensure_not_paused;
use crate::pda::*;
use crate::state::{load_pool_mut, load_tranche_mut, save_pool, save_tranche};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    let [investor, pool, fyc_tranche, ffc_tranche, fyc_mint, ffc_mint,
         investor_fyc_acc, investor_ffc_acc, _token_program, ..] =
        accounts else { return Err(FleetError::InvalidAccountData.into()) };

    let mut c = 0;
    let tokens_in = read_u64(data, &mut c)?;

    require_signer(investor)?;
    let p = load_pool_mut(pool)?;
    ensure_not_paused(&p)?;
    if tokens_in == 0 { return Err(FleetError::Overflow.into()); }

    let mut fyc = load_tranche_mut(fyc_tranche)?;
    let mut ffc = load_tranche_mut(ffc_tranche)?;

    Burn::new(investor_fyc_acc, fyc_mint, investor, tokens_in).invoke()?;
    let result = convert(&p, &mut fyc, &mut ffc, tokens_in)?;

    let auth_key = p.authority;
    let pool_bump_arr = [p.bump];
    let pool_seeds: [Seed; 3] = [Seed::from(POOL_SEED), Seed::from(&auth_key[..]), Seed::from(&pool_bump_arr[..])];
    let pool_signer = [Signer::from(&pool_seeds[..])];
    MintTo::new(ffc_mint, investor_ffc_acc, pool, result.tokens_out).invoke_signed(&pool_signer)?;

    save_tranche(fyc_tranche, &fyc)?;
    save_tranche(ffc_tranche, &ffc)?;
    save_pool(pool, &p)?;
    Ok(())
}`
},
{
  path: "pinochio/src/instructions/disable_yield_source.rs",
  status: "U",
  category: "pinocchio",
  why: "New instruction (round 2) — admin-only, retires a registered yield source (the 'stop accepting a particular yield-bearing token' function the user asked for). Flips is_active to 0; helpers/liquidity.rs::pick_unwind_source then prioritizes it on the next redemption payout, and pick_rebalance_target stops routing new capital to it. No PoolState changes.",
  original: "",
  proposed: `//! Admin-only: retire a registered yield source. Once disabled, it stops
//! receiving new deposits/rebalance routing (helpers/liquidity.rs) and is
//! prioritized for unwinding on the next redemption that needs to swap
//! yield-token → stable. New this round — see /yield-sources.
//!
//! Accounts: [admin, pool, yield_source]
//! Data: ()

use pinocchio::{account::AccountView, ProgramResult};

use crate::errors::FleetError;
use crate::pda::*;
use crate::state::{load_pool_mut, load_yield_source_mut, save_yield_source};

pub fn process(accounts: &[AccountView], _data: &[u8]) -> ProgramResult {
    let [admin, pool, yield_source, ..] = accounts else {
        return Err(FleetError::InvalidAccountData.into());
    };
    require_signer(admin)?;
    let p = load_pool_mut(pool)?;
    if !p.assert_admin(admin.address().as_array()) { return Err(FleetError::Unauthorized.into()); }

    let mut ys = load_yield_source_mut(yield_source)?;
    if ys.pool != *pool.address().as_array() { return Err(FleetError::Unauthorized.into()); }
    ys.is_active = 0;
    save_yield_source(yield_source, &ys)?;
    Ok(())
}`
},
{
  path: "pinochio/src/instructions/set_max_fyc_apy.rs",
  status: "U",
  category: "pinocchio",
  why: "New instruction (round 3) — admin-only, sets PoolState.max_fyc_apy_bps (see state.rs), the ceiling helpers/waterfall.rs::distribute_loan_interest enforces on FYC's TOTAL blended APY. 0 (the value every already-deployed pool backfills to) means uncapped, so a pool's real behavior is completely unchanged until an admin actually calls this. Structurally the smallest possible admin setter — mirrors disable_yield_source.rs's shape (assert_admin, one field write, no PDA) rather than set_redemption_fees.rs's multi-field validation. CORRECTED after a security review: this originally shipped with no bound on the accepted value at all (the claim here used to be 'no upper/lower bound to enforce beyond what u64 already gives for free') — now rejects anything above the new MAX_FYC_APY_BPS (constants.rs), since distribute_loan_interest's ceiling math multiplies this value against fyc.v_tranche in a u128 intermediate that a near-u64::MAX input could push uncomfortably close to overflowing. Like the other round-2/3 admin instructions in this file (disable_yield_source, earmark_loan_capital, jr_to_sr, sr_to_jr), its ix_tag discriminator and process_instruction dispatch arm follow the same convention as INITIALIZE_YIELD_SOURCE/DEPOSIT_YIELD_TOKEN/BURN_INSURANCE_FOR_FFC (lib.rs) but aren't re-shown in this excerpt — same known gap already flagged for those instructions, not new here.",
  original: "",
  proposed: `//! Admin-only: sets FYC's total-blended-APY ceiling (max_fyc_apy_bps on
//! PoolState). 0 means "uncapped" — the sentinel every already-deployed
//! pool starts at after migration, so THIS instruction is what actually
//! turns the cap on; nothing changes for anyone until an admin calls it.
//! New this round — see helpers/waterfall.rs::distribute_loan_interest,
//! /simulator, and /glossary#fyc-apy-cap.
//!
//! CHANGED (security review) — rejects any value above MAX_FYC_APY_BPS
//! (constants.rs). The original version accepted any u64 at all; a value
//! near u64::MAX, combined with a large fyc.v_tranche, pushes
//! distribute_loan_interest's mul_div_u64(headroom_bps, fyc.v_tranche,
//! BPS_DENOMINATOR) uncomfortably close to overflowing its own u128
//! intermediate.
//!
//! Accounts: [admin, pool]
//! Data: max_fyc_apy_bps (u64)

use pinocchio::{account::AccountView, ProgramResult};

use crate::constants::MAX_FYC_APY_BPS;
use crate::errors::FleetError;
use crate::pda::*;
use crate::state::{load_pool_mut, save_pool};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    let [admin, pool, ..] = accounts else {
        return Err(FleetError::InvalidAccountData.into());
    };
    require_signer(admin)?;
    let mut p = load_pool_mut(pool)?;
    if !p.assert_admin(admin.address().as_array()) { return Err(FleetError::Unauthorized.into()); }

    let mut c = 0;
    let max_fyc_apy_bps = read_u64(data, &mut c)?;
    if max_fyc_apy_bps > MAX_FYC_APY_BPS {
        return Err(FleetError::InvalidInstructionData.into());
    }
    p.max_fyc_apy_bps = max_fyc_apy_bps;
    save_pool(pool, &p)?;
    Ok(())
}`
},
{
  path: "pinochio/src/instructions/earmark_loan_capital.rs",
  status: "U",
  category: "pinocchio",
  why: "New instruction (round 2) — admin-only, called by the backend the instant a loan hits the off-chain 'equity received' pipeline stage, before it actually originates on-chain. Creates one EarmarkRecord PDA (its own expiry, keyed on an opaque backend-supplied loan_ref) and bumps PoolState's aggregate earmarked_loan_capital, which helpers/liquidity.rs::compute_elb nets out of instant-redemption liquidity. See /redemption.",
  original: "",
  proposed: `//! Admin-only: reserve capital against a loan that's reached the off-chain
//! "equity received" pipeline stage but hasn't originated on-chain yet.
//! Creates one EarmarkRecord PDA and bumps PoolState's aggregate. New this
//! round — see /redemption.
//!
//! Accounts: [admin, pool, earmark (init PDA), system_program]
//! Data: earmark_bump (u8) + loan_ref (u64) + amount (u64)

use pinocchio::{account::AccountView, cpi::{Seed, Signer}, sysvars::{clock::Clock, Sysvar}, ProgramResult};

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::math::checked_add_u64;
use crate::helpers::sysprog::{create_pda_account, rent_exempt_minimum};
use crate::pda::*;
use crate::state::{earmark_status, load_pool_mut, save_earmark, save_pool, EarmarkRecord, EARMARK_SPACE};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    let [admin, pool, earmark, _system_program, ..] = accounts else {
        return Err(FleetError::InvalidAccountData.into());
    };
    let mut c = 0;
    let earmark_bump = read_u8(data, &mut c)?;
    let loan_ref = read_u64(data, &mut c)?;
    let amount = read_u64(data, &mut c)?;

    require_signer(admin)?;
    let mut p = load_pool_mut(pool)?;
    if !p.assert_admin(admin.address().as_array()) { return Err(FleetError::Unauthorized.into()); }
    if amount == 0 { return Err(FleetError::Overflow.into()); }

    let pool_key = *pool.address().as_array();
    let loan_ref_le = loan_ref.to_le_bytes();
    let bump_arr = [earmark_bump];
    let seeds: [Seed; 4] = [
        Seed::from(EARMARK_SEED),
        Seed::from(&pool_key[..]),
        Seed::from(&loan_ref_le[..]),
        Seed::from(&bump_arr[..]),
    ];
    verify_pda(earmark, &[EARMARK_SEED, &pool_key[..], &loan_ref_le[..]], earmark_bump)?;
    let signer = [Signer::from(&seeds[..])];
    create_pda_account(admin, earmark, EARMARK_SPACE as u64, &PROGRAM_ID,
        rent_exempt_minimum(EARMARK_SPACE as u64), &signer)?;

    let now_ts = Clock::get()?.unix_timestamp;
    let record = EarmarkRecord {
        pool: pool_key,
        loan_ref,
        amount,
        created_ts: now_ts,
        expires_ts: now_ts + EARMARK_EXPIRY_SECS,
        status: earmark_status::ACTIVE,
        bump: earmark_bump,
        _pad: [0u8; 6],
    };
    save_earmark(earmark, &record)?;

    p.earmarked_loan_capital = checked_add_u64(p.earmarked_loan_capital, amount)?;
    save_pool(pool, &p)?;
    Ok(())
}`,
  suggestions: [
    "originate_loan.rs (unchanged in this round's excerpt) needs a corresponding release call — find the matching EarmarkRecord by loan_ref, mark it RELEASED, and decrement earmarked_loan_capital by its amount — the instant a loan actually originates, so the capital transitions cleanly from 'earmarked' to outstanding_principal instead of double-counting against both.",
    "Two concurrent equity-received events can each pass the origination liquidity gate before either one's earmark_loan_capital call actually lands, both drawing on the same slice of ELB. EARMARK_EXPIRY_SECS + cancel_earmark.rs's permissionless sweep bounds the damage but doesn't prevent it — the real fix is serializing equity-received processing in the backend, not something this PDA layout alone can guarantee.",
  ],
},
{
  path: "pinochio/src/instructions/cancel_earmark.rs",
  status: "U",
  category: "pinocchio",
  why: "New instruction (round 2) — releases an earmark, either admin-cancelled any time (the deal fell through) or, permissionlessly, by anyone once expires_ts has passed. The permissionless branch is the hardening this round adds on top of the base earmark/cancel design: it bounds how long a forgotten admin cancellation can over-reserve capital, the same 'don't rely on someone remembering to call it' concern already flagged for flag_pending_default on /open-questions.",
  original: "",
  proposed: `//! Release an earmark — admin-cancelled any time, or permissionlessly by
//! anyone once expires_ts has passed (a backstop against a forgotten admin
//! cancellation permanently over-reserving capital). New this round — see
//! /redemption.
//!
//! Accounts: [caller, pool, earmark]
//! Data: ()

use pinocchio::{account::AccountView, sysvars::{clock::Clock, Sysvar}, ProgramResult};

use crate::errors::FleetError;
use crate::pda::*;
use crate::state::{earmark_status, load_earmark_mut, load_pool_mut, save_earmark, save_pool};

pub fn process(accounts: &[AccountView], _data: &[u8]) -> ProgramResult {
    let [caller, pool, earmark, ..] = accounts else {
        return Err(FleetError::InvalidAccountData.into());
    };
    require_signer(caller)?;
    let mut p = load_pool_mut(pool)?;
    let mut record = load_earmark_mut(earmark)?;
    if record.pool != *pool.address().as_array() { return Err(FleetError::Unauthorized.into()); }
    if record.status != earmark_status::ACTIVE { return Err(FleetError::InvalidAccountData.into()); }

    if !p.assert_admin(caller.address().as_array()) {
        let now_ts = Clock::get()?.unix_timestamp;
        if now_ts < record.expires_ts {
            return Err(FleetError::EarmarkNotYetExpired.into());
        }
    }

    p.earmarked_loan_capital = p.earmarked_loan_capital.saturating_sub(record.amount);
    record.status = earmark_status::CANCELLED;
    save_earmark(earmark, &record)?;
    save_pool(pool, &p)?;
    Ok(())
}`
},
{
  path: "pinochio/src/helpers/redemption.rs",
  status: "M",
  category: "pinocchio",
  why: "Adds execute_accelerated_redemption_payout alongside the existing execute_redemption_payout, which stays untouched and keeps backing process_redemption.rs's unchanged standard-queue path. The new function's fee is computed BEFORE it's ever called (helpers/liquidity.rs::instant_redemption_fee) — only the NET amount actually gets swapped and paid to the investor; the fee-portion tokens never enter the swap, since they're settled as FYC (transferred or converted, not USDC) by accelerated_redeem.rs. Also drops the single flat protocol_fee_recipient split this file used to do post-swap — round 2's fee never touches USDC at all.",
  original: `//! Redemption payout: USYC→USDC swap then split investor / protocol fee.

use pinocchio::{account::AccountView, error::ProgramError, cpi::Signer, Address};
use pinocchio_token::instructions::Transfer;

use crate::constants::BPS_DENOMINATOR;
use crate::errors::FleetError;
use crate::helpers::math::{checked_sub_u64, mul_div_u64};
use crate::helpers::swap::execute_jupiter_swap_to_deposit;

pub struct RedemptionPayout {
    pub usdc_received: u64,
    pub usyc_spent: u64,
    pub investor_usdc: u64,
    pub protocol_fee_usdc: u64,
}

#[allow(clippy::too_many_arguments)]
pub fn execute_redemption_payout(
    jupiter_program: &AccountView,
    base_yield_token_vault: &AccountView,
    deposit_token_vault: &AccountView,
    investor_deposit_token_account: &AccountView,
    protocol_deposit_token_account: &AccountView,
    pool_account: &AccountView,
    pool_signer_addresses: &[&Address],
    pool_signer_seeds: &[Signer],
    gross_usd_payout: u64,
    fee_bps: u64,
    route_accounts: &[AccountView],
    route_data: &[u8],
) -> Result<RedemptionPayout, ProgramError> {
    if gross_usd_payout == 0 {
        return Err(FleetError::SwapOutputBelowMinimum.into());
    }

    let (usyc_spent, usdc_received) = execute_jupiter_swap_to_deposit(
        jupiter_program,
        base_yield_token_vault,
        deposit_token_vault,
        gross_usd_payout,
        route_accounts,
        route_data,
        pool_signer_addresses,
        pool_signer_seeds,
    )?;

    let protocol_fee_usdc = mul_div_u64(usdc_received, fee_bps, BPS_DENOMINATOR)?;
    let investor_usdc = checked_sub_u64(usdc_received, protocol_fee_usdc)?;

    if investor_usdc > 0 {
        Transfer::new(deposit_token_vault, investor_deposit_token_account, pool_account, investor_usdc)
        .invoke_signed(pool_signer_seeds)?;
    }
    if protocol_fee_usdc > 0 {
        Transfer::new(deposit_token_vault, protocol_deposit_token_account, pool_account, protocol_fee_usdc)
        .invoke_signed(pool_signer_seeds)?;
    }

    Ok(RedemptionPayout { usdc_received, usyc_spent, investor_usdc, protocol_fee_usdc })
}`,
  proposed: `//! Redemption payout. execute_redemption_payout (unchanged) still backs
//! process_redemption.rs's standard 30d/90d-queue path — USYC→USDC swap,
//! then a flat fee split off the USDC. NEW (round 2):
//! execute_accelerated_redemption_payout backs the instant path instead —
//! see /redemption.

use pinocchio::{account::AccountView, error::ProgramError, cpi::Signer, Address};
use pinocchio_token::instructions::Transfer;

use crate::constants::BPS_DENOMINATOR;
use crate::errors::FleetError;
use crate::helpers::math::{checked_sub_u64, mul_div_u64};
use crate::helpers::swap::execute_jupiter_swap_to_deposit;

pub struct RedemptionPayout {
    pub usdc_received: u64,
    pub usyc_spent: u64,
    pub investor_usdc: u64,
    pub protocol_fee_usdc: u64,
}

#[allow(clippy::too_many_arguments)]
pub fn execute_redemption_payout(
    jupiter_program: &AccountView,
    base_yield_token_vault: &AccountView,
    deposit_token_vault: &AccountView,
    investor_deposit_token_account: &AccountView,
    protocol_deposit_token_account: &AccountView,
    pool_account: &AccountView,
    pool_signer_addresses: &[&Address],
    pool_signer_seeds: &[Signer],
    gross_usd_payout: u64,
    fee_bps: u64,
    route_accounts: &[AccountView],
    route_data: &[u8],
) -> Result<RedemptionPayout, ProgramError> {
    if gross_usd_payout == 0 {
        return Err(FleetError::SwapOutputBelowMinimum.into());
    }

    let (usyc_spent, usdc_received) = execute_jupiter_swap_to_deposit(
        jupiter_program,
        base_yield_token_vault,
        deposit_token_vault,
        gross_usd_payout,
        route_accounts,
        route_data,
        pool_signer_addresses,
        pool_signer_seeds,
    )?;

    let protocol_fee_usdc = mul_div_u64(usdc_received, fee_bps, BPS_DENOMINATOR)?;
    let investor_usdc = checked_sub_u64(usdc_received, protocol_fee_usdc)?;

    if investor_usdc > 0 {
        Transfer::new(deposit_token_vault, investor_deposit_token_account, pool_account, investor_usdc)
        .invoke_signed(pool_signer_seeds)?;
    }
    if protocol_fee_usdc > 0 {
        Transfer::new(deposit_token_vault, protocol_deposit_token_account, pool_account, protocol_fee_usdc)
        .invoke_signed(pool_signer_seeds)?;
    }

    Ok(RedemptionPayout { usdc_received, usyc_spent, investor_usdc, protocol_fee_usdc })
}

pub struct AcceleratedPayout {
    pub usdc_received: u64,
    pub usyc_spent: u64,
}

/// NEW (round 2) — the accelerated-redemption swap+payout leg. The fee is
/// computed BEFORE this is ever called (helpers/liquidity.rs::instant_redemption_fee)
/// — only the NET amount (post-fee) is swapped and paid to the investor; the
/// fee-portion tokens never enter this swap at all, since they're settled as
/// FYC by the caller (transferred if redeeming FYC, converted via jr_to_sr if
/// redeeming FFC), never as USDC.
#[allow(clippy::too_many_arguments)]
pub fn execute_accelerated_redemption_payout(
    jupiter_program: &AccountView,
    base_yield_token_vault: &AccountView,
    deposit_token_vault: &AccountView,
    investor_deposit_token_account: &AccountView,
    pool_account: &AccountView,
    pool_signer_addresses: &[&Address],
    pool_signer_seeds: &[Signer],
    net_usd_payout: u64,
    route_accounts: &[AccountView],
    route_data: &[u8],
) -> Result<AcceleratedPayout, ProgramError> {
    if net_usd_payout == 0 {
        return Err(FleetError::SwapOutputBelowMinimum.into());
    }
    let (usyc_spent, usdc_received) = execute_jupiter_swap_to_deposit(
        jupiter_program,
        base_yield_token_vault,
        deposit_token_vault,
        net_usd_payout,
        route_accounts,
        route_data,
        pool_signer_addresses,
        pool_signer_seeds,
    )?;
    if usdc_received > 0 {
        Transfer::new(deposit_token_vault, investor_deposit_token_account, pool_account, usdc_received)
            .invoke_signed(pool_signer_seeds)?;
    }
    Ok(AcceleratedPayout { usdc_received, usyc_spent })
}`
},
{
  path: "pinochio/src/instructions/accelerated_redeem.rs",
  status: "M",
  category: "pinocchio",
  why: "Replaces the flat accelerated_redemption_fee_bps with the liquidity-scaled formula from helpers/liquidity.rs, and changes fee settlement entirely: FYC fee-portion tokens are transferred (never burned) straight to protocol/insurance FYC token accounts; FFC fee-portion tokens are burned and the equivalent value minted as new FYC via helpers/tranche_convert.rs::jr_to_sr — protocol/insurance treasuries never hold first-loss (FFC) exposure. Also the first place an actual liquidity check exists before attempting the swap — the original version had none, relying on the Jupiter CPI failing naturally if the vault was short.",
  original: `//! Accelerated redemption: investor pays a fee to skip the queue (Spec 11.4).
//!
//! Accounts (Anchor order):
//!   0  investor (signer, writable)
//!   1  pool (writable)
//!   2  tranche (writable)
//!   3  tranche_mint (writable)
//!   4  investor_tranche_account (writable)
//!   5  investor_deposit_token_account (writable)
//!   6  deposit_token_vault (writable)
//!   7  base_yield_token_vault (writable)
//!   8  protocol_deposit_token_account (writable)
//!   9  jupiter_program
//!  10  token_program
//!  11.. route accounts
//!
//! Data: tokens_requested (u64) + var route_data

use pinocchio::{
    account::AccountView,
    cpi::{Seed, Signer},
    ProgramResult,
};
use pinocchio_token::instructions::Burn;

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::math::checked_sub_u64;
use crate::helpers::pricing::usd_for_tokens;
use crate::helpers::redemption::execute_redemption_payout;
use crate::helpers::token_account::{token_account_mint, token_account_owner};
use crate::helpers::waterfall::ensure_not_paused;
use crate::pda::*;
use crate::state::{load_pool_mut, load_tranche_mut, save_pool, save_tranche};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    if accounts.len() < 11 { return Err(FleetError::InvalidAccountData.into()); }
    let investor = &accounts[0];
    let pool = &accounts[1];
    let tranche = &accounts[2];
    let tranche_mint = &accounts[3];
    let investor_tranche_acc = &accounts[4];
    let investor_dep_acc = &accounts[5];
    let deposit_vault = &accounts[6];
    let base_vault = &accounts[7];
    let protocol_dep_acc = &accounts[8];
    let jupiter_program = &accounts[9];
    let _token_program = &accounts[10];
    let route_accounts = &accounts[11..];

    let mut c = 0;
    let tokens_requested = read_u64(data, &mut c)?;
    let route_data = read_var(data, &mut c)?;

    require_signer(investor)?;
    let mut p = load_pool_mut(pool)?;
    ensure_not_paused(&p)?;
    if tokens_requested == 0 { return Err(FleetError::Overflow.into()); }
    if route_data.is_empty() { return Err(FleetError::AcceleratedSwapBelowMinimum.into()); }

    let mut t = load_tranche_mut(tranche)?;
    let tranche_key = *tranche.address().as_array();
    if tranche_key != p.fyc_tranche && tranche_key != p.ffc_tranche {
        return Err(FleetError::TrancheMismatch.into());
    }
    if t.token_mint != *tranche_mint.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }
    if p.deposit_token_vault != *deposit_vault.address().as_array()
        || p.base_yield_token_vault != *base_vault.address().as_array()
    { return Err(FleetError::Unauthorized.into()); }
    if token_account_owner(protocol_dep_acc)? != p.protocol_fee_recipient
        || token_account_mint(protocol_dep_acc)? != p.deposit_token_mint
    { return Err(FleetError::Unauthorized.into()); }

    let price_used = t.conservative_price;
    let gross_usd = usd_for_tokens(tokens_requested, price_used)?;
    if gross_usd == 0 { return Err(FleetError::AcceleratedSwapBelowMinimum.into()); }
    let fee_bps = p.accelerated_redemption_fee_bps;

    let auth_key = p.authority;
    let pool_bump_arr = [p.bump];
    let pool_seeds: [Seed; 3] = [
        Seed::from(POOL_SEED),
        Seed::from(&auth_key[..]),
        Seed::from(&pool_bump_arr[..]),
    ];
    let pool_signer = [Signer::from(&pool_seeds[..])];

    // 1. Burn investor's tranche tokens.
    Burn::new(investor_tranche_acc, tranche_mint, investor, tokens_requested).invoke()?;

    // 2. Swap + payout.
    let payout = execute_redemption_payout(
        jupiter_program, base_vault, deposit_vault,
        investor_dep_acc, protocol_dep_acc, pool,
        &[pool.address()], &pool_signer,
        gross_usd, fee_bps,
        route_accounts, route_data,
    )?;

    // 3. Bookkeeping.
    t.v_tranche = checked_sub_u64(t.v_tranche, gross_usd)?;
    t.total_supply = checked_sub_u64(t.total_supply, tokens_requested)?;
    p.c_tokens = checked_sub_u64(p.c_tokens, payout.usyc_spent)?;
    if t.tranche_type == TRANCHE_FFC {
        p.pending_ffc_redemptions = p.pending_ffc_redemptions.saturating_sub(gross_usd);
    }

    save_pool(pool, &p)?;
    save_tranche(tranche, &t)?;
    Ok(())
}`,
  proposed: `//! Accelerated redemption: liquidity-scaled fee instead of a flat one,
//! settled entirely as FYC — transferred if redeeming FYC, converted via
//! jr_to_sr if redeeming FFC, so protocol/insurance treasuries never hold
//! first-loss (FFC) exposure. New this round — see /redemption,
//! /tranche-swap. The standard (30d/90d queue) path in
//! process_redemption.rs is unchanged.
//!
//! Accounts (Anchor order):
//!   0  investor (signer, writable)
//!   1  pool (writable)
//!   2  fyc_tranche (writable)
//!   3  fyc_mint (writable)
//!   4  ffc_tranche (writable)
//!   5  ffc_mint (writable)
//!   6  investor_tranche_account (writable) — the mint matching redeem_tranche
//!   7  investor_deposit_token_account (writable)
//!   8  deposit_token_vault (writable)
//!   9  base_yield_token_vault (writable)
//!  10  protocol_fyc_account (writable) — protocol_wallet's FYC token account
//!  11  insurance_fyc_account (writable) — insurance_wallet's FYC token account
//!  12  jupiter_program
//!  13  token_program
//!  14.. route accounts
//!
//! Data: redeem_tranche (u8) + tokens_requested (u64) + var route_data

use pinocchio::{
    account::AccountView,
    cpi::{Seed, Signer},
    ProgramResult,
};
use pinocchio_token::instructions::{Burn, MintTo, Transfer};

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::liquidity::{compute_elb, instant_redemption_fee};
use crate::helpers::math::{checked_add_u64, checked_sub_u64, mul_div_u64};
use crate::helpers::pricing::usd_for_tokens;
use crate::helpers::redemption::execute_accelerated_redemption_payout;
use crate::helpers::tranche_convert::jr_to_sr;
use crate::helpers::waterfall::ensure_not_paused;
use crate::pda::*;
use crate::state::{load_pool_mut, load_tranche_mut, save_pool, save_tranche};

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    if accounts.len() < 14 { return Err(FleetError::InvalidAccountData.into()); }
    let investor = &accounts[0];
    let pool = &accounts[1];
    let fyc_tranche = &accounts[2];
    let fyc_mint = &accounts[3];
    let ffc_tranche = &accounts[4];
    let ffc_mint = &accounts[5];
    let investor_tranche_acc = &accounts[6];
    let investor_dep_acc = &accounts[7];
    let deposit_vault = &accounts[8];
    let base_vault = &accounts[9];
    let protocol_fyc_acc = &accounts[10];
    let insurance_fyc_acc = &accounts[11];
    let jupiter_program = &accounts[12];
    let _token_program = &accounts[13];
    let route_accounts = &accounts[14..];

    let mut c = 0;
    let redeem_tranche = read_u8(data, &mut c)?;
    let tokens_requested = read_u64(data, &mut c)?;
    let route_data = read_var(data, &mut c)?;
    let is_fyc = redeem_tranche == TRANCHE_FYC;

    require_signer(investor)?;
    let mut p = load_pool_mut(pool)?;
    ensure_not_paused(&p)?;
    if tokens_requested == 0 { return Err(FleetError::Overflow.into()); }
    if route_data.is_empty() { return Err(FleetError::AcceleratedSwapBelowMinimum.into()); }

    let mut fyc = load_tranche_mut(fyc_tranche)?;
    let mut ffc = load_tranche_mut(ffc_tranche)?;
    let price_used = if is_fyc { fyc.conservative_price } else { ffc.conservative_price };
    let gross_usd = usd_for_tokens(tokens_requested, price_used)?;
    if gross_usd == 0 { return Err(FleetError::AcceleratedSwapBelowMinimum.into()); }

    // NEW — an actual liquidity check before attempting the swap at all. The
    // original version had none; it just let the Jupiter CPI fail naturally
    // if the vault was short.
    let elb = compute_elb(&p, &fyc, &ffc)?;
    let elb_tranche = if is_fyc { elb.fyc } else { elb.ffc };
    let pending = if is_fyc { p.pending_fyc_redemptions } else { p.pending_ffc_redemptions };
    let fee = instant_redemption_fee(redeem_tranche, gross_usd, elb_tranche.saturating_sub(pending))?;

    let auth_key = p.authority;
    let pool_bump_arr = [p.bump];
    let pool_seeds: [Seed; 3] = [
        Seed::from(POOL_SEED),
        Seed::from(&auth_key[..]),
        Seed::from(&pool_bump_arr[..]),
    ];
    let pool_signer = [Signer::from(&pool_seeds[..])];

    if is_fyc {
        // Fee-portion FYC tokens are TRANSFERRED, never burned — only the
        // net portion actually leaves v_tranche/total_supply.
        let fee_tokens = if price_used > 0 { mul_div_u64(fee.fee_value, PRECISION, price_used)? } else { 0 };
        let net_tokens = tokens_requested.saturating_sub(fee_tokens);
        Burn::new(investor_tranche_acc, fyc_mint, investor, net_tokens).invoke()?;
        if fee_tokens > 0 {
            let half = fee_tokens / 2;
            Transfer::new(investor_tranche_acc, protocol_fyc_acc, investor, half).invoke()?;
            Transfer::new(investor_tranche_acc, insurance_fyc_acc, investor, fee_tokens - half).invoke()?;
        }
        fyc.v_tranche = checked_sub_u64(fyc.v_tranche, fee.net_payout)?;
        fyc.total_supply = fyc.total_supply.saturating_sub(net_tokens);
    } else {
        // The FULL amount is burned from the investor's account, exactly
        // once — matches the real on-chain SPL burn below. Only the NET
        // portion's value/token-count is removed from ffc's own books
        // here: the fee portion's value moves FFC->FYC through jr_to_sr
        // below (one audited burn/mint primitive), which does its own
        // single subtraction on success. FIXED (security review): the
        // previous version subtracted gross_usd/tokens_requested here AND
        // let jr_to_sr subtract the fee's value/token-count again —
        // destroying real NAV on every FFC accelerated redeem with a
        // nonzero fee (fee value removed from FFC twice, added to FYC
        // once).
        Burn::new(investor_tranche_acc, ffc_mint, investor, tokens_requested).invoke()?;
        let fee_ffc_tokens = if price_used > 0 { mul_div_u64(fee.fee_value, PRECISION, price_used)? } else { 0 };
        let net_tokens = tokens_requested.saturating_sub(fee_ffc_tokens);
        ffc.v_tranche = checked_sub_u64(ffc.v_tranche, fee.net_payout)?;
        ffc.total_supply = ffc.total_supply.saturating_sub(net_tokens);

        // A fee-side conversion must never revert the investor's whole
        // redemption, so a jr_to_sr failure (e.g. would breach the
        // severity gate) doesn't propagate. FIXED (security review):
        // jr_to_sr now leaves ffc/fyc completely untouched on Err (see
        // helpers/tranche_convert.rs — the old version mutated first and
        // validated after, so a failed call still moved value and
        // inflated total_supply with nothing actually minted to match).
        // On success it subtracts fee_ffc_tokens from ffc.total_supply
        // itself, bringing the running reduction to net_tokens +
        // fee_ffc_tokens == tokens_requested, matching the real burn
        // above exactly. On failure, fee_ffc_tokens' worth of real tokens
        // were still burned above (that CPI already ran and can't be
        // undone), so total_supply is corrected here to match — but the
        // fee's VALUE stays exactly where it already sat in ffc.v_tranche
        // (never touched by the failed call, nothing to double-remove),
        // tracked in suspense_fee_value so a keeper can retry the
        // conversion later instead of it silently vanishing.
        if fee_ffc_tokens > 0 {
            match jr_to_sr(&p, &mut fyc, &mut ffc, fee_ffc_tokens) {
                Ok(result) => {
                    let half = result.tokens_out / 2;
                    MintTo::new(fyc_mint, protocol_fyc_acc, pool, half).invoke_signed(&pool_signer)?;
                    MintTo::new(fyc_mint, insurance_fyc_acc, pool, result.tokens_out - half).invoke_signed(&pool_signer)?;
                }
                Err(_) => {
                    ffc.total_supply = ffc.total_supply.saturating_sub(fee_ffc_tokens);
                    ffc.suspense_fee_value = checked_add_u64(ffc.suspense_fee_value, fee.fee_value)?;
                }
            }
        }
    }

    let payout = execute_accelerated_redemption_payout(
        jupiter_program, base_vault, deposit_vault, investor_dep_acc, pool,
        &[pool.address()], &pool_signer, fee.net_payout, route_accounts, route_data,
    )?;
    p.c_tokens = checked_sub_u64(p.c_tokens, payout.usyc_spent)?;

    save_pool(pool, &p)?;
    save_tranche(fyc_tranche, &fyc)?;
    save_tranche(ffc_tranche, &ffc)?;
    Ok(())
}`,
  suggestions: [
    "FIXED (security review): the FFC branch no longer double-subtracts the fee's value/token-count from ffc (was: gross_usd removed up front, then jr_to_sr removed the fee portion again, destroying real NAV). Only net_payout/net_tokens are removed here; jr_to_sr handles the fee's single subtraction on success. A rejected fee-conversion now parks the fee's USD value in TrancheState.suspense_fee_value instead of silently dropping it — a permissionless sweep_fee_suspense instruction to retry the conversion later is still follow-up work, not included in this excerpt.",
    "FIXED (security review): instant_redemption_fee now uses the split-invariant integral formula (helpers/liquidity.rs), so splitting one redemption into several legs against the same elb_tranche no longer converges the average fee toward fee_min.",
    "set_redemption_fees.rs's accelerated_bps admin knob is now vestigial — nothing here reads p.accelerated_redemption_fee_bps anymore, the liquidity-scaled formula replaced it entirely. Worth an explicit decision on removing that field/setter rather than leaving a dead admin control live.",
    "Checked during this round's math-verification pass: does a submit_redemption + accelerated_redeem pair composed into ONE atomic transaction let the second instruction read a stale (not-yet-updated) pending_fyc_redemptions/pending_ffc_redemptions? No — Solana executes instructions within one transaction sequentially against the same account state, so an earlier instruction's write is already visible to a later one in the same transaction. (The design tool's own /simulator briefly had exactly this bug in its period-loop — a cached pending total computed once per period instead of re-read per event — fixed there; noted here only to confirm the real on-chain instruction sequencing was never actually at risk of the same class of bug.)",
  ],
},
{
  path: "pinochio/src/instructions/submit_redemption.rs",
  status: "M",
  category: "pinocchio",
  why: "Tracks pending_fyc_redemptions now too, not just pending_ffc_redemptions. Before this, a queued FYC redemption was invisible to both the ELB liquidity split (helpers/liquidity.rs) and the new origination liquidity gate (helpers/coverage.rs::assert_liquidity_available_for_origination) — only FFC's side ever showed up anywhere.",
  original: `//! Submit a redemption request: lock investor's tranche tokens in escrow PDA.
//!
//! Accounts (Anchor order):
//!   0  investor (signer, writable)
//!   1  pool (writable)
//!   2  tranche (writable)
//!   3  tranche_mint (writable)
//!   4  investor_tranche_account (writable)
//!   5  escrow_account (init token account, writable)
//!   6  request (init PDA, writable)
//!   7  token_program
//!   8  system_program
//!   9  rent
//!
//! Data: request_bump (u8) + escrow_bump (u8) + request_id (u64) + tokens_requested (u64)

use pinocchio::{
    account::AccountView,
    cpi::{Seed, Signer},
    sysvars::{clock::Clock, Sysvar},
    ProgramResult,
};
use pinocchio_token::instructions::{InitializeAccount3, Transfer};

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::math::checked_add_u64;
use crate::helpers::pricing::usd_for_tokens;
use crate::helpers::sysprog::{create_pda_account, rent_exempt_minimum};
use crate::helpers::waterfall::ensure_not_paused;
use crate::pda::*;
use crate::state::{
    load_pool_mut, load_tranche, redemption_status, save_pool, save_redemption, RedemptionRequest,
    REDEMPTION_SPACE,
};

const TOKEN_ACCOUNT_LEN: u64 = 165;

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    let [
        investor, pool, tranche, tranche_mint, investor_tranche_acc,
        escrow_account, request, token_program, _system_program, _rent_sysvar, ..
    ] = accounts else { return Err(FleetError::InvalidAccountData.into()) };

    let mut c = 0;
    let request_bump = read_u8(data, &mut c)?;
    let escrow_bump = read_u8(data, &mut c)?;
    let request_id = read_u64(data, &mut c)?;
    let tokens_requested = read_u64(data, &mut c)?;

    require_signer(investor)?;
    let mut p = load_pool_mut(pool)?;
    ensure_not_paused(&p)?;
    if tokens_requested == 0 { return Err(FleetError::Overflow.into()); }
    let t = load_tranche(tranche)?;
    let tranche_key = *tranche.address().as_array();
    if tranche_key != p.fyc_tranche && tranche_key != p.ffc_tranche {
        return Err(FleetError::TrancheMismatch.into());
    }
    if t.token_mint != *tranche_mint.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }

    let now_ts = Clock::get()?.unix_timestamp;
    let lock_seconds = if t.tranche_type == TRANCHE_FFC {
        FFC_REDEMPTION_LOCK_SECS
    } else { FYC_REDEMPTION_LOCK_SECS };

    // 1. Create escrow token account (PDA).
    let investor_key = *investor.address().as_array();
    let request_id_le = request_id.to_le_bytes();
    let escrow_bump_arr = [escrow_bump];
    let escrow_seeds: [Seed; 5] = [
        Seed::from(ESCROW_SEED),
        Seed::from(&tranche_key[..]),
        Seed::from(&investor_key[..]),
        Seed::from(&request_id_le[..]),
        Seed::from(&escrow_bump_arr[..]),
    ];
    verify_pda(escrow_account, &[ESCROW_SEED, &tranche_key[..], &investor_key[..], &request_id_le[..]], escrow_bump)?;
    let escrow_signer = [Signer::from(&escrow_seeds[..])];
    pinocchio_system::instructions::CreateAccount {
        from: investor,
        to: escrow_account,
        lamports: rent_exempt_minimum(TOKEN_ACCOUNT_LEN),
        space: TOKEN_ACCOUNT_LEN,
        owner: &pinocchio_token::ID,
    }.invoke_signed(&escrow_signer)?;
    InitializeAccount3 {
        account: escrow_account,
        mint: tranche_mint,
        owner: pool.address(),
    }.invoke()?;

    // 2. Create the request PDA.
    let req_bump_arr = [request_bump];
    let req_seeds: [Seed; 5] = [
        Seed::from(REDEEM_SEED),
        Seed::from(&tranche_key[..]),
        Seed::from(&investor_key[..]),
        Seed::from(&request_id_le[..]),
        Seed::from(&req_bump_arr[..]),
    ];
    verify_pda(request, &[REDEEM_SEED, &tranche_key[..], &investor_key[..], &request_id_le[..]], request_bump)?;
    let req_signer = [Signer::from(&req_seeds[..])];
    create_pda_account(investor, request, REDEMPTION_SPACE as u64, &PROGRAM_ID,
        rent_exempt_minimum(REDEMPTION_SPACE as u64), &req_signer)?;

    // 3. Transfer tokens to escrow.
    let _ = token_program;
    Transfer::new(investor_tranche_acc, escrow_account, investor, tokens_requested).invoke()?;

    // 4. Save request.
    let req = RedemptionRequest {
        tranche: tranche_key,
        requester: investor_key,
        request_id,
        tokens_locked: tokens_requested,
        request_ts: now_ts,
        eligible_ts: now_ts + lock_seconds,
        status: redemption_status::PENDING,
        bump: request_bump,
        _pad: [0u8; 6],
    };
    save_redemption(request, &req)?;

    // 5. Pool bookkeeping for FFC pending redemptions.
    if t.tranche_type == TRANCHE_FFC {
        let usd = usd_for_tokens(tokens_requested, t.conservative_price)?;
        p.pending_ffc_redemptions = checked_add_u64(p.pending_ffc_redemptions, usd)?;
        save_pool(pool, &p)?;
    }
    Ok(())
}`,
  proposed: `//! Submit a redemption request: lock investor's tranche tokens in escrow PDA.
//! Round 2: pending_fyc_redemptions is now tracked alongside
//! pending_ffc_redemptions — previously only FFC's side fed the ELB
//! liquidity split and the origination liquidity gate.
//!
//! Accounts (Anchor order):
//!   0  investor (signer, writable)
//!   1  pool (writable)
//!   2  tranche (writable)
//!   3  tranche_mint (writable)
//!   4  investor_tranche_account (writable)
//!   5  escrow_account (init token account, writable)
//!   6  request (init PDA, writable)
//!   7  token_program
//!   8  system_program
//!   9  rent
//!
//! Data: request_bump (u8) + escrow_bump (u8) + request_id (u64) + tokens_requested (u64)

use pinocchio::{
    account::AccountView,
    cpi::{Seed, Signer},
    sysvars::{clock::Clock, Sysvar},
    ProgramResult,
};
use pinocchio_token::instructions::{InitializeAccount3, Transfer};

use crate::constants::*;
use crate::errors::FleetError;
use crate::helpers::math::checked_add_u64;
use crate::helpers::pricing::usd_for_tokens;
use crate::helpers::sysprog::{create_pda_account, rent_exempt_minimum};
use crate::helpers::waterfall::ensure_not_paused;
use crate::pda::*;
use crate::state::{
    load_pool_mut, load_tranche, redemption_status, save_pool, save_redemption, RedemptionRequest,
    REDEMPTION_SPACE,
};

const TOKEN_ACCOUNT_LEN: u64 = 165;

pub fn process(accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    let [
        investor, pool, tranche, tranche_mint, investor_tranche_acc,
        escrow_account, request, token_program, _system_program, _rent_sysvar, ..
    ] = accounts else { return Err(FleetError::InvalidAccountData.into()) };

    let mut c = 0;
    let request_bump = read_u8(data, &mut c)?;
    let escrow_bump = read_u8(data, &mut c)?;
    let request_id = read_u64(data, &mut c)?;
    let tokens_requested = read_u64(data, &mut c)?;

    require_signer(investor)?;
    let mut p = load_pool_mut(pool)?;
    ensure_not_paused(&p)?;
    if tokens_requested == 0 { return Err(FleetError::Overflow.into()); }
    let t = load_tranche(tranche)?;
    let tranche_key = *tranche.address().as_array();
    if tranche_key != p.fyc_tranche && tranche_key != p.ffc_tranche {
        return Err(FleetError::TrancheMismatch.into());
    }
    if t.token_mint != *tranche_mint.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }

    let now_ts = Clock::get()?.unix_timestamp;
    let lock_seconds = if t.tranche_type == TRANCHE_FFC {
        FFC_REDEMPTION_LOCK_SECS
    } else { FYC_REDEMPTION_LOCK_SECS };

    // 1. Create escrow token account (PDA).
    let investor_key = *investor.address().as_array();
    let request_id_le = request_id.to_le_bytes();
    let escrow_bump_arr = [escrow_bump];
    let escrow_seeds: [Seed; 5] = [
        Seed::from(ESCROW_SEED),
        Seed::from(&tranche_key[..]),
        Seed::from(&investor_key[..]),
        Seed::from(&request_id_le[..]),
        Seed::from(&escrow_bump_arr[..]),
    ];
    verify_pda(escrow_account, &[ESCROW_SEED, &tranche_key[..], &investor_key[..], &request_id_le[..]], escrow_bump)?;
    let escrow_signer = [Signer::from(&escrow_seeds[..])];
    pinocchio_system::instructions::CreateAccount {
        from: investor,
        to: escrow_account,
        lamports: rent_exempt_minimum(TOKEN_ACCOUNT_LEN),
        space: TOKEN_ACCOUNT_LEN,
        owner: &pinocchio_token::ID,
    }.invoke_signed(&escrow_signer)?;
    InitializeAccount3 {
        account: escrow_account,
        mint: tranche_mint,
        owner: pool.address(),
    }.invoke()?;

    // 2. Create the request PDA.
    let req_bump_arr = [request_bump];
    let req_seeds: [Seed; 5] = [
        Seed::from(REDEEM_SEED),
        Seed::from(&tranche_key[..]),
        Seed::from(&investor_key[..]),
        Seed::from(&request_id_le[..]),
        Seed::from(&req_bump_arr[..]),
    ];
    verify_pda(request, &[REDEEM_SEED, &tranche_key[..], &investor_key[..], &request_id_le[..]], request_bump)?;
    let req_signer = [Signer::from(&req_seeds[..])];
    create_pda_account(investor, request, REDEMPTION_SPACE as u64, &PROGRAM_ID,
        rent_exempt_minimum(REDEMPTION_SPACE as u64), &req_signer)?;

    // 3. Transfer tokens to escrow.
    let _ = token_program;
    Transfer::new(investor_tranche_acc, escrow_account, investor, tokens_requested).invoke()?;

    // 4. Save request.
    let req = RedemptionRequest {
        tranche: tranche_key,
        requester: investor_key,
        request_id,
        tokens_locked: tokens_requested,
        request_ts: now_ts,
        eligible_ts: now_ts + lock_seconds,
        status: redemption_status::PENDING,
        bump: request_bump,
        _pad: [0u8; 6],
    };
    save_redemption(request, &req)?;

    // 5. Pool bookkeeping for pending redemptions — NEW (round 2): FYC is
    // tracked now too, the same way FFC always was.
    let usd = usd_for_tokens(tokens_requested, t.conservative_price)?;
    if t.tranche_type == TRANCHE_FFC {
        p.pending_ffc_redemptions = checked_add_u64(p.pending_ffc_redemptions, usd)?;
    } else {
        p.pending_fyc_redemptions = checked_add_u64(p.pending_fyc_redemptions, usd)?;
    }
    save_pool(pool, &p)?;
    Ok(())
}`,
  suggestions: [
    "process_redemption.rs (unchanged, not included in this round's excerpt) already decrements pending_ffc_redemptions when an FFC request is processed — it needs the mirror-image pending_fyc_redemptions decrement added for FYC requests, or this new field only ever grows and never actually reflects reality.",
  ],
},
{
  path: "backend/fleets/src/services/repository.ts",
  status: "M",
  category: "backend",
  why: "Excerpt of getTrancheOverview (the investor 'Earn' overview endpoint) — real code, confirmed by reading the live file. Two changes: (1) redeemable_instantly.has_fee was hardcoded false with no fee data at all; now exposes the real fee_bps_min/fee_bps_max per tranche, computed from the exact same ELB-tranche math already sitting right above it — this is the live number frontend/src/components/fleets/SwapCard.tsx should read instead of its own hardcoded pool-size constants (see that file's diff). (2) pendingFycRedemptions was hardcoded to the string \"0\" in the cached pool-state writer because ChainPoolState never had a real field for it — now reads the real decoded value, which only exists once pinochio's new PoolState.pending_fyc_redemptions field (state.rs) and its corresponding IDL/decoder update actually ship. The rest of this large file (loan book, APR annualization, insurance, etc.) is unchanged and outside this excerpt.",
  original: `    const pendingBI = toBigInt(
      tranche === TrancheType.FYC
        ? pool?.pendingFycRedemptions
        : pool?.pendingFfcRedemptions,
    );

    // The instant reserve (ELB) is shared by both tranches. What THIS tranche's
    // holders can redeem instantly is its proportional share of the ELB, split by
    // each tranche's share of pooled NAV (guide §6.1: ELB × V_tranche / V_pool;
    // §11.4 fee formula references ELB_FYC / ELB_FFC). e.g. ELB $5,000 with
    // V_FYC:V_FFC = 2:8 ⇒ FYC redeemable = $1,000, FFC = $4,000. It rebalances
    // automatically as ELB and the tranche NAVs change after each redeem.
    const vFycBI = toBigInt(fycTranche?.vTranche);
    const vFfcBI = toBigInt(ffcTranche?.vTranche);
    const vTranchesBI = vFycBI + vFfcBI;
    const trancheVBI = tranche === TrancheType.FYC ? vFycBI : vFfcBI;
    const elbTrancheBI =
      vTranchesBI > 0n ? (elbBI * trancheVBI) / vTranchesBI : 0n;
    const redeemableInstantlyBI =
      elbTrancheBI > pendingBI ? elbTrancheBI - pendingBI : 0n;

    // ... (unchanged: cTokens/usdyPrice/pctMet/apr/etc. — outside this excerpt)

      liquidity: {
        reserve_target: {
          target_usd: baseToUsdString(reserveTargetBI),
          current_usd: baseToUsdString(elbBI),
          pct_met: pctMet,
        },
        redeemable_instantly: {
          value_usd: baseToUsdString(redeemableInstantlyBI),
          lock_days: tranche === TrancheType.FYC ? 30 : 90,
          has_fee: false,
        },
      },

    // ... (elided — poolSnapshots insert etc. outside this excerpt)

      const poolStateRow = {
        // ...
        pendingFfcRedemptions: pool.pendingFfcRedemptions.toString(),
        pendingFycRedemptions: "0",
        // ...
      };`,
  proposed: `    const pendingBI = toBigInt(
      tranche === TrancheType.FYC
        ? pool?.pendingFycRedemptions
        : pool?.pendingFfcRedemptions,
    );

    // The instant reserve (ELB) is shared by both tranches. What THIS tranche's
    // holders can redeem instantly is its proportional share of the ELB, split by
    // each tranche's share of pooled NAV (guide §6.1: ELB × V_tranche / V_pool;
    // §11.4 fee formula references ELB_FYC / ELB_FFC). e.g. ELB $5,000 with
    // V_FYC:V_FFC = 2:8 ⇒ FYC redeemable = $1,000, FFC = $4,000. It rebalances
    // automatically as ELB and the tranche NAVs change after each redeem.
    const vFycBI = toBigInt(fycTranche?.vTranche);
    const vFfcBI = toBigInt(ffcTranche?.vTranche);
    const vTranchesBI = vFycBI + vFfcBI;
    const trancheVBI = tranche === TrancheType.FYC ? vFycBI : vFfcBI;
    const elbTrancheBI =
      vTranchesBI > 0n ? (elbBI * trancheVBI) / vTranchesBI : 0n;
    const redeemableInstantlyBI =
      elbTrancheBI > pendingBI ? elbTrancheBI - pendingBI : 0n;

    // NEW (round 2) — the liquidity-scaled instant-redemption fee band. Real
    // pool-specific bounds could live on poolState instead of these literals
    // (mirrors pinochio's INSTANT_FEE_BPS_FYC/FFC constants exactly) — kept
    // as constants here since neither is admin-tunable this round.
    const feeBpsMin = tranche === TrancheType.FYC ? 10 : 50;
    const feeBpsMax = tranche === TrancheType.FYC ? 50 : 100;

    // ... (unchanged: cTokens/usdyPrice/pctMet/apr/etc. — outside this excerpt)

      liquidity: {
        reserve_target: {
          target_usd: baseToUsdString(reserveTargetBI),
          current_usd: baseToUsdString(elbBI),
          pct_met: pctMet,
        },
        redeemable_instantly: {
          value_usd: baseToUsdString(redeemableInstantlyBI),
          lock_days: tranche === TrancheType.FYC ? 30 : 90,
          has_fee: true,
          fee_bps_min: feeBpsMin,
          fee_bps_max: feeBpsMax,
        },
      },

    // ... (elided — poolSnapshots insert etc. outside this excerpt)

      const poolStateRow = {
        // ...
        pendingFfcRedemptions: pool.pendingFfcRedemptions.toString(),
        // NEW (round 2) — was hardcoded "0"; real once ChainPoolState/the IDL
        // decoder pick up pinochio's new PoolState.pending_fyc_redemptions.
        pendingFycRedemptions: pool.pendingFycRedemptions.toString(),
        // ...
      };`,
  suggestions: [
    "value_usd already IS elb_tranche minus pending (redeemableInstantlyBI) — the exact denominator SwapCard.tsx's fee-preview formula needs — so no new field was required beyond fee_bps_min/max. Worth double-checking the frontend actually reads value_usd for this and doesn't re-derive its own ELB estimate.",
  ],
},
{
  path: "backend/admin/src/app/controllers/page.redemptions.ts",
  status: "M",
  category: "backend",
  why: "Real code, confirmed by reading the live file — the GET /redemptions queue-viewer endpoint (stats, tab_counts, wait-period rows) already exists in full. What's missing, confirmed by grepping every controller/route file: nothing anywhere calls FFLP_Contract.processRedemption or .acceleratedRedeem, even though both already exist on the blockchain service (backend/admin/src/services/blockchain.ts) — they're dead code, never wired to an HTTP route. This adds the missing POST /redemptions/{id}/approve route + handler that actually calls processRedemption, following the exact same shape as the real handleApproveDefault in page.pipeline.ts (repository lookup → on-chain call → DB update → activity log).",
  original: `// ── Route ─────────────────────────────────────────────────────────────────────

export const redemptionsRoute = createRoute({
  method: "get", path: "/redemptions",
  tags: ["Protocol"], summary: "QT redemption queue",
  security: [{ cookieAuth: [] }],
  description:
    "Returns all pending and recent redemption requests. " +
    "Requests transition: queued → needs_approval (wait period elapsed) → completed (on-chain processed). " +
    "Use tab_counts to drive the filter tabs in the UI.",
  responses: {
    200: { content: { "application/json": { schema: RedemptionsResponse } }, description: "Redemption queue" },
    401: { content: { "application/json": { schema: z.object({ error: z.string() }).openapi("Unauthorized") } }, description: "Not authenticated" },
  },
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function handleGetRedemptions(deps: {
  repository: Repository;
  blockchain: FFLP_Contract;
}) {
  const [dbData, proto] = await Promise.all([
    deps.repository.getRedemptionsData(),
    deps.blockchain.getProtocolState(),
  ]);

  // Epoch capacity: maxStandardRedemptionFeeBps % of total NAV (from on-chain pool)
  let epoch_capacity_usd: string | null = null;
  if (proto.pool && proto.fyc && proto.ffc) {
    const totalNav = proto.fyc.vTranche + proto.ffc.vTranche;
    const capBps   = proto.pool.maxStandardRedemptionFeeBps;
    const capBI    = (totalNav * capBps) / 10_000n;
    epoch_capacity_usd = baseToUsdString(capBI);
  }

  return {
    stats: {
      ...dbData.stats,
      epoch_capacity_usd,
    },
    tab_counts: dbData.tab_counts,
    rows:       dbData.rows,
  };
}`,
  proposed: `// ── Route ─────────────────────────────────────────────────────────────────────

export const redemptionsRoute = createRoute({
  method: "get", path: "/redemptions",
  tags: ["Protocol"], summary: "QT redemption queue",
  security: [{ cookieAuth: [] }],
  description:
    "Returns all pending and recent redemption requests. " +
    "Requests transition: queued → needs_approval (wait period elapsed) → completed (on-chain processed). " +
    "Use tab_counts to drive the filter tabs in the UI.",
  responses: {
    200: { content: { "application/json": { schema: RedemptionsResponse } }, description: "Redemption queue" },
    401: { content: { "application/json": { schema: z.object({ error: z.string() }).openapi("Unauthorized") } }, description: "Not authenticated" },
  },
});

// NEW (round 2) — approve/process a redemption that's reached needs_approval.
// Mirrors handleApproveDefault's shape exactly (page.pipeline.ts): repository
// lookup, on-chain call, DB update, activity log.
export const approveRedemptionRoute = createRoute({
  method: "post", path: "/redemptions/{id}/approve",
  tags: ["Protocol"], summary: "Process an eligible redemption on-chain",
  security: [{ cookieAuth: [] }],
  description:
    "Calls the on-chain process_redemption instruction for a request currently in needs_approval. " +
    "Requires eligible_ts to have already passed — checked both here and by the program itself. " +
    "Was previously a local-only UI optimistic update (frontend page.tsx) with no backend call at all.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ ok: z.literal(true), signature: z.string() }) } },
      description: "Processed on-chain",
    },
    400: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Not in needs_approval, or eligible_ts hasn't passed yet",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Redemption request not found",
    },
    500: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "On-chain call failed",
    },
  },
});

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function handleGetRedemptions(deps: {
  repository: Repository;
  blockchain: FFLP_Contract;
}) {
  const [dbData, proto] = await Promise.all([
    deps.repository.getRedemptionsData(),
    deps.blockchain.getProtocolState(),
  ]);

  // Epoch capacity: maxStandardRedemptionFeeBps % of total NAV (from on-chain pool)
  let epoch_capacity_usd: string | null = null;
  if (proto.pool && proto.fyc && proto.ffc) {
    const totalNav = proto.fyc.vTranche + proto.ffc.vTranche;
    const capBps   = proto.pool.maxStandardRedemptionFeeBps;
    const capBI    = (totalNav * capBps) / 10_000n;
    epoch_capacity_usd = baseToUsdString(capBI);
  }

  return {
    stats: {
      ...dbData.stats,
      epoch_capacity_usd,
    },
    tab_counts: dbData.tab_counts,
    rows:       dbData.rows,
  };
}

export async function handleApproveRedemption(
  deps: { repository: Repository; blockchain: FFLP_Contract; actorEmail: string },
  params: { id: string },
) {
  const request = await deps.repository.getRedemptionRequestById(params.id);
  if (!request) return { error: "not_found" } as const;
  if (request.status !== "needs_approval") return { error: "not_ready_for_approval" } as const;
  if (new Date(request.eligible_at ?? 0) > new Date()) return { error: "not_yet_eligible" } as const;

  let signature: string;
  try {
    // processRedemption already exists on the blockchain service — it just
    // never had a route calling it. Same for acceleratedRedeem, unused for
    // the same reason; that one belongs to the instant path, not this queue.
    const result = await deps.blockchain.processRedemption(
      request.tranche === "FYC" ? 0 : 1,
      new PublicKey(request.wallet_address),
      BigInt(request.request_id.replace(/\\D/g, "")),
    );
    signature = result; // NOTE: processRedemption currently returns a base64
                         // UNSIGNED tx (buildVersionTxn), not a submitted
                         // signature — this handler still needs the sign +
                         // send + confirm step handleApproveDefault's
                         // approveDefaultOnChain already does internally.
                         // Flagged, not silently glossed over.
  } catch (err) {
    console.error(\`[approve-redemption] on-chain call failed for \${params.id}:\`, err);
    return { error: "onchain_approve_failed" } as const;
  }

  await deps.repository.markRedemptionProcessed(params.id, signature);

  logActivity(deps.repository, {
    actorEmail:  deps.actorEmail,
    category:    "protocol",
    action:      "redemption_processed",
    description: \`\${deps.actorEmail} approved redemption \${request.request_id} (\${request.tranche}, $\${request.amount_usd})\`,
    entityType:  "redemption",
    entityId:    params.id,
    entityLabel: request.request_id,
    metadata:    { tx_sig: signature },
  });

  return { ok: true as const, signature };
}`,
  suggestions: [
    "processRedemption (blockchain.ts) returns an unsigned base64 transaction (buildVersionTxn), not a submitted signature — unlike approveDefaultOnChain, which signs and sends internally. This handler needs the same sign+send+confirm step added to processRedemption itself (or inline here) before it actually does anything on-chain; called out in the code comment rather than silently assumed to work.",
    "This route only covers the scheduled (30d/90d) queue. The loan-origination liquidity check (assert_liquidity_available_for_origination, pinochio side) has no backend-side mirror yet — page.pipeline.ts's loan-approval flow should show admins a warning when approving a loan would draw on capital needed for requests visible on this exact page, but that cross-reference doesn't exist yet.",
  ],
},
{
  path: "frontend/src/app/portal-admin/(app)/redemptions/page.tsx",
  status: "M",
  category: "frontend",
  why: "Real code, confirmed by reading the live file — the redemptions queue page, tabs, and wait-period progress bars already exist in full, including an 'Approve' button. approveRequest(id), though, is confirmed to be a LOCAL-ONLY React state mutation — it flips the row to 'processing' in the UI and calls no backend endpoint at all. Wires it to the new POST /redemptions/{id}/approve route (page.redemptions.ts) instead.",
  original: `  function approveRequest(id: string) {
    setQueue(q => Array.isArray(q) ? q.map(r => r.id === id ? { ...r, status: 'processing' as const } : r) : []);
  }`,
  proposed: `  const [approvingId, setApprovingId] = useState<string | null>(null);

  // CHANGED (round 2) — was a local-only optimistic update with no backend
  // call; now actually calls the new approve endpoint (page.redemptions.ts)
  // and rolls the optimistic update back on failure instead of assuming success.
  async function approveRequest(id: string) {
    setApprovingId(id);
    setQueue(q => Array.isArray(q) ? q.map(r => r.id === id ? { ...r, status: 'processing' as const } : r) : []);
    try {
      await approveRedemption(id); // apiClient.ts — added the same way approveApplication already is
    } catch (err) {
      console.error('[redemptions] approve failed:', err);
      setQueue(q => Array.isArray(q) ? q.map(r => r.id === id ? { ...r, status: 'needs_approval' as const } : r) : []);
    } finally {
      setApprovingId(null);
    }
  }`,
  suggestions: [
    "apiClient.ts needs a matching approveRedemption(id) export, added the exact same way approveApplication(id) already is: adminApiFetch(\`/redemptions/\\${id}/approve\`, { method: 'POST' }) — not included as its own diff entry here since it's a one-line mirror of an existing pattern.",
    "The Approve button itself (further down this file) should disable/spin while approvingId === r.id — not shown in this excerpt, but needed so a slow on-chain confirmation doesn't invite a double-click double-submit.",
  ],
},
{
  path: "frontend/src/components/fleets/SwapCard.tsx",
  status: "M",
  category: "frontend",
  why: "Real code, confirmed by reading the live file — the Instant/Scheduled redeem toggle and fee-scale preview already exist in full, but the fee curve is computed against two HARDCODED magic constants (2_400_000 for FFC, 13_581_107 for FYC) standing in for pool size, not any live value. Replaces them with the real elb_tranche the backend now exposes (backend/fleets/src/services/repository.ts's liquidity.redeemable_instantly.value_usd, fee_bps_min/max) — the exact same endpoint-rate formula, now against a real, live denominator that actually shrinks as redemptions happen instead of two numbers frozen at whatever the pool looked like when someone hardcoded them.",
  original: `        {!isMint && (
          <>
            <div style={{ marginTop: 14 }}>
              <Segmented options={['Instant', 'Scheduled']} value={redeemMode} onChange={setRedeemMode} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginTop: 14 }}>
              <span style={{ color: 'var(--fleets-fg-50)' }}>
                {redeemMode === 'Instant' ? 'Redemption Fee' : 'Processing'}
              </span>
              <span style={{ color: 'var(--fleets-fg-80)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {redeemMode === 'Instant'
                  ? (() => {
                      if (payNum <= 0) return token === 'FFC' ? '0.50%–1.00%' : '0.10%–0.50%';
                      if (token === 'FFC') {
                        const fee = Math.min(1.00, Math.max(0.50, 0.50 + 0.50 * (payNum / 2_400_000)));
                        return \`\${fee.toFixed(2)}%\`;
                      }
                      const fee = Math.min(0.50, Math.max(0.10, 0.10 + 0.40 * (payNum / 13_581_107)));
                      return \`\${fee.toFixed(2)}%\`;
                    })()
                  : (token === 'FFC' ? 'Within 90 days' : 'Within 30 days')}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fleets-fg-50)', marginTop: 8, lineHeight: 1.45 }}>
              {redeemMode === 'Instant'
                ? (token === 'FFC'
                    ? 'Fee scales 0.50%–1.00% based on redemption size vs. available liquidity.'
                    : 'Fee scales 0.10%–0.50% based on redemption size vs. available liquidity ($13,581,107 pool).')
                : (token === 'FFC'
                    ? 'Scheduled redemptions are processed within 90 days with no fee.'
                    : 'Scheduled redemptions are processed within 30 days with no fee.')}
            </div>
          </>
        )}`,
  proposed: `        {!isMint && (
          <>
            <div style={{ marginTop: 14 }}>
              <Segmented options={['Instant', 'Scheduled']} value={redeemMode} onChange={setRedeemMode} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginTop: 14 }}>
              <span style={{ color: 'var(--fleets-fg-50)' }}>
                {redeemMode === 'Instant' ? 'Redemption Fee' : 'Processing'}
              </span>
              <span style={{ color: 'var(--fleets-fg-80)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {redeemMode === 'Instant'
                  ? (() => {
                      // CHANGED (round 2) — elbTrancheUsd/feeBpsMin/feeBpsMax now
                      // come from liquidity.redeemable_instantly on the overview
                      // API (real, live), not two constants frozen at whatever
                      // the pool looked like when someone hardcoded them.
                      const { elbTrancheUsd, feeBpsMin, feeBpsMax } = liquidityForToken(token);
                      if (payNum <= 0 || elbTrancheUsd <= 0) return \`\${(feeBpsMin / 100).toFixed(2)}%–\${(feeBpsMax / 100).toFixed(2)}%\`;
                      if (payNum > elbTrancheUsd) return 'Exceeds instant liquidity';
                      const feeBps = feeBpsMin + (feeBpsMax - feeBpsMin) * (payNum / elbTrancheUsd);
                      return \`\${(feeBps / 100).toFixed(2)}%\`;
                    })()
                  : (token === 'FFC' ? 'Within 90 days' : 'Within 30 days')}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fleets-fg-50)', marginTop: 8, lineHeight: 1.45 }}>
              {redeemMode === 'Instant'
                ? (() => {
                    const { elbTrancheUsd, feeBpsMin, feeBpsMax } = liquidityForToken(token);
                    return \`Fee scales \${(feeBpsMin / 100).toFixed(2)}%–\${(feeBpsMax / 100).toFixed(2)}% based on redemption size vs. available liquidity (\${fmtNum(elbTrancheUsd)} available now).\`;
                  })()
                : (token === 'FFC' ? 'Scheduled redemptions are processed within 90 days with no fee.'
                                    : 'Scheduled redemptions are processed within 30 days with no fee.')}
            </div>
          </>
        )}`,
  suggestions: [
    "liquidityForToken(token) is assumed here to read from whatever hook already loads this card's overview data — not shown in this excerpt since the component's full data-fetching setup is out of scope for a targeted diff. If no such hook exists yet, one needs adding alongside this change, not just the formula swap.",
    "The redeem CTA itself is still gated ('Redeem — Coming soon', further up this file) — this diff only makes the FEE PREVIEW real. Actually enabling the button needs a client-side transaction-building call to accelerated_redeem/submit_redemption, which doesn't exist on the frontend at all yet — a separate, larger piece of work than this preview fix.",
  ],
},
];
