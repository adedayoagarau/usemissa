import test from "node:test";
import assert from "node:assert/strict";
import {
  HttpTaxonomySearchProvider,
  SerperTaxonomySearchProvider,
  parseTaxonomySearchResponse,
  taxonomyDiscoveryBatchSize,
  taxonomyDiscoveryResultLimit,
  TAXONOMY_CANDIDATE_SCHEMA_PROBE,
  TAXONOMY_EXISTING_URLS_QUERY,
} from "../src/taxonomyDiscoveryWorker.js";
import { Pool } from "pg";

test("taxonomy candidate SQL uses the canonical URL columns", () => {
  assert.match(TAXONOMY_CANDIDATE_SCHEMA_PROBE, /select url, normalized_url from source_discovery_candidates/i);
  assert.match(TAXONOMY_EXISTING_URLS_QUERY, /source_discovery_candidates where normalized_url/i);
  assert.match(TAXONOMY_EXISTING_URLS_QUERY, /data->>'url'/i);
  assert.doesNotMatch(TAXONOMY_EXISTING_URLS_QUERY, /from radar_sources\s+where\s+url\b/i);
});

test("taxonomy candidate schema probe executes against Postgres when configured", { skip: !process.env.DATABASE_URL }, async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query(TAXONOMY_CANDIDATE_SCHEMA_PROBE);
    assert.equal(result.fields.map((field) => field.name).join(","), "url,normalized_url");
  } finally {
    await pool.end();
  }
});

test("taxonomy discovery provider output is bounded, normalized, and safe", () => {
  const response = parseTaxonomySearchResponse({
    nextCursor: " page-2 ",
    results: [
      { url: "HTTPS://Example.org/calls/summer/#details", title: "  Summer call  ", score: 120, proposedKind: "directory" },
      { url: "https://example.org/calls/summer", title: "duplicate" },
      { url: "javascript:alert(1)", title: "unsafe" },
      { url: "https://example.org/calls/other", robotsAllowed: false, blockedReason: "robots.txt" },
    ],
  }, 10);

  assert.deepEqual(response.nextCursor, "page-2");
  assert.equal(response.results.length, 2);
  assert.equal(response.results[0]?.url, "https://example.org/calls/summer");
  assert.equal(response.results[0]?.score, 100);
  assert.equal(response.results[1]?.robotsAllowed, false);
});

test("taxonomy discovery bounds hosted work", () => {
  assert.equal(taxonomyDiscoveryBatchSize("1000"), 50);
  assert.equal(taxonomyDiscoveryBatchSize("nope"), 8);
  assert.equal(taxonomyDiscoveryResultLimit("1000"), 50);
  assert.equal(taxonomyDiscoveryResultLimit("nope"), 25);
});

test("taxonomy discovery keeps policy fields for human review", () => {
  const response = parseTaxonomySearchResponse({ results: [{ url: "https://example.org/call", termsAllowed: false, title: "Call" }] });
  assert.equal(response.results[0]?.termsAllowed, false);
  assert.equal(response.results[0]?.title, "Call");
});

test("taxonomy search requests carry the canonical coverage context", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = (async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ results: [{ url: "https://example.org/poetry-grant" }] }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const provider = new HttpTaxonomySearchProvider("https://search.internal.test/query", "token");
    await provider.search({
      query: "Poetry grant NG en open call",
      locale: "en",
      limit: 5,
      context: {
        opportunityType: "grant",
        geographyCode: "NG",
        languageCode: "en",
        sourceTier: 0,
        taxonomyTerms: [{ id: "term-poetry", label: "Poetry", facet: "discipline" }],
      },
    });
    assert.deepEqual(requestBody?.context, {
      opportunityType: "grant",
      geographyCode: "NG",
      languageCode: "en",
      sourceTier: 0,
      taxonomyTerms: [{ id: "term-poetry", label: "Poetry", facet: "discipline" }],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Serper results map into bounded source candidates and paginate", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  let requestHeaders: HeadersInit | undefined;
  globalThis.fetch = (async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    requestHeaders = init?.headers;
    return new Response(JSON.stringify({
      organic: [
        { link: "https://example.org/poetry-grant", title: "Poetry grant", snippet: "A call", position: 1 },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const provider = new SerperTaxonomySearchProvider("secret");
    const response = await provider.search({
      query: "Poetry grant NG open call",
      locale: "en-US",
      limit: 1,
      context: {
        opportunityType: "grant",
        geographyCode: "NG",
        languageCode: "en",
        sourceTier: 0,
        taxonomyTerms: [{ id: "term-poetry", label: "Poetry", facet: "discipline" }],
      },
    });
    assert.equal(requestBody?.gl, "ng");
    assert.equal(requestBody?.hl, "en");
    assert.equal((requestHeaders as Record<string, string>)?.["X-API-KEY"], "secret");
    assert.equal(response.results[0]?.url, "https://example.org/poetry-grant");
    assert.equal(response.nextCursor, "2");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
