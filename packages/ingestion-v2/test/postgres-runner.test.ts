import test from "node:test";
import assert from "node:assert/strict";
import {
  AdapterRegistry,
  FIRST_TRANCHE_SOURCE_MANIFEST,
  GenericHtmlAdapter,
  MemoryShadowRunStore,
  UNCHANGED_ROOT_WARNING,
  adaptiveCadenceHours,
  assertIngestionV2DatabaseRole,
  createFirstTrancheSources,
  createIngestionCatalog,
  createWorkerSources,
  executeShadowPipeline,
  readIngestionV2SourceRefreshHistory,
  runDuePostgresShadowBatch,
  shadowJob,
  validateSourceManifest,
} from "../src/index.js";

test("runs only the bounded first tranche by default and keeps publication authority closed", () => {
  assert.deepEqual(validateSourceManifest(), []);
  assert.equal(FIRST_TRANCHE_SOURCE_MANIFEST.length, 12);
  const sources = createFirstTrancheSources();
  assert.equal(sources.length, 11);
  assert.deepEqual(
    createWorkerSources().map((source) => source.id),
    sources.map((source) => source.id),
  );
  assert.ok(sources.length < createIngestionCatalog().length);
  assert.ok(
    sources.every(
      (source) =>
        (source.config.sourceManifest as { publicationAuthority: string })
          .publicationAuthority === "none",
    ),
  );
  assert.equal(
    sources.find((source) => source.name.startsWith("Grants.gov"))?.adapterId,
    "json-api-v2",
  );
});

test("adapts cadence from changes, deadlines, and durable failure streaks", () => {
  const policy = FIRST_TRANCHE_SOURCE_MANIFEST[0]!.refresh;
  assert.equal(
    adaptiveCadenceHours(policy, {
      changed: true,
      consecutiveUnchangedRuns: 0,
      consecutiveFailures: 0,
    }),
    24,
  );
  assert.equal(
    adaptiveCadenceHours(policy, {
      changed: false,
      consecutiveUnchangedRuns: 0,
      consecutiveFailures: 1,
    }),
    6,
  );
  assert.equal(
    adaptiveCadenceHours(policy, {
      changed: false,
      consecutiveUnchangedRuns: 7,
      consecutiveFailures: 0,
    }),
    48,
  );
  assert.equal(
    adaptiveCadenceHours(policy, {
      changed: false,
      consecutiveUnchangedRuns: 0,
      consecutiveFailures: 0,
      hoursUntilDeadline: 48,
    }),
    6,
  );
  assert.equal(
    adaptiveCadenceHours(policy, {
      changed: false,
      consecutiveUnchangedRuns: 0,
      consecutiveFailures: 3,
    }),
    168,
  );
});

test("allows production shadow storage only through its separate explicit gate", () => {
  assert.equal(
    assertIngestionV2DatabaseRole("production", {
      productionShadowApproved: true,
      productionPromotionApproved: false,
    }),
    "production",
  );
  assert.throws(
    () =>
      assertIngestionV2DatabaseRole("production", {
        productionShadowApproved: false,
        productionPromotionApproved: false,
      }),
    /production shadow storage/,
  );
});

test("derives failure and unchanged streaks from Postgres run history", async () => {
  const unchangedPool = {
    query: async () => ({
      rows: [
        { status: "completed", warnings: [UNCHANGED_ROOT_WARNING] },
        { status: "completed", warnings: [UNCHANGED_ROOT_WARNING] },
        { status: "completed", warnings: [] },
      ],
    }),
  };
  assert.deepEqual(
    await readIngestionV2SourceRefreshHistory(unchangedPool as never, "source"),
    { consecutiveUnchangedRuns: 2, consecutiveFailures: 0 },
  );

  const failedPool = {
    query: async () => ({
      rows: [
        { status: "failed", warnings: [] },
        { status: "failed", warnings: [] },
        { status: "failed", warnings: [] },
        { status: "completed", warnings: [] },
      ],
    }),
  };
  assert.deepEqual(
    await readIngestionV2SourceRefreshHistory(failedPool as never, "source"),
    { consecutiveUnchangedRuns: 0, consecutiveFailures: 3 },
  );
});

