"use client";

import { useEffect, useState, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { Program } from "@anchor-lang/core";
import { PRICE_PRECISION } from "@/app/lib/constants";
import { type PerpsFactoryIdl } from "@/app/lib/idl";

export interface MarketData {
  publicKey: PublicKey;
  index: number;
  pythFeed: PublicKey;
  collateralMint: PublicKey;
  vault: PublicKey;
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

interface MarketAccountState {
  index: { toNumber(): number };
  pythFeed: PublicKey;
  collateralMint: PublicKey;
  vault: PublicKey;
  creator: PublicKey;
  ammBase: { toNumber(): number };
  ammQuote: { toNumber(): number };
  maxLeverage: number;
  tradingFeeBps: number;
  maintenanceMarginBps: number;
  openInterestLong: { toNumber(): number };
  openInterestShort: { toNumber(): number };
  lpSharesTotal: { toNumber(): number };
  active: boolean;
}

interface MarketAccountEntry {
  publicKey: PublicKey;
  account: MarketAccountState;
}

interface MarketAccountClient {
  all(): Promise<MarketAccountEntry[]>;
}

export function useMarkets(program: Program<PerpsFactoryIdl>) {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    try {
      const marketAccount = program.account as unknown as {
        market: MarketAccountClient;
      };
      const allMarkets = await marketAccount.market.all();
      const parsed: MarketData[] = allMarkets.map(
        ({ publicKey, account }: MarketAccountEntry) => {
          const ammBase = account.ammBase.toNumber();
          const ammQuote = account.ammQuote.toNumber();
          const markPrice =
            ammBase > 0 ? (ammQuote * PRICE_PRECISION) / ammBase : 0;

          return {
            publicKey,
            index: account.index.toNumber(),
            pythFeed: account.pythFeed,
            collateralMint: account.collateralMint,
            vault: account.vault,
            creator: account.creator,
            ammBase,
            ammQuote,
            markPrice: markPrice / PRICE_PRECISION,
            maxLeverage: account.maxLeverage,
            tradingFeeBps: account.tradingFeeBps,
            maintenanceMarginBps: account.maintenanceMarginBps,
            openInterestLong: account.openInterestLong.toNumber(),
            openInterestShort: account.openInterestShort.toNumber(),
            lpSharesTotal: account.lpSharesTotal.toNumber(),
            active: account.active,
          };
        }
      );

      parsed.sort((a, b) => a.index - b.index);
      setMarkets(parsed);
    } catch (e) {
      console.error("Failed to fetch markets:", e);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    void fetchMarkets();
  }, [fetchMarkets]);

  return { markets, loading, refresh: fetchMarkets };
}
