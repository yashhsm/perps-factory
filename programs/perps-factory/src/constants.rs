use anchor_lang::prelude::*;

#[constant]
pub const PROTOCOL_SEED: &[u8] = b"protocol";

#[constant]
pub const MARKET_SEED: &[u8] = b"market";

#[constant]
pub const POSITION_SEED: &[u8] = b"position";

#[constant]
pub const LP_SEED: &[u8] = b"lp";

#[constant]
pub const VAULT_SEED: &[u8] = b"vault";

/// Funding rate interval: 8 hours in seconds.
pub const FUNDING_INTERVAL: i64 = 8 * 60 * 60;

/// Precision for funding rate calculations (1e12).
pub const FUNDING_PRECISION: u128 = 1_000_000_000_000;

/// Precision for price calculations (1e6).
pub const PRICE_PRECISION: u64 = 1_000_000;

/// Max allowed Pyth price staleness in seconds.
pub const MAX_PRICE_STALENESS: i64 = 30;

/// Max confidence interval as percentage of price (in bps). 250 = 2.5%.
pub const MAX_CONFIDENCE_BPS: u64 = 250;

/// Default trading fee: 10 bps (0.1%).
pub const DEFAULT_TRADING_FEE_BPS: u16 = 10;

/// Default maintenance margin: 500 bps (5%).
pub const DEFAULT_MAINTENANCE_MARGIN_BPS: u16 = 500;

/// Default liquidation fee: 250 bps (2.5%).
pub const DEFAULT_LIQUIDATION_FEE_BPS: u16 = 250;

/// Default max leverage: 20x.
pub const DEFAULT_MAX_LEVERAGE: u8 = 20;

/// Protocol fee: 5 bps (0.05%) — taken from trading fees.
pub const DEFAULT_PROTOCOL_FEE_BPS: u16 = 5;

/// Creator fee share: 10% of trading fees.
pub const CREATOR_FEE_SHARE_BPS: u16 = 1000;

/// Liquidator reward: portion of liquidation fee.
pub const LIQUIDATOR_REWARD_BPS: u16 = 5000; // 50% to liquidator, 50% to insurance

/// Funding crank reward in USDC lamports (0.01 USDC = 10_000).
pub const FUNDING_CRANK_REWARD: u64 = 10_000;
