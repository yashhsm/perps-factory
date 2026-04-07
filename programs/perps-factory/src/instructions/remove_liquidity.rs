use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Market, LpPosition};
use crate::constants::*;
use crate::error::PerpsError;

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [LP_SEED, market.key().as_ref(), provider.key().as_ref()],
        bump = lp_position.bump,
        constraint = lp_position.owner == provider.key(),
    )]
    pub lp_position: Account<'info, LpPosition>,

    #[account(
        mut,
        constraint = vault.key() == market.vault,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = provider_token.mint == market.collateral_mint,
        constraint = provider_token.owner == provider.key(),
    )]
    pub provider_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub provider: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<RemoveLiquidity>, lp_amount: u64) -> Result<()> {
    let lp = &mut ctx.accounts.lp_position;
    require!(lp.lp_shares >= lp_amount, PerpsError::InsufficientLpShares);

    let market = &mut ctx.accounts.market;

    // Pro-rata withdrawal
    let withdraw_amount = (lp_amount as u128)
        .checked_mul(market.amm_quote as u128)
        .ok_or(PerpsError::MathOverflow)?
        .checked_div(market.lp_shares_total as u128)
        .ok_or(PerpsError::MathOverflow)? as u64;

    require!(withdraw_amount > 0, PerpsError::InsufficientLiquidity);

    // Update market AMM state
    market.amm_quote = market.amm_quote.saturating_sub(withdraw_amount);
    market.lp_shares_total = market.lp_shares_total.saturating_sub(lp_amount);

    // Update LP position
    lp.lp_shares = lp.lp_shares.saturating_sub(lp_amount);

    // Transfer from vault to provider
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
                to: ctx.accounts.provider_token.to_account_info(),
                authority: ctx.accounts.market.to_account_info(),
            },
            signer_seeds,
        ),
        withdraw_amount,
    )?;

    msg!("Removed liquidity: shares={}, amount={}", lp_amount, withdraw_amount);

    Ok(())
}
