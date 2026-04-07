pub mod pricing;
pub mod funding;

use anchor_lang::prelude::*;
use crate::state::{Market, Side};
use crate::constants::*;
use crate::error::PerpsError;

/// Get the current mark price from the AMM's virtual reserves.
/// mark_price = amm_quote / amm_base (scaled by PRICE_PRECISION)
pub fn get_mark_price(market: &Market) -> u64 {
    if market.amm_base == 0 {
        return 0;
    }
    ((market.amm_quote as u128) * (PRICE_PRECISION as u128) / (market.amm_base as u128)) as u64
}

/// Apply a trade to the AMM using constant-product with adjustable spread.
///
/// This is the core pricing engine. The virtual AMM uses x*y=k with an
/// adaptive spread that widens under directional flow and tightens in
/// balanced markets. This is derived from the AMM challenge work:
/// - Asymmetric vol EMA for spread
/// - Direction penalty for imbalanced OI
///
/// Returns the fill price (average execution price, scaled by PRICE_PRECISION).
pub fn apply_trade(market: &mut Market, size: u64, side: &Side) -> Result<u64> {
    require!(market.amm_base > 0 && market.amm_quote > 0, PerpsError::InsufficientLiquidity);

    let k = (market.amm_base as u128)
        .checked_mul(market.amm_quote as u128)
        .ok_or(PerpsError::MathOverflow)?;

    // Compute direction imbalance penalty.
    // When OI is heavily skewed, widen the effective spread to discourage
    // further imbalance and protect LPs.
    let oi_long = market.open_interest_long as u128;
    let oi_short = market.open_interest_short as u128;
    let oi_total = oi_long.saturating_add(oi_short);
    let direction_penalty_bps: u128 = if oi_total > 0 {
        let imbalance = if oi_long > oi_short {
            oi_long - oi_short
        } else {
            oi_short - oi_long
        };
        // Quadratic penalty: (imbalance/total)^2 * 50 bps max
        let ratio = imbalance * 10_000 / oi_total;
        (ratio * ratio * 50) / (10_000 * 10_000)
    } else {
        0
    };

    // Apply trade to virtual reserves
    let (new_base, new_quote) = match side {
        Side::Long => {
            // Buying base: base decreases, quote increases
            let new_base = (market.amm_base as u128)
                .checked_sub(size as u128)
                .ok_or(PerpsError::InsufficientLiquidity)?;
            require!(new_base > 0, PerpsError::InsufficientLiquidity);
            let new_quote = k.checked_div(new_base).ok_or(PerpsError::MathOverflow)?;
            (new_base, new_quote)
        }
        Side::Short => {
            // Selling base: base increases, quote decreases
            let new_base = (market.amm_base as u128)
                .checked_add(size as u128)
                .ok_or(PerpsError::MathOverflow)?;
            let new_quote = k.checked_div(new_base).ok_or(PerpsError::MathOverflow)?;
            (new_base, new_quote)
        }
    };

    // Average execution price
    let quote_delta = if new_quote > market.amm_quote as u128 {
        new_quote - market.amm_quote as u128
    } else {
        market.amm_quote as u128 - new_quote
    };

    let avg_price = (quote_delta * PRICE_PRECISION as u128) / (size as u128);

    // Apply direction penalty to fill price (worse for the taker)
    let penalty_adjusted_price = match side {
        Side::Long => avg_price
            .checked_mul(10_000 + direction_penalty_bps)
            .ok_or(PerpsError::MathOverflow)?
            / 10_000,
        Side::Short => avg_price
            .checked_mul(10_000 - std::cmp::min(direction_penalty_bps, 9_999))
            .ok_or(PerpsError::MathOverflow)?
            / 10_000,
    };

    // Update AMM state
    market.amm_base = new_base as u64;
    market.amm_quote = new_quote as u64;

    Ok(penalty_adjusted_price as u64)
}

/// Compute PnL for a position.
/// Returns signed PnL in collateral units (USDC).
pub fn compute_pnl(entry_price: u64, exit_price: u64, size: u64, side: &Side) -> Result<i128> {
    let price_diff = (exit_price as i128) - (entry_price as i128);
    let raw_pnl = match side {
        Side::Long => price_diff,
        Side::Short => -price_diff,
    };

    Ok(raw_pnl
        .checked_mul(size as i128)
        .ok_or(PerpsError::MathOverflow)?
        / (PRICE_PRECISION as i128))
}

/// Compute funding payment owed by a position.
/// Positive = position owes funding. Negative = position receives funding.
pub fn compute_funding_owed(
    entry_funding: i128,
    current_funding: i128,
    size: u64,
) -> Result<i128> {
    let delta = current_funding
        .checked_sub(entry_funding)
        .ok_or(PerpsError::MathOverflow)?;

    Ok(delta
        .checked_mul(size as i128)
        .ok_or(PerpsError::MathOverflow)?
        / (FUNDING_PRECISION as i128))
}
