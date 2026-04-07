"use client";

import { useMemo } from "react";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  AnchorProvider,
  Program,
  type Provider,
} from "@anchor-lang/core";

import idl, { type PerpsFactoryIdl } from "@/app/lib/idl";

type AnchorWallet = AnchorProvider["wallet"];

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const anchorWallet = useMemo<AnchorWallet | null>(() => {
    if (
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !wallet.signAllTransactions
    ) {
      return null;
    }

    return {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions: wallet.signAllTransactions.bind(wallet),
    };
  }, [wallet]);

  const provider = useMemo(() => {
    if (!anchorWallet) return null;
    return new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
    });
  }, [anchorWallet, connection]);

  const readOnlyProvider = useMemo<Provider>(
    () => provider ?? { connection },
    [connection, provider]
  );

  const program = useMemo(() => {
    return new Program<PerpsFactoryIdl>(idl, readOnlyProvider);
  }, [readOnlyProvider]);

  return { program, provider, connection, wallet };
}
