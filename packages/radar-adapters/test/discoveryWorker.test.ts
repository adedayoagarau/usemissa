import test from "node:test";
import assert from "node:assert/strict";
import {
  discoveryBatchSize,
  discoveryIntervalHoursForSource,
  discoveryPolicyFromRobots,
  discoveryRequestHeaders,
  sourceDiscoveryLinkLimit,
  discoverySourceFromLink,
  discoverySourceInsertPlaceholders,
  discoverySourceUpdatePlaceholders,
  extractDiscoveryLinks,
  discoveryIdentityKey,
  isDiscoverySource,
  mergeDiscoveredSourceMetadata,
  reconcileMachineDiscoveredChildren,
  prioritizeDiscoverySources,
  reconcileDiscoveredChildren,
} from "../src/discoveryWorker.js";

test("machine records use external identity so one page can expose concurrent calls", () => {
  assert.notEqual(
    discoveryIdentityKey({ url: "https://ec.europa.eu/call/shared", discoveryExternalId: "eu-ft:one" }),
    discoveryIdentityKey({ url: "https://ec.europa.eu/call/shared", discoveryExternalId: "eu-ft:two" }),
  );
});

test("a machine record follows its official URL when the stable external ID moves", () => {
  const source: Source = {
    id: "machine-child", name: "Call", url: "https://example.eu/old", kind: "organization-website",
    active: true, checkIntervalHours: 24, consecutiveFailures: 0, discoveryExternalId: "eu-ft:one",
  };
  assert.equal(mergeDiscoveredSourceMetadata(source, {
    url: "https://example.eu/new", discoveryExternalId: "eu-ft:one", title: "Call",
  }), true);
  assert.equal(source.url, "https://example.eu/new");
});

test("new first-party API evidence makes an existing machine source immediately due", () => {
  const source: Source = {
    id: "machine-child", name: "Call", url: "https://example.eu/call", kind: "organization-website",
    active: true, checkIntervalHours: 24, consecutiveFailures: 0, discoveryExternalId: "eu-ft:one",
    nextCheckAt: "2026-08-13T00:00:00.000Z",
  };
  assert.equal(mergeDiscoveredSourceMetadata(source, {
    url: source.url,
    discoveryExternalId: source.discoveryExternalId,
    discoveryMachineRecord: {
      title: "Call", deadlineDate: "2026-09-01", evidenceUrl: "https://api.example.eu",
    },
  }), true);
  assert.equal(source.nextCheckAt, undefined);
});
import type { Source } from "@missa/radar-engine";

test("discovery reconciliation retires stale provenance children", () => {
  const current: Source[] = [
    {
      id: "current-child",
      name: "Current call",
      url: "https://host.example/current-call",
      kind: "organization-website",
      active: true,
      checkIntervalHours: 24,
      consecutiveFailures: 0,
      discoveredFromSourceId: "parent-source",
    },
    {
      id: "stale-child",
      name: "Old archive",
      url: "https://host.example/issues/old",
      kind: "organization-website",
      active: true,
      checkIntervalHours: 24,
      consecutiveFailures: 0,
      discoveredFromSourceId: "parent-source",
    },
    {
      id: "stale-grandchild",
      name: "Old canonical host",
      url: "https://official.example/old-call",
      kind: "organization-website",
      active: true,
      checkIntervalHours: 24,
      consecutiveFailures: 0,
      discoveredFromSourceId: "stale-child",
    },
  ];

  assert.deepEqual(
    reconcileDiscoveredChildren(current, "parent-source", [
      { url: "https://host.example/current-call", title: "Current call" },
    ]).map((source) => source.id),
    ["stale-child", "stale-grandchild"],
  );
  assert.equal(current[0]?.active, true);
  assert.equal(current[1]?.active, false);
  assert.equal(current[2]?.active, false);
});

test("machine-feed reconciliation schedules one final check without deleting history", () => {
  const current: Source[] = [{
    id: "grant-child",
    name: "An arts grant",
    url: "https://www.grants.gov/search-results-detail/123",
    kind: "organization-website",
    active: true,
    checkIntervalHours: 24,
    consecutiveFailures: 0,
    discoveredFromSourceId: "grants-parent",
    discoveryExternalId: "grants.gov:123",
    discoveryExternalStatus: "posted",
    nextCheckAt: "2026-08-20T00:00:00.000Z",
  }];

  assert.deepEqual(reconcileMachineDiscoveredChildren(current, "grants-parent", []), [current[0]]);
  assert.equal(current[0]?.active, true);
  assert.equal(current[0]?.discoveryExternalStatus, "retired");
  assert.equal(current[0]?.checkIntervalHours, 8_760);
  assert.equal(current[0]?.nextCheckAt, undefined);
  assert.deepEqual(reconcileMachineDiscoveredChildren(current, "grants-parent", []), []);
});

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

