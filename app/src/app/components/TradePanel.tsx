"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Program } from "@anchor-lang/core";
import { MarketData } from "@/app/hooks/useMarkets";
import { ONE_USDC, POSITION_SEED, VAULT_SEED } from "@/app/lib/constants";
import BN from "bn.js";

interface Props {
  market: MarketData;
  program: Program;
  onTradeComplete: () => void;
}

export default function TradePanel({ market, program, onTradeComplete }: Props) {
  const wallet = useWallet();
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState("");
  const [collateral, setCollateral] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const leverage =
    size && collateral && Number(collateral) > 0
      ? (Number(size) * market.markPrice) / Number(collateral)
      : 0;

  const handleTrade = async () => {
    if (!wallet.publicKey || !size || !collateral) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const sizeNum = parseInt(size);
      const collateralNum = Math.floor(Number(collateral) * ONE_USDC);

      const [positionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position"),
          market.publicKey.toBuffer(),
          wallet.publicKey.toBuffer(),
        ],
        program.programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), market.publicKey.toBuffer()],
        program.programId
      );

      // TODO: Get the trader's USDC token account dynamically
      // For now this is a placeholder — in production, use getAssociatedTokenAddress
      setError(
        "Connect wallet & ensure you have a USDC token account. Full integration coming soon."
      );
      setLoading(false);
      return;

      // The actual instruction call (uncomment when token accounts are wired):
      /*
      await program.methods
        .openPosition({
          side: side === "long" ? { long: {} } : { short: {} },
          size: new BN(sizeNum),
          collateral: new BN(collateralNum),
        })
        .accounts({
          market: market.publicKey,
          position: positionPda,
          vault: vaultPda,
          traderToken: traderTokenAccount,
          pythFeed: market.pythFeed,
          trader: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setSuccess(`${side.toUpperCase()} position opened!`);
      onTradeComplete();
      */
    } catch (e: any) {
      setError(e.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
        Trade Market #{market.index}
      </h3>

      {/* Side selector */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setSide("long")}
          className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
            side === "long"
              ? "bg-green text-white"
              : "bg-surface-2 text-muted hover:text-foreground"
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setSide("short")}
          className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
            side === "short"
              ? "bg-red text-white"
              : "bg-surface-2 text-muted hover:text-foreground"
          }`}
        >
          Short
        </button>
      </div>

      {/* Size input */}
      <div className="mb-3">
        <label className="block text-xs text-muted mb-1">
          Size (base units)
        </label>
        <input
          type="number"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="10000"
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
        />
      </div>

      {/* Collateral input */}
      <div className="mb-3">
        <label className="block text-xs text-muted mb-1">
          Collateral (USDC)
        </label>
        <input
          type="number"
          value={collateral}
          onChange={(e) => setCollateral(e.target.value)}
          placeholder="1000"
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
        />
      </div>

      {/* Info row */}
      <div className="flex justify-between text-xs text-muted mb-4 px-1">
        <span>
          Mark: ${market.markPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <span
          className={
            leverage > market.maxLeverage ? "text-red font-semibold" : ""
          }
        >
          Leverage: {leverage.toFixed(1)}x / {market.maxLeverage}x
        </span>
      </div>

      {/* Notional */}
      {size && (
        <div className="text-xs text-muted mb-4 px-1">
          Notional: $
          {(Number(size) * market.markPrice).toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}
        </div>
      )}

      {/* Trade button */}
      <button
        onClick={handleTrade}
        disabled={
          loading ||
          !wallet.publicKey ||
          !size ||
          !collateral ||
          leverage > market.maxLeverage
        }
        className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          side === "long"
            ? "bg-green hover:bg-green/90 text-white"
            : "bg-red hover:bg-red/90 text-white"
        }`}
      >
        {loading
          ? "Submitting..."
          : !wallet.publicKey
            ? "Connect Wallet"
            : leverage > market.maxLeverage
              ? `Max ${market.maxLeverage}x leverage`
              : `${side === "long" ? "Long" : "Short"} ${size || "..."} units`}
      </button>

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
    </div>
  );
}
