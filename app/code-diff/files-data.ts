export interface DiffFile {
  path: string;
  status: 'M' | 'U';
  why: string;
  original: string;
  proposed: string;
}

export const FILES: DiffFile[] = [
{
  path: "pinochio/src/constants.rs",
  status: "M",
  why: "Adds the six severity-curve constants (K_MIN, SEVERITY_REF, COVERAGE_WEIGHT_FLOOR, SEVERITY_MINT_FLOOR, SEVERITY_GATE_MAX, K_BREAKPOINTS) that back the new curve. FFC_COVERAGE_NUMERATOR/DENOMINATOR — the old flat 80% floor — are removed; only coverage.rs referenced them, so nothing else breaks. Also adds ALLOWED_SWAP_PROGRAMS (Jupiter + Titan, for helpers/jupiter.rs) and the yield-source seed/tag (for the new multi-yield-token mechanism — see state.rs).",
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
pub const CURE_PERIOD_DAYS: i64 = 30;

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

/// Above this severity, loan origination is blocked (30%) — replaces the
/// old flat 80% coverage floor below.
pub const SEVERITY_GATE_MAX_BPS: u64 = 3_000;

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

// Account-data type tags (1 byte at offset 0 of each program-owned account).
// Replaces Anchor's 8-byte sha256 discriminator.
pub const TAG_CONFIG: u8 = 1;
pub const TAG_POOL: u8 = 2;
pub const TAG_TRANCHE: u8 = 3;
pub const TAG_LOAN: u8 = 4;
pub const TAG_REDEMPTION: u8 = 5;
pub const TAG_YIELD_SOURCE: u8 = 6;

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

pub const ALLOWED_SWAP_PROGRAMS: [Address; 2] = [JUPITER_V6_PROGRAM_ID, TITAN_PROGRAM_ID];`
},
{
  path: "pinochio/src/errors.rs",
  status: "M",
  why: "Appends three new variants — two for the severity gates, one for the multi-yield-source registry. Appended, not inserted — every existing discriminant keeps its exact numeric value, since those are already-deployed error codes a live client may match on.",
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
    /// now returns SeverityGateExceeded instead. Kept (not removed/renumbered)
    /// because this discriminant may already be matched on by a live client.
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
  why: "LoanAccount gets one new field — levelized_interest, the flat per-period figure computed once at origination. This grows the repr(C) struct by 8 bytes, so LOAN_SPACE changes and any already-deployed LoanAccount PDAs need a migration (realloc + backfill) before this ships — flagged directly in /open-questions on the design tool. PoolState gets one new byte, yield_source_count, carved out of what was _padding — the struct's total size is unchanged, so this one is NOT a breaking change (existing accounts already read that byte as zero, which is the correct starting count). PoolState ALSO gets three new fields — loan_accrual_rate/loan_accrual_checkpoint/loan_accrual_updated_ts, a reward-per-second accumulator that makes compute_optimistic_price's loan-interest estimate a real per-active-loan accrual instead of the old cap-based proxy (see helpers/allocation.rs) — this IS a breaking 24-byte growth, same realloc + backfill migration story as LoanAccount's field, not folded into the free-padding trick above. New: YieldSourceState, one PDA per registered yield-bearing reserve token — see helpers/allocation.rs and instructions/initialize_yield_source.rs. (Its impl_account_io! registration and the RedemptionRequest struct/load-save-helpers tail of the real file are outside this excerpt — same as they were before this round.)",
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

    pub is_active: u8,
    pub bump: u8,
    pub _pad: [u8; 6],
}`
},
{
  path: "pinochio/src/helpers/amortization.rs",
  status: "M",
  why: "Adds levelized_interest — the flat per-period figure. period_interest (true declining-balance) stays put: it's still correct for the borrower-facing schedule, it's just no longer what the pool collects against.",
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

/// True, declining-balance interest for one period. Still correct — kept for
/// the borrower-facing amortization schedule. No longer used to compute what
/// the pool actually collects/splits; see \`levelized_interest\` below.
pub fn period_interest(current_balance: u64, apr_bps: u64) -> Result<u64, ProgramError> {
    let interest = (current_balance as u128).checked_mul(apr_bps as u128).ok_or(ProgramError::from(FleetError::Overflow))?
        / 12 / BPS_DENOMINATOR as u128;
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
  why: "assert_origination_allowed's flat 80% coverage floor becomes a severity gate — origination capacity now scales with FYC's actual size instead of assuming it's 1:1 with FFC. New: assert_mint_allowed, which didn't exist before this round at all.",
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
use crate::helpers::math::{checked_add_u64, mul_div_u64};
use crate::helpers::pricing::usd_for_tokens;
use crate::state::{PoolState, TrancheState};

/// severity = max(0, outstanding - effective_ffc) / fyc.v_tranche, in bps.
/// The impact dial: how much of FYC's own TVL is at risk in the worst case,
/// once FFC's protection is exhausted. See helpers/curve.rs for the full
/// coverage + severity write-up.
fn severity_bps(outstanding: u64, effective_ffc: u64, fyc_v: u64) -> Result<u64, ProgramError> {
    if fyc_v == 0 { return Ok(0); }
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

    let insurance_value = usd_for_tokens(ffc.insurance_token_balance, ffc.conservative_price)?;
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
}`
},
{
  path: "pinochio/src/helpers/curve.rs",
  status: "U",
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
  why: "distribute_loan_interest's fyc_target/residual split — the actual bug: FYC's rate can invert below its own reserve-only baseline once FFC is oversized relative to the epoch cap — is replaced with the severity-scaled curve from curve.rs. Signature drops base_yield_token_price/now_ts: coverage and severity are read directly off pool + tranche state, no epoch snapshot needed. apply_default_waterfall is also redesigned into a three-tier order: FFC absorbs the loss first, same as before; once FFC is exhausted the remainder now burns FYC tokens held in the insurance wallet (a real loss absorption — v_tranche and total_supply both drop by the burned amount) instead of the old version's post-hoc price smoothing; only once the insurance fund's own FYC is exhausted does the loss finally reduce general fyc.v_tranche. approve_default.rs needs no changes — it already discards apply_default_waterfall's return value.",
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
use crate::constants::PRECISION;
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

    let coverage_bps = if pool.outstanding_principal == 0 {
        10_000
    } else {
        mul_div_u64(ffc.v_tranche, 10_000, pool.outstanding_principal)?.min(10_000)
    };
    let severity_bps = if fyc.v_tranche == 0 {
        0
    } else {
        let shortfall = pool.outstanding_principal.saturating_sub(ffc.v_tranche);
        mul_div_u64(shortfall, 10_000, fyc.v_tranche)?
    };
    let k_bps = k_from_coverage_and_severity(coverage_bps, severity_bps)?;

    let k_ffc = mul_div_u64(ffc.v_tranche, k_bps, 10_000)?;
    let denom = checked_add_u64(fyc.v_tranche, k_ffc)?;
    let ffc_share = if denom == 0 { 0 } else { mul_div_u64(split.net_yield, k_ffc, denom)? };
    let fyc_share = split.net_yield.saturating_sub(ffc_share);

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
  path: "pinochio/src/helpers/allocation.rs",
  status: "M",
  why: "observed_source_apy_bps generalizes observed_base_yield_token_apy_bps to any registered YieldSourceState; new harmonized_reserve_apy_bps value-weights every source's APY into one blended figure. compute_optimistic_price is substantially rewritten, not re-parameterized — auditing it against the design intent (mint assuming not-yet-collected yield already accrued, from BOTH loan interest and yield-token appreciation) found the real contract got both wrong: loan side used a cap-based days-elapsed/30 proxy unrelated to any real loan's schedule; yield-token side wasn't reflected in optimistic pricing AT ALL, so minting right after a price move but before the next epoch tick priced new tokens off stale value, at existing holders' expense. Fixed: loan side now reads a real reward-per-second accrual off PoolState's three new fields (state.rs), split through the same severity curve real collection uses; yield-token side computes the live unrealized delta on source_c_tokens, split the same flat pro-rata way split_base_yield_token_yield does. Both read distribute_loan_interest's InterestDistribution.fyc_share/ffc_share directly rather than diffing v_tranche, so mint_fee_value_into_fyc's price-neutral fee mint is never double-counted. Flagged: compute_v_pool (pricing.rs) still only sums the primary reserve, so this function's own split denominator under-counts non-primary sources too — same tracked follow-up as elsewhere. Also drops deposit_value — a per-token price shouldn't depend on any one depositor's amount.",
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

use pinocchio::error::ProgramError;
use crate::constants::{BPS_DENOMINATOR, LOAN_ALLOCATION_BPS, NET_YIELD_BPS, PRECISION};
use crate::errors::FleetError;
use crate::helpers::math::{checked_add_u64, mul_div_u64};
use crate::helpers::pricing::compute_v_pool;
use crate::helpers::waterfall::distribute_loan_interest;
use crate::state::{PoolState, TrancheState};

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
) -> Result<AllocationSnapshot, ProgramError> {
    let v_pool = compute_v_pool(pool, base_yield_token_price)?;
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
// v_pool_now is still the pool-wide total (loan cap, TVL) — compute_v_pool
// itself isn't migrated to sum across all sources in this pass, so it still
// under-counts value held in non-primary sources; a tracked follow-up, not
// silently absorbed here. source_c_tokens IS this source's own correct
// token count though (pool.c_tokens for the primary reserve,
// YieldSourceState.c_tokens for any other), so the dollar AMOUNT of newly
// accrued yield is exact even though the pool-wide SPLIT ratio isn't yet.
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
    source_c_tokens: u64,
    source_last_price: u64,
    source_price_now: u64,
    now_ts: i64,
) -> Result<u64, ProgramError> {
    let tranche = if target_is_fyc { fyc } else { ffc };
    if tranche.total_supply == 0 { return Ok(PRECISION); }

    // (1) Yield-token side.
    let v_pool_now = compute_v_pool(pool, source_price_now)?;
    let source_gross_yield = if source_price_now > source_last_price {
        mul_div_u64(source_c_tokens, source_price_now - source_last_price, PRECISION)?
    } else { 0 };
    let source_net_yield = mul_div_u64(source_gross_yield, NET_YIELD_BPS, BPS_DENOMINATOR)?;
    let fyc_yield_share = if v_pool_now == 0 { 0 } else { mul_div_u64(source_net_yield, fyc.v_tranche, v_pool_now)? };
    let yield_estimate = if target_is_fyc { fyc_yield_share } else { source_net_yield.saturating_sub(fyc_yield_share) };

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
  why: "jupiter_program (account 12) becomes swap_program, checked against ALLOWED_SWAP_PROGRAMS instead of only Jupiter — an investor's route_data can now come from either aggregator's off-chain quote, forwarded to whichever program they name. execute_jupiter_swap becomes execute_aggregator_swap. compute_optimistic_price's call site is also updated for that function's own real rewrite (see helpers/allocation.rs why) — now passes both fyc_st/ffc_st plus target_is_fyc (the severity-curve loan-interest preview needs both tranches, not just the target) and p.c_tokens as this path's source token count, and no longer passes min_base_usd at all (a per-token price shouldn't depend on this depositor's amount). The direct-collateral path — depositing USDY/syrupUSDC straight in, skipping the swap entirely — is a new sibling instruction, instructions/deposit_yield_token.rs, not a branch inside this file.",
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
//!  14.. route accounts (forwarded to the named aggregator)
//!
//! Data: deposit_token_amount (u64) + slippage_bps (u64) + tranche_type (u8) + var route_data
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
use crate::helpers::allocation::{build_snapshot, compute_optimistic_price};
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

    // CHANGED — compute_optimistic_price now takes both tranches (the k-curve
    // split needs both) plus this source's own token count explicitly,
    // instead of reaching into PoolState/a single tranche itself. No longer
    // takes min_base_usd — a per-token price doesn't depend on this
    // depositor's amount, only tokens_to_mint below does.
    let optimistic_price = compute_optimistic_price(
        &fyc_st, &ffc_st, target_is_fyc, &p,
        p.c_tokens, p.last_base_yield_token_price, base_price, now_ts,
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

    let snapshot = build_snapshot(&p, &fyc_st, base_price, now_ts)?;
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
  why: "Reads l.levelized_interest instead of calling period_interest — the core behavior change. Every downstream line (principal_portion, total_payment, balance paydown) is untouched; only the interest figure's source changes, from live declining-balance to the flat figure stored at origination. jupiter_program (account 9) also becomes swap_program: execute_jupiter_swap becomes execute_aggregator_swap, callable with either allow-listed aggregator. Also keeps pool.loan_accrual_checkpoint/rate current: this payment's `interest` comes out of the checkpoint (it's realized now, not still-accruing), and if this was the loan's last payment its rate contribution is removed entirely — the other two of the three places that keep compute_optimistic_price's real accrual estimate correct (helpers/allocation.rs), alongside originate_loan.rs and flag_pending_default.rs.",
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

    // CHANGED — flat, levelized interest stored at origination. Was:
    // period_interest(l.current_balance, l.apr_bps), true declining-balance,
    // recomputed live every payment. Everything below this line is untouched.
    let interest = l.levelized_interest;
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
    let elapsed = (now_ts - p.loan_accrual_updated_ts).max(0) as u64;
    p.loan_accrual_checkpoint = checked_add_u64(
        p.loan_accrual_checkpoint,
        mul_div_u64(p.loan_accrual_rate, elapsed, PRECISION)?,
    )?.saturating_sub(interest);
    if l.status == loan_status::REPAID {
        let rate_contribution = mul_div_u64(l.levelized_interest, PRECISION, SECONDS_PER_PERIOD as u64)?;
        p.loan_accrual_rate = p.loan_accrual_rate.saturating_sub(rate_contribution);
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
  path: "pinochio/src/instructions/flag_pending_default.rs",
  status: "M",
  why: "The third and last of the three places that keep pool.loan_accrual_rate/checkpoint correct for compute_optimistic_price (helpers/allocation.rs — see state.rs for the fields, originate_loan.rs and repay_loan.rs for the other two). Deliberately stops counting a loan's assumed accrual HERE, not at the later approve_default.rs — by the time a loan is flagged pending-default it's already gone through a full CURE_PERIOD_DAYS of non-payment, so continuing to assume its interest is still accruing all the way until a separate admin action formally defaults it would keep inflating optimistic price with money already known to be at risk, for however long that gap happens to be. load_pool becomes load_pool_mut / a new save_pool call — the only other change; the actual default-flagging logic (delinquency check, cure-period check) is untouched.",
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
  proposed: `//! Flag a delinquent loan as PendingDefault after the cure period elapses.
//! Accounts: [admin, pool, loan]
//! Data: ()

use pinocchio::{account::AccountView, sysvars::{clock::Clock, Sysvar}, ProgramResult};

use crate::constants::{CURE_PERIOD_DAYS, PRECISION, SECONDS_PER_DAY, SECONDS_PER_PERIOD};
use crate::errors::FleetError;
use crate::helpers::math::mul_div_u64;
use crate::pda::*;
use crate::state::{load_loan_mut, load_pool_mut, loan_status, save_loan, save_pool};

pub fn process(accounts: &[AccountView], _data: &[u8]) -> ProgramResult {
    let [admin, pool, loan, ..] = accounts else { return Err(FleetError::InvalidAccountData.into()) };
    require_signer(admin)?;
    let mut p = load_pool_mut(pool)?;
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

    // NEW — this loan stops being assumed as accruing toward optimistic
    // pricing the moment it's formally flagged, not just at final
    // approve_default. Roll the checkpoint up to now at the OLD rate first,
    // then remove this loan's own contribution to the rate.
    let elapsed = (now_ts - p.loan_accrual_updated_ts).max(0) as u64;
    p.loan_accrual_checkpoint = p.loan_accrual_checkpoint
        .saturating_add(mul_div_u64(p.loan_accrual_rate, elapsed, PRECISION)?);
    let rate_contribution = mul_div_u64(l.levelized_interest, PRECISION, SECONDS_PER_PERIOD as u64)?;
    p.loan_accrual_rate = p.loan_accrual_rate.saturating_sub(rate_contribution);
    p.loan_accrual_updated_ts = now_ts;
    save_pool(pool, &p)?;

    Ok(())
}
`
},
{
  path: "pinochio/src/instructions/run_yield_epoch.rs",
  status: "M",
  why: "Backward compatible, not a breaking rewrite: called with the original 5 accounts, this ticks the pool's primary reserve exactly as before, byte-for-byte the same math, still writing PoolState's own c_tokens/last_base_yield_token_price/last_epoch_ts — every existing off-chain caller keeps working unmodified. Called with 6 accounts — a yield_source account inserted before the oracle — it ticks THAT registered YieldSourceState (USDY, syrupUSDC, ...) instead, using the same observed_source_apy_bps-style 24h-epoch math from helpers/allocation.rs, without ever touching PoolState. Adding a source's epoch tick is a longer accounts array, not a new instruction or a new tag. v_pool for the fee/split math still only sums the primary reserve either way — the same tracked helpers/pricing.rs follow-up noted on helpers/allocation.rs — so this file doesn't silently claim more coverage than it has.",
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
  proposed: `//! Distribute newly-accrued yield (epoch tick). Backward compatible: called
//! with 5 accounts, it ticks the pool's original primary reserve exactly as
//! before (PoolState's own c_tokens/last_base_yield_token_price/last_epoch_ts).
//! Called with 6 accounts — a yield_source account inserted before the oracle
//! — it ticks THAT registered YieldSourceState instead (USDY, syrupUSDC, ...),
//! so adding a source never requires a new instruction or a new tag.
//! Accounts: [authority, pool, fyc, ffc, base_oracle]
//!        or [authority, pool, fyc, ffc, yield_source, oracle]
//! Data: ()

use pinocchio::{account::AccountView, cpi::Seed, sysvars::{clock::Clock, Sysvar}, ProgramResult};

use crate::constants::{BPS_DENOMINATOR, NET_YIELD_BPS, PRECISION};
use crate::errors::FleetError;
use crate::helpers::fees::mint_fee_value_into_fyc;
use crate::helpers::math::mul_div_u64;
use crate::helpers::oracle::fetch_base_yield_token_price;
use crate::helpers::pricing::compute_v_pool;
use crate::helpers::waterfall::{refresh_conservative_prices, split_base_yield_token_yield};
use crate::pda::*;
use crate::state::{
    load_pool_mut, load_tranche_mut, load_yield_source_mut, save_pool, save_tranche, save_yield_source,
};

pub fn process(accounts: &[AccountView], _data: &[u8]) -> ProgramResult {
    let [authority, pool, fyc, ffc, rest @ ..] = accounts else {
        return Err(FleetError::InvalidAccountData.into());
    };
    require_signer(authority)?;
    let mut p = load_pool_mut(pool)?;
    if !p.assert_authority(authority.address().as_array()) { return Err(FleetError::Unauthorized.into()); }
    if p.fyc_tranche != *fyc.address().as_array() || p.ffc_tranche != *ffc.address().as_array() {
        return Err(FleetError::TrancheMismatch.into());
    }

    let now_ts = Clock::get()?.unix_timestamp;
    let mut fyc_st = load_tranche_mut(fyc)?;
    let mut ffc_st = load_tranche_mut(ffc)?;

    // NEW — 6-account call: tick one registered non-primary YieldSourceState.
    let (net_yield, fee_value, v_pool) = if let [yield_source, oracle, ..] = rest {
        let mut ys = load_yield_source_mut(yield_source)?;
        if ys.pool != *pool.address().as_array() || ys.oracle != *oracle.address().as_array() {
            return Err(FleetError::Unauthorized.into());
        }
        if ys.is_active == 0 { return Err(FleetError::YieldSourceInactive.into()); }

        let price_now = fetch_base_yield_token_price(oracle)?;
        if price_now < ys.last_price { return Err(FleetError::StaleOraclePrice.into()); }
        let price_delta = price_now - ys.last_price;
        let gross_yield = mul_div_u64(ys.c_tokens, price_delta, PRECISION)?;
        let net_yield = mul_div_u64(gross_yield, NET_YIELD_BPS, BPS_DENOMINATOR)?;
        let fee_value = gross_yield.saturating_sub(net_yield);
        // CHANGED — v_pool still only sums the primary reserve (pool.c_tokens);
        // non-primary sources aren't folded into pool-wide totals yet. Tracked
        // as a follow-up in helpers/pricing.rs, not silently absorbed here.
        let v_pool = compute_v_pool(&p, p.last_base_yield_token_price)?;

        ys.last_price = price_now;
        ys.last_epoch_ts = now_ts;
        save_yield_source(yield_source, &ys)?;
        (net_yield, fee_value, v_pool)
    } else {
        // UNCHANGED — 5-account call, the pool's original primary reserve,
        // identical math to the pre-redesign version of this file.
        let [base_oracle] = rest else { return Err(FleetError::InvalidAccountData.into()); };
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
        let v_pool = compute_v_pool(&p, price_now)?;

        p.last_base_yield_token_price = price_now;
        p.last_epoch_ts = now_ts;
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
  why: "New instruction (ix_tag::INITIALIZE_YIELD_SOURCE, tag 16). Registers one more YieldSourceState PDA for a yield-bearing reserve token (USDY, syrupUSDC, ...) — the mechanism the user asked for to support more than one yield-bearing token without a breaking change. Structurally mirrors initialize_tranche.rs: verify_pda + create_pda_account + a fresh zero-copy struct write, admin-gated the same way originate_loan.rs gates itself (p.assert_admin). Never touches PoolState's layout — only increments its new yield_source_count byte.",
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
  why: "New instruction (ix_tag::DEPOSIT_YIELD_TOKEN, tag 17) — the direct-collateral deposit path the user asked for: 'we won't need to swap via titan or jupiter, we just deposit them straight into our pool.' Same mint-at-optimistic-price math as instructions/deposit.rs, minus the swap leg entirely — the investor's own yield-bearing tokens go straight into that source's vault. Prices off the target YieldSourceState's own c_tokens/last_price (compute_optimistic_price's real signature — see helpers/allocation.rs), not the pool's primary reserve, so this is correct even for a second or third registered source — both the yield-token accrual and the loan-interest accrual (shared pool-wide, same for every source) price correctly here.",
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
use crate::helpers::allocation::{build_snapshot, compute_optimistic_price};
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
        _token_program, ..
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
    // numbers, not the primary reserve's.
    let optimistic_price = compute_optimistic_price(
        &fyc_st, &ffc_st, target_is_fyc, &p,
        ys.c_tokens, ys.last_price, source_price, now_ts,
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

    let snapshot = build_snapshot(&p, &fyc_st, p.last_base_yield_token_price, now_ts)?;
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
  why: "Three new ix_tag discriminators and dispatch arms for the multi-yield-source + direct-deposit + manual-insurance-burn instructions. Appended after ACCELERATED_REDEEM (15), not inserted, so every existing tag a live client already encodes against keeps its exact numeric value.",
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
    /// NEW — registers one more YieldSourceState PDA (USDY, syrupUSDC, ...).
    pub const INITIALIZE_YIELD_SOURCE: u8 = 16;
    /// NEW — deposit a yield-bearing token directly, no swap leg.
    pub const DEPOSIT_YIELD_TOKEN: u8 = 17;
    /// NEW — manually burn insurance-held FYC to cover an FFC loss that
    /// never went through apply_default_waterfall.
    pub const BURN_INSURANCE_FOR_FFC: u8 = 18;
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
        INITIALIZE_YIELD_SOURCE => instructions::initialize_yield_source::process(accounts, payload),
        DEPOSIT_YIELD_TOKEN => instructions::deposit_yield_token::process(accounts, payload),
        BURN_INSURANCE_FOR_FFC => instructions::burn_insurance_for_ffc::process(accounts, payload),
        _ => Err(FleetError::InvalidInstructionData.into()),
    }
}
`
},
{
  path: "pinochio/src/instructions/mod.rs",
  status: "M",
  why: "Registers the three new instruction modules — initialize_yield_source, deposit_yield_token, burn_insurance_for_ffc — alphabetically, matching this file's existing convention.",
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
pub mod approve_default;
pub mod burn_insurance_for_ffc;
pub mod deposit;
pub mod deposit_yield_token;
pub mod flag_pending_default;
pub mod initialize_contract;
pub mod initialize_pool;
pub mod initialize_tranche;
pub mod initialize_yield_source;
pub mod originate_loan;
pub mod process_redemption;
pub mod recalculate_allocation;
pub mod record_recovery;
pub mod repay_loan;
pub mod run_yield_epoch;
pub mod set_paused;
pub mod set_redemption_fees;
pub mod submit_redemption;
`
},
{
  path: "pinochio/src/helpers/mod.rs",
  status: "M",
  why: "Registers the new curve module so helpers::curve::* resolves.",
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
pub mod math;
pub mod metaplex;
pub mod oracle;
pub mod pricing;
pub mod redemption;
pub mod swap;
pub mod sysprog;
pub mod token_account;
pub mod waterfall;`
},
];
