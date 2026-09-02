import test from "node:test";
import assert from "node:assert/strict";
import {
  extractArtsOpportunity,
  runArtsDiscovery,
  computeWindowState,
  windowStateToOpportunityStatus,
  ARTS_DISCOVERY_REGISTRY,
} from "../src/index.js";

test("extractArtsOpportunity: extracts residency with stipend and studio space", () => {
  const text = `
    MacDowell Fellowship & Residency Program
    Open call for artists in Painting, Sculpture, Film/Video, and Multidisciplinary arts.
    MacDowell provides a private studio, private bedroom housing provided, and chef-prepared meals.
    Selected fellows receive a $5,000 stipend to assist with living expenses during their residency.
    Residency duration: 4–6 weeks.
    Application fee: $30 application fee.
    Deadline: October 15, 2026.
  `;

  const result = extractArtsOpportunity(text, new Date("2026-09-01"));

  assert.equal(result.isArtsOpportunity, true);
  assert.equal(result.opportunityKind, "residency");
  assert.equal(result.studioProvided, true);
  assert.equal(result.housingProvided, true);
  assert.equal(result.stipendAmountUsd, 5000);
  assert.equal(result.applicationFeeCents, 3000);
  assert.equal(result.feeDisclosed, true);
  assert.equal(result.duration, "4–6 weeks");
  assert.equal(result.deadlineDate, "2026-10-15");
  assert.ok(result.disciplines.includes("Painting"));
  assert.ok(result.disciplines.includes("Sculpture"));
  assert.ok(result.disciplines.includes("Film/Video"));
  assert.ok(result.disciplines.includes("Multidisciplinary"));
  assert.ok(result.confidence >= 80);
});

test("extractArtsOpportunity: extracts exhibition call with entry fee and submission deadline", () => {
  const text = `
    Annual National Juried Exhibition in Contemporary Art
    Call for artists working in Painting, Photography, Printmaking, and Digital Art.
    Cash awards: Best in show receives a $3,000 award and solo exhibition.
    Entry fee: $35 jury fee for up to 3 entries.
    Submissions due: November 30, 2026.
    Selected works will be exhibited at the downtown gallery.
  `;

  const result = extractArtsOpportunity(text, new Date("2026-09-01"));

  assert.equal(result.isArtsOpportunity, true);
  assert.equal(result.opportunityKind, "exhibition");
  assert.equal(result.applicationFeeCents, 3500);
  assert.equal(result.feeDisclosed, true);
  assert.equal(result.deadlineDate, "2026-11-30");
  assert.ok(result.disciplines.includes("Painting"));
  assert.ok(result.disciplines.includes("Photography"));
  assert.ok(result.disciplines.includes("Printmaking"));
  assert.ok(result.disciplines.includes("Digital Art"));
  assert.equal(result.studioProvided, false);
});

test("extractArtsOpportunity: extracts free multidisciplinary grant with no fee", () => {
  const text = `
    Creative Capital Project Grant
    Grants of up to $50,000 for innovative and groundbreaking projects.
    Disciplines: Sound Art, Performance, Film/Video, and Multidisciplinary artists.
    No application fee ($0 free).
    Applications close: December 15, 2026.
  `;

  const result = extractArtsOpportunity(text, new Date("2026-09-01"));

  assert.equal(result.isArtsOpportunity, true);
  assert.equal(result.opportunityKind, "grant");
  assert.equal(result.stipendAmountUsd, 50000);
  assert.equal(result.applicationFeeCents, 0);
  assert.equal(result.feeDisclosed, true);
  assert.equal(result.deadlineDate, "2026-12-15");
  assert.ok(result.disciplines.includes("Sound Art"));
  assert.ok(result.disciplines.includes("Performance"));
  assert.ok(result.disciplines.includes("Multidisciplinary"));
});

test("computeWindowState: computes state machine correctly", () => {
  // 1. Rolling / no deadline
  assert.equal(computeWindowState(null, true), "always_open");
  assert.equal(computeWindowState(null, false), "always_open");

  // 2. Deadline in far future (>14 days)
  const future = new Date();
  future.setDate(future.getDate() + 30);
  assert.equal(computeWindowState(future.toISOString().slice(0, 10)), "currently_open");

  // 3. Deadline soon (<=14 days)
  const soon = new Date();
  soon.setDate(soon.getDate() + 5);
  assert.equal(computeWindowState(soon.toISOString().slice(0, 10)), "closing_soon");

  // 4. Past deadline
  const past = new Date();
  past.setDate(past.getDate() - 5);
  assert.equal(computeWindowState(past.toISOString().slice(0, 10)), "closed");

  // Status mapping
  assert.equal(windowStateToOpportunityStatus("always_open"), "open");
  assert.equal(windowStateToOpportunityStatus("currently_open"), "open");
  assert.equal(windowStateToOpportunityStatus("closing_soon"), "closing-soon");
  assert.equal(windowStateToOpportunityStatus("closed"), "closed");
});

test("runArtsDiscovery: runs dry-run discovery and discovers all target sources", async () => {
  const result = await runArtsDiscovery({ dryRun: true });

  assert.ok(result.organizationsCount >= 18);
  assert.ok(result.profilesCount >= 18);
  assert.ok(result.sourcesCount >= 18);
  assert.ok(result.opportunitiesCount >= 20);

  // Check specific organizations from prompt are present
  const orgNames = ARTS_DISCOVERY_REGISTRY.map((r) => r.name);
  assert.ok(orgNames.some((n) => n.includes("Artist Communities Alliance")));
  assert.ok(orgNames.some((n) => n.includes("Res Artis")));
  assert.ok(orgNames.some((n) => n.includes("TransArtists")));
  assert.ok(orgNames.some((n) => n.includes("MacDowell")));
  assert.ok(orgNames.some((n) => n.includes("Yaddo")));
  assert.ok(orgNames.some((n) => n.includes("Bemis Center")));
  assert.ok(orgNames.some((n) => n.includes("Headlands Center")));
  assert.ok(orgNames.some((n) => n.includes("VCCA")));
  assert.ok(orgNames.some((n) => n.includes("Ox-Bow")));
  assert.ok(orgNames.some((n) => n.includes("Millay Arts")));
  assert.ok(orgNames.some((n) => n.includes("Anderson Center")));
  assert.ok(orgNames.some((n) => n.includes("Artforum") || n.includes("e-flux")));
  assert.ok(orgNames.some((n) => n.includes("NYFA")));
  assert.ok(orgNames.some((n) => n.includes("CaFÉ")));
  assert.ok(orgNames.some((n) => n.includes("Hyperallergic")));
  assert.ok(orgNames.some((n) => n.includes("Creative Capital")));
  assert.ok(orgNames.some((n) => n.includes("Pollock-Krasner")));
  assert.ok(orgNames.some((n) => n.includes("Joan Mitchell")));
  assert.ok(orgNames.some((n) => n.includes("Guggenheim")));
  assert.ok(orgNames.some((n) => n.includes("Anonymous Was A Woman")));

  // Verify visual arts and residency domains are represented
  const domains = new Set(result.opportunities.map((o) => o.domain));
  assert.ok(domains.has("visual_arts"));
  assert.ok(domains.has("residency"));

  // Verify financial and facility extraction on discovered items
  const macdowellOpp = result.opportunities.find((o) => o.id === "opp_macdowell_fellowship");
  assert.ok(macdowellOpp);
  assert.equal(macdowellOpp.studioProvided, true);
  assert.equal(macdowellOpp.housingProvided, true);
  assert.equal(macdowellOpp.stipendUsd, 5000);
});
