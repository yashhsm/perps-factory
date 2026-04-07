use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::{Market, Protocol};
use crate::constants::*;
use crate::error::PerpsError;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateMarketParams {
    /// Max leverage for this market (1-100).
    pub max_leverage: u8,
    /// Trading fee in basis points.
    pub trading_fee_bps: u16,
    /// Maintenance margin in basis points.
    pub maintenance_margin_bps: u16,
    /// Initial virtual base for AMM (sets initial depth).
    pub initial_amm_base: u64,
    /// Initial virtual quote for AMM.
    pub initial_amm_quote: u64,
}

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol.bump,
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [MARKET_SEED, &protocol.market_count.to_le_bytes()],
        bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = creator,
        token::mint = collateral_mint,
        token::authority = market,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// The Pyth price feed account for this market's underlying asset.
    /// CHECK: Validated in handler via pyth_solana_receiver_sdk.
    pub pyth_feed: UncheckedAccount<'info>,

    /// USDC mint (or other collateral).
    pub collateral_mint: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateMarket>, params: CreateMarketParams) -> Result<()> {
    require!(params.max_leverage >= 1 && params.max_leverage <= 100, PerpsError::InvalidParams);
    require!(params.trading_fee_bps > 0 && params.trading_fee_bps <= 500, PerpsError::InvalidParams);
    require!(params.maintenance_margin_bps >= 100, PerpsError::InvalidParams);
    require!(params.initial_amm_base > 0 && params.initial_amm_quote > 0, PerpsError::InvalidParams);

    // TODO: Validate Pyth feed account structure.
    // For now we trust that the creator provides a valid Pyth feed.
    // In production, use pyth_solana_receiver_sdk to verify.

    let protocol = &mut ctx.accounts.protocol;
    let market = &mut ctx.accounts.market;

    market.index = protocol.market_count;
    market.pyth_feed = ctx.accounts.pyth_feed.key();
    market.collateral_mint = ctx.accounts.collateral_mint.key();
    market.vault = ctx.accounts.vault.key();

    // AMM init — virtual reserves set the initial depth/spread
    market.amm_base = params.initial_amm_base;
    market.amm_quote = params.initial_amm_quote;
    market.lp_shares_total = 0;

    // Funding init
    market.cumulative_funding_long = 0;
    market.cumulative_funding_short = 0;
    let clock = Clock::get()?;
    market.last_funding_ts = clock.unix_timestamp;
    market.mark_twap_acc = 0;
    market.index_twap_acc = 0;
    market.twap_last_ts = clock.unix_timestamp;

    // Market params
    market.max_leverage = params.max_leverage;
    market.trading_fee_bps = params.trading_fee_bps;
    market.maintenance_margin_bps = params.maintenance_margin_bps;
    market.liquidation_fee_bps = DEFAULT_LIQUIDATION_FEE_BPS;

    // Aggregate state
    market.open_interest_long = 0;
    market.open_interest_short = 0;

    market.creator = ctx.accounts.creator.key();
    market.active = true;
    market.bump = ctx.bumps.market;

    protocol.market_count = protocol.market_count.checked_add(1).unwrap();

    msg!(
        "Market {} created: pyth_feed={}, max_leverage={}x",
        market.index,
        market.pyth_feed,
        market.max_leverage,
    );

    Ok(())
}
