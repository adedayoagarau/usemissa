/**
 * Shared production-engine construction, extracted from serve.ts so both the
 * long-running dev/self-hosted server (serve.ts) and short-lived serverless
 * callers (apps/web's Vercel Cron route, Story 1.5) build the exact same
 * engine the exact same way -- one source of truth for "what does a
 * production RadarEngine look like", not two.
 */
import { Pool } from 'pg';
import { RadarEngine, HttpFetcher, systemClock, assembleRegistry, filterSources } from '@missa/radar-engine';
import { ensurePostgresSchema, loadStoreFromPostgres, saveStoreToPostgres } from './postgresStore.js';
import { LlmExtractor } from './llmExtractor.js';

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '').toLowerCase();
}

/**
 * Seeds the engine's sources from the built opportunity-source registry
 * (packages/radar-engine/src/registry/ -- 49 verticals, ~1,024 tier-0
 * sources). Tier 0 only: the canonical org guideline/submit pages, not
 * tier-1 directories or tier-2 outbound-link crawling (both out of scope
 * for this pass).
 *
 * Dedup-aware rather than a blunt "store is empty" gate: it compares
 * registry entries against the store's existing source URLs and adds only
 * the ones that are missing, by URL. This makes it self-healing against
 * *any* partial-seed state (a bundling bug that only seeded some sources,
 * a previous run that failed partway through, etc.) -- re-running it always
 * converges the store toward "every registry tier-0 source present exactly
 * once" without ever creating duplicates. When the store already has every
 * registry source, this is a no-op and returns null.
 *
 * Extracted as a standalone function (rather than inlined in
 * createProductionEngine) so it's unit-testable against a plain in-memory
 * RadarEngine, without a real Postgres connection.
 */
export function seedRegistryIfEmpty(engine: RadarEngine): { loaded: number } | null {
  const existingUrls = new Set(
    [...engine.store.sources.values()].map((s) => normalizeUrl(s.url)),
  );
  const registry = assembleRegistry();
  const entries = filterSources(registry, { maxTier: 0 });

  let loaded = 0;
  for (const entry of entries) {
    const key = normalizeUrl(entry.url);
    if (existingUrls.has(key)) continue;
    engine.addSource({
      name: entry.name,
      url: entry.url,
      kind: entry.kind,
      checkIntervalHours: entry.checkIntervalHours,
    });
    existingUrls.add(key);
    loaded++;
  }

  if (loaded === 0) return null;
  console.log(`[seedRegistryIfEmpty] seeded ${loaded} new tier-0 sources from the opportunity-source registry`);
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
