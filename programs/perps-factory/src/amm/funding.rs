// Funding rate math utilities.
//
// The funding rate mechanism ensures mark price converges to index price:
// - When mark > index: longs pay shorts (positive funding)
// - When mark < index: shorts pay longs (negative funding)
//
// Rate = (mark - index) / index * (interval / 24h)
// Capped at +/- 0.1% per interval to prevent extreme swings.
//
// TWAP-based calculation:
// - Accumulate mark and index prices over the interval
// - Use the TWAP difference for smoother funding
// - Prevents manipulation via single-block price spikes
//
// TODO: Implement TWAP accumulator updates (called on every trade)
// TODO: Implement funding rate caps
// TODO: Implement velocity-based funding (accelerate rate when OI is heavily skewed)
