import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pool, QueryResult } from "pg";
import Anthropic from "@anthropic-ai/sdk";
import {
  ManualClock,
  createStore,
  RadarEngine,
  FixtureFetcher,
  assembleRegistry,
  filterSources,
  type Source,
} from "@missa/radar-engine";
import { parseDisallowForUserAgent } from "../src/playwrightFetcher.js";
import { parseCrawlDelayForUserAgent } from "../src/sourcePolicy.js";
import { LlmExtractor } from "../src/llmExtractor.js";
import {
  loadStoreFromPostgres,
  saveStoreToPostgres,
} from "../src/postgresStore.js";
import { seedRegistryIfEmpty } from "../src/productionEngine.js";
import { uuidIds } from "../src/uuidIds.js";

test("production Radar IDs are prefixed UUIDs", () => {
  assert.match(uuidIds().next("source"), /^source_[0-9a-f-]{36}$/);
});

test("robots.txt parser: picks the specific user-agent group over the wildcard", () => {
  const robots = `
User-agent: *
Disallow: /private

User-agent: MissaRadar
Disallow: /no-crawl
Disallow: /also-blocked
`;
  assert.deepEqual(parseDisallowForUserAgent(robots, "MissaRadar/0.1"), [
    "/no-crawl",
    "/also-blocked",
  ]);
});

test("robots.txt parser: falls back to the wildcard group when no specific match", () => {
  const robots = `User-agent: *\nDisallow: /admin\n`;
  assert.deepEqual(parseDisallowForUserAgent(robots, "MissaRadar/0.1"), [
    "/admin",
  ]);
});

test("robots.txt parser: no rules means nothing disallowed", () => {
  assert.deepEqual(parseDisallowForUserAgent("", "MissaRadar/0.1"), []);
});

test("robots.txt parser returns the selected group's crawl delay", () => {
  const robots = `
    User-agent: *
    Crawl-delay: 2

    User-agent: MissaRadar
    Crawl-delay: 10
  `;
  assert.equal(parseCrawlDelayForUserAgent(robots, "MissaRadar/1.0"), 10);
  assert.equal(parseCrawlDelayForUserAgent(robots, "OtherBot/1.0"), 2);
});

function fakeAnthropicClient(toolInput: Record<string, unknown>): Anthropic {
  return {
    messages: {
      create: async () => ({
        content: [
          {
            type: "tool_use",
            id: "toolu_1",
            name: "record_opportunity_fields",
            input: toolInput,
          },
        ],
      }),
    },
  } as unknown as Anthropic;
}

function failingAnthropicClient(status = 503): Anthropic {
  return {
    messages: {
      create: async () => {
        throw Object.assign(new Error("provider unavailable"), { status });
      },
    },
  } as unknown as Anthropic;
}

test("LlmExtractor: maps model output into a validated OpportunityCandidate", async () => {
  const clock = new ManualClock(new Date("2026-07-07T00:00:00Z"));
  const client = fakeAnthropicClient({
    title: "Lantern City Film Festival",
    organizationName: "Lantern City Film Festival",
    type: "festival",
    genres: ["documentary"],
    deadlineDate: "2026-09-30",
    feeDisclosed: true,
    feeAmountCents: 4000,
    eligibility: [],
    requiredMaterials: ["work sample"],
    submissionUrl: "https://lanterncityfest.com/apply",
    contactEmailPresent: true,
  });
  const extractor = new LlmExtractor(clock, { client, apiKey: "unused" });
  const source: Source = {
    id: "src_1",
    name: "Lantern City Film Festival",
    url: "https://lanterncityfest.com/entries",
    kind: "organization-website",
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
  };
  const candidate = await extractor.extract(source, {
    id: "snap_1",
    sourceId: "src_1",
    url: source.url,
    fetchedAt: clock.now().toISOString(),
    status: "ok",
    contentHash: "h",
    content:
      "Call for entries: documentary and short film. Submissions close September 30, 2026.",
  });

  assert.equal(candidate.title, "Lantern City Film Festival");
  assert.equal(candidate.type, "festival");
  assert.equal(candidate.deadline.kind, "exact");
  assert.equal(candidate.deadline.date, "2026-09-30");
  assert.equal(candidate.fee.amountCents, 4000);
  assert.ok(
    candidate.extractionConfidence > 0,
    "validateCandidate should have scored it",
  );
  assert.deepEqual(candidate.issues, []);
});

