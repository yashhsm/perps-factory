import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { PerpsFactory } from "../target/types/perps_factory";
import {
  createMint,
  createAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import BN from "bn.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.perpsFactory as Program<PerpsFactory>;
  const authority = provider.wallet;

  console.log("Program ID:", program.programId.toBase58());
  console.log("Authority:", authority.publicKey.toBase58());
  console.log("Balance:", await provider.connection.getBalance(authority.publicKey) / 1e9, "SOL");

  // Seeds
  const PROTOCOL_SEED = Buffer.from("protocol");
  const MARKET_SEED = Buffer.from("market");
  const VAULT_SEED = Buffer.from("vault");
  const POSITION_SEED = Buffer.from("position");

  // 1. Check if protocol already initialized
  const [protocolPda] = PublicKey.findProgramAddressSync(
    [PROTOCOL_SEED],
    program.programId
  );

  let protocolAccount;
  try {
    protocolAccount = await (program.account as any).protocol.fetch(protocolPda);
    console.log("\n✓ Protocol already initialized");
    console.log("  Market count:", protocolAccount.marketCount.toNumber());
  } catch {
    console.log("\n→ Initializing protocol...");
    await program.methods
      .initialize()
      .accounts({
        protocol: protocolPda,
        authority: authority.publicKey,
        treasury: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    protocolAccount = await (program.account as any).protocol.fetch(protocolPda);
    console.log("✓ Protocol initialized!");
  }

  // 2. Create a test USDC mint
  console.log("\n→ Creating test USDC mint...");
  const usdcMint = await createMint(
    provider.connection,
    (provider.wallet as any).payer,
    authority.publicKey,
    null,
    6 // 6 decimals like real USDC
  );
  console.log("✓ Test USDC mint:", usdcMint.toBase58());

  // 3. Create market
  const marketCount = protocolAccount.marketCount.toNumber();
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(marketCount));

  const [marketPda] = PublicKey.findProgramAddressSync(
    [MARKET_SEED, indexBuf],
    program.programId
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [VAULT_SEED, marketPda.toBuffer()],
    program.programId
  );

  // Use a random keypair as fake Pyth feed
  const pythFeed = Keypair.generate();

  const initialPrice = 100; // $100 per unit
  const depth = 1_000_000; // 1M base units
  const ammBase = new BN(depth);
  const ammQuote = new BN(depth * initialPrice * 1_000_000); // quote in USDC (6 decimals)

  console.log("\n→ Creating market #" + marketCount + "...");
  console.log("  Price: $" + initialPrice);
  console.log("  Depth: " + depth.toLocaleString() + " base units");

  await program.methods
    .createMarket({
      maxLeverage: 20,
      tradingFeeBps: 10,
      maintenanceMarginBps: 500,
      initialAmmBase: ammBase,
      initialAmmQuote: ammQuote,
    })
    .accounts({
      protocol: protocolPda,
      market: marketPda,
      vault: vaultPda,
      pythFeed: pythFeed.publicKey,
      collateralMint: usdcMint,
      creator: authority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const market = await (program.account as any).market.fetch(marketPda);
  console.log("✓ Market created!");
  console.log("  Market PDA:", marketPda.toBase58());
  console.log("  Mark price:", (market.ammQuote.toNumber() / market.ammBase.toNumber() / 1_000_000).toFixed(2));
  console.log("  Max leverage:", market.maxLeverage + "x");
  console.log("  Active:", market.active);

  // 4. Mint test USDC to trader
  console.log("\n→ Minting 100,000 test USDC to trader...");
  const traderToken = await createAccount(
    provider.connection,
    (provider.wallet as any).payer,
    usdcMint,
    authority.publicKey
  );
  await mintTo(
    provider.connection,
    (provider.wallet as any).payer,
    usdcMint,
    traderToken,
    authority.publicKey,
    100_000 * 1_000_000 // 100,000 USDC
  );
  console.log("✓ Minted 100,000 USDC to:", traderToken.toBase58());

  // 5. Open a long position
  const [positionPda] = PublicKey.findProgramAddressSync(
    [POSITION_SEED, marketPda.toBuffer(), authority.publicKey.toBuffer()],
    program.programId
  );

  const positionSize = new BN(1000); // 1000 base units
  const collateral = new BN(10_000 * 1_000_000); // 10,000 USDC

  console.log("\n→ Opening LONG position...");
  console.log("  Size: 1,000 units");
  console.log("  Collateral: 10,000 USDC");
  console.log("  Leverage: ~" + (1000 * initialPrice / 10_000).toFixed(1) + "x");

  await program.methods
    .openPosition({
      side: { long: {} },
      size: positionSize,
      collateral: collateral,
    })
    .accounts({
      market: marketPda,
      position: positionPda,
      vault: vaultPda,
      traderToken: traderToken,
      pythFeed: pythFeed.publicKey,
      trader: authority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const position = await (program.account as any).position.fetch(positionPda);
  console.log("✓ Position opened!");
  console.log("  Size:", position.size.toNumber());
  console.log("  Collateral:", (position.collateral.toNumber() / 1_000_000).toLocaleString(), "USDC");
  console.log("  Entry price:", (position.entryPrice.toNumber() / 1_000_000).toFixed(4));

  // 6. Check updated market state
  const updatedMarket = await (program.account as any).market.fetch(marketPda);
  const newMark = updatedMarket.ammQuote.toNumber() / updatedMarket.ammBase.toNumber() / 1_000_000;
  console.log("\n--- Market State After Trade ---");
  console.log("  Mark price: $" + newMark.toFixed(4));
  console.log("  OI Long:", updatedMarket.openInterestLong.toNumber());
  console.log("  OI Short:", updatedMarket.openInterestShort.toNumber());
  console.log("  Price impact:", ((newMark - initialPrice) / initialPrice * 100).toFixed(4) + "%");

  console.log("\n=============================");
  console.log("  DEVNET SIMULATION COMPLETE");
  console.log("=============================");
  console.log("  Balance remaining:", await provider.connection.getBalance(authority.publicKey) / 1e9, "SOL");
}

main().catch(console.error);
