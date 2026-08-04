/**
 * Shared production-engine construction for the Workspace domain, mirroring
 * radar-adapters/src/productionEngine.ts's pattern for the Radar domain --
 * one source of truth for "what does a production WorkspaceEngine look
 * like."
 */
import { Pool } from "pg";
import { WorkspaceEngine } from "./engine.js";
import { cloneStore } from "./store/store.js";
import { uuidWorkspaceIds } from "./ids.js";
import {
  ensurePostgresSchema,
  loadStoreFromPostgres,
  readSnapshotVersion,
  saveStoreDeltaToPostgres,
} from "./db/postgresStore.js";

export interface ProductionWorkspaceEngine {
  engine: WorkspaceEngine;
  pool: Pool;
  /** Persists the current in-memory store back to Postgres. Callers should
   * call this after every mutating engine call -- there's no autosave. */
  persist(): Promise<void>;
  close(): Promise<void>;
}

export async function createProductionWorkspaceEngine(): Promise<ProductionWorkspaceEngine> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to build a production WorkspaceEngine.",
    );
  }

  const pool = new Pool({ connectionString: databaseUrl });
  await ensurePostgresSchema(pool);
  const store = await loadStoreFromPostgres(pool);
  let snapshotVersion = await readSnapshotVersion(pool);
  let persistedStore = cloneStore(store);

  const engine = new WorkspaceEngine({ store, ids: uuidWorkspaceIds() });
  let pendingPersist = Promise.resolve();

  return {
    engine,
    pool,
    persist: () => {
      const next = pendingPersist.then(async () => {
        try {
          snapshotVersion = await saveStoreDeltaToPostgres(engine.store, persistedStore, pool, snapshotVersion);
        } catch (error) {
          // Rebase the local delta once when another instance committed first.
          // Unchanged rows are not included in the delta, so independent edits
          // merge without resurrecting rows deleted by the other instance.
          if (error instanceof Error && error.name === 'SnapshotConflictError') {
            snapshotVersion = await readSnapshotVersion(pool);
            snapshotVersion = await saveStoreDeltaToPostgres(engine.store, persistedStore, pool, snapshotVersion);
          } else {
            throw error;
          }
        }
        persistedStore = cloneStore(engine.store);
      });
      pendingPersist = next.catch(() => undefined);
      return next;
    },
    close: () => pool.end(),
  };
}
