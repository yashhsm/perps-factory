# Perps Factory

Permissionless perpetual futures protocol on Solana. Anyone can create a perp market for any Pyth-fed asset with AMM-bootstrapped liquidity.

## Architecture

- **On-chain program** (`programs/perps-factory/`): Anchor program with market factory, AMM, margin, funding, liquidation
- **Frontend** (`app/`): Next.js trading UI (TODO)
- **SDK** (`sdk/`): TypeScript client for the program (TODO)
- **Bot** (`bot/`): Market-making agent (TODO)

## Key Design Decisions

- **AMM-bootstrapped liquidity**: Every market starts with virtual reserves (constant-product). No need for organic LPs on day 1.
- **Isolated margin only** (v1): Each position has its own collateral. Cross-margin is v2.
- **USDC collateral**: All markets settle in USDC.
- **Pyth oracle**: Index price from Pyth feeds. Mark price from AMM virtual reserves.
- **Permissionless market creation**: Anyone can call `create_market` with a valid Pyth feed.
- **Cranked funding**: 8-hour intervals. Anyone can crank for a small reward.
- **Direction penalty**: AMM widens spread when OI is imbalanced — protects LPs from directional risk.

## Building

```bash
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

## Program Structure

```
programs/perps-factory/src/
  lib.rs              # Program entrypoint + instruction routing
  state.rs            # Account structs: Protocol, Market, Position, LpPosition
  error.rs            # Custom errors
  constants.rs        # Seeds, precision constants, default params
  instructions/       # One file per instruction
    initialize.rs     # Init protocol state
    create_market.rs  # Permissionless market creation
    open_position.rs  # Open long/short with leverage
    close_position.rs # Close + settle PnL
    add_liquidity.rs  # LP deposits
    remove_liquidity.rs # LP withdrawals
    liquidate.rs      # Liquidate undercollateralized positions
    update_funding.rs # Crank funding rate
  amm/
    mod.rs            # Core AMM: pricing, trade execution, PnL calc
    pricing.rs        # Pyth integration (TODO)
    funding.rs        # Funding rate math (TODO: TWAP, caps)
```

## TODO (MVP)

1. Pyth integration — decode price feed, validate staleness/confidence
2. TWAP accumulator — update on every trade for smoother funding
3. Funding rate caps — +/- 0.1% per interval
4. Trading fee distribution — protocol / creator / LP split
5. Tests — unit tests with LiteSVM
6. TypeScript SDK — client for all instructions
7. Frontend — market list, create market, trade, positions
8. MM bot — market-making agent using AMM challenge strategies
