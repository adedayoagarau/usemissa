/**
 * Shared production-engine construction, extracted from serve.ts so both the
 * long-running dev/self-hosted server (serve.ts) and short-lived serverless
 * callers (apps/web's Vercel Cron route, Story 1.5) build the exact same
 * engine the exact same way -- one source of truth for "what does a
 * production RadarEngine look like", not two.
 */
import { Pool } from 'pg';
import { RadarEngine, HttpFetcher, systemClock, loadSourcesIntoEngine } from '@missa/radar-engine';
import { ensurePostgresSchema, loadStoreFromPostgres, saveStoreToPostgres } from './postgresStore.js';
import { LlmExtractor } from './llmExtractor.js';

/**
 * Seeds the engine's sources from the built opportunity-source registry
 * (packages/radar-engine/src/registry/ -- 49 verticals, ~1,024 tier-0
 * sources) when the store has none yet. Tier 0 only: the canonical org
 * guideline/submit pages, not tier-1 directories or tier-2 outbound-link
 * crawling (both out of scope for this pass).
 *
 * Idempotent: once the store has any sources at all (e.g. a Postgres that
 * was already seeded on a previous cold start), this is a no-op and returns
 * null -- re-running it on every serverless cold start never duplicates
 * sources.
 *
 * Extracted as a standalone function (rather than inlined in
 * createProductionEngine) so it's unit-testable against a plain in-memory
 * RadarEngine, without a real Postgres connection.
 */
export function seedRegistryIfEmpty(engine: RadarEngine): { loaded: number } | null {
  if (engine.store.sources.size > 0) return null;
  const { loaded } = loadSourcesIntoEngine(engine.addSource.bind(engine), { maxTier: 0 });
  console.log(`[seedRegistryIfEmpty] seeded ${loaded} tier-0 sources from the opportunity-source registry`);
  return { loaded };
}

export interface ProductionEngine {
  engine: RadarEngine;
  pool: Pool;
  /** Persists the current in-memory store back to Postgres. Call this after
   * every tick in a short-lived (serverless) caller -- there's no long-running
   * process to rely on periodic autosave the way serve.ts's RadarServer has. */
  persist(): Promise<void>;
  /** Callers must call this when done (serverless: at the end of the request;
   * long-running: on shutdown) -- leaving pool connections open leaks them. */
  close(): Promise<void>;
}

export async function createProductionEngine(): Promise<ProductionEngine> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to build a production RadarEngine.');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  await ensurePostgresSchema(pool);
  const store = await loadStoreFromPostgres(pool);

  // Dynamic import, not a top-level static one: `playwright`'s own module-load
  // code reaches for browser-registry files (browsers.json) that don't exist
  // in a Vercel serverless bundle, and a *static* import runs that code the
  // moment this module loads -- regardless of whether MISSA_USE_PLAYWRIGHT is
  // set -- which crashed every route that calls createProductionEngine, not
  // just the opt-in Playwright path. A dynamic import only pays that cost
  // when the flag is actually on.
  const fetcher =
    process.env.MISSA_USE_PLAYWRIGHT === '1'
      ? new (await import('./playwrightFetcher.js')).PlaywrightFetcher()
      : new HttpFetcher();
  const extractor = process.env.ANTHROPIC_API_KEY ? new LlmExtractor(systemClock) : undefined;

  const engine = new RadarEngine({ store, fetcher, extractor });
  seedRegistryIfEmpty(engine);

  return {
    engine,
    pool,
    persist: () => saveStoreToPostgres(engine.store, pool),
    close: () => pool.end(),
  };
}
