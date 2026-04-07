"use client";

import { MarketData } from "@/app/hooks/useMarkets";
import { ONE_USDC } from "@/app/lib/constants";

interface Props {
  markets: MarketData[];
  loading: boolean;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export default function MarketList({
  markets,
  loading,
  selectedIndex,
  onSelect,
}: Props) {
  if (loading) {
    return (
      <div className="p-6 text-center text-muted">Loading markets...</div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="p-6 text-center text-muted">
        <p>No markets yet.</p>
        <p className="text-sm mt-1">Create the first one.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {markets.map((market) => {
        const isSelected = selectedIndex === market.index;
        const totalOI = market.openInterestLong + market.openInterestShort;
        const totalLiquidity = market.ammQuote / ONE_USDC;

        return (
          <button
            key={market.index}
            onClick={() => onSelect(market.index)}
            className={`w-full text-left px-4 py-3 transition-colors hover:bg-surface-2 ${
              isSelected ? "bg-surface-2 border-l-2 border-accent" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-semibold text-sm">
                  Market #{market.index}
                </span>
                <span className="ml-2 text-xs text-muted">
                  {market.maxLeverage}x
                </span>
              </div>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  market.active
                    ? "bg-green/10 text-green"
                    : "bg-red/10 text-red"
                }`}
              >
                {market.active ? "LIVE" : "INACTIVE"}
              </span>
            </div>
            <div className="flex gap-4 mt-1 text-xs text-muted">
              <span>
                Mark: ${market.markPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span>Fee: {market.tradingFeeBps}bps</span>
              <span>
                Depth: ${totalLiquidity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            {totalOI > 0 && (
              <div className="flex gap-3 mt-1 text-xs">
                <span className="text-green">
                  L: {market.openInterestLong.toLocaleString()}
                </span>
                <span className="text-red">
                  S: {market.openInterestShort.toLocaleString()}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
