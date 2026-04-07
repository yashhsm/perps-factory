// Re-export the IDL from the build output.
// In production, copy the IDL to this file or import from a published package.
import type { Idl } from "@anchor-lang/core";

import rawIdl from "../../../../target/idl/perps_factory.json";

export type PerpsFactoryIdl = typeof rawIdl & Idl;

const idl = rawIdl as PerpsFactoryIdl;

export default idl;
export const PROGRAM_ID = idl.address;
