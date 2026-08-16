import { createIngestionV2Pool } from "./persistence.js";
import { repairApplyEnabled, runRepairTick } from "./repair.js";
import { assertIngestionV2DatabaseRole } from "./safety.js";

const apply = repairApplyEnabled();
assertIngestionV2DatabaseRole(undefined, { access: apply ? "write" : "read" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to repair quarantined opportunities");
const pool = createIngestionV2Pool();
try {
  if (!apply) console.log("[missa-ingestion-v2] dry run: reads and fetches only. Set MISSA_INGESTION_V2_REPAIR_APPLY=1 to write repaired destinations.");
  const result = await runRepairTick(pool, { apply, limit: Number(process.env.V2_REPAIR_LIMIT ?? 25) });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool.end();
}
