use anchor_lang::prelude::*;

/// Global protocol state.
#[account]
#[derive(InitSpace)]
pub struct Protocol {
    /// Authority that can update protocol-level params.
    pub authority: Pubkey,
    /// Total number of markets created.
    pub market_count: u64,
    /// Protocol fee in basis points (e.g. 5 = 0.05%).
    pub protocol_fee_bps: u16,
    /// Treasury that collects protocol fees.
    pub treasury: Pubkey,
    pub bump: u8,
}

/// A single perpetual futures market.
#[account]
#[derive(InitSpace)]
pub struct Market {
    /// Unique market index.
    pub index: u64,
    /// The Pyth price feed this market tracks.
    pub pyth_feed: Pubkey,
    /// USDC mint used as collateral.
    pub collateral_mint: Pubkey,
    /// Market's collateral vault.
    pub vault: Pubkey,

    // -- AMM state --
    /// Total base (virtual) in the AMM.
    pub amm_base: u64,
    /// Total quote (virtual + real) in the AMM.
    pub amm_quote: u64,
    /// Total LP shares outstanding.
    pub lp_shares_total: u64,

    // -- Funding state --
    /// Cumulative funding per unit of base (scaled by 1e12).
    pub cumulative_funding_long: i128,
    pub cumulative_funding_short: i128,
    /// Last funding update timestamp.
    pub last_funding_ts: i64,
    /// TWAP accumulators for funding calc.
    pub mark_twap_acc: i128,
    pub index_twap_acc: i128,
    pub twap_last_ts: i64,

    // -- Market params --
    /// Max leverage (e.g. 20 = 20x).
    pub max_leverage: u8,
    /// Trading fee in basis points.
    pub trading_fee_bps: u16,
    /// Maintenance margin ratio in basis points (e.g. 500 = 5%).
    pub maintenance_margin_bps: u16,
    /// Liquidation fee in basis points (paid to liquidator).
    pub liquidation_fee_bps: u16,

    // -- Aggregate state --
    /// Total open interest (long side, in base units).
    pub open_interest_long: u64,
    /// Total open interest (short side, in base units).
    pub open_interest_short: u64,

    /// Creator of this market (earns a share of fees).
    pub creator: Pubkey,
    /// Whether the market is active.
    pub active: bool,
    pub bump: u8,
}

/// A trader's position in a specific market.
#[account]
#[derive(InitSpace)]
pub struct Position {
    /// Owner of this position.
    pub owner: Pubkey,
    /// Market this position belongs to.
    pub market: Pubkey,
    /// Size in base units. Positive = long, negative = short.
    pub size: i64,
    /// Collateral deposited (USDC, in token units).
    pub collateral: u64,
    /// Entry price (scaled by 1e6).
    pub entry_price: u64,
    /// Cumulative funding at entry.
    pub entry_funding: i128,
    /// Timestamp of position open.
    pub opened_at: i64,
    pub bump: u8,
}

/// LP position tracking shares in a market's AMM.
#[account]
#[derive(InitSpace)]
pub struct LpPosition {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub lp_shares: u64,
    pub deposited_amount: u64,
    pub bump: u8,
}

/// Side of a trade.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    Long,
    Short,
}
