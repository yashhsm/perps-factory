// Re-export the IDL from the build output
// In production, copy the IDL to this file or import from a published package
import idl from "../../../../target/idl/perps_factory.json";
export default idl;
export const PROGRAM_ID = idl.address;
