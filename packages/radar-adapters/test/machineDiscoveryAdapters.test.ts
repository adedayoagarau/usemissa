import test from "node:test";
import assert from "node:assert/strict";
import { assembleRegistry } from "@missa/radar-engine";
import {
  grantsGovLinksFromResponse,
  grantsGovSearchRequest,
} from "../src/machineDiscoveryAdapters.js";

test("Grants.gov request is bounded to the official Arts dataset", () => {
  assert.deepEqual(grantsGovSearchRequest(), {
    rows: 1_000,
    startRecordNum: 0,
    fundingCategories: "AR",
    oppStatuses: "forecasted|posted",
    sortBy: "openDate|desc",
  });
});

test("the registry opts Grants.gov into the machine connector at a daily cadence", () => {
  const source = assembleRegistry().sources.find(
    (candidate) => candidate.url === "https://www.grants.gov/search-results.html?group=arts",
  );
  assert.equal(source?.discoveryAdapterId, "grants-gov-api");
  assert.equal(source?.checkIntervalHours, 24);
});

test("Grants.gov records become canonical detail sources with lifecycle cadence", () => {
  const links = grantsGovLinksFromResponse({
    errorcode: 0,
    data: {
      hitCount: 2,
      oppHits: [
        { id: "363271", title: "  Reel American  ", agency: "U.S. Mission to Jordan", oppStatus: "posted" },
        { id: 123, title: "Archived Arts Grant", oppStatus: "archived" },
      ],
    },
  }, "grants_parent");

  assert.equal(links.length, 2);
  assert.deepEqual(links[0], {
    url: "https://www.grants.gov/search-results-detail/363271",
    title: "Reel American",
    kind: "organization-website",
    registryTier: 0,
    followsOutboundLinks: false,
    discoveredFromSourceId: "grants_parent",
    discoveryExternalId: "grants.gov:363271",
    discoveryExternalStatus: "posted",
    registryOrganizationName: "U.S. Mission to Jordan",
    registryTrust: {
      status: "verified",
      authorityKind: "official-source",
      score: 95,
      evidenceUrl: "https://www.grants.gov/api/api-guide",
      reviewNote: "Canonical Grants.gov detail URL emitted by the official public API.",
    },
    checkIntervalHours: 24,
  });
  assert.equal(links[1]?.checkIntervalHours, 8_760);
});

test("Grants.gov connector fails closed on an incomplete oversized response", () => {
  assert.throws(
    () => grantsGovLinksFromResponse({ errorcode: 0, data: { hitCount: 1_001, oppHits: [] } }, "parent"),
    /bounded connector limit/,
  );
});
