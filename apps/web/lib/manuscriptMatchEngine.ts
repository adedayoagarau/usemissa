import { Pool } from "pg";
import { ManuscriptMatchEngine } from "@missa/radar-adapters";
import { missaPostgresPoolConfig } from "@missa/radar-adapters";
import { catalogueReadDatabaseUrl } from "./catalogueDatabase";

declare global {
  var __missaManuscriptMatchEngine: ManuscriptMatchEngine | undefined;
}

export function getManuscriptMatchEngine(): ManuscriptMatchEngine {
  if (global.__missaManuscriptMatchEngine) {
    return global.__missaManuscriptMatchEngine;
  }

  // Prefer the same catalogue read connection the rest of the public site
  // uses. Reading only DATABASE_URL left the matcher without a pool in
  // environments where the catalogue URL is the configured one, so every
  // request silently fell back to the hardcoded sample publications.
  const databaseUrl = catalogueReadDatabaseUrl();
  let pool: Pool | null = null;

  if (databaseUrl) {
    pool = new Pool({
      ...missaPostgresPoolConfig(databaseUrl, "creator"),
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
