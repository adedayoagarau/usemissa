import { createIngestionV2Pool } from "./persistence.js";
import { publicationApplyEnabled, runPublicationTick } from "./publication.js";
import { assertIngestionV2DatabaseRole } from "./safety.js";

assertIngestionV2DatabaseRole();
const pool = createIngestionV2Pool();
try {
  const apply = publicationApplyEnabled();
  if (!apply) console.log("[missa-ingestion-v2] dry run: set MISSA_INGESTION_V2_PUBLISH=1 to apply publication decisions");
  const result = await runPublicationTick(pool, { apply, limit: Number(process.env.V2_PUBLISH_LIMIT ?? 50) });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool.end();
}
