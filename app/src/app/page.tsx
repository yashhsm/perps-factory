"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Header from "@/app/components/Header";
import MarketList from "@/app/components/MarketList";
import MarketDetail from "@/app/components/MarketDetail";
import TradePanel from "@/app/components/TradePanel";
import CreateMarketModal from "@/app/components/CreateMarketModal";
import { useProgram } from "@/app/hooks/useProgram";
import { useMarkets } from "@/app/hooks/useMarkets";

export default function Home() {
  const { program } = useProgram();
  const { markets, loading } = useMarkets(program);
  const [selectedMarketIndex, setSelectedMarketIndex] = useState<number | null>(
    null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const wallet = useWallet();

  const selectedMarket = markets.find(
    (m) => m.index === selectedMarketIndex
  );

  return (
    <div className="flex flex-col h-screen">
      <Header />

      <main className="flex flex-1 overflow-hidden">
        {/* Left sidebar — Market List */}
        <aside className="w-72 border-r border-border bg-surface flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-muted uppercase tracking-wide">
              Markets
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!wallet.publicKey}
              className="text-xs bg-accent text-white px-3 py-1 rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MarketList
              markets={markets}
              loading={loading}
              selectedIndex={selectedMarketIndex}
              onSelect={setSelectedMarketIndex}
            />
          </div>
          <div className="px-4 py-2 border-t border-border text-xs text-muted">
            {markets.length} market{markets.length !== 1 ? "s" : ""} live
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {selectedMarket ? (
            <div className="flex-1 p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
                {/* Market detail — 2 cols */}
                <div className="lg:col-span-2">
                  <MarketDetail market={selectedMarket} />
                </div>

                {/* Trade panel — 1 col */}
                <div>
                  <TradePanel market={selectedMarket} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">perps.factory</h2>
                <p className="text-muted max-w-md">
                  Permissionless perpetual futures on Solana. Anyone can create a
                  market for any asset. AMM-bootstrapped liquidity from day one.
                </p>
                {!wallet.publicKey && (
                  <p className="text-sm text-accent mt-4">
                    Connect your wallet to get started.
                  </p>
                )}
                {wallet.publicKey && markets.length === 0 && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    Create First Market
                  </button>
                )}
                {markets.length > 0 && (
                  <p className="text-sm text-muted mt-4">
                    Select a market from the sidebar to start trading.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Market Modal */}
      {showCreateModal && (
        <CreateMarketModal
          marketCount={markets.length}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
