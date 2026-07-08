import { WorkspaceEngine, createProductionWorkspaceEngine, type ProductionWorkspaceEngine } from '@missa/workspace-engine';

/**
 * Shared WorkspaceEngine for apps/web's route handlers -- same two-backing
 * pattern as lib/engine.ts (Radar side): a real Postgres-backed engine when
 * DATABASE_URL is set, an in-memory demo-scoped engine otherwise.
 *
 * Uses globalThis, not a plain module-level `let` -- see lib/engine.ts's
 * comment for why: Route Handlers and Page Server Components can get
 * separate module instances even in one `next start` process, so a plain
 * singleton silently doesn't share state across them.
 */
declare global {
  // eslint-disable-next-line no-var
  var __missaWorkspaceEngine: WorkspaceEngine | undefined;
  // eslint-disable-next-line no-var
  var __missaProductionWorkspaceEnginePromise: Promise<ProductionWorkspaceEngine> | undefined;
}

function getProductionWorkspaceEngine(): Promise<ProductionWorkspaceEngine> {
  if (!globalThis.__missaProductionWorkspaceEnginePromise) {
    globalThis.__missaProductionWorkspaceEnginePromise = createProductionWorkspaceEngine();
  }
  return globalThis.__missaProductionWorkspaceEnginePromise;
}

export async function getWorkspaceEngine(): Promise<WorkspaceEngine> {
  if (process.env.DATABASE_URL) return (await getProductionWorkspaceEngine()).engine;
  if (!globalThis.__missaWorkspaceEngine) globalThis.__missaWorkspaceEngine = new WorkspaceEngine();
  return globalThis.__missaWorkspaceEngine;
}

/**
 * Route handlers must call this after any mutating engine call, same
 * contract as lib/engine.ts's persistRadar -- see that file's comment for
 * the known whole-store-snapshot / multi-instance-race caveat, which
 * applies identically here.
 */
export async function persistWorkspace(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const { persist } = await getProductionWorkspaceEngine();
  await persist();
}
