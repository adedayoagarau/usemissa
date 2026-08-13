import test from "node:test";
import assert from "node:assert/strict";
import { AdapterRegistry, DeepSeekHtmlAdapter, FeedAdapter, GaryObservationAdapter, GenericHtmlAdapter, JsonApiAdapter, MemoryShadowRunStore, assertIngestionV2DatabaseRole, assessEvidenceQuality, buildOpportunityIdentity, compareExtractionResults, compareOpportunityIdentity, compareSourceAdapters, createBenchmarkSources, createIngestionCatalog, createRun, createSnapshotId, evaluatePromotionGate, executeShadowPipeline, redisOptionsFromUrl, robotsAllowsPath, sanitizeSourceText, scoreBenchmarkCase, shadowJob, summarizeBenchmarkScorecards } from "../src/index.js";

test("creates shadow runs without publishing mode", () => {
  const source = createBenchmarkSources()[0]!;
  const run = createRun(source);
  assert.equal(run.mode, "shadow");
  assert.equal(run.status, "queued");
  assert.match(run.id, /^ingv2_/);
});

test("catalog exposes the registered source portfolio with fail-closed eligibility", () => {
  const catalog = createIngestionCatalog();
  assert.ok(catalog.length >= 1000);
  assert.ok(catalog.some((source) => source.eligible));
  assert.ok(catalog.some((source) => !source.eligible));
  assert.ok(catalog.filter((source) => source.eligible).every((source) => source.active));
});

test("registry rejects duplicate adapter ids", () => {
  const registry = new AdapterRegistry().register(new GenericHtmlAdapter());
  assert.deepEqual(registry.list(), ["generic-html-v2"]);
  assert.throws(() => registry.register(new GenericHtmlAdapter()), /already registered/);
});

test("compares extraction results as an evaluation artifact", () => {
  const adapter = new GenericHtmlAdapter();
  const source = { ...createBenchmarkSources()[0]!, config: { destination: { pageRole: "detail" as const } } };
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_1", runId: context.run.id, sourceId: context.source.id, url: context.source.url, finalUrl: context.source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: "<h1>Grant</h1>", rendered: false };
  return adapter.extract({ ...context, snapshot }, snapshot).then((result) => {
    const comparison = compareExtractionResults(result, result);
    assert.equal(comparison.agreementRate, 1);
  });
});

test("normalizes canonical aliases and monetary descriptions for comparison", () => {
  const field = (fieldName: string, value: string) => ({ fieldName, rawValue: value, normalizedValue: value, confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: "https://example.test", snapshotId: "snap" } });
  const comparison = compareExtractionResults({ fields: [field("prize", "$1,000, publication")], candidateLinks: [], warnings: [] }, { fields: [field("cash_prize", "$1,000")], candidateLinks: [], warnings: [] });
  assert.equal(comparison.sharedFieldNames[0], "prize");
  assert.equal(comparison.agreementRate, 1);
});

test("parses local and Upstash Redis URLs for BullMQ", () => {
  assert.equal(redisOptionsFromUrl("redis://localhost:6379").host, "localhost");
  const hosted = redisOptionsFromUrl("rediss://default:secret@upstash.example:6380");
  assert.equal(hosted.tls !== undefined, true);
  assert.equal(hosted.maxRetriesPerRequest, null);
});

test("requires an explicit local or staging database role", () => {
  assert.equal(assertIngestionV2DatabaseRole("local"), "local");
  assert.equal(assertIngestionV2DatabaseRole("staging"), "staging");
  assert.throws(() => assertIngestionV2DatabaseRole("production"), /requires INGESTION_V2_DATABASE_ROLE/);
});

test("fails robots checks for disallowed paths", () => {
  assert.equal(robotsAllowsPath("User-agent: *\nDisallow: /private", "/private/opportunity"), false);
  assert.equal(robotsAllowsPath("User-agent: *\nDisallow: /private", "/public/opportunity"), true);
});

test("extracts RSS entries as destination-backed opportunities", async () => {
  const source = { ...createBenchmarkSources()[0]!, kind: "feed" as const, adapterId: "feed-v2", config: { transport: "rss" } };
  const adapter = new FeedAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_feed", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "application/rss+xml", contentHash: "hash", html: '<rss><channel><item><title>Example grant</title><link>https://example.test/detail</link><description>Open call</description></item></channel></rss>', rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.equal(result.fields.some((field) => field.fieldName === "title"), true);
  assert.equal(result.candidateLinks[0]?.authority, "destination");
});

