use anchor_lang::prelude::*;
use crate::state::Protocol;
use crate::constants::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Protocol::INIT_SPACE,
        seeds = [PROTOCOL_SEED],
        bump,
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Treasury account to receive protocol fees.
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol;
    protocol.authority = ctx.accounts.authority.key();
    protocol.market_count = 0;
    protocol.protocol_fee_bps = DEFAULT_PROTOCOL_FEE_BPS;
    protocol.treasury = ctx.accounts.treasury.key();
    protocol.bump = ctx.bumps.protocol;
    Ok(())
}
