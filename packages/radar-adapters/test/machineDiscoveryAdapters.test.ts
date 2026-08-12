import test from "node:test";
import assert from "node:assert/strict";
import { assembleRegistry } from "@missa/radar-engine";
import {
  euFundingLinksFromResponse,
  euFundingSearchQuery,
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

test("EU Funding request is bounded to current English Creative Europe records", () => {
  assert.deepEqual(euFundingSearchQuery(), {
    bool: { must: [
      { terms: { type: ["1", "2", "8"] } },
      { terms: { status: ["31094501", "31094502"] } },
      { terms: { frameworkProgramme: ["43251814"] } },
      { terms: { language: ["en"] } },
    ] },
  });
});

test("the registry opts Creative Europe into the official API connector", () => {
  const source = assembleRegistry().sources.find(
    (candidate) => candidate.url === "https://culture.ec.europa.eu/creative-europe",
  );
  assert.equal(source?.discoveryAdapterId, "eu-funding-api");
  assert.equal(source?.checkIntervalHours, 24);
  assert.equal(source?.followsOutboundLinks, true);
});

test("EU Funding records keep concurrent calls sharing one canonical page", () => {
  const metadata = {
    frameworkProgramme: ["43251814"], language: ["en"], status: ["31094502"],
    startDate: ["2026-06-30T00:00:00.000+0000"],
  };
  const links = euFundingLinksFromResponse({
    totalResults: 3,
    results: [
      { reference: "one", summary: "Cultural Horizons: Residencies", language: "en", url: "https://ec.europa.eu/call/shared", metadata: { ...metadata, deadlineDate: ["2026-09-30T18:00:00.000+0000"] } },
      { reference: "two", summary: "Cultural Horizons: Artistic Debuts", language: "en", url: "https://ec.europa.eu/call/shared", metadata: { ...metadata, deadlineDate: ["2026-10-05T05:00:00.000+0000"] } },
      { reference: "stale", summary: "Old open record", language: "en", url: "https://ec.europa.eu/call/old", metadata: { ...metadata, deadlineDate: ["2023-03-14T17:00:00.000+0000"] } },
    ],
  }, "creative-europe-parent", new Date("2026-08-12T00:00:00.000Z"));
  assert.equal(links.length, 2);
  assert.equal(links[0]?.url, links[1]?.url);
  assert.notEqual(links[0]?.discoveryExternalId, links[1]?.discoveryExternalId);
  assert.equal(links[0]?.discoveryMachineRecord?.deadlineDate, "2026-09-30");
  assert.equal(links[1]?.discoveryMachineRecord?.deadlineDate, "2026-10-05");
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
        { id: "363271", title: "  Reel American  ", agency: "U.S. Mission to Jordan", openDate: "07/22/2026", closeDate: "08/31/2026", oppStatus: "posted" },
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
    discoveryMachineRecord: {
      title: "Reel American",
      organizationName: "U.S. Mission to Jordan",
      openDate: "2026-07-22",
      deadlineDate: "2026-08-31",
      applicationUrl: "https://www.grants.gov/search-results-detail/363271",
      evidenceUrl: "https://api.grants.gov/v1/api/search2",
    },
  });
  assert.equal(links[1]?.checkIntervalHours, 8_760);
});

test("Grants.gov connector fails closed on an incomplete oversized response", () => {
  assert.throws(
    () => grantsGovLinksFromResponse({ errorcode: 0, data: { hitCount: 1_001, oppHits: [] } }, "parent"),
    /bounded connector limit/,
  );
});
