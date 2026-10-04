import test from "node:test";
import assert from "node:assert/strict";
import { AdapterRegistry, ChillSubsNextAdapter, DeepSeekHtmlAdapter, FeedAdapter, GaryObservationAdapter, GenericHtmlAdapter, INGESTION_V2_VERSION, JsonApiAdapter, MemoryShadowRunStore, assertIngestionV2DatabaseRole, assessEvidenceQuality, buildOpportunityIdentity, closeExpiredPublishedV2Opportunities, closeExpiredReviewableV2Opportunities, compareExtractionResults, compareOpportunityIdentity, compareSourceAdapters, createBenchmarkSources, createFirstTrancheSources, createIngestionCatalog, createRun, createSnapshotId, evaluateCandidateReplayGate, evaluatePromotionGate, executeShadowPipeline, findCanonicalDuplicateMatches, handoffApprovedCandidate, hasCurrentDeadlineOrWindow, isAggregateOpportunityPage, opportunityTaxonomyTermIds, redisOptionsFromUrl, resolveCurrentDeadline, robotsAllowsPath, reviewForPublication, sanitizeSourceText, scoreBenchmarkCase, shadowJob, sourceIsDue, sourceIsOpen, summarizeBenchmarkScorecards, writeWithDeepSeek } from "../src/index.js";

test("creates shadow runs without publishing mode", () => {
  const source = createBenchmarkSources()[0]!;
  const run = createRun(source);
  assert.equal(run.mode, "shadow");
  assert.equal(run.status, "queued");
  assert.match(run.id, /^ingv2_/);
});

test("DeepSeek writer returns a bounded source-linked page draft", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: "A verified opportunity with a clearly stated deadline and official application path.", highlights: [{ label: "Deadline", value: "15 August 2026", certainty: "confirmed" }, { label: "Application path", value: "Official application page available", certainty: "confirmed" }], preparation: ["Read the official guidelines before applying."], unknowns: ["Eligibility details require confirmation."], nextAction: "Read the official application page and confirm eligibility." }) } }] }), { status: 200 })) as typeof fetch;
  try {
    const content = await writeWithDeepSeek({ title: "Example opportunity", organization: "Example organization", type: "grant", deadline: "2026-08-15", authoritativeUrl: "https://example.test/apply", fields: [{ fieldName: "title", rawValue: "Example opportunity", normalizedValue: "Example opportunity", confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: "https://example.test/apply", snapshotId: "snap_test" } }] }, { apiKey: "test-key" });
    assert.equal(content.builderVersion, "deepseek-writer-v1");
    assert.equal(content.sourceUrl, "https://example.test/apply");
    assert.equal(content.highlights.length, 2);
    assert.equal(content.review.status, "pending");
  } finally { globalThis.fetch = originalFetch; }
});

test("catalog exposes the registered source portfolio with fail-closed eligibility", () => {
  const catalog = createIngestionCatalog();
  assert.ok(catalog.length >= 1000);
  assert.ok(catalog.some((source) => source.eligible));
  assert.ok(catalog.some((source) => !source.eligible));
  assert.ok(catalog.filter((source) => source.eligible).every((source) => source.active));
});

test("classifies stable sources into durable lanes and keeps single-run sources out of automation", () => {
  const catalog = createIngestionCatalog();
  assert.ok(catalog.some((source) => source.schedule.lane === "core-daily"));
  assert.ok(catalog.some((source) => source.schedule.lane === "scheduled"));
  const single = createBenchmarkSources()[0]!;
  assert.equal(single.schedule.lane, "single-run");
  assert.equal(sourceIsDue(single, null), false);
});

test("honors explicit opening windows before a scheduled source becomes due", () => {
  const source = { ...createBenchmarkSources()[0]!, schedule: { lane: "scheduled" as const, cadenceHours: 24, openFrom: "2099-01-01T00:00:00Z", openUntil: "2099-02-01T00:00:00Z" } };
  assert.equal(sourceIsOpen(source.schedule, new Date("2098-12-31T23:59:00Z")), false);
  assert.equal(sourceIsDue(source, null, new Date("2099-01-02T00:00:00Z")), true);
});

test("publisher requires the fetched destination to reconcile to the source record", async () => {
  const source = { ...createBenchmarkSources()[0]!, config: { destination: { pageRole: "landing" as const, rules: [{ role: "detail" as const, patterns: ["/detail/"], authority: "destination" as const }] } } };
  const sourceSnapshot = { id: "snap_source", runId: "ingv2_publisher", sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "source", html: "<h1>Example Prize</h1>", rendered: false };
  const fields = (snapshotId: string) => [
    { fieldName: "title", rawValue: "Example Prize", normalizedValue: "Example Prize", confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: "https://example.test/detail/prize", snapshotId } },
    { fieldName: "organization", rawValue: "Example Foundation", normalizedValue: "Example Foundation", confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: "https://example.test/detail/prize", snapshotId } },
  ];
  const review = await reviewForPublication({ source, sourceSnapshot, sourceExtraction: { fields: fields("snap_source"), candidateLinks: [{ url: "https://example.test/detail/prize", role: "detail", authority: "destination" }], warnings: [] }, relatedSnapshots: [{ ...sourceSnapshot, id: "snap_detail", url: "https://example.test/detail/prize", finalUrl: "https://example.test/detail/prize", html: "<h1>Example Prize</h1>" }], relatedFields: fields("snap_detail") }, { apiKey: "" });
  assert.equal(review.decision, "review");
  assert.equal(review.reconciliation.decision, "pass");
  assert.equal(review.publicWrite, false);
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
  const previous = process.env.MISSA_INGESTION_V2_PROMOTE_APPROVED;
  process.env.MISSA_INGESTION_V2_PROMOTE_APPROVED = "1";
  assert.equal(assertIngestionV2DatabaseRole("production"), "production");
  if (previous === undefined) delete process.env.MISSA_INGESTION_V2_PROMOTE_APPROVED;
  else process.env.MISSA_INGESTION_V2_PROMOTE_APPROVED = previous;
  assert.throws(() => assertIngestionV2DatabaseRole("production"), /requires INGESTION_V2_DATABASE_ROLE/);
});

