import {
  RadarEngine,
  buildServerDemoWorld,
  cloneStore,
  planTrackerImport,
  type ImportMapping,
  type ImportRowDecision,
  type ParsedTrackerCsv,
  type TrackerImportResult,
} from '@missa/radar-engine';
import {
  createProductionEngine,
  creatorRelationalAuthorityHealth,
  trackerImportCandidateHash,
  trackerImportStateHash,
  TrackerImportPersistenceError,
  type ProductionEngine,
} from '@missa/radar-adapters';

/**
 * Shared RadarEngine for apps/web's route handlers, in-process (per the
 * architecture doc: Route Handlers call radar-engine directly, no internal
 * HTTP hop).
 *
 * Two backings, chosen by DATABASE_URL's presence:
 *  - Set (production/preview, once Neon is connected): a real Postgres-backed
 *    engine via @missa/radar-adapters' createProductionEngine -- the same
 *    construction the Cron route (api/cron/tick) already uses, but kept warm
 *    across requests here instead of connect-tick-persist-close per call.
 *  - Unset (local dev without a DB): the DEMO-SEEDED, in-memory world
 *    (buildServerDemoWorld) -- intentionally ephemeral, exists so the UI has
 *    real data and real logins to develop against without needing Postgres
 *    running locally.
 */
type DemoWorld = ReturnType<typeof buildServerDemoWorld>;

/**
 * A plain module-level `let` singleton does NOT reliably share state across
 * different Next.js routes -- Route Handlers and Page Server Components are
 * bundled into separate chunks (per-route code splitting), each of which can
 * get its own copy of an imported module even within a single `next start`
 * process. Confirmed by smoke-testing this exact bug: a track() via
 * /api/users/:id/track wasn't visible from the /tracker *page* (Server
 * Component) even though it WAS visible from the /api/.../tracker *route*
 * (Route Handler) in the same running process. globalThis is the standard
 * fix -- it's a true process-wide object, unaffected by module duplication.
 */
declare global {
  var __missaDemoWorldPromise: Promise<DemoWorld> | undefined;
  var __missaProductionEnginePromise: Promise<ProductionEngine> | undefined;
}

const demoPreviewRequests = new Map<string, number[]>();
const demoCommitRequests = new Map<string, number[]>();
const demoImportReceipts = new Map<string, { requestHash: string; result: TrackerImportResult }>();

function consumeDemoLimit(store: Map<string, number[]>, key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const recent = (store.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - recent[0]!)) / 1000));
    throw new TrackerImportPersistenceError('Too many import requests. Try again later.', 'rate-limit', retryAfter);
  }
  store.set(key, [...recent, now]);
}

async function buildAndTick(): Promise<DemoWorld> {
  const world = buildServerDemoWorld();
  // Populate opportunities/status/alerts from the seed sources, same as
  // cli.ts's serve --demo path does before the server starts accepting requests.
  await world.engine.tick();

  // Same seeding cli.ts's `serve --demo` does: give the North River rep
  // account a real, approved org membership (domain-match auto-approves) so
  // Epic 6's Workspace pages have something to log into and test against --
  // requestClaim only grants membership on approval, so without this step
  // every demo account's `memberships` array would be empty.
  const magazine = [...world.engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('North River'));
  if (magazine) {
    world.engine.requestClaim(magazine.id, world.organizationIds.northRiver, world.credentials.northRiverRep.accountId);
  }

  return world;
}

function getDemoWorld(): Promise<DemoWorld> {
  if (!globalThis.__missaDemoWorldPromise) globalThis.__missaDemoWorldPromise = buildAndTick();
  return globalThis.__missaDemoWorldPromise;
}

/** Kept warm for the lifetime of the process (globalThis, same reasoning as
 * getDemoWorld) -- unlike the Cron route, request-serving routes shouldn't
 * open and close a Pool on every call. */
function getProductionEngine(): Promise<ProductionEngine> {
  if (!globalThis.__missaProductionEnginePromise) {
    globalThis.__missaProductionEnginePromise = createProductionEngine();
  }
  return globalThis.__missaProductionEnginePromise;
}