test("large finite directories may raise their own limit within the hard ceiling", () => {
  assert.equal(sourceDiscoveryLinkLimit({ discoveryLinkLimit: 400 }, 50), 400);
  assert.equal(sourceDiscoveryLinkLimit({ discoveryLinkLimit: 5_000 }, 50), 1_000);
  assert.equal(sourceDiscoveryLinkLimit({}, 50), 50);
});

test("named site schemas honor their source freshness cadence", () => {
  assert.equal(discoveryIntervalHoursForSource({ checkIntervalHours: 24, discoveryAdapterId: "resartis-index" }, 48), 24);
  assert.equal(discoveryIntervalHoursForSource({ checkIntervalHours: 24 }, 48), 48);
});

test("discovery selects only explicitly opted-in Postgres sources", () => {
  assert.equal(isDiscoverySource({ active: true, followsOutboundLinks: true }), true);
  assert.equal(isDiscoverySource({ active: true, followsOutboundLinks: false }), false);
  assert.equal(isDiscoverySource({ active: true, followsOutboundLinks: undefined }), false);
  assert.equal(isDiscoverySource({ active: false, followsOutboundLinks: true }), false);
});

test("discovery prioritizes site adapters before the generic backlog", () => {
  const source = (id: string, options: Partial<Source> = {}): Source => ({
    id,
    name: id,
    url: `https://${id}.example/calls`,
    kind: "directory",
    checkIntervalHours: 48,
    active: true,
    consecutiveFailures: 0,
    followsOutboundLinks: true,
    ...options,
  });

  const ordered = prioritizeDiscoverySources([
    source("generic-unchecked"),
    source("adapter-recent", {
      discoveryAdapterId: "source-detail",
      discoveryLastCheckedAt: "2026-08-11T00:00:00.000Z",
    }),
    source("adapter-unchecked", { discoveryAdapterId: "source-index" }),
    source("generic-old", { discoveryLastCheckedAt: "2026-08-01T00:00:00.000Z" }),
  ]);

  assert.deepEqual(ordered.map(({ id }) => id), [
    "adapter-unchecked",
    "adapter-recent",
    "generic-unchecked",
    "generic-old",
  ]);
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

test("discovery replaces a hostname placeholder with the call context", () => {
  const existing: Source = {
    id: "existing-canonical",
    name: "example.org/apply",
    url: "https://example.org/apply",
    kind: "organization-website",
    registryTier: 0,
    followsOutboundLinks: false,
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
  };

  assert.equal(mergeDiscoveredSourceMetadata(existing, {
    url: existing.url,
    title: "North River Poetry Prize",
    kind: "organization-website",
    registryTier: 0,
    followsOutboundLinks: false,
  }, "directory-source"), true);
  assert.equal(existing.name, "North River Poetry Prize");
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

test("browser-compatible discovery requests remain explicitly identified as Missa", () => {
  const headers = discoveryRequestHeaders({
    id: "browser-compatible-source",
    name: "Directory",
    url: "https://directory.example/calls",
    kind: "directory",
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
    discoveryRequestProfile: "browser-compatible",
  });

  assert.match(headers["user-agent"] ?? "", /MissaRadar\/1\.0/);
  assert.match(headers["user-agent"] ?? "", /usemissa\.com/);
  assert.equal(headers.from, "radar@usemissa.com");
});

test("robots policy evaluates the actual browser-compatible user agent", () => {
  const robots = `
    User-agent: *
    Disallow: /admin/

    User-agent: Disco
    Disallow: /
  `;
  const browserCompatibleAgent = discoveryRequestHeaders({
    id: "browser-compatible-source",
    name: "Directory",
    url: "https://directory.example/open-calls/",
    kind: "directory",
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
    discoveryRequestProfile: "browser-compatible",
  })["user-agent"];

  assert.equal(discoveryPolicyFromRobots(robots, "https://directory.example/open-calls/", 1_000, browserCompatibleAgent).allowed, true);
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
