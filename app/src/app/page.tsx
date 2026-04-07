"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import Header from "@/app/components/Header";
import MarketList from "@/app/components/MarketList";
import MarketDetail from "@/app/components/MarketDetail";
import TradePanel from "@/app/components/TradePanel";
import CreateMarketModal from "@/app/components/CreateMarketModal";
import InitProtocol from "@/app/components/InitProtocol";
import { useProgram } from "@/app/hooks/useProgram";
import { useMarkets } from "@/app/hooks/useMarkets";
import idl from "@/app/lib/idl";
import { PROTOCOL_SEED } from "@/app/lib/constants";

export default function Home() {
  const { program, connection } = useProgram();
  const { markets, loading, refresh } = useMarkets(program);
  const [selectedMarketIndex, setSelectedMarketIndex] = useState<number | null>(
    null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [protocolInitialized, setProtocolInitialized] = useState<boolean | null>(null);
  const wallet = useWallet();

  const selectedMarket = markets.find(
    (m) => m.index === selectedMarketIndex
  );

  // Check if protocol is initialized
  const checkProtocol = useCallback(async () => {
    try {
      const programId = new PublicKey(idl.address);
      const [protocolPda] = PublicKey.findProgramAddressSync(
        [PROTOCOL_SEED],
        programId
      );
      const info = await connection.getAccountInfo(protocolPda);
      setProtocolInitialized(info !== null);
    } catch {
      setProtocolInitialized(false);
    }
  }, [connection]);

  useEffect(() => {
    checkProtocol();
  }, [checkProtocol]);

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
              disabled={!wallet.publicKey || !protocolInitialized}
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
                <div className="lg:col-span-2">
                  <MarketDetail market={selectedMarket} />
                </div>
                <div>
                  <TradePanel
                    market={selectedMarket}
                    program={program}
                    onTradeComplete={refresh}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                {/* Show init button if protocol not initialized */}
                {wallet.publicKey && protocolInitialized === false ? (
                  <InitProtocol
                    program={program}
                    onInitialized={() => {
                      setProtocolInitialized(true);
                    }}
                  />
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-2">perps.factory</h2>
                    <p className="text-muted max-w-md">
                      Permissionless perpetual futures on Solana. Anyone can
                      create a market for any asset. AMM-bootstrapped liquidity
                      from day one.
                    </p>
                    {!wallet.publicKey && (
                      <p className="text-sm text-accent mt-4">
                        Connect your wallet to get started.
                      </p>
                    )}
                    {wallet.publicKey && protocolInitialized && markets.length === 0 && (
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
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Market Modal */}
      {showCreateModal && program && (
        <CreateMarketModal
          program={program}
          marketCount={markets.length}
          onCreated={() => {
            setShowCreateModal(false);
            refresh();
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
