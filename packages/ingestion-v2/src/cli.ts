import { createIngestionV2Pool, ensureIngestionV2Schema } from "./persistence.js";
import { assertIngestionV2DatabaseRole } from "./safety.js";

assertIngestionV2DatabaseRole();
const pool = createIngestionV2Pool();
try {
  await ensureIngestionV2Schema(pool);
  console.log("missa-ingestion-v2 schema ensured");
} finally {
  await pool.end();
}
