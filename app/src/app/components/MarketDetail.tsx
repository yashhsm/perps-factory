"use client";

import { MarketData } from "@/app/hooks/useMarkets";
import { ONE_USDC } from "@/app/lib/constants";

interface Props {
  market: MarketData;
}

export default function MarketDetail({ market }: Props) {
  const totalLiquidity = market.ammQuote / ONE_USDC;
  const oiImbalance =
    market.openInterestLong + market.openInterestShort > 0
      ? Math.abs(market.openInterestLong - market.openInterestShort) /
        (market.openInterestLong + market.openInterestShort)
      : 0;

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold font-mono">
          Market #{market.index}
        </h3>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            market.active ? "bg-green/10 text-green" : "bg-red/10 text-red"
          }`}
        >
          {market.active ? "LIVE" : "INACTIVE"}
        </span>
      </div>

      {/* Price display */}
      <div className="text-3xl font-mono font-bold mb-4">
        $
        {market.markPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
        <span className="text-sm text-muted ml-2 font-normal">mark</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Max Leverage"
          value={`${market.maxLeverage}x`}
        />
        <StatCard
          label="Trading Fee"
          value={`${market.tradingFeeBps} bps`}
        />
        <StatCard
          label="Maint. Margin"
          value={`${(market.maintenanceMarginBps / 100).toFixed(1)}%`}
        />
        <StatCard
          label="AMM Depth"
          value={`$${totalLiquidity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        />
      </div>

      {/* Open Interest bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>Open Interest</span>
          <span>
            {(market.openInterestLong + market.openInterestShort).toLocaleString()} total
          </span>
        </div>
        <div className="h-2 bg-surface-2 rounded-full overflow-hidden flex">
          {market.openInterestLong + market.openInterestShort > 0 ? (
            <>
              <div
                className="bg-green h-full"
                style={{
                  width: `${
                    (market.openInterestLong /
                      (market.openInterestLong + market.openInterestShort)) *
                    100
                  }%`,
                }}
              />
              <div className="bg-red h-full flex-1" />
            </>
          ) : (
            <div className="bg-surface-2 h-full flex-1" />
          )}
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-green">
            L: {market.openInterestLong.toLocaleString()}
          </span>
          <span className="text-red">
            S: {market.openInterestShort.toLocaleString()}
          </span>
        </div>
        {oiImbalance > 0.3 && (
          <div className="text-xs text-amber-400 mt-1">
            OI imbalanced ({(oiImbalance * 100).toFixed(0)}%) — spreads widened
          </div>
        )}
      </div>

      {/* Creator */}
      <div className="mt-4 text-xs text-muted">
        Creator: {market.creator.toBase58().slice(0, 8)}...
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-2 rounded-lg px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-sm font-mono font-semibold">{value}</div>
    </div>
  );
}
