use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Market, Position, Side};
use crate::constants::*;
use crate::error::PerpsError;
use crate::amm;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct OpenPositionParams {
    pub side: Side,
    /// Size in base units.
    pub size: u64,
    /// Collateral to deposit (USDC).
    pub collateral: u64,
}

#[derive(Accounts)]
pub struct OpenPosition<'info> {
    #[account(
        mut,
        constraint = market.active @ PerpsError::MarketNotActive,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = trader,
        space = 8 + Position::INIT_SPACE,
        seeds = [POSITION_SEED, market.key().as_ref(), trader.key().as_ref()],
        bump,
    )]
    pub position: Account<'info, Position>,

    #[account(
        mut,
        constraint = vault.key() == market.vault,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = trader_token.mint == market.collateral_mint,
        constraint = trader_token.owner == trader.key(),
    )]
    pub trader_token: Account<'info, TokenAccount>,

    /// CHECK: Pyth price feed — validated in AMM pricing.
    #[account(constraint = pyth_feed.key() == market.pyth_feed @ PerpsError::InvalidPriceFeed)]
    pub pyth_feed: UncheckedAccount<'info>,

    #[account(mut)]
    pub trader: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<OpenPosition>, params: OpenPositionParams) -> Result<()> {
    require!(params.size > 0, PerpsError::ZeroSize);
    require!(params.collateral > 0, PerpsError::InsufficientCollateral);

    let market_key = ctx.accounts.market.key();
    let market = &mut ctx.accounts.market;

    // Get mark price from AMM
    let mark_price = amm::get_mark_price(market);

    // Check leverage: notional / collateral <= max_leverage
    let notional = (params.size as u128)
        .checked_mul(mark_price as u128)
        .ok_or(PerpsError::MathOverflow)?
        / (PRICE_PRECISION as u128);

    let leverage = notional
        .checked_mul(10)
        .ok_or(PerpsError::MathOverflow)?
        / (params.collateral as u128);

    require!(leverage <= (market.max_leverage as u128) * 10, PerpsError::ExcessiveLeverage);

    // Transfer collateral to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.trader_token.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.trader.to_account_info(),
            },
        ),
        params.collateral,
    )?;

    // Apply price impact via AMM
    let fill_price = amm::apply_trade(market, params.size, &params.side)?;

    // Update OI
    match params.side {
        Side::Long => {
            market.open_interest_long = market.open_interest_long
                .checked_add(params.size)
                .ok_or(PerpsError::MathOverflow)?;
        }
        Side::Short => {
            market.open_interest_short = market.open_interest_short
                .checked_add(params.size)
                .ok_or(PerpsError::MathOverflow)?;
        }
    }

    // Write position
    let position = &mut ctx.accounts.position;
    position.owner = ctx.accounts.trader.key();
    position.market = market_key;
    position.size = match params.side {
        Side::Long => params.size as i64,
        Side::Short => -(params.size as i64),
    };
    position.collateral = params.collateral;
    position.entry_price = fill_price;
    position.entry_funding = if params.side == Side::Long {
        market.cumulative_funding_long
    } else {
        market.cumulative_funding_short
    };
    position.opened_at = Clock::get()?.unix_timestamp;
    position.bump = ctx.bumps.position;

    msg!(
        "Position opened: side={}, size={}, collateral={}, entry_price={}",
        if params.side == Side::Long { "LONG" } else { "SHORT" },
        params.size,
        params.collateral,
        fill_price,
    );

    Ok(())
}