export async function getEngine(): Promise<RadarEngine> {
  const creatorAuthority = creatorRelationalAuthorityHealth(process.env);
  if (creatorAuthority.mode === 'relational' && !creatorAuthority.ready) {
    throw new Error('Creator relational authority is unavailable');
  }
  if (process.env.DATABASE_URL) return (await getProductionEngine()).engine;
  return (await getDemoWorld()).engine;
}

/**
 * Route handlers must call this after any mutating engine call (signUp,
 * trackOpportunity, followOrganization, grantOrgMembership, direct store
 * writes, etc.) so the change survives a cold start or is visible to another
 * warm instance. No-op in demo mode (no DATABASE_URL) since that store is
 * intentionally in-memory only.
 *
 * Radar persistence applies row-level deltas and rebases once on a stale
 * snapshot, so independent warm instances merge their changes without
 * silently replacing the whole store.
 */
export async function persistRadar(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const { persist } = await getProductionEngine();
  await persist();
}

export async function consumeTrackerImportPreview(accountId: string): Promise<void> {
  if (process.env.DATABASE_URL) {
    await (await getProductionEngine()).consumeTrackerImportPreview(accountId);
    return;
  }
  consumeDemoLimit(demoPreviewRequests, accountId, 5, 10 * 60_000);
}

export async function commitTrackerImportWithReceipt(input: {
  accountId: string;
  userId: string;
  idempotencyKey: string;
  requestHash: string;
  sourceHash: string;
  expectedCandidateHash: string;
  expectedTrackerHash: string;
  parsed: ParsedTrackerCsv;
  mapping: ImportMapping;
  decisions: Record<string, ImportRowDecision>;
}): Promise<{ result: TrackerImportResult; idempotent: boolean }> {
  if (process.env.DATABASE_URL) {
    const committed = await (await getProductionEngine()).commitTrackerImport(input);
    return { result: committed.result, idempotent: committed.idempotent };
  }

  const receiptKey = `${input.accountId}:${input.idempotencyKey}`;
  const existing = demoImportReceipts.get(receiptKey);
  if (existing) {
    if (existing.requestHash !== input.requestHash) throw new TrackerImportPersistenceError('This confirmation key belongs to a different import.', 'idempotency-conflict');
    return { result: existing.result, idempotent: true };
  }
  consumeDemoLimit(demoCommitRequests, input.accountId, 3, 10 * 60_000);
  const engine = await getEngine();
  if (trackerImportStateHash(engine.store, input.userId) !== input.expectedTrackerHash) throw new TrackerImportPersistenceError('Your Tracker changed after this preview. Prepare a new preview.', 'conflict');
  const plan = planTrackerImport(engine.store, input.userId, input.parsed, input.mapping);
  if (trackerImportCandidateHash(plan.candidateSet) !== input.expectedCandidateHash) throw new TrackerImportPersistenceError('Opportunity matches changed after this preview. Prepare a new preview.', 'conflict');
  const before = cloneStore(engine.store);
  try {
    const result = engine.commitTrackerImport(input.userId, plan, input.decisions, new Date(), input.sourceHash);
    if (result.needsReview > 0) throw new TrackerImportPersistenceError('Resolve every row issue before importing.', 'review');
    engine.recordAudit(input.accountId, 'tracker.imported', 'user_profile', input.userId, JSON.stringify({ importId: result.importId, sourceKind: 'csv', imported: result.imported, matched: result.matched, createdManual: result.createdManual, skipped: result.skipped, unresolvedTaxonomy: result.unresolvedTaxonomy, idempotencyKey: input.idempotencyKey }));
    demoImportReceipts.set(receiptKey, { requestHash: input.requestHash, result });
    return { result, idempotent: false };
  } catch (error) {
    engine.store.tracked = before.tracked;
    engine.store.manualTrackerEntries = before.manualTrackerEntries;
    engine.store.auditLog = before.auditLog;
    throw error;
  }
}
