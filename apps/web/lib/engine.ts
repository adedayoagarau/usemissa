import { RadarEngine, buildServerDemoWorld } from '@missa/radar-engine';
import { createProductionEngine, type ProductionEngine } from '@missa/radar-adapters';

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
  // eslint-disable-next-line no-var
  var __missaDemoWorldPromise: Promise<DemoWorld> | undefined;
  // eslint-disable-next-line no-var
  var __missaProductionEnginePromise: Promise<ProductionEngine> | undefined;
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
 * KNOWN LIMITATION: persist() is a whole-store delete+reinsert (see
 * radar-adapters/src/postgresStore.ts) and multiple warm serverless
 * instances each hold their own in-memory copy loaded at cold start -- two
 * instances persisting concurrently can race and the later write wins,
 * clobbering the other's change. Acceptable for current traffic levels; a
 * real fix (per-entity upserts, or moving off whole-store snapshotting) is
 * follow-up work, not blocking this wiring.
 */
export async function persistRadar(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const { persist } = await getProductionEngine();
  await persist();
}
