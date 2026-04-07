import { PublicKey } from "@solana/web3.js";

export const PRICE_PRECISION = 1_000_000;
export const USDC_DECIMALS = 6;
export const ONE_USDC = 1_000_000;

// Devnet USDC mint (native-mint-based for testing)
// Replace with real USDC mint for mainnet
export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

export const PROTOCOL_SEED = Buffer.from("protocol");
export const MARKET_SEED = Buffer.from("market");
export const POSITION_SEED = Buffer.from("position");
export const LP_SEED = Buffer.from("lp");
export const VAULT_SEED = Buffer.from("vault");

export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
