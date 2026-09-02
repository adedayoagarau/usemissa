import { randomUUID } from 'node:crypto';
import { WorkspaceEngine, WorkspaceConflictError, WorkspaceIdempotencyReuseError, WorkspaceNotFoundError, createProductionWorkspaceEngine, createRelationalWorkspace, relationalWorkspaceAuthorityEnabled, workspaceRequestHash, type ProductionWorkspaceEngine, type RelationalWorkspace, type WorkspaceCommandEnvelope } from '@missa/workspace-engine';

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
  var __missaWorkspaceEngine: WorkspaceEngine | undefined;
  var __missaProductionWorkspaceEnginePromise: Promise<ProductionWorkspaceEngine> | undefined;
  var __missaRelationalWorkspacePromise: Promise<RelationalWorkspace> | undefined;
}

export function getRelationalWorkspace(): Promise<RelationalWorkspace> {
  if (!relationalWorkspaceAuthorityEnabled()) throw new Error('Workspace relational authority is disabled');
  if (!globalThis.__missaRelationalWorkspacePromise) {
    globalThis.__missaRelationalWorkspacePromise = createRelationalWorkspace().catch((error) => {
      globalThis.__missaRelationalWorkspacePromise = undefined;
      throw error;
    });
  }
  return globalThis.__missaRelationalWorkspacePromise;
}

export function workspaceRelationalAuthorityEnabled(): boolean {
  return relationalWorkspaceAuthorityEnabled();
}

export function workspaceCommandEnvelope(
  request: Request,
  input: {
    actorAccountId: string;
    commandType: string;
    payload: unknown;
    organizationId?: string;
    ownerAccountId?: string;
    expectedRevision?: unknown;
  },
): WorkspaceCommandEnvelope {
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();
  if (!idempotencyKey) throw new Error('Idempotency-Key is required');
  if (idempotencyKey.length > 200) throw new Error('Idempotency-Key must be 200 characters or fewer');
  const headerRevision = request.headers.get('If-Match')?.replace(/^W\//, '').replaceAll('"', '');
  const rawRevision = input.expectedRevision ?? headerRevision;
  const expectedRevision = rawRevision === undefined ? undefined : Number(rawRevision);
  if (rawRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision! < 1 || expectedRevision! > 2_147_483_647)) throw new Error('A valid expectedRevision is required');
  return {
    actorAccountId: input.actorAccountId,
    commandType: input.commandType,
    idempotencyKey,
    requestHash: workspaceRequestHash({ commandType: input.commandType, payload: input.payload, expectedRevision }),
    correlationId: request.headers.get('X-Correlation-Id')?.trim().slice(0, 200) || randomUUID(),
    ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    ...(input.ownerAccountId ? { ownerAccountId: input.ownerAccountId } : {}),
    ...(expectedRevision !== undefined ? { expectedRevision } : {}),
  };
}

export function workspaceMutationError(error: unknown): { status: number; body: { error: string; conflict?: Record<string, unknown> } } | undefined {
  if (error instanceof WorkspaceConflictError) return {
    status: 409,
    body: { error: error.message, conflict: { resourceType: error.resourceType, resourceId: error.resourceId, expectedRevision: error.expectedRevision, currentRevision: error.currentRevision, action: 'refresh-and-retry' } },
  };
  if (error instanceof WorkspaceIdempotencyReuseError) return { status: 409, body: { error: error.message } };
  if (error instanceof WorkspaceNotFoundError) return { status: 404, body: { error: 'Workspace resource not found' } };
  if (error instanceof Error && /^(Idempotency-Key|A valid expectedRevision|A submission needs|A complete scoped command envelope)/.test(error.message)) {
    return { status: 400, body: { error: error.message } };
  }
  const databaseError = error as { code?: string; constraint?: string };
  if (databaseError.code === '23505' && databaseError.constraint === 'submissions_payment_session_idx') return { status: 409, body: { error: 'This payment session has already been used' } };
  if (databaseError.code === '23503' || databaseError.code === '23514') return { status: 400, body: { error: 'Workspace input violates a required relationship or rule' } };
  console.error('Relational Workspace mutation failed', error);
  return { status: 500, body: { error: 'Workspace mutation failed' } };
}

function getProductionWorkspaceEngine(): Promise<ProductionWorkspaceEngine> {
  if (!globalThis.__missaProductionWorkspaceEnginePromise) {
    globalThis.__missaProductionWorkspaceEnginePromise = createProductionWorkspaceEngine();
  }
  return globalThis.__missaProductionWorkspaceEnginePromise;
}

/** Explicit compatibility projection for authorization and pre-cutover pages.
 * This does not select authority and must never be used for relational writes. */
export async function getCompatibilityWorkspaceEngine(): Promise<WorkspaceEngine> {
  if (process.env.DATABASE_URL) return (await getProductionWorkspaceEngine()).engine;
  if (!globalThis.__missaWorkspaceEngine) globalThis.__missaWorkspaceEngine = new WorkspaceEngine();
  return globalThis.__missaWorkspaceEngine;
}

export async function getWorkspaceEngine(): Promise<WorkspaceEngine> {
  if (relationalWorkspaceAuthorityEnabled()) throw new Error('Compatibility WorkspaceEngine is unavailable while relational authority is enabled');
  return getCompatibilityWorkspaceEngine();
}

/**
 * Route handlers must call this after any mutating engine call, same
 * contract as lib/engine.ts's persistRadar. Workspace persistence applies
 * row-level deltas and rebases once on a stale snapshot, so independent
 * multi-instance changes merge without replacing the whole store.
 */
export async function persistWorkspace(): Promise<void> {
  if (relationalWorkspaceAuthorityEnabled()) throw new Error('persistWorkspace is invalid while relational authority is enabled');
  if (!process.env.DATABASE_URL) return;
  const { persist } = await getProductionWorkspaceEngine();
  await persist();
}
