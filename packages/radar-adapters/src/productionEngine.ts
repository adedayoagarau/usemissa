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
import {
  commitTrackerImportTransaction,
  consumeTrackerImportPreviewRateLimit,
  type DurableTrackerImportInput,
  type DurableTrackerImportResult,
} from './trackerImportPersistence.js';

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "").toLowerCase();
}

export function defaultCanonicalCheckIntervalHours(value: string | number | undefined = process.env.RADAR_DEFAULT_CHECK_INTERVAL_HOURS): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 24;
  return Math.min(24, Math.max(12, parsed));
}

function checkIntervalForEntry(entry: { tier: number; followsOutboundLinks?: boolean; checkIntervalHours: number }): number {
  return entry.tier === 0 && entry.followsOutboundLinks !== true
    ? defaultCanonicalCheckIntervalHours()
    : entry.checkIntervalHours;
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
      const adapterChanged = existing.discoveryAdapterId !== entry.discoveryAdapterId;
      existing.name = entry.name;
      existing.kind = entry.kind;
      existing.active = entry.active;
      existing.registryVerticalId = entry.verticalId;
      existing.registryGroup = registry.verticals.find((vertical) => vertical.id === entry.verticalId)?.group;
      existing.registryDisciplines = entry.disciplines ?? registry.verticals.find((vertical) => vertical.id === entry.verticalId)?.disciplines;
      existing.registryTaxonomyTermIds = entry.taxonomyTermIds;
      existing.registryTrust = entry.trust;
      existing.registryGeography = entry.geography;
      existing.registryOpportunityTypes = entry.opportunityTypes;
      existing.registryOrganizationName = entry.organizationName;
      existing.registryTier = entry.tier;
      existing.followsOutboundLinks = entry.followsOutboundLinks;
      existing.discoveryAdapterId = entry.discoveryAdapterId;
      existing.checkIntervalHours = checkIntervalForEntry(entry);
      if (adapterChanged) {
        // A different parser may discover a different graph from the same URL.
        // Force one unconditional fetch instead of accepting an old adapter's
        // validators/checkpoint as proof that the new schema has run.
        delete existing.discoveryLastCheckedAt;
        delete existing.discoveryEtag;
        delete existing.discoveryLastModified;
      }
      continue;
    }
    const added = engine.addSource({
      name: entry.name,
      url: entry.url,
      kind: entry.kind,
      checkIntervalHours: checkIntervalForEntry(entry),
      registryVerticalId: entry.verticalId,
      registryGroup: registry.verticals.find((vertical) => vertical.id === entry.verticalId)?.group,
      registryDisciplines: entry.disciplines ?? registry.verticals.find((vertical) => vertical.id === entry.verticalId)?.disciplines,
      registryTaxonomyTermIds: entry.taxonomyTermIds,
      registryTrust: entry.trust,
      registryGeography: entry.geography,
      registryOpportunityTypes: entry.opportunityTypes,
      registryOrganizationName: entry.organizationName,
      registryTier: entry.tier,
      followsOutboundLinks: entry.followsOutboundLinks,
      discoveryAdapterId: entry.discoveryAdapterId,
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
  /** Runs the CSV import under the shared Radar snapshot lock, a per-key
   * advisory lock, durable rate limiting, and one database transaction. */
  commitTrackerImport(input: Omit<DurableTrackerImportInput, 'baseStore'>): Promise<DurableTrackerImportResult>;
  consumeTrackerImportPreview(accountId: string): Promise<void>;
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

  // Keep the loaded database snapshot as the delta baseline. Registry
  // hydration below is a real state migration: new sources, corrected source
  // authority, and adapter changes must be durably written on the next tick.
  let persistedStore = cloneStore(store);
  const engine = new RadarEngine({ store, fetcher, extractor, ids: uuidIds() });
  // Hydrate registry tier metadata for every persisted source in memory. The
  // persistence baseline remains the database snapshot, so only actual
  // additions and metadata changes are written on the next persist.
  seedRegistryIfEmpty(engine, { maxTier: 3 });
  let pendingPersist = Promise.resolve();

  return {
    engine,
    pool,
    persist: () => {
      const next = pendingPersist.then(async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            snapshotVersion = await saveRadarStoreDeltaToPostgres(engine.store, persistedStore, pool, snapshotVersion);
            break;
          } catch (error) {
            if (error instanceof Error && error.name === 'SnapshotConflictError') {
              snapshotVersion = await readSnapshotVersion(pool);
              continue;
            }
            const code = (error as { code?: string }).code;
            if ((code === '40P01' || code === '40001' || code === '55P03') && attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
              continue;
            }
            throw error;
          }
        }
        persistedStore = cloneStore(engine.store);
      });
      pendingPersist = next.catch(() => undefined);
      return next;
    },
    commitTrackerImport: async (input) => {
      let output: DurableTrackerImportResult | undefined;
      const next = pendingPersist.then(async () => {
        output = await commitTrackerImportTransaction(pool, { ...input, baseStore: engine.store });
        engine.store.tracked = [...engine.store.tracked.filter((row) => row.userId !== input.userId), ...output.tracked];
        engine.store.manualTrackerEntries = [...engine.store.manualTrackerEntries.filter((row) => row.userId !== input.userId), ...output.manualTrackerEntries];
        if (output.auditEntry && !engine.store.auditLog.some((entry) => entry.id === output!.auditEntry!.id)) engine.store.auditLog.push(output.auditEntry);
        snapshotVersion = output.snapshotVersion;
        persistedStore = cloneStore(engine.store);
      });
      pendingPersist = next.catch(() => undefined);
      await next;
      return output!;
    },
    consumeTrackerImportPreview: (accountId) => consumeTrackerImportPreviewRateLimit(pool, { accountId, limit: 5, windowMs: 10 * 60_000 }),
    close: () => pool.end(),
  };
}
