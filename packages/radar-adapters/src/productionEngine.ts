/**
 * Shared production-engine construction, extracted from serve.ts so both the
 * long-running dev/self-hosted server (serve.ts) and short-lived serverless
 * callers (apps/web's Vercel Cron route, Story 1.5) build the exact same
 * engine the exact same way -- one source of truth for "what does a
 * production RadarEngine look like", not two.
 */
import { Pool } from "pg";
import {
  RadarEngine,
  HttpFetcher,
  systemClock,
  assembleRegistry,
  filterSources,
  cloneStore,
} from "@missa/radar-engine";
import {
  ensurePostgresSchema,
  loadStoreFromPostgres,
  readSnapshotVersion,
  saveRadarStoreDeltaToPostgres,
} from "./postgresStore.js";
import { LlmExtractor } from "./llmExtractor.js";
import { uuidIds } from "./uuidIds.js";

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "").toLowerCase();
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
export function seedRegistryIfEmpty(
  engine: RadarEngine,
  options: { maxTier?: 0 | 1 | 2 | 3 } = { maxTier: 0 },
): { loaded: number } | null {
  const existingByUrl = new Map(
    [...engine.store.sources.values()].map((source) => [normalizeUrl(source.url), source] as const),
  );
  const registry = assembleRegistry();
  const entries = filterSources(registry, options);

  let loaded = 0;
  for (const entry of entries) {
    const key = normalizeUrl(entry.url);
    const existing = existingByUrl.get(key);
    if (existing) {
      existing.registryVerticalId = entry.verticalId;
      existing.registryGroup = registry.verticals.find((vertical) => vertical.id === entry.verticalId)?.group;
      existing.registryDisciplines = entry.disciplines ?? registry.verticals.find((vertical) => vertical.id === entry.verticalId)?.disciplines;
      existing.registryGeography = entry.geography;
      existing.registryOpportunityTypes = entry.opportunityTypes;
      existing.registryOrganizationName = entry.organizationName;
      existing.registryTier = entry.tier;
      existing.followsOutboundLinks = entry.followsOutboundLinks;
      continue;
    }
    const added = engine.addSource({
      name: entry.name,
      url: entry.url,
      kind: entry.kind,
      checkIntervalHours: entry.checkIntervalHours,
      registryVerticalId: entry.verticalId,
      registryGroup: registry.verticals.find((vertical) => vertical.id === entry.verticalId)?.group,
      registryDisciplines: entry.disciplines ?? registry.verticals.find((vertical) => vertical.id === entry.verticalId)?.disciplines,
      registryGeography: entry.geography,
      registryOpportunityTypes: entry.opportunityTypes,
      registryOrganizationName: entry.organizationName,
      registryTier: entry.tier,
      followsOutboundLinks: entry.followsOutboundLinks,
    });
    existingByUrl.set(key, added);
    loaded++;
  }

  if (loaded === 0) return null;
  console.log(
    `[seedRegistryIfEmpty] seeded ${loaded} new sources (maxTier=${options.maxTier ?? 'all'}) from the opportunity-source registry`,
  );
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
    throw new Error(
      "DATABASE_URL is required to build a production RadarEngine.",
    );
  }

  const pool = new Pool({ connectionString: databaseUrl });
  await ensurePostgresSchema(pool);
  const store = await loadStoreFromPostgres(pool);
  let snapshotVersion = await readSnapshotVersion(pool);
  let persistedStore = cloneStore(store);

  // Dynamic import, not a top-level static one: `playwright`'s own module-load
  // code reaches for browser-registry files (browsers.json) that don't exist
  // in a Vercel serverless bundle, and a *static* import runs that code the
  // moment this module loads -- regardless of whether MISSA_USE_PLAYWRIGHT is
  // set -- which crashed every route that calls createProductionEngine, not
  // just the opt-in Playwright path. A dynamic import only pays that cost
  // when the flag is actually on.
  const fetcher =
    process.env.MISSA_USE_PLAYWRIGHT === "1"
      ? new (await import("./playwrightFetcher.js")).PlaywrightFetcher()
      : new HttpFetcher();
  const extractor = process.env.ANTHROPIC_API_KEY
    ? new LlmExtractor(systemClock)
    : undefined;

  const engine = new RadarEngine({ store, fetcher, extractor, ids: uuidIds() });
  // Hydrate registry tier metadata for every persisted source in memory. The
  // clone used for delta persistence is taken after this call, so this does
  // not rewrite the full registry; it simply lets worker tier fences operate
  // correctly on snapshots created before registryTier was added.
  seedRegistryIfEmpty(engine, { maxTier: 3 });
  let pendingPersist = Promise.resolve();

  return {
    engine,
    pool,
    persist: () => {
      const next = pendingPersist.then(async () => {
        try {
          snapshotVersion = await saveRadarStoreDeltaToPostgres(engine.store, persistedStore, pool, snapshotVersion);
        } catch (error) {
          if (error instanceof Error && error.name === 'SnapshotConflictError') {
            snapshotVersion = await readSnapshotVersion(pool);
            snapshotVersion = await saveRadarStoreDeltaToPostgres(engine.store, persistedStore, pool, snapshotVersion);
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