test("LlmExtractor: an implausible model-supplied deadline is discarded by the shared validator", async () => {
  const clock = new ManualClock(new Date("2026-07-07T00:00:00Z"));
  const client = fakeAnthropicClient({
    title: "Some Call",
    type: "open-call",
    genres: [],
    eligibility: [],
    requiredMaterials: [],
    contactEmailPresent: false,
    deadlineDate: "1999-01-01",
  });
  const extractor = new LlmExtractor(clock, { client, apiKey: "unused" });
  const source: Source = {
    id: "src_2",
    name: "Some Call",
    url: "https://example.com/call",
    kind: "directory",
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
  };
  const candidate = await extractor.extract(source, {
    id: "snap_2",
    sourceId: "src_2",
    url: source.url,
    fetchedAt: clock.now().toISOString(),
    status: "ok",
    contentHash: "h",
    content: "irrelevant",
  });
  assert.equal(candidate.deadline.date, undefined);
});

test("LlmExtractor: taxonomy IDs are bounded to the supplied candidate set", async () => {
  const clock = new ManualClock(new Date("2026-07-07T00:00:00Z"));
  const accepted = "taxterm_disc-documentary-filmmaking";
  const client = fakeAnthropicClient({
    title: "A documentary call",
    type: "open-call",
    genres: ["made-up genre"],
    taxonomyTermIds: [accepted, "taxterm_disc-not-in-the-catalog"],
    eligibility: [],
    requiredMaterials: [],
    contactEmailPresent: false,
  });
  const extractor = new LlmExtractor(clock, { client, apiKey: "unused" });
  const source: Source = {
    id: "src_taxonomy",
    name: "Documentary call",
    url: "https://example.com/documentary",
    kind: "organization-website",
    registryTaxonomyTermIds: [accepted],
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
  };
  const candidate = await extractor.extract(source, {
    id: "snap_taxonomy",
    sourceId: source.id,
    url: source.url,
    fetchedAt: clock.now().toISOString(),
    status: "ok",
    contentHash: "h",
    content: "A call for documentary filmmaking projects.",
  });
  assert.deepEqual(candidate.taxonomyAssignments?.map((assignment) => assignment.termId), [accepted]);
});

test("LlmExtractor: uses the DeepSeek OpenAI-compatible tool response", async () => {
  const clock = new ManualClock(new Date("2026-07-07T00:00:00Z"));
  const originalFetch = globalThis.fetch;
  let request: { url: string; body: Record<string, unknown>; authorization?: string } | undefined;
  globalThis.fetch = (async (input, init) => {
    request = {
      url: String(input),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      authorization: new Headers(init?.headers).get("authorization") ?? undefined,
    };
    return new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ function: { arguments: JSON.stringify({ title: "Deep Call", type: "grant", genres: [], eligibility: [], requiredMaterials: [], contactEmailPresent: false }) } }] } }] }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const extractor = new LlmExtractor(clock, { provider: "deepseek", apiKey: "test-key", model: "deepseek-chat", endpoint: "https://deepseek.test/chat" });
    const source: Source = { id: "src_deepseek", name: "Deep Call", url: "https://example.com/deep", kind: "organization-website", checkIntervalHours: 24, active: true, consecutiveFailures: 0 };
    const candidate = await extractor.extract(source, { id: "snap_deepseek", sourceId: source.id, url: source.url, fetchedAt: clock.now().toISOString(), status: "ok", contentHash: "h", content: "A grant call." });
    assert.equal(candidate.title, "Deep Call");
    assert.equal(request?.url, "https://deepseek.test/chat");
    assert.equal(request?.authorization, "Bearer test-key");
    assert.equal(request?.body.model, "deepseek-chat");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("LlmExtractor: falls back to deterministic extraction when the provider fails", async () => {
  const clock = new ManualClock(new Date("2026-07-07T00:00:00Z"));
  const extractor = new LlmExtractor(clock, {
    client: failingAnthropicClient(402),
    apiKey: "unused",
  });
  const source: Source = {
    id: "src_fallback",
    name: "North River Poetry Prize",
    url: "https://example.com/poetry-prize",
    kind: "organization-website",
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
  };

  const candidate = await extractor.extract(source, {
    id: "snap_fallback",
    sourceId: source.id,
    url: source.url,
    fetchedAt: clock.now().toISOString(),
    status: "ok",
    contentHash: "h",
    content: "North River Poetry Prize\nCall for poetry. Deadline: September 30, 2026.",
  });

  assert.equal(candidate.title, "North River Poetry Prize");
  assert.equal(candidate.type, "award");
  assert.equal(candidate.deadline.kind, "exact");
  assert.equal(candidate.deadline.date, "2026-09-30");
  assert.ok(candidate.extractionConfidence > 0);
});

