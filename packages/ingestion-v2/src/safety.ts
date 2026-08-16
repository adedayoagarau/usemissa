export type IngestionV2DatabaseRole = "local" | "staging" | "production";

/** Reading production is safe; writing to it is the thing that needs a second key. */
export type IngestionV2Access = "read" | "write";

export interface IngestionV2RoleOptions {
  access?: IngestionV2Access;
  env?: NodeJS.ProcessEnv;
}

/**
 * Prevents ingestion v2 from being pointed at an unlabelled or production
 * database by accident.
 *
 * Access is separated from the label deliberately. Conflating them meant a
 * read-only inspection of production required the same flag that makes the
 * worker promote every source — so the safe operation and the dangerous one
 * shared a switch, and the only way to look was to arm the writer.
 */
export function assertIngestionV2DatabaseRole(
  value = process.env.INGESTION_V2_DATABASE_ROLE,
  options: IngestionV2RoleOptions = {},
): IngestionV2DatabaseRole {
  const env = options.env ?? process.env;
  const access = options.access ?? "write";
  if (value === "local" || value === "staging") return value;
  if (value === "production") {
    if (access === "read") return value;
    if (env.MISSA_INGESTION_V2_PROMOTE_APPROVED === "1") return value;
    throw new Error(
      "Ingestion v2 will not write to a production database without MISSA_INGESTION_V2_PROMOTE_APPROVED=1. Read-only commands run against production with INGESTION_V2_DATABASE_ROLE=production alone.",
    );
  }
  throw new Error(
    `Ingestion v2 needs INGESTION_V2_DATABASE_ROLE set to local, staging, or production (received ${value === undefined ? "nothing" : `"${value}"`}). Writing to production additionally requires MISSA_INGESTION_V2_PROMOTE_APPROVED=1.`,
  );
}
