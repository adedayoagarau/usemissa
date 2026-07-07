import { WorkspaceEngine } from '@missa/workspace-engine';

/**
 * Shared WorkspaceEngine for apps/web's route handlers -- same in-memory,
 * demo-scoped placeholder pattern as lib/engine.ts (Radar side). Real
 * persistence is a follow-up (see packages/workspace-engine/src/db/schema.ts's
 * note: schema exists, no live Postgres client wired yet).
 *
 * Uses globalThis, not a plain module-level `let` -- see lib/engine.ts's
 * comment for why: Route Handlers and Page Server Components can get
 * separate module instances even in one `next start` process, so a plain
 * singleton silently doesn't share state across them.
 */
declare global {
  // eslint-disable-next-line no-var
  var __missaWorkspaceEngine: WorkspaceEngine | undefined;
}

export function getWorkspaceEngine(): WorkspaceEngine {
  if (!globalThis.__missaWorkspaceEngine) globalThis.__missaWorkspaceEngine = new WorkspaceEngine();
  return globalThis.__missaWorkspaceEngine;
}
