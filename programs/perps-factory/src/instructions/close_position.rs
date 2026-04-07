use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Market, Position, Side};
use crate::constants::*;
use crate::error::PerpsError;
use crate::amm;

#[derive(Accounts)]
pub struct ClosePosition<'info> {
    #[account(
        mut,
        constraint = market.active @ PerpsError::MarketNotActive,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        close = trader,
        seeds = [POSITION_SEED, market.key().as_ref(), trader.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == trader.key(),
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

    /// CHECK: Pyth price feed.
    #[account(constraint = pyth_feed.key() == market.pyth_feed @ PerpsError::InvalidPriceFeed)]
    pub pyth_feed: UncheckedAccount<'info>,

    #[account(mut)]
    pub trader: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClosePosition>) -> Result<()> {
    // Copy position data before mutable borrow of market
    let pos_size = ctx.accounts.position.size;
    let pos_collateral = ctx.accounts.position.collateral;
    let pos_entry_price = ctx.accounts.position.entry_price;
    let pos_entry_funding = ctx.accounts.position.entry_funding;

    let market = &mut ctx.accounts.market;

    let abs_size = pos_size.unsigned_abs();
    let side = if pos_size > 0 { Side::Long } else { Side::Short };

    // Close trade through AMM (opposite direction)
    let close_side = if side == Side::Long { Side::Short } else { Side::Long };
    let exit_price = amm::apply_trade(market, abs_size, &close_side)?;

    // Compute PnL
    let pnl = amm::compute_pnl(pos_entry_price, exit_price, abs_size, &side)?;

    // Compute funding owed
    let funding_owed = amm::compute_funding_owed(
        pos_entry_funding,
        if side == Side::Long {
            market.cumulative_funding_long
        } else {
            market.cumulative_funding_short
        },
        abs_size,
    )?;

    // Trading fee
    let notional = (abs_size as u128)
        .checked_mul(exit_price as u128)
        .ok_or(PerpsError::MathOverflow)?
        / (PRICE_PRECISION as u128);
    let fee = (notional * market.trading_fee_bps as u128) / 10_000;

    // Net payout = collateral + pnl - funding - fee
    let payout = (pos_collateral as i128)
        .checked_add(pnl)
        .ok_or(PerpsError::MathOverflow)?
        .checked_sub(funding_owed)
        .ok_or(PerpsError::MathOverflow)?
        .checked_sub(fee as i128)
        .ok_or(PerpsError::MathOverflow)?;

    let payout = if payout < 0 { 0u64 } else { payout as u64 };

    // Update OI
    match side {
        Side::Long => {
            market.open_interest_long = market.open_interest_long.saturating_sub(abs_size);
        }
        Side::Short => {
            market.open_interest_short = market.open_interest_short.saturating_sub(abs_size);
        }
    }

    // Transfer payout from vault to trader
    if payout > 0 {
        let seeds = &[
            MARKET_SEED,
            &market.index.to_le_bytes(),
            &[market.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.trader_token.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer_seeds,
            ),
            payout,
        )?;
    }

    msg!(
        "Position closed: pnl={}, funding={}, fee={}, payout={}",
        pnl,
        funding_owed,
        fee,
        payout,
    );

    Ok(())
}