test("LlmExtractor: opens a provider circuit after the first failure in a batch", async () => {
  const clock = new ManualClock(new Date("2026-07-07T00:00:00Z"));
  let attempts = 0;
  const client = {
    messages: {
      create: async () => {
        attempts += 1;
        throw Object.assign(new Error("provider unavailable"), { status: 402 });
      },
    },
  } as unknown as Anthropic;
  const extractor = new LlmExtractor(clock, { client, apiKey: "unused" });
  const source: Source = {
    id: "src_circuit",
    name: "North River Poetry Prize",
    url: "https://example.com/poetry-prize",
    kind: "organization-website",
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
  };
  const snapshot = {
    id: "snap_circuit",
    sourceId: source.id,
    url: source.url,
    fetchedAt: clock.now().toISOString(),
    status: "ok" as const,
    contentHash: "h",
    content: "North River Poetry Prize\nCall for poetry. Deadline: September 30, 2026.",
  };

  await extractor.extract(source, snapshot);
  await extractor.extract(source, { ...snapshot, id: "snap_circuit_2" });

  assert.equal(attempts, 1);
});

function fakePool(): { pool: Pool; tables: Map<string, unknown[]> } {
  const tables = new Map<string, unknown[]>();
  const pool = {
    connect: async () => ({
      query: async (sql: string, params?: unknown[]) =>
        fakeQuery(tables, sql, params),
      release: () => {},
    }),
    query: async (sql: string, params?: unknown[]) =>
      fakeQuery(tables, sql, params),
  } as unknown as Pool;
  return { pool, tables };
}

async function fakeQuery(
  tables: Map<string, unknown[]>,
  sql: string,
  params?: unknown[],
): Promise<QueryResult> {
  const norm = sql.trim().toLowerCase();
  const rows: unknown[] = [];
  if (norm.startsWith("delete from")) {
    const table = norm.split(" ")[2];
    tables.set(table, []);
  } else if (norm.startsWith("insert into")) {
    const table = norm.split(" ")[2];
    const list = tables.get(table) ?? [];
    // Our inserts always put the JSON payload (or, for emitted_alert_keys, the raw key) last.
    const value = params![params!.length - 1];
    list.push({ data: value, key: value });
    tables.set(table, list);
  } else if (
    norm.startsWith("select data from") ||
    norm.startsWith("select key from")
  ) {
    const table = norm.split(" ")[3];
    rows.push(...(tables.get(table) ?? []));
  }
  return { rows, rowCount: rows.length } as QueryResult;
}

test("seedRegistryIfEmpty: seeds ~1,024 tier-0 sources into an empty store", () => {
  const engine = new RadarEngine({
    store: createStore(),
    fetcher: new FixtureFetcher(),
  });
  assert.equal(engine.store.sources.size, 0);

  const result = seedRegistryIfEmpty(engine);

  assert.ok(result, "expected a result when the store was empty");
  assert.ok(
    result!.loaded >= 1000,
    `expected >= 1000 tier-0 sources loaded, got ${result!.loaded}`,
  );
  assert.equal(engine.store.sources.size, result!.loaded);
});

test("seedRegistryIfEmpty: is a no-op once the store already has ALL registry sources", () => {
  const engine = new RadarEngine({
    store: createStore(),
    fetcher: new FixtureFetcher(),
  });
  const first = seedRegistryIfEmpty(engine);
  assert.ok(first, "expected the first call to seed the empty store");
  const sizeAfterFirstSeed = engine.store.sources.size;

  const result = seedRegistryIfEmpty(engine);

  assert.equal(
    result,
    null,
    "expected null when the store already has every registry source",
  );
  assert.equal(
    engine.store.sources.size,
    sizeAfterFirstSeed,
    "store should be unchanged",
  );
});

