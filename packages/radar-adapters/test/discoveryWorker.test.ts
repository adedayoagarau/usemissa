import test from "node:test";
import assert from "node:assert/strict";
import {
  discoveryBatchSize,
  discoveryPolicyFromRobots,
  discoveryRequestHeaders,
  discoverySourceFromLink,
  discoverySourceInsertPlaceholders,
  discoverySourceUpdatePlaceholders,
  extractDiscoveryLinks,
  isDiscoverySource,
  mergeDiscoveredSourceMetadata,
} from "../src/discoveryWorker.js";
import type { Source } from "@missa/radar-engine";

test("discovery extracts bounded call links and drops assets", () => {
  const html = `
    <a href="/calls/summer-open-call">Summer open call</a>
    <a href="https://example.org/apply/grant">Apply for grant</a>
    <a href="/images/apply.png">Apply image</a>
    <a href="/calls/summer-open-call#details">Duplicate</a>
    <a href="mailto:hello@example.org">Email</a>
  `;
  const links = extractDiscoveryLinks(html, "https://directory.example.org/list", 10);
  assert.deepEqual(links.map((link) => link.url), [
    "https://directory.example.org/calls/summer-open-call",
    "https://example.org/apply/grant",
  ]);
});

test("discovery batch is bounded for hosted workers", () => {
  assert.equal(discoveryBatchSize("1000"), 250);
  assert.equal(discoveryBatchSize("not-a-number"), 100);
});

test("discovery selects only explicitly opted-in Postgres sources", () => {
  assert.equal(isDiscoverySource({ active: true, followsOutboundLinks: true }), true);
  assert.equal(isDiscoverySource({ active: true, followsOutboundLinks: false }), false);
  assert.equal(isDiscoverySource({ active: true, followsOutboundLinks: undefined }), false);
  assert.equal(isDiscoverySource({ active: false, followsOutboundLinks: true }), false);
});

test("discovery persistence declares VALUES parameter types", () => {
  assert.deepEqual(discoverySourceUpdatePlaceholders(2), [
    "($1::text, $2::boolean, $3::jsonb)",
    "($4::text, $5::boolean, $6::jsonb)",
  ]);
  assert.deepEqual(discoverySourceInsertPlaceholders(1), [
    "($1::text, $2::text, $3::boolean, $4::jsonb)",
  ]);
});

test("discovery-created sources preserve adapter tier and provenance", () => {
  const parent: Source = {
    id: "directory-source",
    name: "Directory",
    url: "https://directory.example/calls",
    kind: "directory",
    registryTier: 2,
    registryVerticalId: "literary-fiction",
    registryDisciplines: ["fiction"],
    registryGeography: ["global"],
    registryOpportunityTypes: ["open-call"],
    followsOutboundLinks: true,
    checkIntervalHours: 48,
    active: true,
    consecutiveFailures: 0,
  };

  const child = discoverySourceFromLink(parent, {
    url: "https://directory.example/call/example/",
    title: "Example call",
    kind: "directory",
    registryTier: 2,
    followsOutboundLinks: true,
    discoveryAdapterId: "directory-detail",
    discoveredFromSourceId: parent.id,
  }, "child-source", 24);

  assert.equal(child.id, "child-source");
  assert.equal(child.kind, "directory");
  assert.equal(child.registryTier, 2);
  assert.equal(child.followsOutboundLinks, true);
  assert.equal(child.discoveryAdapterId, "directory-detail");
  assert.equal(child.discoveredFromSourceId, parent.id);
  assert.deepEqual(child.registryDisciplines, ["fiction"]);
});

test("discovery self-heals an existing generic child with its site schema", () => {
  const existing: Source = {
    id: "existing-child",
    name: "Example call",
    url: "https://directory.example/call/example/",
    kind: "organization-website",
    registryTier: 0,
    followsOutboundLinks: false,
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
  };

  assert.equal(mergeDiscoveredSourceMetadata(existing, {
    url: existing.url,
    kind: "directory",
    registryTier: 2,
    followsOutboundLinks: true,
    discoveryAdapterId: "directory-detail",
  }, "directory-source"), true);
  assert.equal(existing.kind, "directory");
  assert.equal(existing.registryTier, 2);
  assert.equal(existing.followsOutboundLinks, true);
  assert.equal(existing.discoveryAdapterId, "directory-detail");
  assert.equal(existing.discoveredFromSourceId, "directory-source");
});

test("discovery sends persisted validators on freshness checks", () => {
  const headers = discoveryRequestHeaders({
    id: "source-with-validators",
    name: "Source",
    url: "https://example.org/calls",
    kind: "directory",
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
    discoveryEtag: '\"abc123\"',
    discoveryLastModified: "Mon, 10 Aug 2026 10:00:00 GMT",
  });

  assert.equal(headers["if-none-match"], '\"abc123\"');
  assert.equal(headers["if-modified-since"], "Mon, 10 Aug 2026 10:00:00 GMT");
});

test("discovery honors robots exclusions and crawl delay", () => {
  const robots = `
    User-agent: *
    Disallow: /private
    Crawl-delay: 10
  `;
  assert.deepEqual(discoveryPolicyFromRobots(robots, "https://example.org/private/call", 1_000), {
    allowed: false,
    delayMs: 10_000,
  });
  assert.deepEqual(discoveryPolicyFromRobots(robots, "https://example.org/open-call", 1_000), {
    allowed: true,
    delayMs: 10_000,
  });
});
