use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::Market;
use crate::constants::*;
use crate::error::PerpsError;
use crate::amm;

#[derive(Accounts)]
pub struct UpdateFunding<'info> {
    #[account(
        mut,
        constraint = market.active @ PerpsError::MarketNotActive,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        constraint = vault.key() == market.vault,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Cranker receives a small reward for updating funding.
    #[account(
        mut,
        constraint = cranker_token.mint == market.collateral_mint,
    )]
    pub cranker_token: Account<'info, TokenAccount>,

    /// CHECK: Pyth price feed.
    #[account(constraint = pyth_feed.key() == market.pyth_feed @ PerpsError::InvalidPriceFeed)]
    pub pyth_feed: UncheckedAccount<'info>,

    #[account(mut)]
    pub cranker: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<UpdateFunding>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // Ensure enough time has passed since last update
    let elapsed = now.checked_sub(market.last_funding_ts).ok_or(PerpsError::MathOverflow)?;
    require!(elapsed >= FUNDING_INTERVAL, PerpsError::FundingTooEarly);

    // Get current mark and index prices
    let mark_price = amm::get_mark_price(market);

    // TODO: Read index price from Pyth.
    // For now, use mark price as a placeholder. In production, decode the Pyth
    // price feed account data using pyth_solana_receiver_sdk.
    let index_price = mark_price;

    // Funding rate = (mark - index) / index * (elapsed / 24h)
    // Positive funding: longs pay shorts. Negative: shorts pay longs.
    let price_diff = (mark_price as i128) - (index_price as i128);
    let funding_rate = price_diff
        .checked_mul(FUNDING_PRECISION as i128)
        .ok_or(PerpsError::MathOverflow)?
        .checked_mul(elapsed as i128)
        .ok_or(PerpsError::MathOverflow)?
        / (index_price as i128)
        / (24 * 60 * 60); // normalize to 24h

    // Update cumulative funding
    market.cumulative_funding_long = market.cumulative_funding_long
        .checked_add(funding_rate)
        .ok_or(PerpsError::MathOverflow)?;
    market.cumulative_funding_short = market.cumulative_funding_short
        .checked_sub(funding_rate)
        .ok_or(PerpsError::MathOverflow)?;

    market.last_funding_ts = now;

    // Pay cranker reward
    if FUNDING_CRANK_REWARD > 0 {
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
                    to: ctx.accounts.cranker_token.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer_seeds,
            ),
            FUNDING_CRANK_REWARD,
        )?;
    }

    msg!("Funding updated: rate={}, elapsed={}s", funding_rate, elapsed);

    Ok(())
}
