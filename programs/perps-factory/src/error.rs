use anchor_lang::prelude::*;

#[error_code]
pub enum PerpsError {
    #[msg("Market is not active")]
    MarketNotActive,
    #[msg("Leverage exceeds market maximum")]
    ExcessiveLeverage,
    #[msg("Position size must be non-zero")]
    ZeroSize,
    #[msg("Insufficient collateral for position")]
    InsufficientCollateral,
    #[msg("Position is not liquidatable")]
    NotLiquidatable,
    #[msg("Position margin ratio is below maintenance")]
    BelowMaintenanceMargin,
    #[msg("Invalid Pyth price feed")]
    InvalidPriceFeed,
    #[msg("Pyth price is stale")]
    StalePriceData,
    #[msg("Pyth price confidence too wide")]
    PriceConfidenceTooWide,
    #[msg("Funding rate update too early")]
    FundingTooEarly,
    #[msg("Insufficient LP shares")]
    InsufficientLpShares,
    #[msg("AMM pool has insufficient liquidity")]
    InsufficientLiquidity,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Invalid market parameters")]
    InvalidParams,
}
