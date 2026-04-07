"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface Props {
  marketCount: number;
  onClose: () => void;
}

export default function CreateMarketModal({
  marketCount,
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

  const handleCreate = async () => {
    if (!wallet.publicKey) return;
    setLoading(true);
    setError(null);

    try {
      const price = Number(initialPrice);
      const depth = Number(initialDepth);

      if (!Number.isFinite(price) || price <= 0) {
        setError("Enter a valid positive initial price.");
        return;
      }

      if (!Number.isFinite(depth) || depth <= 0) {
        setError("Enter a valid positive AMM depth.");
        return;
      }

      setError(
        "Market creation is not wired yet. A collateral mint and on-chain create-market instruction still need to be hooked up."
      );
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Failed to create market"
      );
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
