import test from "node:test";
import assert from "node:assert/strict";
import { assembleRegistry, type Source } from "@missa/radar-engine";
import {
  euFundingLinksFromResponse,
  euFundingSearchQuery,
  fetchMachineDiscoverySource,
  grantsGovLinksFromResponse,
  grantsGovSearchRequest,
  nyfaVisualArtsLinksFromHtml,
} from "../src/machineDiscoveryAdapters.js";

test("NYFA visual arts archive emits distinct official opportunity pages", () => {
  const links = nyfaVisualArtsLinksFromHtml(`
    <a href="https://www.nyfa.org/awards-grants/rauschenberg-medical-emergency-grants/">Rauschenberg Medical Emergency Grants</a>
    <a href="https://www.nyfa.org/awards-grants/queens-arts-fund-new-work-grant/">Queens Arts Fund: New Work Grant</a>
    <a href="https://www.nyfa.org/awards-grants/">All Awards &amp; Grants</a>
    <a href="https://example.com/not-nyfa">Noise</a>
  `, "nyfa-parent");
  assert.deepEqual(links.map((link) => link.title), ["Rauschenberg Medical Emergency Grants", "Queens Arts Fund: New Work Grant"]);
  assert.equal(links[0]?.discoveryExternalId, "nyfa:https://www.nyfa.org/awards-grants/rauschenberg-medical-emergency-grants");
  assert.equal(links[0]?.discoveryMachineRecord?.evidenceUrl, "https://www.nyfa.org/grant-discipline/visual-arts/");
});

test("Sundance deadlines emits current official application cards", async () => {
  const source: Source = {
    id: "sundance-deadlines",
    name: "Sundance Institute Artist Opportunities",
    url: "https://www.sundance.org/deadlines/",
    kind: "directory",
    discoveryAdapterId: "sundance-deadlines",
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
  };
  const html = `
    <h2>Graton Artist Opportunity</h2>
    <p>The opportunity supports emerging filmmakers.</p>
    <p>Extended Deadline: January 1, 2099</p>
    <a href="https://apply.sundance.org/prog/2026_graton_artist_opportunity/">Apply Now</a>
    <h2>Expired Opportunity</h2>
    <p>Deadline: January 1, 2020</p>
    <a href="https://apply.sundance.org/prog/expired/">Apply Now</a>
  `;
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } });
  try {
    const result = await fetchMachineDiscoverySource(source);
    assert.deepEqual(result.links.map((link) => link.title), ["Graton Artist Opportunity"]);
    assert.equal(result.links[0]?.discoveryMachineRecord?.deadlineDate, "2099-01-01");
    assert.equal(result.links[0]?.registryTrust?.status, "verified");
  } finally {
    globalThis.fetch = original;
  }
});

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