test("fails robots checks for disallowed paths", () => {
  assert.equal(robotsAllowsPath("User-agent: *\nDisallow: /private", "/private/opportunity"), false);
  assert.equal(robotsAllowsPath("User-agent: *\nDisallow: /private", "/public/opportunity"), true);
});

test("retries one transient HTML fetch without broadening the source budget", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://retry.test/opportunity" };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const originalFetch = globalThis.fetch;
  let pageAttempts = 0;
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /", { status: 200 });
    pageAttempts += 1;
    if (pageAttempts === 1) throw new Error("transient timeout");
    return new Response("<h1>Recovered opportunity</h1>", { status: 200, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  try {
    const snapshot = await adapter.fetch(context);
    assert.equal(snapshot.statusCode, 200);
    assert.equal(pageAttempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retries one transient HTML 403 before classifying the source as blocked", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://retry.test/opportunity" };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const originalFetch = globalThis.fetch;
  let pageAttempts = 0;
  globalThis.fetch = (async (input) => {
    if (String(input).endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /", { status: 200 });
    pageAttempts += 1;
    return pageAttempts === 1
      ? new Response("temporary challenge", { status: 403 })
      : new Response("<h1>Recovered opportunity</h1>", { status: 200, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  try {
    assert.equal((await adapter.fetch(context)).statusCode, 200);
    assert.equal(pageAttempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test("joins Chill Subs call ids to organizer submission URLs and collapses genre variants", async () => {
  const adapter = new ChillSubsNextAdapter();
  const source = {
    id: "chill-subs-test",
    name: "Chill Subs Contests",
    url: "https://www.chillsubs.com/browse/contests",
    adapterId: adapter.id,
    kind: "directory" as const,
    geography: ["global"],
    opportunityTypes: ["contest"],
    config: { transport: "chill-subs-next" },
    schedule: { lane: "core-daily" as const, cadenceHours: 24 },
  };
  const run = createRun(source);
  const rootPayload = {
    props: {
      pageProps: {
        browseData: [
          {
            id: "call-poetry",
            title: "Example Writing Contest",
            name: "Example Review",
            key: "example-review",
            entityType: "magazine",
            entityStatus: "active",
            status: "open",
            description: "A contest represented once for each accepted genre.",
            readingPeriod: { subWindows: [{ closeDate: "2099-08-18T03:59:59.000Z" }] },
          },
          {
            id: "call-fiction",
            title: "Example Writing Contest",
            name: "Example Review",
            key: "example-review",
            entityType: "magazine",
            entityStatus: "active",
            status: "open",
            readingPeriod: { subWindows: [{ closeDate: "2099-08-18T03:59:59.000Z" }] },
          },
          {
            id: "call-closed",
            title: "Closed Contest",
            name: "Example Review",
            key: "example-review",
            entityType: "magazine",
            entityStatus: "active",
            status: "closed",
            readingPeriod: { subWindows: [{ closeDate: "2099-08-19T03:59:59.000Z" }] },
          },
        ],
      },
    },
  };
  const rootSnapshot = {
    id: "snap_chill_root",
    runId: run.id,
    sourceId: source.id,
    url: source.url,
    finalUrl: source.url,
    fetchedAt: new Date().toISOString(),
    statusCode: 200,
    contentType: "text/html",
    contentHash: "root",
    html: `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(rootPayload)}</script>`,
    rendered: false,
  };
  const root = await adapter.extract({ run, source }, rootSnapshot);
  assert.equal(root.candidateLinks.length, 1);
  assert.equal(root.candidateLinks[0]?.stableId, "call-poetry");
  assert.equal(
    root.candidateLinks[0]?.url,
    "https://www.chillsubs.com/magazine/example-review?call=call-poetry",
  );

  const profileUrl = root.candidateLinks[0]!.url;
  const profilePayload = {
    props: {
      pageProps: {
        listing: {
          name: "Example Review",
          subCalls: [
            {
              id: "call-poetry",
              title: "Example Writing Contest",
              status: "open",
              link: "https://example-review.test/submit/contest",
              description: "Official contest guidelines.",
              readingPeriod: { subWindows: [{ closeDate: "2099-08-18T03:59:59.000Z" }] },
            },
          ],
        },
      },
    },
  };
  const profileSnapshot = {
    ...rootSnapshot,
    id: "snap_chill_profile",
    url: profileUrl,
    finalUrl: profileUrl,
    contentHash: "profile",
    html: `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(profilePayload)}</script>`,
  };
  const profile = await adapter.extract(
    { run, source: { ...source, url: profileUrl } },
    profileSnapshot,
  );
  assert.equal(profile.candidateLinks[0]?.url, "https://example-review.test/submit/contest");
  assert.equal(profile.candidateLinks[0]?.role, "apply");
  assert.equal(
    profile.fields.find((entry) => entry.fieldName === "deadline")?.normalizedValue,
    "2099-08-18T03:59:59.000Z",
  );
});

test("extracts Grants.gov nested API records and preserves POST detail requests", async () => {
  const source = createBenchmarkSources().find((candidate) => candidate.id === "benchmark-grants-gov-arts")!;
  const adapter = new JsonApiAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_grants_gov", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "application/json", contentHash: "hash", html: JSON.stringify({ data: { oppHits: [{ id: "ABC123", title: "Arts grant", agency: "National Arts Agency", closeDate: "2026-12-31" }] } }), rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.equal(result.fields.some((field) => field.fieldName === "organization"), true);
  assert.deepEqual(result.candidateLinks[0]?.request, { method: "POST", body: { opportunityId: "ABC123" } });
  assert.equal(result.candidateLinks[0]?.stableId, "ABC123");
  assert.equal(result.candidateLinks[0]?.canonicalUrl, "https://www.grants.gov/search-results-detail/ABC123");
  assert.equal(result.fields[0]?.provenance.recordId, "ABC123");
});

test("filters stale and placeholder API records before applying the bounded detail quota", async () => {
  const root = createBenchmarkSources().find((candidate) => candidate.id === "benchmark-grants-gov-arts")!;
  const source = { ...root, config: { ...root.config, recordFilter: { requiredPaths: ["closeDate"], datePath: "closeDate", maximumDaysAhead: 1095 } } };
  const adapter = new JsonApiAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_filtered_api", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "application/json", contentHash: "hash", html: JSON.stringify({ data: { oppHits: [
    { id: "stale", title: "Old grant", closeDate: "2020-01-01" },
    { id: "placeholder", title: "Placeholder grant", closeDate: "2099-01-01" },
    { id: "current", title: "Current grant", closeDate: "2026-12-31" },
  ] } }), rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.deepEqual(result.candidateLinks.map((candidate) => candidate.stableId), ["current"]);
});

test("extracts a Grants.gov detail response against the detail schema", async () => {
  const root = createBenchmarkSources().find((candidate) => candidate.id === "benchmark-grants-gov-arts")!;
  const source = {
    ...root,
    url: "https://api.grants.gov/v1/api/fetchOpportunity",
    config: {
      ...root.config,
      canonicalUrl: "https://www.grants.gov/search-results-detail/ABC123",
      detailRequest: {
        ...(root.config.detailRequest as object),
        detailRecordPath: "data",
        detailFieldMap: {
          id: "id",
          title: "opportunityTitle",
          organization: "synopsis.agencyName",
          description: "synopsis.synopsisDesc",
          deadline: ["originalDueDate", "synopsis.responseDate"],
        },
      },
      destination: { pageRole: "detail" as const },
    },
  };
  const adapter = new JsonApiAdapter();
  const context = { run: createRun(source), source };
  const snapshot = {
    id: "snap_grants_detail",
    runId: context.run.id,
    sourceId: source.id,
    url: source.url,
    finalUrl: source.url,
    fetchedAt: new Date().toISOString(),
    statusCode: 200,
    contentType: "application/json",
    contentHash: "hash",
    html: JSON.stringify({ data: { id: "ABC123", opportunityTitle: "Arts grant", originalDueDate: "2026-12-31", synopsis: { agencyName: "National Arts Agency", synopsisDesc: "Supports new work." } } }),
    rendered: false,
  };

  const result = await adapter.extract({ ...context, snapshot }, snapshot);

  assert.deepEqual(result.fields.map((field) => field.fieldName), ["title", "organization", "description", "deadline"]);
  assert.equal(result.fields[0]?.provenance.sourceUrl, "https://www.grants.gov/search-results-detail/ABC123");
  assert.equal(result.candidateLinks.length, 0);
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

test("posts bounded multipart API queries and selects the next deadline", async () => {
  const source = {
    ...createBenchmarkSources().find((candidate) => candidate.id === "benchmark-grants-gov-arts")!,
    url: "https://api.example.test/search",
    config: {
      transport: "json",
      request: { method: "POST" as const, multipart: { query: { json: { programme: "creative" }, filename: "query.json" }, pageSize: "100" } },
      responseBound: { countPath: "totalResults", maximum: 100 },
      recordPath: "results",
      fieldMap: { id: "reference", url: "url", title: "summary", deadline: "metadata.deadlineDate" },
      constantFields: { organization: "Creative Europe" },
      destination: { pageRole: "landing" as const, rules: [{ role: "detail" as const, patterns: ["/topic-details/"], authority: "destination" as const }] },
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    assert.equal(init?.body instanceof FormData, true);
    assert.equal((init?.body as FormData).get("pageSize"), "100");
    return new Response(JSON.stringify({ totalResults: 1, results: [{ reference: "call-1", summary: "Creative call", url: "https://ec.europa.eu/topic-details/call-1", metadata: { deadlineDate: ["2020-07-01", "2099-09-30"] } }] }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const adapter = new JsonApiAdapter();
    const context = { run: createRun(source), source };
    const snapshot = await adapter.fetch(context);
    const result = await adapter.extract({ ...context, snapshot }, snapshot);
    assert.equal(result.fields.find((field) => field.fieldName === "organization")?.rawValue, "Creative Europe");
    assert.equal(result.fields.find((field) => field.fieldName === "deadline")?.rawValue, "2099-09-30");
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test("candidate replay gate requires two exact, deadline-complete, non-publishing passes", () => {
  const identity = { title: "Example Prize", organization: "Example Arts", deadline: "2026-12-31", canonicalUrl: "https://example.test/prize", key: "example prize::example arts" };
  const field = { fieldName: "deadline", rawValue: "2026-12-31", normalizedValue: "2026-12-31", confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: "https://example.test/prize", snapshotId: "snap" } };
  const artifact = (runId: string) => ({
    run: { id: runId, sourceId: "source", trigger: "shadow" as const, mode: "shadow" as const, status: "completed" as const, createdAt: "2026-08-01T00:00:00.000Z" },
    snapshot: { id: `snap_${runId}`, runId, sourceId: "source", url: "https://example.test", finalUrl: "https://example.test", fetchedAt: "2026-08-01T00:00:00.000Z", statusCode: 200, contentType: "text/html", contentHash: "hash", html: "", rendered: false },
    relatedSnapshots: [],
    extraction: { fields: [field], candidateLinks: [], warnings: [] },
    quality: { decision: "review" as const, score: 1, reasons: [] },
    publisher: {
      decision: "review" as const,
      model: "deterministic" as const,
      publicWrite: false as const,
      rationale: [],
      pipelineVersion: INGESTION_V2_VERSION,
      reconciliation: { decision: "pass" as const, authoritativeUrl: identity.canonicalUrl, sourceIdentity: identity, destinationIdentity: identity, reasons: [] },
      candidateReviews: [{
        candidate: { url: identity.canonicalUrl, canonicalUrl: identity.canonicalUrl, stableId: "one" },
        snapshotId: `snap_${runId}`,
        extraction: { fields: [field], candidateLinks: [], warnings: [] },
        quality: { decision: "review" as const, score: 1, reasons: [] },
        review: { decision: "approve" as const, model: "deterministic" as const, publicWrite: false as const, rationale: [], pipelineVersion: INGESTION_V2_VERSION, reconciliation: { decision: "pass" as const, authoritativeUrl: identity.canonicalUrl, sourceIdentity: identity, destinationIdentity: identity, reasons: [] } },
      }],
    },
    published: false as const,
  });

  const gateNow = new Date("2026-08-01T00:00:00.000Z");
  const incomplete = evaluateCandidateReplayGate([artifact("one")], ["source"], 2, { now: gateNow });
  assert.equal(incomplete.eligible, false);
  assert.match(incomplete.sources[0]?.reasons[0] ?? "", /requires 2 complete passes/);
  const passing = evaluateCandidateReplayGate([artifact("one"), artifact("two")], ["source"], 2, { now: gateNow });
  assert.equal(passing.eligible, true);
  assert.equal(passing.publicWrite, false);
  assert.equal(passing.sources[0]?.deadlineCoverage, 1);
  const duplicate = evaluateCandidateReplayGate([artifact("one"), artifact("two")], ["source"], 2, { now: gateNow, existingCanonicalUrls: new Set([identity.canonicalUrl]) });
  assert.equal(duplicate.eligible, true);
  assert.equal(duplicate.sources[0]?.duplicateCount, 1);
  assert.equal(duplicate.sources[0]?.newCandidateCount, 0);

  const modelVariant = artifact("two");
  modelVariant.publisher.candidateReviews[0]!.extraction.fields.push({
    fieldName: "description",
    rawValue: "A paraphrase that can vary between deterministic-temperature model calls.",
    normalizedValue: "A paraphrase that can vary between deterministic-temperature model calls.",
    confidence: 0.65,
    provenance: { adapterId: "deepseek-html-v2", method: "deepseek-json-shadow", sourceUrl: identity.canonicalUrl, snapshotId: "snap_two" },
  });
  const modelStable = evaluateCandidateReplayGate([artifact("one"), modelVariant], ["source"], 2, { now: gateNow });
  assert.equal(modelStable.sources[0]?.stable, true);
  assert.equal(modelStable.eligible, true);
});

test("candidate handoff reports an exact canonical duplicate without rewriting it", async () => {
  const source = createBenchmarkSources()[0]!;
  const url = "https://example.test/existing-prize";
  const identity = { title: "Existing Prize", organization: "Example Arts", deadline: "2026-12-31", canonicalUrl: url, key: "existing" };
  const fields = [
    { fieldName: "title", rawValue: "Existing Prize", normalizedValue: "Existing Prize", confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: url, snapshotId: "snap" } },
    { fieldName: "organization", rawValue: "Example Arts", normalizedValue: "Example Arts", confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: url, snapshotId: "snap" } },
    { fieldName: "deadline", rawValue: "2026-12-31", normalizedValue: "2026-12-31", confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: url, snapshotId: "snap" } },
    // A fetched organizer page can legitimately have no usable heading. The
    // earlier non-empty directory title must remain the canonical fallback.
    { fieldName: "title", rawValue: "", normalizedValue: "", confidence: 0.1, provenance: { adapterId: "test", method: "empty-destination-heading", sourceUrl: "https://organizer.test/apply", snapshotId: "snap_destination" } },
  ];
  const queries: string[] = [];
  const queryValues: unknown[][] = [];
  const client = {
    query: async (text: string, values: unknown[] = []) => {
      queries.push(text);
      queryValues.push(values);
      if (text.includes("select o.id, o.publication_state")) return { rows: [{ id: "opp_existing", publication_state: "published" }], rowCount: 1 };
      return { rows: [], rowCount: null };
    },
    release: () => undefined,
  };
  const pool = { connect: async () => client };
  const review = { decision: "approve" as const, model: "deterministic" as const, publicWrite: false as const, rationale: [], pipelineVersion: INGESTION_V2_VERSION, reconciliation: { decision: "pass" as const, authoritativeUrl: url, sourceIdentity: identity, destinationIdentity: identity, reasons: [] } };
  const candidate = { candidate: { url, canonicalUrl: url, stableId: "existing" }, snapshotId: "snap", extraction: { fields, candidateLinks: [], warnings: [] }, quality: { decision: "review" as const, score: 1, reasons: [] }, review };
  const artifact = { run: { id: "run", sourceId: source.id, trigger: "shadow" as const, mode: "shadow" as const, status: "completed" as const, createdAt: "2026-08-01T00:00:00.000Z" }, snapshot: { id: "snap", runId: "run", sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: "2026-08-01T00:00:00.000Z", statusCode: 200, contentType: "text/html", contentHash: "hash", html: "", rendered: false }, extraction: { fields, candidateLinks: [], warnings: [] }, publisher: { ...review, candidateReviews: [candidate] }, published: false as const };

  const result = await handoffApprovedCandidate(pool as never, source, artifact, candidate);

  assert.deepEqual(result, { opportunityId: "opp_existing", status: "duplicate-existing", publicationState: "published" });
  assert.equal(queries.some((query) => query.includes("insert into opportunities")), false);
  const duplicateQueryValues = queryValues[queries.findIndex((query) => query.includes("select o.id, o.publication_state"))]!;
  assert.deepEqual(duplicateQueryValues[2], ["existingprize"]);
  assert.deepEqual(duplicateQueryValues[4], ["examplearts"]);
  assert.deepEqual(duplicateQueryValues[5], []);
  assert.equal(queries.some((query) => query.includes("pg_advisory_xact_lock")), true);
});

test("deduplicates distinctive exact titles and deadlines across directory URLs without organizer metadata", async () => {
  const fields = [
    { fieldName: "title", rawValue: "International Emerging Writers Prize", normalizedValue: "International Emerging Writers Prize", confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: "https://newpages.test/listing", snapshotId: "snap" } },
  ];
  let values: unknown[] = [];
  const db = {
    query: async (_text: string, queryValues: unknown[]) => {
      values = queryValues;
      return { rows: [{ id: "opp_from_poets_writers", publication_state: "reviewable" }] };
    },
  };

  const matches = await findCanonicalDuplicateMatches(db as never, { fields, candidateLinks: [], warnings: [] }, "https://newpages.test/listing", "2026-12-31");

  assert.equal(matches[0]?.id, "opp_from_poets_writers");
  assert.deepEqual(values[5], ["internationalemergingwritersprize"]);
  assert.deepEqual(values[4], []);
});

test("closes only expired published v2 opportunities while preserving their public archive state", async () => {
  let query = "";
  const db = {
    query: async (text: string) => {
      query = text;
      return { rows: [{ id: "opp_v2_expired" }] };
    },
  };

  const closed = await closeExpiredPublishedV2Opportunities(db as never);

  assert.deepEqual(closed, ["opp_v2_expired"]);
  assert.match(query, /publication_state = 'published'/);
  assert.match(query, /deadline_date < current_date/);
  assert.match(query, /set status = 'closed'/);
});

test("closes expired exact reviewable v2 evidence without publishing or deleting it", async () => {
  let query = "";
  const db = { query: async (text: string) => { query = text; return { rows: [{ id: "opp_v2_expired_review" }] }; } };
  const closed = await closeExpiredReviewableV2Opportunities(db as never);
  assert.deepEqual(closed, ["opp_v2_expired_review"]);
  assert.match(query, /publication_state = 'reviewable'/);
  assert.match(query, /deadline_kind = 'exact'/);
  assert.match(query, /set status = 'closed'/);
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

test("classifies numeric detail routes only through an anchored source rule", async () => {
  const source = {
    ...createBenchmarkSources()[0]!,
    url: "https://directory.test/competitions",
    config: { destination: { pageRole: "landing" as const, detailLimit: 5, detailPathRegex: "^/\\d+/[a-z0-9-]+$" } },
  };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_numeric", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: '<nav><a href="/about/2026">About 2026</a></nav><main><a href="/1182267/tramod-awards-2026">TraMod Awards</a></main>', rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.deepEqual(result.candidateLinks.map((candidate) => candidate.url), ["https://directory.test/1182267/tramod-awards-2026"]);
  assert.equal(result.candidateLinks[0]?.authority, "destination");
});

test("normalizes unambiguous day-first deadlines and prefers deterministic page evidence", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://directory.test/opportunity", config: { destination: { pageRole: "detail" as const } } };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_day_first", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: "<h1>Icons of Life</h1><p>Deadline: 19/08/2026</p>", rendered: false };
  const extraction = await adapter.extract({ ...context, snapshot }, snapshot);
  extraction.fields.push({ fieldName: "deadline", rawValue: "July 19, 2026", normalizedValue: "July 19, 2026", confidence: 0.65, provenance: { adapterId: "deepseek-html-v2", method: "deepseek-json-shadow", sourceUrl: source.url, snapshotId: snapshot.id } });

  assert.equal(extraction.fields[1]?.normalizedValue, "2026-08-19");
  assert.deepEqual(resolveCurrentDeadline(extraction.fields, source.url, new Date("2026-08-17T00:00:00.000Z")), { date: "2026-08-19", conflict: false, values: ["2026-07-19", "2026-08-19"], kind: "exact" });

  const modelOnly = extraction.fields.filter((field) => field.provenance.method === "deepseek-json-shadow");
  modelOnly.push({ ...modelOnly[0]!, rawValue: "September 19, 2026", normalizedValue: "September 19, 2026" });
  assert.deepEqual(resolveCurrentDeadline(modelOnly, source.url, new Date("2026-08-17T00:00:00.000Z")), { date: null, conflict: true, values: ["2026-07-19", "2026-09-19"], kind: "unknown" });
});

test("prefers the first-party destination deadline over a conflicting directory date", () => {
  const fields = [
    { fieldName: "deadline", rawValue: "October 16, 2026", normalizedValue: "October 16, 2026", confidence: 0.8, provenance: { adapterId: "generic-html-v2", method: "html-deadline-label", sourceUrl: "https://directory.test/competition", snapshotId: "snap_directory" } },
    { fieldName: "deadline", rawValue: "1 October 2026", normalizedValue: "1 October 2026", confidence: 0.8, provenance: { adapterId: "generic-html-v2", method: "html-deadline-label", sourceUrl: "https://official.test/competition?utm_source=directory", snapshotId: "snap_official" } },
  ];

  assert.deepEqual(resolveCurrentDeadline(fields, "https://official.test/competition", new Date("2026-08-17T00:00:00.000Z")), {
    date: "2026-10-01",
    conflict: false,
    values: ["2026-10-01", "2026-10-16"],
    kind: "exact",
  });
});

test("accepts explicit rolling windows and resolves phased deadlines to the next current phase", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://official.test/call", config: { destination: { pageRole: "detail" as const } } };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const rollingSnapshot = { id: "snap_rolling", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "rolling", html: "<h1>Submissions</h1><p>Submissions are accepted on a rolling basis.</p>", rendered: false };
  const rolling = await adapter.extract({ ...context, snapshot: rollingSnapshot }, rollingSnapshot);
  assert.equal(hasCurrentDeadlineOrWindow(rolling.fields, source.url, new Date("2026-08-17T00:00:00.000Z")), true);
  assert.equal(resolveCurrentDeadline(rolling.fields, source.url).kind, "rolling");

  const phasedSnapshot = { ...rollingSnapshot, id: "snap_phased", contentHash: "phased", html: "<h1>Pitch</h1><p>Early bird deadline: September 13, 2026. Final deadline: November 13, 2026.</p>" };
  const phased = await adapter.extract({ ...context, snapshot: phasedSnapshot }, phasedSnapshot);
  assert.deepEqual(resolveCurrentDeadline(phased.fields, source.url, new Date("2026-08-17T00:00:00.000Z")), { date: "2026-09-13", conflict: false, values: ["2026-09-13", "2026-11-13"], kind: "exact" });
});

test("recognizes year-round and current seasonal intake without inventing dates", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://official.test/call", config: { destination: { pageRole: "detail" as const } } };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_year_round", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "year-round", html: "<h1>Submissions</h1><p>Applications are accepted year-round.</p>", rendered: false };
  const yearRound = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.equal(resolveCurrentDeadline(yearRound.fields, source.url).kind, "year-round");
  assert.equal(hasCurrentDeadlineOrWindow(yearRound.fields, source.url), true);

  const seasonalSnapshot = { ...snapshot, id: "snap_seasonal", contentHash: "seasonal", html: "<h1>Autumn submissions</h1><p>Seasonal submissions are open.</p>" };
  const seasonal = await adapter.extract({ ...context, snapshot: seasonalSnapshot }, seasonalSnapshot);
  assert.equal(resolveCurrentDeadline(seasonal.fields, source.url).kind, "seasonal");
});

test("rejects roundup identities as aggregate evidence rather than one opportunity", () => {
  const extraction = { fields: [{ fieldName: "title", rawValue: "Best Literary Magazines: 100+ Places to Submit in 2026", normalizedValue: "Best Literary Magazines: 100+ Places to Submit in 2026", confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: "https://reedsy.test/resources/literary-magazines", snapshotId: "snap" } }], candidateLinks: [], warnings: [] };
  assert.equal(isAggregateOpportunityPage(extraction, "https://reedsy.test/resources/literary-magazines"), true);
});

test("rejects known directory and funding-guide URLs before canonical handoff", () => {
  const extraction = { fields: [{ fieldName: "title", rawValue: "Mobility Funding Guide to Moldova", normalizedValue: "Mobility Funding Guide to Moldova", confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: "https://on-the-move.org/resources/funding/mobility-funding-guide-moldova", snapshotId: "snap" } }], candidateLinks: [], warnings: [] };
  assert.equal(isAggregateOpportunityPage(extraction, "https://on-the-move.org/news/deadlines"), true);
  assert.equal(isAggregateOpportunityPage(extraction, "https://on-the-move.org/resources/funding/mobility-funding-guide-moldova"), true);
  assert.equal(isAggregateOpportunityPage(extraction, "https://on-the-move.org/news/example-current-open-call"), false);
  assert.equal(isAggregateOpportunityPage(extraction, "https://www.curatorspace.com/opportunities/index/page/9?orderBy=deadline"), true);
  assert.equal(isAggregateOpportunityPage(extraction, "https://www.transartists.org/en/air/sapporo-artist-residence"), true);
  assert.equal(isAggregateOpportunityPage(extraction, "https://www.transartists.org/en/deadlines"), true);
  assert.equal(isAggregateOpportunityPage(extraction, "https://www.transartists.org/en/news/current-open-call"), false);
});

test("keeps source coverage separate from each Chill Subs opportunity art form", () => {
  const chill = createFirstTrancheSources().find((source) => (source.config.sourceManifest as { id?: string } | undefined)?.id === "chill-subs-contests");
  assert.ok(chill);
  const extraction = (title: string) => ({ fields: [{ fieldName: "title", rawValue: title, normalizedValue: title, confidence: 1, provenance: { adapterId: "test", method: "fixture", sourceUrl: chill.url, snapshotId: "snap" } }], candidateLinks: [], warnings: [] });
  assert.deepEqual(opportunityTaxonomyTermIds(chill, extraction("Resonance Issue One — Cover Art Submissions")), []);
  const poetry = opportunityTaxonomyTermIds(chill, extraction("Sublingua Prize for Poetry"));
  assert.ok(poetry.includes("taxterm_pf-writing-and-literature"));
  assert.ok(poetry.length > 1);
  assert.ok(opportunityTaxonomyTermIds(chill, extraction("Flash Creative Nonfiction Contest")).length > 1);
  assert.ok(opportunityTaxonomyTermIds(chill, extraction("Flash Fiction Contest")).length > 1);
});

test("prefers an explicit source-card extension over a stale application deadline", () => {
  const fields = [
    { fieldName: "deadline", rawValue: "August 18, 2026", normalizedValue: "August 18, 2026", confidence: 0.9, provenance: { adapterId: "generic-html-v2", method: "html-link-context-deadline", sourceUrl: "https://publisher.test/deadlines", snapshotId: "snap_publisher" } },
    { fieldName: "deadline", rawValue: "July 31, 2026", normalizedValue: "July 31, 2026", confidence: 0.8, provenance: { adapterId: "generic-html-v2", method: "html-deadline-label", sourceUrl: "https://apply.test/program", snapshotId: "snap_apply" } },
  ];
  assert.equal(resolveCurrentDeadline(fields, "https://apply.test/program", new Date("2026-08-17T00:00:00.000Z")).date, "2026-08-18");
});

test("extracts explicit day-month-name deadlines used by international sources", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://directory.test/opportunity", config: { destination: { pageRole: "detail" as const } } };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_day_month_name", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: "<h1>International Call</h1><p>Deadline: 14 September 2026</p>", rendered: false };
  const extraction = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.equal(extraction.fields.find((field) => field.fieldName === "deadline")?.normalizedValue, "14 September 2026");
  assert.equal(resolveCurrentDeadline(extraction.fields, source.url, new Date("2026-08-17T00:00:00.000Z")).date, "2026-09-14");
});

test("extracts explicit dates after descriptive deadline wording", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://directory.test/opportunity", config: { destination: { pageRole: "detail" as const } } };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_deadline_phrase", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: "<h1>Board Call</h1><p>The deadline for submitting nominations is 05 October 2026.</p>", rendered: false };
  const extraction = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.equal(resolveCurrentDeadline(extraction.fields, source.url, new Date("2026-08-17T00:00:00.000Z")).date, "2026-10-05");
});

test("extracts a platform final deadline when the date precedes its label", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://festivals.test/festival/1", config: { destination: { pageRole: "detail" as const } } };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_reverse_deadline", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: "<h1>Example Festival</h1><p>22 Jul 2026 Call for entries</p><p>24 Aug 2026 Final deadline</p><p>10 Sep 2026 Notification date</p>", rendered: false };
  const extraction = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.equal(extraction.fields.find((field) => field.fieldName === "deadline")?.normalizedValue, "24 Aug 2026");
});

test("stabilizes dynamic directory cards by configured canonical URL order", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://directory.test/", config: { destination: { pageRole: "landing" as const, candidateOrder: "url" as const, rules: [{ role: "detail" as const, patterns: ["/opportunity/"], authority: "destination" as const }] } } };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_ordered_cards", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: '<a href="/opportunity/20">Second</a><a href="/opportunity/10">First</a>', rendered: false };
  const extraction = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.deepEqual(extraction.candidateLinks.map((candidate) => candidate.url), ["https://directory.test/opportunity/10", "https://directory.test/opportunity/20"]);
});

test("unwraps Google outbound redirect links before destination classification", async () => {
  const source = { ...createBenchmarkSources()[0]!, url: "https://directory.test/opportunity", config: { destination: { pageRole: "landing" as const } } };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const target = "https://official.test/open-call";
  const snapshot = { id: "snap_google_redirect", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: `<a href="https://www.google.com/url?sa=D&amp;q=${encodeURIComponent(target)}">Apply for the open call</a>`, rendered: false };
  const extraction = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.equal(extraction.candidateLinks[0]?.url, target);
});

test("scopes official publisher card fields to its external application link", async () => {
  const source = {
    ...createBenchmarkSources()[0]!,
    url: "https://publisher.test/deadlines",
    config: { destination: { pageRole: "landing" as const, allowedHosts: ["apply.test"], rules: [{ role: "apply" as const, patterns: ["/program/"], authority: "destination" as const }], sourceCard: { organization: "Official Publisher" } } },
  };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_source_cards", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: '<nav><a href="/apply">Apply</a></nav><main><h2>First Fellowship</h2><p>Deadline: August 25, 2026</p><a href="https://apply.test/program/first">Apply Now</a><h2>Second Fellowship</h2><p>Deadline: September 30, 2026</p><a href="https://apply.test/program/second">Apply Now</a></main>', rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.deepEqual(result.candidateLinks.map((candidate) => candidate.url), ["https://apply.test/program/first", "https://apply.test/program/second"]);
  assert.deepEqual(result.fields.filter((field) => field.provenance.recordId === "https://apply.test/program/second").map((field) => [field.fieldName, field.normalizedValue]), [["title", "Second Fellowship"], ["organization", "Official Publisher"], ["deadline", "September 30, 2026"]]);
});

test("filters dated call listings and normalizes short US deadlines from link cards", async () => {
  const source = {
    ...createBenchmarkSources()[0]!,
    url: "https://jobs.test/listings",
    config: { destination: { pageRole: "landing" as const, requiredLinkRegex: "(?:deadline\\s*:?\\s*)?\\b(?:0?[1-9]|1[0-2])[.\\/-](?:0?[1-9]|[12]\\d|3[01])[.\\/-]\\d{2}\\b", rules: [{ role: "detail" as const, patterns: ["/job/"], authority: "destination" as const }], sourceCard: { titleClassName: "tile-title", deadlineFromLinkLabel: "mdy-short" as const } } },
  };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_dated_calls", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: '<a href="/job/general-manager"><div class="tile-title">General Manager</div></a><a href="/job/actors-deadline-09-06-26"><div class="tile-title">Actors - Submission (Deadline: 09.06.26)</div></a>', rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.deepEqual(result.candidateLinks.map((candidate) => candidate.url), ["https://jobs.test/job/actors-deadline-09-06-26"]);
  assert.deepEqual(result.fields.map((field) => [field.fieldName, field.normalizedValue]), [["title", "Actors - Submission (Deadline: 09.06.26)"], ["deadline", "2026-09-06"]]);
});

test("extracts current first-party records from configured embedded JSON", async () => {
  const source = {
    ...createBenchmarkSources()[0]!,
    url: "https://directory.test/opportunities",
    config: {
      embeddedJson: {
        scriptId: "__NEXT_DATA__",
        recordPath: "props.pageProps.opportunities.data",
        fieldMap: { id: "id", url: ["contact.url", "apply.onlineForm"], title: "title", organization: "profile.organizationName", deadline: "deadline" },
        requiredEquals: { "attributes.isPublished": true, "attributes.isPending": false },
        datePath: "deadline",
        maximumDaysAhead: 1095,
      },
      destination: { pageRole: "landing" as const, detailLimit: 5 },
    },
  };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const payload = { props: { pageProps: { opportunities: { data: [
    { id: "current", title: "Current Residency", profile: { organizationName: "Host Arts" }, deadline: "2026-12-31T23:00:00Z", contact: { url: "https://host.test/current" }, attributes: { isPublished: true, isPending: false } },
    { id: "pending", title: "Pending Call", deadline: "2026-12-31T23:00:00Z", contact: { url: "https://host.test/pending" }, attributes: { isPublished: false, isPending: true } },
    { id: "expired", title: "Expired Call", deadline: "2020-01-01T00:00:00Z", contact: { url: "https://host.test/expired" }, attributes: { isPublished: true, isPending: false } },
  ] } } } };
  const snapshot = { id: "snap_embedded_json", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script>`, rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.deepEqual(result.candidateLinks.map((candidate) => candidate.url), ["https://host.test/current"]);
  assert.deepEqual(result.fields.filter((field) => field.provenance.recordId === "current").map((field) => field.fieldName), ["title", "organization", "deadline"]);
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

test("follows a bounded directory listing to the organizer first-party page", async () => {
  const source = {
    ...createBenchmarkSources()[0]!,
    id: "newpages-test",
    name: "NewPages Calls and Contests",
    url: "https://www.newpages.test/classifieds-fee/all/",
    config: {
      destination: {
        pageRole: "landing" as const,
        detailLimit: 5,
        rules: [{ role: "detail" as const, patterns: ["/guide-submission-opportunities/"], authority: "destination" as const }],
        firstPartyHop: { articleOnly: true, limit: 1, excludedHosts: ["npofficespace.test"] },
      },
    },
  };
  const registry = new AdapterRegistry().register(new GenericHtmlAdapter());
  const store = new MemoryShadowRunStore();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /", { status: 200 });
    if (url.endsWith("/classifieds-fee/all/")) {
      return new Response('<nav><a href="/submission-opportunities/">Submit</a></nav><main><a href="/guide-submission-opportunities/example-prize/">Example Prize</a></main>', { status: 200, headers: { "content-type": "text/html" } });
    }
    if (url.endsWith("/guide-submission-opportunities/example-prize/")) {
      return new Response('<main><h1>Example Prize</h1><p>Deadline: October 1, 2026</p><a href="https://npofficespace.test/listing-request/">Submit listing</a><a href="https://organizer.test/contests/example-prize/">Official contest page</a></main>', { status: 200, headers: { "content-type": "text/html" } });
    }
    return new Response("<main><h1>Example Prize</h1><p>Applications close October 1, 2026.</p></main>", { status: 200, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  try {
    const artifact = await executeShadowPipeline(registry, source, shadowJob(source, { runId: "ingv2_first_party_hop" }), store);
    assert.equal(artifact.relatedSnapshots?.length, 2);
    assert.equal(artifact.publisher?.candidateReviews?.length, 1);
    assert.equal(artifact.publisher?.candidateReviews?.[0]?.candidate.url, "https://organizer.test/contests/example-prize/");
    assert.equal(artifact.publisher?.candidateReviews?.[0]?.review.reconciliation.authoritativeUrl, "https://organizer.test/contests/example-prize/");
    assert.equal(artifact.publisher?.candidateReviews?.[0]?.extraction.fields.some((field) => field.fieldName === "deadline"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("classifies an unquoted first-party application link from submitted directory HTML", async () => {
  const source = {
    ...createBenchmarkSources()[0]!,
    url: "https://directory.test/open-calls/",
    config: { destination: { pageRole: "detail" as const, firstPartyHop: { articleOnly: true, limit: 1, excludedHosts: ["pixelgrade.com"] } } },
  };
  const adapter = new GenericHtmlAdapter();
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_unquoted_application", runId: context.run.id, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: '<main><h1>Residency</h1><p>Application deadline 2026-10-01</p><h5>Link to more information</h5><span><a href=https://forms.example/apply target="_blank">Apply</span></main>', rendered: false };

  const result = await adapter.extract({ ...context, snapshot }, snapshot);

  assert.equal(result.candidateLinks[0]?.url, "https://forms.example/apply");
  assert.equal(result.candidateLinks[0]?.authority, "destination");
  assert.match(result.candidateLinks[0]?.title ?? "", /Link to more information/i);
});

test("keeps multi-opportunity publisher decisions scoped to each destination", async () => {
  const source = {
    ...createBenchmarkSources()[0]!,
    url: "https://example.test/grants",
    config: {
      destination: {
        pageRole: "landing" as const,
        detailLimit: 2,
        rules: [{ role: "detail" as const, patterns: ["/writing_contests/"], authority: "destination" as const }],
      },
    },
  };
  const registry = new AdapterRegistry().register(new GenericHtmlAdapter());
  const store = new MemoryShadowRunStore();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /", { status: 200 });
    if (url.endsWith("/grants")) return new Response('<a href="/writing_contests/one">First Prize</a><a href="/writing_contests/two">Second Prize</a>', { status: 200, headers: { "content-type": "text/html" } });
    if (url.endsWith("/one")) return new Response("<h1>First Prize</h1><p>Deadline: 2026-10-01</p>", { status: 200, headers: { "content-type": "text/html" } });
    return new Response("<h1>Second Prize</h1><p>Deadline: 2026-11-01</p>", { status: 200, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  try {
    const artifact = await executeShadowPipeline(registry, source, shadowJob(source, { runId: "ingv2_candidate_scope" }), store);
    assert.equal(artifact.publisher?.decision, "review");
    assert.equal(artifact.publisher?.candidateReviews?.length, 2);
    assert.deepEqual(
      artifact.publisher?.candidateReviews?.map((candidate) => candidate.extraction.fields.find((field) => field.fieldName === "title")?.normalizedValue),
      ["First Prize", "Second Prize"],
    );
    assert.deepEqual(
      artifact.publisher?.candidateReviews?.map((candidate) => candidate.review.reconciliation.authoritativeUrl),
      ["https://example.test/writing_contests/one", "https://example.test/writing_contests/two"],
    );
    assert.match(artifact.publisher?.rationale[0] ?? "", /2 distinct opportunity candidates/);
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