test("extracts JSON listing envelopes and applies a quality gate", async () => {
  const source = { ...createBenchmarkSources()[0]!, kind: "api" as const, adapterId: "json-api-v2", config: { transport: "json" } };
  const adapter = new JsonApiAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_json", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "application/json", contentHash: "hash", html: JSON.stringify({ results: [{ name: "Example grant", url: "https://example.test/detail", deadlineDate: "2026-12-31", description: "Open call" }] }), rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  const quality = assessEvidenceQuality(snapshot, result);
  assert.equal(result.fields.some((field) => field.fieldName === "deadline"), true);
  assert.equal(quality.decision, "review");
});

test("extracts Grants.gov nested API records and preserves POST detail requests", async () => {
  const source = createBenchmarkSources().find((candidate) => candidate.id === "benchmark-grants-gov-arts")!;
  const adapter = new JsonApiAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_grants_gov", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "application/json", contentHash: "hash", html: JSON.stringify({ data: { oppHits: [{ id: "ABC123", title: "Arts grant", agency: "National Arts Agency", closeDate: "2026-12-31" }] } }), rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.equal(result.fields.some((field) => field.fieldName === "organization"), true);
  assert.deepEqual(result.candidateLinks[0]?.request, { method: "POST", body: { opportunityId: "ABC123" } });
});

test("rejects non-success API responses as typed source failures", async () => {
  const source = { ...createBenchmarkSources().find((candidate) => candidate.id === "benchmark-grants-gov-arts")!, url: "https://example.test/api" };
  const adapter = new JsonApiAdapter();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("blocked", { status: 403 })) as typeof fetch;
  try { await assert.rejects(() => adapter.fetch({ run: createRun(source), source }), (error: unknown) => error instanceof Error && error.message.includes("JSON source HTTP 403")); }
  finally { globalThis.fetch = originalFetch; }
});

test("keeps same-endpoint API detail requests as distinct snapshots", () => {
  assert.notEqual(createSnapshotId("run", "https://api.example/detail", '{"opportunityId":"1"}'), createSnapshotId("run", "https://api.example/detail", '{"opportunityId":"2"}'));
});

test("supports source-defined detail request templates", async () => {
  const source = { ...createBenchmarkSources().find((candidate) => candidate.id === "benchmark-grants-gov-arts")!, config: { ...createBenchmarkSources().find((candidate) => candidate.id === "benchmark-grants-gov-arts")!.config, detailRequest: { url: "https://example.test/detail", method: "POST" as const, bodyTemplate: { ids: ["{{id}}"], mode: "full" }, headers: { authorization: "Bearer configured-by-source" } } } };
  const adapter = new JsonApiAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_template", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "application/json", contentHash: "hash", html: JSON.stringify({ data: { oppHits: [{ id: "ABC123", title: "Arts grant" }] } }), rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.deepEqual(result.candidateLinks[0]?.request, { method: "POST", body: { ids: ["ABC123"], mode: "full" }, headers: { authorization: "Bearer configured-by-source" } });
});

test("sanitizes source NUL bytes before persistence", () => {
  assert.equal(sanitizeSourceText("title\u0000body"), "titlebody");
});

test("scores v2 coverage against a baseline without allowing publication", () => {
  const source = createBenchmarkSources()[0]!;
  const snapshot = { id: "snap_score", runId: "run_score", sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: "<h1>Example</h1>", rendered: false };
  const field = (fieldName: string, value: string) => ({ fieldName, rawValue: value, normalizedValue: value, confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: source.url, snapshotId: snapshot.id } });
  const v2 = { fields: [field("title", "Example")], candidateLinks: [{ url: "https://example.test/detail", role: "detail" as const, authority: "destination" as const }], warnings: [] };
  const baseline = { fields: [field("title", "Example"), field("deadline", "2026-12-31")], candidateLinks: [], warnings: [] };
  const score = scoreBenchmarkCase(snapshot, v2, baseline, { decision: "review", score: 0.8, reasons: [] });
  assert.equal(score.baselineFieldRecall, 0.5);
  assert.equal(score.destinationSuccess, true);
  assert.equal(score.publishable, false);
});

