pub mod amm;
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::initialize::*;
pub use instructions::create_market::*;
pub use instructions::add_liquidity::*;
pub use instructions::remove_liquidity::*;
pub use instructions::open_position::*;
pub use instructions::close_position::*;
pub use instructions::liquidate::*;
pub use instructions::update_funding::*;

declare_id!("FtQtY9QpFAUFqTVK1266cm5xHkcNR5AYQhcGAdM8wzCC");

#[program]
pub mod perps_factory {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        params: CreateMarketParams,
    ) -> Result<()> {
        instructions::create_market::handler(ctx, params)
    }

    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        amount: u64,
    ) -> Result<()> {
        instructions::add_liquidity::handler(ctx, amount)
    }

    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        lp_amount: u64,
    ) -> Result<()> {
        instructions::remove_liquidity::handler(ctx, lp_amount)
    }

    pub fn open_position(
        ctx: Context<OpenPosition>,
        params: OpenPositionParams,
    ) -> Result<()> {
        instructions::open_position::handler(ctx, params)
    }

    pub fn close_position(ctx: Context<ClosePosition>) -> Result<()> {
        instructions::close_position::handler(ctx)
    }

    pub fn liquidate(ctx: Context<Liquidate>) -> Result<()> {
        instructions::liquidate::handler(ctx)
    }

    pub fn update_funding(ctx: Context<UpdateFunding>) -> Result<()> {
        instructions::update_funding::handler(ctx)
    }
}