test("seedRegistryIfEmpty: self-heals a partial seed by adding only missing sources", () => {
  const engine = new RadarEngine({
    store: createStore(),
    fetcher: new FixtureFetcher(),
  });

  // Simulate today's real incident: some (but not all) registry sources are
  // already present in the store, as if a previous bundling bug only seeded
  // a subset.
  const registry = assembleRegistry();
  const tier0 = filterSources(registry, { maxTier: 0 });
  const alreadyPresent = tier0.slice(0, 5);
  for (const entry of alreadyPresent) {
    engine.addSource({
      name: entry.name,
      url: entry.url,
      kind: entry.kind,
      checkIntervalHours: entry.checkIntervalHours,
    });
  }
  assert.equal(engine.store.sources.size, alreadyPresent.length);

  const result = seedRegistryIfEmpty(engine);

  assert.ok(result, "expected the partial seed to be self-healed");
  assert.equal(
    result!.loaded,
    tier0.length - alreadyPresent.length,
    "expected only the missing sources to be added",
  );
  assert.equal(
    engine.store.sources.size,
    tier0.length,
    "store should now have every registry source",
  );

  // No duplicates: each normalized URL appears exactly once.
  const urls = [...engine.store.sources.values()].map((s) =>
    s.url.replace(/\/$/, "").toLowerCase(),
  );
  assert.equal(
    urls.length,
    new Set(urls).size,
    "expected no duplicate source URLs",
  );
});

test("seedRegistryIfEmpty: refreshes site schema and authority on existing sources", () => {
  const engine = new RadarEngine({ store: createStore(), fetcher: new FixtureFetcher() });
  const existing = engine.addSource({
    name: "NewPages Calls and Contests",
    url: "https://www.newpages.com/classifieds-fee/all/",
    kind: "organization-website",
    checkIntervalHours: 24,
  });
  existing.discoveryLastCheckedAt = "2026-08-11T00:00:00.000Z";
  existing.discoveryEtag = '"old-adapter"';
  existing.discoveryLastModified = "Mon, 10 Aug 2026 00:00:00 GMT";

  seedRegistryIfEmpty(engine, { maxTier: 3 });

  assert.equal(existing.kind, "directory");
  assert.equal(existing.registryTier, 2);
  assert.equal(existing.followsOutboundLinks, true);
  assert.equal(existing.discoveryAdapterId, "newpages-index");
  assert.equal(existing.discoveryLastCheckedAt, undefined);
  assert.equal(existing.discoveryEtag, undefined);
  assert.equal(existing.discoveryLastModified, undefined);
});

test("postgresStore: save then load round-trips a RadarStore", async () => {
  const { pool } = fakePool();
  const store = createStore();
  store.organizations.set("org_1", {
    id: "org_1",
    name: "Test Org",
    domains: ["test.org"],
    verified: true,
  });
  store.users.set("user_1", {
    id: "user_1",
    displayName: "Ada",
    genres: ["poetry"],
    attributes: {},
  });
  store.emittedAlertKeys.add("closing-soon:user_1:opp_1");
  store.accounts.set("acct_1", {
    id: "acct_1",
    email: "ada@example.com",
    passwordHash: "salt:hash",
    userId: "user_1",
    isAdmin: false,
    createdAt: "2026-07-07T00:00:00.000Z",
  });
  store.memberships.push({
    accountId: "acct_1",
    organizationId: "org_1",
    role: "admin",
    grantedAt: "2026-07-07T00:00:00.000Z",
  });
  store.auditLog.push({
    id: "audit_1",
    at: "2026-07-07T00:00:00.000Z",
    accountId: "acct_1",
    action: "claim.approve",
    targetType: "claim",
    targetId: "claim_1",
  });

  await saveStoreToPostgres(store, pool);
  const loaded = await loadStoreFromPostgres(pool);

  assert.deepEqual(
    loaded.organizations.get("org_1"),
    store.organizations.get("org_1"),
  );
  assert.deepEqual(loaded.users.get("user_1"), store.users.get("user_1"));
  assert.ok(loaded.emittedAlertKeys.has("closing-soon:user_1:opp_1"));
  assert.deepEqual(loaded.accounts.get("acct_1"), store.accounts.get("acct_1"));
  assert.deepEqual(loaded.memberships, store.memberships);
  assert.deepEqual(loaded.auditLog, store.auditLog);
});
