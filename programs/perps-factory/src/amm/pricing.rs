// Pyth price feed integration utilities.
//
// TODO: Implement using pyth_solana_receiver_sdk to:
// 1. Deserialize the Pyth price account
// 2. Extract price + confidence interval
// 3. Validate staleness (MAX_PRICE_STALENESS)
// 4. Validate confidence (MAX_CONFIDENCE_BPS)
// 5. Return confidence-weighted price
//
// For MVP, the AMM virtual reserves provide the mark price.
// The Pyth index price is needed for:
// - Funding rate calculation (mark vs index)
// - Liquidation price validation (secondary check)
// - Initial AMM seeding (set virtual reserves to match Pyth price)
