"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { BN } from "@anchor-lang/core";
import { MarketData } from "@/app/hooks/useMarkets";
import { POSITION_SEED, ONE_USDC } from "@/app/lib/constants";

interface Props {
  market: MarketData;
  program: { methods: any; programId: PublicKey };
  onTradeComplete: () => void;
}

export default function TradePanel({ market, program, onTradeComplete }: Props) {
  const wallet = useWallet();
  const { connection } = useConnection();
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
      const sizeNum = Number(size);
      const collateralNum = Number(collateral);

      if (!Number.isFinite(sizeNum) || sizeNum <= 0) {
        setError("Enter a valid positive size.");
        setLoading(false);
        return;
      }
      if (!Number.isFinite(collateralNum) || collateralNum <= 0) {
        setError("Enter valid positive collateral.");
        setLoading(false);
        return;
      }

      const sizeRaw = new BN(Math.floor(sizeNum));
      const collateralRaw = new BN(Math.floor(collateralNum * ONE_USDC));

      // Derive position PDA
      const [positionPda] = PublicKey.findProgramAddressSync(
        [POSITION_SEED, market.publicKey.toBuffer(), wallet.publicKey.toBuffer()],
        program.programId
      );

      // Get trader's USDC token account (ATA)
      const traderToken = await getAssociatedTokenAddress(
        market.collateralMint,
        wallet.publicKey
      );

      // Check if the token account exists
      const tokenInfo = await connection.getAccountInfo(traderToken);
      if (!tokenInfo) {
        setError(
          `No USDC token account found. Send USDC (mint: ${market.collateralMint.toBase58().slice(0, 8)}...) to your wallet first.`
        );
        setLoading(false);
        return;
      }

      const tx = await program.methods
        .openPosition({
          side: side === "long" ? { long: {} } : { short: {} },
          size: sizeRaw,
          collateral: collateralRaw,
        })
        .accounts({
          market: market.publicKey,
          position: positionPda,
          vault: market.vault,
          traderToken: traderToken,
          pythFeed: market.pythFeed,
          trader: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setSuccess(`${side.toUpperCase()} opened! tx: ${tx.slice(0, 16)}...`);
      setTimeout(() => {
        onTradeComplete();
      }, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      if (msg.includes("insufficient funds") || msg.includes("0x1")) {
        setError("Insufficient SOL for fees or USDC for collateral.");
      } else if (msg.includes("already in use")) {
        setError("You already have an open position in this market. Close it first.");
      } else {
        setError(msg);
      }
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
          className={leverage > market.maxLeverage ? "text-red font-semibold" : ""}
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
