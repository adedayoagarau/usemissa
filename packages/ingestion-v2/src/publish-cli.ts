import { createIngestionV2Pool } from "./persistence.js";
import { publicationApplyEnabled, runPublicationTick } from "./publication.js";
import { assertIngestionV2DatabaseRole } from "./safety.js";

const apply = publicationApplyEnabled();
assertIngestionV2DatabaseRole(undefined, { access: apply ? "write" : "read" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to evaluate publication decisions");
const pool = createIngestionV2Pool();
try {
  if (!apply) console.log("[missa-ingestion-v2] dry run: reads only. Set MISSA_INGESTION_V2_PUBLISH=1 to apply decisions.");
  const result = await runPublicationTick(pool, { apply, limit: Number(process.env.V2_PUBLISH_LIMIT ?? 50) });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool.end();
}
