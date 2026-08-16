import "server-only";

import { Pool } from "pg";
import { PostgresAccountDeletionQueue } from "@missa/radar-adapters";

declare global {
  var __missaAccountDeletionPool: Pool | undefined;
}

export function getAccountDeletionQueue():
  PostgresAccountDeletionQueue | undefined {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return undefined;
  if (!globalThis.__missaAccountDeletionPool)
    globalThis.__missaAccountDeletionPool = new Pool({
      connectionString,
      max: 2,
      connectionTimeoutMillis: 5_000,
    });
  return new PostgresAccountDeletionQueue(
    globalThis.__missaAccountDeletionPool,
  );
}
