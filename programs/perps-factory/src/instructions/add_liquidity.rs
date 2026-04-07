use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Market, LpPosition};
use crate::constants::*;
use crate::error::PerpsError;

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(
        mut,
        constraint = market.active @ PerpsError::MarketNotActive,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init_if_needed,
        payer = provider,
        space = 8 + LpPosition::INIT_SPACE,
        seeds = [LP_SEED, market.key().as_ref(), provider.key().as_ref()],
        bump,
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
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AddLiquidity>, amount: u64) -> Result<()> {
    require!(amount > 0, PerpsError::InsufficientCollateral);

    let market = &mut ctx.accounts.market;

    // Calculate LP shares: if pool is empty, shares = amount. Otherwise pro-rata.
    let shares = if market.lp_shares_total == 0 {
        amount
    } else {
        (amount as u128)
            .checked_mul(market.lp_shares_total as u128)
            .ok_or(PerpsError::MathOverflow)?
            .checked_div(market.amm_quote as u128)
            .ok_or(PerpsError::MathOverflow)? as u64
    };

    // Transfer collateral to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.provider_token.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.provider.to_account_info(),
            },
        ),
        amount,
    )?;

    // Update AMM state — add to quote side (real liquidity)
    market.amm_quote = market.amm_quote
        .checked_add(amount)
        .ok_or(PerpsError::MathOverflow)?;
    market.lp_shares_total = market.lp_shares_total
        .checked_add(shares)
        .ok_or(PerpsError::MathOverflow)?;

    // Update LP position
    let lp = &mut ctx.accounts.lp_position;
    if lp.owner == Pubkey::default() {
        lp.owner = ctx.accounts.provider.key();
        lp.market = ctx.accounts.market.key();
        lp.bump = ctx.bumps.lp_position;
    }
    lp.lp_shares = lp.lp_shares.checked_add(shares).ok_or(PerpsError::MathOverflow)?;
    lp.deposited_amount = lp.deposited_amount.checked_add(amount).ok_or(PerpsError::MathOverflow)?;

    msg!("Added liquidity: amount={}, shares={}", amount, shares);

    Ok(())
}