test("creates stable identities and sends ambiguous matches to review", () => {
  const result = { fields: [
    { fieldName: "title", rawValue: "Example Grant", normalizedValue: "Example Grant", confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: "https://example.test", snapshotId: "snap" } },
    { fieldName: "organization", rawValue: "Example Arts", normalizedValue: "Example Arts", confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: "https://example.test", snapshotId: "snap" } },
  ], candidateLinks: [], warnings: [] };
  const left = buildOpportunityIdentity(result, "https://example.test/grant?utm_source=x");
  const right = buildOpportunityIdentity(result, "https://example.test/grant");
  assert.equal(compareOpportunityIdentity(left, right), "same");
  assert.equal(compareOpportunityIdentity(left, { ...right, organization: "Other Arts", key: "example", canonicalUrl: "https://example.test/other" }), "review");
});

test("promotion gate fails closed until benchmark evidence is strong", () => {
  const result = evaluatePromotionGate({
    scorecard: { sourceHealth: "healthy", destinationSuccess: true, baselineFieldRecall: 0.5, exactAgreement: 1, qualityScore: 0.9, publishable: false, reasons: [] },
    quality: { decision: "review", score: 0.9, reasons: [] },
  });
  assert.equal(result.eligible, false);
  assert.equal(result.publicWrite, false);
  assert.match(result.reasons[0] ?? "", /recall/);
  const passing = evaluatePromotionGate({
    scorecard: { sourceHealth: "healthy", destinationSuccess: true, baselineFieldRecall: 0.875, exactAgreement: 1, qualityScore: 1, publishable: false, reasons: [] },
    quality: { decision: "review", score: 1, reasons: [] },
  });
  assert.equal(passing.eligible, true);
  assert.equal(passing.publicWrite, false);
});

test("summarizes a benchmark suite with per-sample fail-closed thresholds", () => {
  const scorecard = { sourceHealth: "healthy" as const, destinationSuccess: true, baselineFieldRecall: 1, exactAgreement: 1, qualityScore: 0.8, publishable: false as const, reasons: [] };
  const summary = summarizeBenchmarkScorecards([scorecard, scorecard]);
  assert.equal(summary.sampleCount, 2);
  assert.equal(summary.allPass, true);
  assert.equal(summary.minimumExactAgreement, 1);
});

test("treats Poets & Writers as a landing page and classifies detail destinations", async () => {
  const source = createBenchmarkSources()[0]!;
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_destination", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: '<h1>Writing Contests</h1><a href="/writing_contests/example">Example contest</a>', rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.equal(result.fields.length, 0);
  assert.equal(result.candidateLinks[0]?.role, "detail");
  assert.equal(result.candidateLinks[0]?.authority, "destination");
    assert.match(result.warnings[0] ?? "", /Landing page/);
});

test("does not let navigation links consume the destination budget", async () => {
  const source = createBenchmarkSources()[0]!;
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_navigation", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: '<a href="/grants">Grants</a><a href="/writing_contests/real">Real Contest</a>', rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.deepEqual(result.candidateLinks.map((candidate) => candidate.url), ["https://www.pw.org/writing_contests/real"]);
  assert.equal(result.candidateLinks[0]?.role, "detail");
});

test("does not classify nested opportunity URLs inside social-share query strings", () => {
  const source = createBenchmarkSources()[0]!;
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_social", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: '<a href="https://www.facebook.com/sharer.php?u=https%3A//www.pw.org/writing_contests/example">Share</a>', rendered: false };
  return adapter.extract({ ...context, snapshot }, snapshot).then((result) => assert.equal(result.candidateLinks.length, 0));
});

