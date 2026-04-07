"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "@anchor-lang/core";
import idl from "@/app/lib/idl";
import {
  PROTOCOL_SEED,
  MARKET_SEED,
  VAULT_SEED,
  USDC_MINT,
} from "@/app/lib/constants";

interface Props {
  program: { methods: any };
  marketCount: number;
  onCreated: () => void;
  onClose: () => void;
}

export default function CreateMarketModal({
  program,
  marketCount,
  onCreated,
  onClose,
}: Props) {
  const wallet = useWallet();
  const [maxLeverage, setMaxLeverage] = useState("20");
  const [tradingFee, setTradingFee] = useState("10");
  const [maintenanceMargin, setMaintenanceMargin] = useState("500");
  const [initialPrice, setInitialPrice] = useState("100");
  const [initialDepth, setInitialDepth] = useState("1000000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!wallet.publicKey) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const price = Number(initialPrice);
      const depth = Number(initialDepth);

      if (!Number.isFinite(price) || price <= 0) {
        setError("Enter a valid positive initial price.");
        setLoading(false);
        return;
      }
      if (!Number.isFinite(depth) || depth <= 0) {
        setError("Enter a valid positive AMM depth.");
        setLoading(false);
        return;
      }

      const ammBase = new BN(depth);
      // quote = depth * price * 1e6 (USDC 6 decimals)
      const ammQuote = new BN(Math.floor(depth * price * 1_000_000));

      const programId = new PublicKey(idl.address);

      // Derive protocol PDA
      const [protocolPda] = PublicKey.findProgramAddressSync(
        [PROTOCOL_SEED],
        programId
      );

      // Derive market PDA using current market_count
      const indexBuf = Buffer.alloc(8);
      indexBuf.writeBigUInt64LE(BigInt(marketCount));
      const [marketPda] = PublicKey.findProgramAddressSync(
        [MARKET_SEED, indexBuf],
        programId
      );

      // Derive vault PDA
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [VAULT_SEED, marketPda.toBuffer()],
        programId
      );

      // Use a random keypair as Pyth feed placeholder on devnet
      // In production, this would be a real Pyth price account
      const pythFeed = Keypair.generate();

      const tx = await program.methods
        .createMarket({
          maxLeverage: Number(maxLeverage),
          tradingFeeBps: Number(tradingFee),
          maintenanceMarginBps: Number(maintenanceMargin),
          initialAmmBase: ammBase,
          initialAmmQuote: ammQuote,
        })
        .accounts({
          protocol: protocolPda,
          market: marketPda,
          vault: vaultPda,
          pythFeed: pythFeed.publicKey,
          collateralMint: USDC_MINT,
          creator: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setSuccess(`Market created! tx: ${tx.slice(0, 16)}...`);
      setTimeout(() => {
        onCreated();
      }, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create market";
      // Provide user-friendly hints for common errors
      if (msg.includes("insufficient funds") || msg.includes("0x1")) {
        setError("Insufficient SOL for transaction fees. Airdrop devnet SOL first.");
      } else if (msg.includes("already in use")) {
        setError("Protocol not initialized yet, or market index collision. Try refreshing.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Create New Market</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground"
          >
            x
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted mb-1">
              Initial Price (USDC per unit)
            </label>
            <input
              type="number"
              value={initialPrice}
              onChange={(e) => setInitialPrice(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">
              AMM Depth (base units)
            </label>
            <input
              type="number"
              value={initialDepth}
              onChange={(e) => setInitialDepth(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
            />
            <p className="text-xs text-muted mt-1">
              Higher = deeper liquidity, lower price impact
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">
                Max Leverage
              </label>
              <input
                type="number"
                value={maxLeverage}
                onChange={(e) => setMaxLeverage(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Fee (bps)
              </label>
              <input
                type="number"
                value={tradingFee}
                onChange={(e) => setTradingFee(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Maint. Margin
              </label>
              <input
                type="number"
                value={maintenanceMargin}
                onChange={(e) => setMaintenanceMargin(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-surface-2 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted">Mark Price</span>
              <span className="font-mono">
                ${Number(initialPrice).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">AMM k</span>
              <span className="font-mono">
                {(
                  Number(initialDepth) *
                  Number(initialDepth) *
                  Number(initialPrice)
                ).toExponential(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Market Index</span>
              <span className="font-mono">#{marketCount}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 text-xs text-red bg-red/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 text-xs text-green bg-green/10 rounded-lg px-3 py-2">
            {success}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm bg-surface-2 text-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !wallet.publicKey}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Market"}
          </button>
        </div>
      </div>
    </div>
  );
}
