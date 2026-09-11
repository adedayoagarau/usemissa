import { Pool } from "pg";
import { ManuscriptMatchEngine } from "@missa/radar-adapters";

declare global {
  var __missaManuscriptMatchEngine: ManuscriptMatchEngine | undefined;
}

export function getManuscriptMatchEngine(): ManuscriptMatchEngine {
  if (global.__missaManuscriptMatchEngine) {
    return global.__missaManuscriptMatchEngine;
  }

  const databaseUrl = process.env.DATABASE_URL;
  let pool: Pool | null = null;

  if (databaseUrl) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost")
        ? undefined
        : { rejectUnauthorized: false },
      max: 5,
    });
  }

  const engine = new ManuscriptMatchEngine(pool);
  global.__missaManuscriptMatchEngine = engine;
  return engine;
}
