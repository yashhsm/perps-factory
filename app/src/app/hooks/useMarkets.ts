"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program } from "@anchor-lang/core";
import { PRICE_PRECISION, ONE_USDC } from "@/app/lib/constants";

export interface MarketData {
  publicKey: PublicKey;
  index: number;
  pythFeed: PublicKey;
  creator: PublicKey;
  ammBase: number;
  ammQuote: number;
  markPrice: number;
  maxLeverage: number;
  tradingFeeBps: number;
  maintenanceMarginBps: number;
  openInterestLong: number;
  openInterestShort: number;
  lpSharesTotal: number;
  active: boolean;
}

export function useMarkets(program: Program | null) {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarkets = useCallback(async () => {
    if (!program) return;
    setLoading(true);
    try {
      const allMarkets = await (program.account as any).market.all();
      const parsed: MarketData[] = allMarkets.map((m: any) => {
        const ammBase = m.account.ammBase.toNumber();
        const ammQuote = m.account.ammQuote.toNumber();
        const markPrice =
          ammBase > 0 ? (ammQuote * PRICE_PRECISION) / ammBase : 0;

        return {
          publicKey: m.publicKey,
          index: m.account.index.toNumber(),
          pythFeed: m.account.pythFeed,
          creator: m.account.creator,
          ammBase,
          ammQuote,
          markPrice: markPrice / PRICE_PRECISION,
          maxLeverage: m.account.maxLeverage,
          tradingFeeBps: m.account.tradingFeeBps,
          maintenanceMarginBps: m.account.maintenanceMarginBps,
          openInterestLong: m.account.openInterestLong.toNumber(),
          openInterestShort: m.account.openInterestShort.toNumber(),
          lpSharesTotal: m.account.lpSharesTotal.toNumber(),
          active: m.account.active,
        };
      });

      parsed.sort((a, b) => a.index - b.index);
      setMarkets(parsed);
    } catch (e) {
      console.error("Failed to fetch markets:", e);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  return { markets, loading, refresh: fetchMarkets };
}
