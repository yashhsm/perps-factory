"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">perps.factory</h1>
        <span className="text-xs font-mono text-muted bg-surface-2 px-2 py-0.5 rounded">
          devnet
        </span>
      </div>
      <WalletMultiButton />
    </header>
  );
}
