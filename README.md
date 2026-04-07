# perps.factory

Permissionless perpetual futures on Solana. Anyone can create a perp market for any asset with AMM-bootstrapped liquidity from day one.

**Built using [Solana](https://solana.com)**

## What is this?

A protocol that lets anyone spin up a perpetual futures market for any Pyth-fed asset. No governance proposals, no whitelisting — just deploy and trade.

- **Permissionless market creation** — anyone can create a market
- **AMM-bootstrapped liquidity** — virtual reserves provide instant depth
- **Isolated margin** — each position has its own collateral (USDC)
- **Pyth oracle integration** — index prices from Pyth Network
- **On-chain liquidation** — permissionless liquidation with keeper rewards
- **Funding rate mechanism** — 8-hour intervals, crankable by anyone

## Architecture

```
perps-factory/
  programs/perps-factory/   # Anchor on-chain program
    src/
      instructions/         # 8 instructions (init, create market, trade, liquidate, etc.)
      amm/                  # Constant-product AMM with direction penalty
  app/                      # Next.js 16 trading frontend
  tests/                    # Anchor test suite (10/10 passing)
```

## Quick Start

### Build & Test the Program

```bash
anchor build
anchor test
```

### Run the Frontend

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

## Tech Stack

- **On-chain**: Anchor (Rust), Solana runtime
- **Oracle**: Pyth Network price feeds
- **Frontend**: Next.js 16, Tailwind CSS, Solana wallet adapter
- **Collateral**: USDC (SPL Token)

## Status

This is an early-stage prototype. The on-chain program compiles and passes tests. The frontend connects wallets and displays markets. Trading execution and market creation transactions are not yet wired to the UI.

## License

MIT