test("uses DeepSeek JSON output as shadow evidence", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://example.test/opportunity", adapterId: "deepseek-html-v2", config: { destination: { pageRole: "detail" as const } } };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /", { status: 200 });
    if (url === source.url) return new Response("<html><h1>Example grant</h1></html>", { status: 200, headers: { "content-type": "text/html" } });
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: "Example grant", organization: "Example Arts", opportunityType: "grant", deadlineDate: "2026-12-31", deadlineKind: "exact", submissionUrl: "https://example.test/apply" }) } }] }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const adapter = new DeepSeekHtmlAdapter({ apiKey: "test", endpoint: "https://api.deepseek.test/chat/completions" });
    const context = { run: createRun(source), source };
    const snapshot = await adapter.fetch(context);
    const result = await adapter.extract({ ...context, snapshot }, snapshot);
    assert.equal(result.fields.some((field) => field.provenance.adapterId === "deepseek-html-v2" && field.fieldName === "deadline"), true);
    assert.match(result.warnings.at(-1) ?? "", /shadow evidence/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("executes a shadow pipeline and never publishes", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://example.test/opportunities", config: { destination: { pageRole: "detail" as const } } };
  const registry = new AdapterRegistry().register(new GenericHtmlAdapter());
  const store = new MemoryShadowRunStore();
  const job = shadowJob(source, { runId: "ingv2_test_run" });
  const adapter = registry.get(source.adapterId);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("<html><h1>Example grant</h1><a href='/apply'>Apply</a></html>", { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch;
  try {
    const artifact = await executeShadowPipeline(registry, source, job, store);
    assert.equal(artifact.run.status, "completed");
    assert.equal(artifact.published, false);
    assert.equal(artifact.extraction.fields[0]?.fieldName, "title");
    assert.equal(store.get("ingv2_test_run"), artifact);
    assert.equal(adapter.id, "generic-html-v2");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetches classified detail destinations as related shadow evidence", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://example.test/grants", config: { destination: { pageRole: "landing" as const, detailLimit: 2, rules: [{ role: "detail" as const, patterns: ["/writing_contests/"], authority: "destination" as const }] } } };
  const registry = new AdapterRegistry().register(new GenericHtmlAdapter());
  const store = new MemoryShadowRunStore();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /", { status: 200 });
    if (url.endsWith("/grants")) return new Response('<h1>Directory</h1><a href="/writing_contests/example">Example Contest</a>', { status: 200, headers: { "content-type": "text/html" } });
    return new Response("<h1>Example Contest</h1><p>Deadline: 2026-12-31</p>", { status: 200, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  try {
    const artifact = await executeShadowPipeline(registry, source, shadowJob(source, { runId: "ingv2_destination" }), store);
    assert.equal(artifact.relatedSnapshots?.length, 1);
    assert.equal(artifact.relatedSnapshots?.[0]?.url, "https://example.test/writing_contests/example");
    assert.equal(artifact.extraction.fields.some((field) => field.rawValue === "Example Contest"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("bridges a Gary observation without rewriting Gary's parser", async () => {
  const source = { ...createBenchmarkSources()[0]!, adapterId: "gary-observation-bridge-v2" };
  const adapter = new GaryObservationAdapter(async () => ({
    sourceUrl: "https://www.pw.org/writing_contests/example",
    rawHtml: "<h1>Example Prize</h1>",
    fields: { title: "Example Prize", deadline: "2026-12-31", entry_fee: "$10" },
    fieldProvenance: { deadline: { method: "gary-selected-field" } },
  }));
  const registry = new AdapterRegistry().register(adapter);
  const store = new MemoryShadowRunStore();
  const job = shadowJob(source, { runId: "ingv2_gary_bridge" });
  const artifact = await executeShadowPipeline(registry, source, job, store);
  assert.deepEqual(artifact.extraction.fields.map((field) => field.fieldName), ["title", "deadline", "entry_fee"]);
  assert.equal(artifact.extraction.fields[1]?.provenance.method, "gary-selected-field");
});

test("produces a shadow comparison report with no public writes", async () => {
  const source = { ...createBenchmarkSources()[0]!, adapterId: "generic-html-v2", config: { comparisonAdapter: "gary", destination: { pageRole: "detail" as const } } };
  const generic = new GenericHtmlAdapter();
  const gary = new GaryObservationAdapter(async () => ({
    sourceUrl: "https://www.pw.org/writing_contests/example",
    rawHtml: "<h1>Example Prize</h1>",
    fields: { title: "Example Prize", deadline: "2026-12-31" },
  }));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("<html><h1>Example Prize</h1></html>", { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch;
  try {
    const report = await compareSourceAdapters(source, generic, gary, shadowJob(source, { runId: "ingv2_compare" }));
    assert.equal(report.publicWrites, false);
    assert.equal(report.comparison.disagreements.length, 0);
    assert.deepEqual(report.comparison.sharedFieldNames, ["title"]);
    assert.equal(report.scorecard.publishable, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("records a failed shadow run without publishing", async () => {
  const source = createBenchmarkSources()[0]!;
  const adapter = new GenericHtmlAdapter();
  const registry = new AdapterRegistry().register(adapter);
  const store = new MemoryShadowRunStore();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("fixture fetch failed"); }) as typeof fetch;
  try {
    await assert.rejects(() => executeShadowPipeline(registry, source, shadowJob(source, { runId: "ingv2_failed" }), store), /fixture fetch failed/);
    assert.equal(store.failure("ingv2_failed"), "fixture fetch failed");
    assert.equal(store.failureCode("ingv2_failed"), "unknown");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
