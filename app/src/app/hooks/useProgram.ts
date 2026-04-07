"use client";

import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import idl from "@/app/lib/idl";

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey) return null;
    return new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(idl as any, provider);
  }, [provider]);

  return { program, provider, connection, wallet };
}

export function useProtocolPda(programId: PublicKey) {
  return useMemo(() => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("protocol")],
      programId
    )[0];
  }, [programId]);
}

export function useMarketPda(programId: PublicKey, marketIndex: number) {
  return useMemo(() => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(marketIndex));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("market"), buf],
      programId
    )[0];
  }, [programId, marketIndex]);
}
