import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { PerpsFactory } from "../target/types/perps_factory";

describe("perps-factory", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.perpsFactory as Program<PerpsFactory>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
