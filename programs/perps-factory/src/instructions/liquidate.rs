use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Market, Position, Side};
use crate::constants::*;
use crate::error::PerpsError;
use crate::amm;

#[derive(Accounts)]
pub struct Liquidate<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        close = position_owner,
        seeds = [POSITION_SEED, market.key().as_ref(), position_owner.key().as_ref()],
        bump = position.bump,
    )]
    pub position: Account<'info, Position>,

    #[account(
        mut,
        constraint = vault.key() == market.vault,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Liquidator receives a reward.
    #[account(
        mut,
        constraint = liquidator_token.mint == market.collateral_mint,
    )]
    pub liquidator_token: Account<'info, TokenAccount>,

    /// CHECK: Pyth price feed.
    #[account(constraint = pyth_feed.key() == market.pyth_feed @ PerpsError::InvalidPriceFeed)]
    pub pyth_feed: UncheckedAccount<'info>,

    /// CHECK: The owner of the position being liquidated.
    #[account(mut)]
    pub position_owner: UncheckedAccount<'info>,

    #[account(mut)]
    pub liquidator: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Liquidate>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let position = &ctx.accounts.position;

    let abs_size = position.size.unsigned_abs();
    let side = if position.size > 0 { Side::Long } else { Side::Short };

    // Get current mark price
    let mark_price = amm::get_mark_price(market);

    // Compute unrealized PnL
    let pnl = amm::compute_pnl(position.entry_price, mark_price, abs_size, &side)?;

    // Compute funding owed
    let funding_owed = amm::compute_funding_owed(
        position.entry_funding,
        if side == Side::Long {
            market.cumulative_funding_long
        } else {
            market.cumulative_funding_short
        },
        abs_size,
    )?;

    // Margin ratio = (collateral + pnl - funding) / notional
    let notional = (abs_size as u128)
        .checked_mul(mark_price as u128)
        .ok_or(PerpsError::MathOverflow)?
        / (PRICE_PRECISION as u128);

    let margin = (position.collateral as i128)
        .checked_add(pnl)
        .ok_or(PerpsError::MathOverflow)?
        .checked_sub(funding_owed)
        .ok_or(PerpsError::MathOverflow)?;

    // Check if below maintenance margin
    let maintenance_margin = (notional * market.maintenance_margin_bps as u128) / 10_000;

    require!(
        margin < maintenance_margin as i128,
        PerpsError::NotLiquidatable,
    );

    // Close through AMM
    let close_side = if side == Side::Long { Side::Short } else { Side::Long };
    amm::apply_trade(market, abs_size, &close_side)?;

    // Update OI
    match side {
        Side::Long => {
            market.open_interest_long = market.open_interest_long.saturating_sub(abs_size);
        }
        Side::Short => {
            market.open_interest_short = market.open_interest_short.saturating_sub(abs_size);
        }
    }

    // Liquidator reward
    let liq_fee = (notional * market.liquidation_fee_bps as u128) / 10_000;
    let liquidator_reward = (liq_fee * LIQUIDATOR_REWARD_BPS as u128) / 10_000;
    let reward = std::cmp::min(liquidator_reward as u64, position.collateral);

    if reward > 0 {
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
                    to: ctx.accounts.liquidator_token.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer_seeds,
            ),
            reward,
        )?;
    }

    msg!("Position liquidated: owner={}, reward={}", position.owner, reward);

    Ok(())
}
