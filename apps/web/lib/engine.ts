import { RadarEngine, buildServerDemoWorld } from '@missa/radar-engine';

/**
 * Shared RadarEngine for apps/web's route handlers, in-process (per the
 * architecture doc: Route Handlers call radar-engine directly, no internal
 * HTTP hop). This is DEMO-SEEDED (buildServerDemoWorld, the same fixture
 * cli.ts's `missa-radar serve --demo` uses) and in-memory -- it is not
 * production wiring. Production persistence (Postgres, via the same
 * pattern @missa/radar-adapters/src/serve.ts already establishes) is a
 * follow-up once Story 2.1's real sign-up flow needs accounts to survive
 * a restart; today's placeholder demo accounts (see credentials below)
 * exist purely so Epic 3's UI stories have real data and real logins to
 * develop and smoke-test against.
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

export function getDemoWorld(): Promise<DemoWorld> {
  if (!globalThis.__missaDemoWorldPromise) globalThis.__missaDemoWorldPromise = buildAndTick();
  return globalThis.__missaDemoWorldPromise;
}

export async function getEngine(): Promise<RadarEngine> {
  return (await getDemoWorld()).engine;
}