test("runs due sources directly from Postgres schedules in shadow mode", async () => {
  const base = createFirstTrancheSources()[0]!;
  const source = {
    ...base,
    adapterId: "fixture-v2",
    url: "https://example.test/source",
  };
  const registry = new AdapterRegistry().register({
    id: "fixture-v2",
    canHandle: (candidate) => candidate.adapterId === "fixture-v2",
    fetch: async ({ run, source: candidate }) => ({
      id: "snap_postgres_runner",
      runId: run.id,
      sourceId: candidate.id,
      url: candidate.url,
      finalUrl: candidate.url,
      fetchedAt: run.createdAt,
      statusCode: 200,
      contentType: "text/html",
      contentHash: "changed",
      html: "<h1>Example opportunity</h1>",
      rendered: false,
    }),
    extract: async ({ snapshot }) => ({
      fields: [
        {
          fieldName: "title",
          rawValue: "Example opportunity",
          normalizedValue: "Example opportunity",
          confidence: 1,
          provenance: {
            adapterId: "fixture-v2",
            method: "fixture",
            sourceUrl: source.url,
            snapshotId: snapshot!.id,
          },
        },
      ],
      candidateLinks: [],
      warnings: [],
    }),
  });
  const store = new MemoryShadowRunStore();
  const rescheduled: Array<[string, number]> = [];
  const result = await runDuePostgresShadowBatch({
    registry,
    sources: [source],
    runStore: store,
    scheduleStore: {
      claimDue: async () => [source.id],
      readRefreshHistory: async () => ({
        consecutiveUnchangedRuns: 0,
        consecutiveFailures: 0,
      }),
      reschedule: async (sourceId, hours) => {
        rescheduled.push([sourceId, hours]);
      },
    },
    logger: { info: () => undefined, warn: () => undefined },
  });

  assert.equal(result.claimed, 1);
  assert.equal(result.completed, 1);
  assert.equal(result.failed, 0);
  assert.equal(store.values()[0]?.published, false);
  assert.deepEqual(rescheduled, [[source.id, 24]]);
});

test("contains direct-run failures and cools a repeatedly failing source", async () => {
  const base = createFirstTrancheSources()[0]!;
  const source = { ...base, adapterId: "failing-v2" };
  const registry = new AdapterRegistry().register({
    id: "failing-v2",
    canHandle: () => true,
    fetch: async () => {
      throw new Error("fixture source unavailable");
    },
    extract: async () => ({ fields: [], candidateLinks: [], warnings: [] }),
  });
  const rescheduled: number[] = [];
  const result = await runDuePostgresShadowBatch({
    registry,
    sources: [source],
    runStore: new MemoryShadowRunStore(),
    scheduleStore: {
      claimDue: async () => [source.id],
      readRefreshHistory: async () => ({
        consecutiveUnchangedRuns: 0,
        consecutiveFailures: 3,
      }),
      reschedule: async (_sourceId, hours) => {
        rescheduled.push(hours);
      },
    },
    logger: { info: () => undefined, warn: () => undefined },
  });

  assert.equal(result.failed, 1);
  assert.match(result.runs[0]?.error ?? "", /fixture source unavailable/);
  assert.deepEqual(rescheduled, [168]);
});

test("stops after an unchanged root without refetching child destinations", async () => {
  const source = {
    ...createFirstTrancheSources()[0]!,
    url: "https://example.test/grants",
    adapterId: "generic-html-v2",
    config: {
      destination: {
        pageRole: "landing" as const,
        detailLimit: 2,
        rules: [
          {
            role: "detail" as const,
            patterns: ["/detail/"],
            authority: "destination" as const,
          },
        ],
      },
    },
  };
  const registry = new AdapterRegistry().register(new GenericHtmlAdapter());
  const store = new MemoryShadowRunStore();
  const fetched: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    const url = String(input);
    fetched.push(url);
    if (url.endsWith("/robots.txt"))
      return new Response("User-agent: *\nAllow: /", { status: 200 });
    if (url.endsWith("/grants"))
      return new Response(
        '<h1>Directory</h1><a href="/detail/example">Example</a>',
        { status: 200, headers: { "content-type": "text/html" } },
      );
    return new Response("<h1>Example</h1>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  }) as typeof fetch;
  try {
    const first = await executeShadowPipeline(
      registry,
      source,
      shadowJob(source, { runId: "ingv2_delta_first" }),
      store,
    );
    const second = await executeShadowPipeline(
      registry,
      source,
      shadowJob(source, { runId: "ingv2_delta_second" }),
      store,
    );
    assert.equal(first.relatedSnapshots?.length, 1);
    assert.equal(second.unchanged, true);
    assert.equal(second.relatedSnapshots?.length, 0);
    assert.equal(
      fetched.filter((url) => url.includes("/detail/example")).length,
      1,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
