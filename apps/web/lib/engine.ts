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

let worldPromise: Promise<DemoWorld> | undefined;

async function buildAndTick(): Promise<DemoWorld> {
  const world = buildServerDemoWorld();
  // Populate opportunities/status/alerts from the seed sources, same as
  // cli.ts's serve --demo path does before the server starts accepting requests.
  await world.engine.tick();
  return world;
}

export function getDemoWorld(): Promise<DemoWorld> {
  if (!worldPromise) worldPromise = buildAndTick();
  return worldPromise;
}

export async function getEngine(): Promise<RadarEngine> {
  return (await getDemoWorld()).engine;
}
