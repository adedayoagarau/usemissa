export type IngestionV2DatabaseRole = "local" | "staging";

/** Prevents the shadow worker from being pointed at an unlabelled/production database. */
export function assertIngestionV2DatabaseRole(value = process.env.INGESTION_V2_DATABASE_ROLE): IngestionV2DatabaseRole {
  if (value === "local" || value === "staging") return value;
  throw new Error("Ingestion v2 requires INGESTION_V2_DATABASE_ROLE=local or staging; refusing to start");
}
