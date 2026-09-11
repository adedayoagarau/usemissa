export type IngestionV2DatabaseRole = "local" | "staging" | "production";

export interface IngestionV2DatabaseRoleOptions {
  productionShadowApproved?: boolean;
  productionPromotionApproved?: boolean;
}

/** Prevents a worker from being pointed at an unlabelled production database. */
export function assertIngestionV2DatabaseRole(
  value = process.env.INGESTION_V2_DATABASE_ROLE,
  options: IngestionV2DatabaseRoleOptions = {},
): IngestionV2DatabaseRole {
  if (value === "local" || value === "staging") return value;
  const productionShadowApproved =
    options.productionShadowApproved ??
    process.env.MISSA_INGESTION_V2_PRODUCTION_SHADOW_APPROVED === "1";
  const productionPromotionApproved =
    options.productionPromotionApproved ??
    process.env.MISSA_INGESTION_V2_PROMOTE_APPROVED === "1";
  if (
    value === "production" &&
    (productionShadowApproved || productionPromotionApproved)
  )
    return value;
  throw new Error(
    "Ingestion v2 requires INGESTION_V2_DATABASE_ROLE=local or staging; production shadow storage requires MISSA_INGESTION_V2_PRODUCTION_SHADOW_APPROVED=1",
  );
}
