import "server-only";

import packageJson from "../package.json";
import { GLOBAL_RNG_SEED } from "./flightConfig";

export interface PublicSimMetadata {
  simVersion: string;
  rngSeed: number;
  dataSnapshotHash: string | null;
}

function getOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

const defaultSimVersion =
  typeof packageJson.version === "string" ? packageJson.version : "0.0.0";

export const SIM_VERSION = getOptionalEnv("SIM_VERSION") ?? defaultSimVersion;
export const DATA_SNAPSHOT_HASH = getOptionalEnv("DATA_SNAPSHOT_HASH");

export function getPublicSimMetadata(): PublicSimMetadata {
  return {
    simVersion: SIM_VERSION,
    rngSeed: GLOBAL_RNG_SEED,
    dataSnapshotHash: DATA_SNAPSHOT_HASH,
  };
}
