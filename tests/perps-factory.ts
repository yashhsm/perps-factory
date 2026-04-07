import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { PerpsFactory } from "../target/types/perps_factory";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import BN from "bn.js";

describe("perps-factory", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.perpsFactory as Program<PerpsFactory>;
  const authority = provider.wallet;

  // Shared state across tests
  let collateralMint: PublicKey;
  let pythFeed: Keypair;
  let protocolPda: PublicKey;
  let marketPda: PublicKey;
  let vaultPda: PublicKey;
  let authorityToken: PublicKey;

  // Second trader
  const trader = Keypair.generate();
  let traderToken: PublicKey;

  // LP provider
  const lpProvider = Keypair.generate();
  let lpProviderToken: PublicKey;

  const USDC_DECIMALS = 6;
  const ONE_USDC = 1_000_000;

  before(async () => {
    // Airdrop SOL to trader and LP provider
    const airdropTrader = await provider.connection.requestAirdrop(
      trader.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTrader);

    const airdropLp = await provider.connection.requestAirdrop(
      lpProvider.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropLp);

    // Create USDC-like mint
    collateralMint = await createMint(
      provider.connection,
      (authority as any).payer,
      authority.publicKey,
      null,
      USDC_DECIMALS
    );

    // Create a fake Pyth feed account (just a keypair for now)
    pythFeed = Keypair.generate();

    // Create token accounts
    authorityToken = await createAccount(
      provider.connection,
      (authority as any).payer,
      collateralMint,
      authority.publicKey
    );

    traderToken = await createAccount(
      provider.connection,
      (authority as any).payer,
      collateralMint,
      trader.publicKey
    );

    lpProviderToken = await createAccount(
      provider.connection,
      (authority as any).payer,
      collateralMint,
      lpProvider.publicKey
    );

    // Mint USDC to all participants
    await mintTo(
      provider.connection,
      (authority as any).payer,
      collateralMint,
      authorityToken,
      authority.publicKey,
      100_000 * ONE_USDC // 100k USDC
    );

    await mintTo(
      provider.connection,
      (authority as any).payer,
      collateralMint,
      traderToken,
      authority.publicKey,
      100_000 * ONE_USDC
    );

    await mintTo(
      provider.connection,
      (authority as any).payer,
      collateralMint,
      lpProviderToken,
      authority.publicKey,
      100_000 * ONE_USDC
    );

    // Derive PDAs
    [protocolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol")],
      program.programId
    );
  });

  it("initializes the protocol", async () => {
    const treasury = Keypair.generate();

    await program.methods
      .initialize()
      .accounts({
        protocol: protocolPda,
        authority: authority.publicKey,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const protocol = await program.account.protocol.fetch(protocolPda);
    expect(protocol.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(protocol.marketCount.toNumber()).to.equal(0);
    expect(protocol.protocolFeeBps).to.equal(5);
    console.log("  Protocol initialized, fee:", protocol.protocolFeeBps, "bps");
  });

  it("creates a permissionless market", async () => {
    // Market PDA uses market_count (0) as seed
    const protocol = await program.account.protocol.fetch(protocolPda);
    const marketIndex = protocol.marketCount;

    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketIndex.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );

    await program.methods
      .createMarket({
        maxLeverage: 20,
        tradingFeeBps: 10,
        maintenanceMarginBps: 500,
        initialAmmBase: new BN(1_000_000), // 1M base units
        initialAmmQuote: new BN(100_000 * ONE_USDC), // 100k USDC (price = 100 USDC/unit)
      })
      .accounts({
        protocol: protocolPda,
        market: marketPda,
        vault: vaultPda,
        pythFeed: pythFeed.publicKey,
        collateralMint: collateralMint,
        creator: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    expect(market.index.toNumber()).to.equal(0);
    expect(market.maxLeverage).to.equal(20);
    expect(market.tradingFeeBps).to.equal(10);
    expect(market.active).to.be.true;
    expect(market.ammBase.toNumber()).to.equal(1_000_000);
    expect(market.ammQuote.toNumber()).to.equal(100_000 * ONE_USDC);
    expect(market.openInterestLong.toNumber()).to.equal(0);
    expect(market.openInterestShort.toNumber()).to.equal(0);

    const updatedProtocol = await program.account.protocol.fetch(protocolPda);
    expect(updatedProtocol.marketCount.toNumber()).to.equal(1);

    // Mark price = quote/base * 1e6 = (100_000_000_000 / 1_000_000) * 1e6 = 100_000_000 (100 USDC)
    const markPrice = market.ammQuote.toNumber() * 1_000_000 / market.ammBase.toNumber();
    console.log("  Market created, mark price:", markPrice / 1_000_000, "USDC");
  });

  it("adds liquidity to the market", async () => {
    const [lpPositionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp"), marketPda.toBuffer(), lpProvider.publicKey.toBuffer()],
      program.programId
    );

    const depositAmount = new BN(10_000 * ONE_USDC); // 10k USDC

    await program.methods
      .addLiquidity(depositAmount)
      .accounts({
        market: marketPda,
        lpPosition: lpPositionPda,
        vault: vaultPda,
        providerToken: lpProviderToken,
        provider: lpProvider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([lpProvider])
      .rpc();

    const lp = await program.account.lpPosition.fetch(lpPositionPda);
    expect(lp.owner.toBase58()).to.equal(lpProvider.publicKey.toBase58());
    expect(lp.depositedAmount.toNumber()).to.equal(10_000 * ONE_USDC);
    expect(lp.lpShares.toNumber()).to.be.greaterThan(0);

    const market = await program.account.market.fetch(marketPda);
    console.log("  LP added:", depositAmount.toNumber() / ONE_USDC, "USDC, shares:", lp.lpShares.toNumber());
    console.log("  AMM quote after LP:", market.ammQuote.toNumber() / ONE_USDC, "USDC");
  });

  it("opens a long position", async () => {
    const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketPda.toBuffer(), trader.publicKey.toBuffer()],
      program.programId
    );

    const size = new BN(10_000); // 10k base units
    const collateral = new BN(5_000 * ONE_USDC); // 5k USDC collateral

    const traderBalBefore = (await getAccount(provider.connection, traderToken)).amount;

    await program.methods
      .openPosition({
        side: { long: {} },
        size: size,
        collateral: collateral,
      })
      .accounts({
        market: marketPda,
        position: positionPda,
        vault: vaultPda,
        traderToken: traderToken,
        pythFeed: pythFeed.publicKey,
        trader: trader.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([trader])
      .rpc();

    const position = await program.account.position.fetch(positionPda);
    expect(position.owner.toBase58()).to.equal(trader.publicKey.toBase58());
    expect(position.size.toNumber()).to.be.greaterThan(0); // positive = long
    expect(position.collateral.toNumber()).to.equal(5_000 * ONE_USDC);
    expect(position.entryPrice.toNumber()).to.be.greaterThan(0);

    const traderBalAfter = (await getAccount(provider.connection, traderToken)).amount;
    expect(Number(traderBalBefore) - Number(traderBalAfter)).to.equal(5_000 * ONE_USDC);

    const market = await program.account.market.fetch(marketPda);
    expect(market.openInterestLong.toNumber()).to.equal(10_000);

    console.log("  Long opened: size=", size.toNumber(), "entry=", position.entryPrice.toNumber() / 1_000_000, "USDC");
    console.log("  AMM base after trade:", market.ammBase.toNumber(), "quote:", market.ammQuote.toNumber() / ONE_USDC, "USDC");
  });

  it("closes the long position", async () => {
    const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketPda.toBuffer(), trader.publicKey.toBuffer()],
      program.programId
    );

    const traderBalBefore = (await getAccount(provider.connection, traderToken)).amount;

    await program.methods
      .closePosition()
      .accounts({
        market: marketPda,
        position: positionPda,
        vault: vaultPda,
        traderToken: traderToken,
        pythFeed: pythFeed.publicKey,
        trader: trader.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([trader])
      .rpc();

    const traderBalAfter = (await getAccount(provider.connection, traderToken)).amount;
    const payout = Number(traderBalAfter) - Number(traderBalBefore);
    console.log("  Position closed, payout:", payout / ONE_USDC, "USDC");

    const market = await program.account.market.fetch(marketPda);
    expect(market.openInterestLong.toNumber()).to.equal(0);

    // Position account should be closed (rent returned)
    const positionAccount = await provider.connection.getAccountInfo(positionPda);
    expect(positionAccount).to.be.null;
  });

  it("opens and closes a short position", async () => {
    const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketPda.toBuffer(), trader.publicKey.toBuffer()],
      program.programId
    );

    // Open short
    await program.methods
      .openPosition({
        side: { short: {} },
        size: new BN(5_000),
        collateral: new BN(3_000 * ONE_USDC),
      })
      .accounts({
        market: marketPda,
        position: positionPda,
        vault: vaultPda,
        traderToken: traderToken,
        pythFeed: pythFeed.publicKey,
        trader: trader.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([trader])
      .rpc();

    const position = await program.account.position.fetch(positionPda);
    expect(position.size.toNumber()).to.be.lessThan(0); // negative = short
    console.log("  Short opened: size=", position.size.toNumber(), "entry=", position.entryPrice.toNumber() / 1_000_000, "USDC");

    const market = await program.account.market.fetch(marketPda);
    expect(market.openInterestShort.toNumber()).to.equal(5_000);

    // Close short
    const traderBalBefore = (await getAccount(provider.connection, traderToken)).amount;

    await program.methods
      .closePosition()
      .accounts({
        market: marketPda,
        position: positionPda,
        vault: vaultPda,
        traderToken: traderToken,
        pythFeed: pythFeed.publicKey,
        trader: trader.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([trader])
      .rpc();

    const traderBalAfter = (await getAccount(provider.connection, traderToken)).amount;
    const payout = Number(traderBalAfter) - Number(traderBalBefore);
    console.log("  Short closed, payout:", payout / ONE_USDC, "USDC");

    const marketAfter = await program.account.market.fetch(marketPda);
    expect(marketAfter.openInterestShort.toNumber()).to.equal(0);
  });

  it("rejects excessive leverage", async () => {
    const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketPda.toBuffer(), trader.publicKey.toBuffer()],
      program.programId
    );

    // Try to open 100k base with only 100 USDC collateral
    // At ~100 USDC/unit, notional = 10M USDC, leverage = 100,000x
    try {
      await program.methods
        .openPosition({
          side: { long: {} },
          size: new BN(100_000),
          collateral: new BN(100 * ONE_USDC),
        })
        .accounts({
          market: marketPda,
          position: positionPda,
          vault: vaultPda,
          traderToken: traderToken,
          pythFeed: pythFeed.publicKey,
          trader: trader.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([trader])
        .rpc();

      expect.fail("Should have thrown ExcessiveLeverage");
    } catch (err: any) {
      expect(err.toString()).to.contain("ExcessiveLeverage");
      console.log("  Correctly rejected excessive leverage");
    }
  });

  it("rejects zero-size position", async () => {
    const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketPda.toBuffer(), trader.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .openPosition({
          side: { long: {} },
          size: new BN(0),
          collateral: new BN(1_000 * ONE_USDC),
        })
        .accounts({
          market: marketPda,
          position: positionPda,
          vault: vaultPda,
          traderToken: traderToken,
          pythFeed: pythFeed.publicKey,
          trader: trader.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([trader])
        .rpc();

      expect.fail("Should have thrown ZeroSize");
    } catch (err: any) {
      expect(err.toString()).to.contain("ZeroSize");
      console.log("  Correctly rejected zero-size position");
    }
  });

  it("creates a second market (permissionless)", async () => {
    const protocol = await program.account.protocol.fetch(protocolPda);
    const marketIndex = protocol.marketCount;

    const [market2Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketIndex.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const [vault2Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), market2Pda.toBuffer()],
      program.programId
    );

    const pythFeed2 = Keypair.generate();

    // Different params: 10x leverage, 30bps fee (higher risk market)
    await program.methods
      .createMarket({
        maxLeverage: 10,
        tradingFeeBps: 30,
        maintenanceMarginBps: 1000, // 10% maintenance
        initialAmmBase: new BN(10_000_000),
        initialAmmQuote: new BN(1_000_000 * ONE_USDC), // price = 0.1 USDC/unit (memecoin-like)
      })
      .accounts({
        protocol: protocolPda,
        market: market2Pda,
        vault: vault2Pda,
        pythFeed: pythFeed2.publicKey,
        collateralMint: collateralMint,
        creator: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const market2 = await program.account.market.fetch(market2Pda);
    expect(market2.index.toNumber()).to.equal(1);
    expect(market2.maxLeverage).to.equal(10);
    expect(market2.tradingFeeBps).to.equal(30);

    const updatedProtocol = await program.account.protocol.fetch(protocolPda);
    expect(updatedProtocol.marketCount.toNumber()).to.equal(2);

    const markPrice = market2.ammQuote.toNumber() * 1_000_000 / market2.ammBase.toNumber();
    console.log("  Market 2 created (memecoin), mark price:", markPrice / 1_000_000, "USDC");
  });

  it("removes liquidity (small amount within vault balance)", async () => {
    const [lpPositionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp"), marketPda.toBuffer(), lpProvider.publicKey.toBuffer()],
      program.programId
    );

    // Check vault balance to ensure we don't withdraw more than available
    const vaultBalance = (await getAccount(provider.connection, vaultPda)).amount;
    const lpBefore = await program.account.lpPosition.fetch(lpPositionPda);
    const market = await program.account.market.fetch(marketPda);

    // Calculate max safe shares: (vaultBalance / ammQuote) * totalShares
    const maxSafeShares = Number(vaultBalance) * lpBefore.lpShares.toNumber() / market.ammQuote.toNumber();
    const sharesToRemove = new BN(Math.floor(Math.min(maxSafeShares * 0.5, lpBefore.lpShares.toNumber() / 4)));

    console.log("  Vault balance:", Number(vaultBalance) / ONE_USDC, "USDC, removing", sharesToRemove.toNumber(), "shares");

    const lpBalBefore = (await getAccount(provider.connection, lpProviderToken)).amount;

    await program.methods
      .removeLiquidity(sharesToRemove)
      .accounts({
        market: marketPda,
        lpPosition: lpPositionPda,
        vault: vaultPda,
        providerToken: lpProviderToken,
        provider: lpProvider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([lpProvider])
      .rpc();

    const lpBalAfter = (await getAccount(provider.connection, lpProviderToken)).amount;
    const withdrawn = Number(lpBalAfter) - Number(lpBalBefore);
    console.log("  Removed shares, received:", withdrawn / ONE_USDC, "USDC");

    const lpAfter = await program.account.lpPosition.fetch(lpPositionPda);
    expect(lpAfter.lpShares.toNumber()).to.be.lessThan(lpBefore.lpShares.toNumber());
  });
});
