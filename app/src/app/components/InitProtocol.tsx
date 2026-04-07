"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "@/app/lib/idl";
import { PROTOCOL_SEED } from "@/app/lib/constants";

interface Props {
  program: { methods: any };
  onInitialized: () => void;
}

export default function InitProtocol({ program, onInitialized }: Props) {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInit = async () => {
    if (!wallet.publicKey) return;
    setLoading(true);
    setError(null);

    try {
      const programId = new PublicKey(idl.address);
      const [protocolPda] = PublicKey.findProgramAddressSync(
        [PROTOCOL_SEED],
        programId
      );

      await program.methods
        .initialize()
        .accounts({
          protocol: protocolPda,
          authority: wallet.publicKey,
          treasury: wallet.publicKey, // Use wallet as treasury for now
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      onInitialized();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to initialize";
      if (msg.includes("already in use")) {
        // Protocol already initialized, that's fine
        onInitialized();
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6 max-w-md">
      <h3 className="text-lg font-semibold mb-2">Initialize Protocol</h3>
      <p className="text-sm text-muted mb-4">
        The protocol hasn't been initialized on this network yet. This is a
        one-time setup that creates the global state account.
      </p>
      <button
        onClick={handleInit}
        disabled={loading || !wallet.publicKey}
        className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {loading ? "Initializing..." : "Initialize Protocol"}
      </button>
      {error && (
        <div className="mt-3 text-xs text-red bg-red/10 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
