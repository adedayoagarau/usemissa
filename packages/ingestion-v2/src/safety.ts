export type IngestionV2DatabaseRole = "local" | "staging" | "production";

/** Prevents the shadow worker from being pointed at an unlabelled/production database. */
export function assertIngestionV2DatabaseRole(value = process.env.INGESTION_V2_DATABASE_ROLE): IngestionV2DatabaseRole {
  if (value === "local" || value === "staging") return value;
  if (value === "production" && process.env.MISSA_INGESTION_V2_PROMOTE_APPROVED === "1") return value;
  throw new Error("Ingestion v2 requires INGESTION_V2_DATABASE_ROLE=local or staging; production requires MISSA_INGESTION_V2_PROMOTE_APPROVED=1");
}
