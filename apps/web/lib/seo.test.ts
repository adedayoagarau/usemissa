import assert from "node:assert/strict";
import { test } from "node:test";

import {
  brandedTitle,
  hasPassedExactDeadline,
  isRoundupTitle,
  hasListingFilters,
  opportunityJsonLd,
  opportunityPageTitle,
  pageMetadata,
  repairGeneratedSummary,
  siteEntityJsonLd,
} from "./seo";

test("pagination alone does not count as a listing filter", () => {
  assert.equal(hasListingFilters(undefined), false);
  assert.equal(hasListingFilters({}), false);
  assert.equal(hasListingFilters({ page: "3" }), false);
  assert.equal(hasListingFilters({ cursor: "abc" }), false);
  assert.equal(hasListingFilters({ q: "", page: "2" }), false);
  assert.equal(hasListingFilters({ q: "   " }), false);
});

test("search, sort, and filters count as listing filters", () => {
  assert.equal(hasListingFilters({ q: "poetry" }), true);
  assert.equal(hasListingFilters({ sort: "name" }), true);
  assert.equal(hasListingFilters({ kind: ["small_press"] }), true);
  assert.equal(hasListingFilters({ genre: "fiction", page: "2" }), true);
});

test("page metadata carries a canonical URL and robots directive", () => {
  const indexed = pageMetadata({
    title: "Grant foundations | Missa",
    description: "Funding for creative work.",
    path: "/grants",
  });
  assert.match(String(indexed.alternates?.canonical), /\/grants$/u);
  assert.deepEqual(indexed.robots, { index: true, follow: true });
  const hidden = pageMetadata({
    title: "Log in to Missa",
    description: "Log in to Missa.",
    path: "/login",
    noIndex: true,
  });
  assert.deepEqual(hidden.robots, { index: false, follow: true });
});

test("titles carry the brand once", () => {
  assert.equal(brandedTitle("Grant funders for artists and writers"), "Grant funders for artists and writers | Missa");
  assert.equal(brandedTitle("About Missa"), "About Missa");
});

test("a noindexed variant carries no canonical", () => {
  const hidden = pageMetadata({ title: "Filtered", description: "Filtered list.", path: "/journals", noIndex: true });
  assert.equal(hidden.alternates, undefined);
});

test("call titles name the organizer and the deadline", () => {
  assert.equal(
    opportunityPageTitle({ title: "Spring Fellowship", organizationName: "North Review", deadline: { date: "2026-12-06", kind: "exact" } }),
    "Spring Fellowship — North Review, deadline Dec 6, 2026",
  );
  assert.equal(
    opportunityPageTitle({ title: "North Review Reading Period", organizationName: "North Review", deadline: { kind: "rolling" } }),
    "North Review Reading Period, rolling deadline",
  );
  assert.equal(
    opportunityPageTitle({ title: "Old Prize", deadline: { date: "2024-01-01", kind: "exact" }, status: "closed" }),
    "Old Prize (closed)",
  );
});

test("broken generated deadline sentences are rewritten", () => {
  assert.equal(
    repairGeneratedSummary("X lists “Y”. The official deadline is deadline not confirmed.", { kind: "unknown" }),
    "X lists “Y”. The deadline isn’t confirmed yet; check the official page.",
  );
  assert.equal(
    repairGeneratedSummary("X lists “Y”. The official deadline is 2026-12-06. It is closing soon.", { date: "2026-12-06", kind: "exact" }),
    "X lists “Y”. The deadline is Dec 6, 2026. It is closing soon.",
  );
});

test("grants are marked up as MonetaryGrant, other calls never as events", () => {
  const grant = opportunityJsonLd(
    { title: "Spring Grant", type: "grant", organizationName: "North Fund", guidelinesUrl: "https://north.example/grant", deadline: { date: "2026-12-06", kind: "exact" }, fee: { status: "no-fee" } },
    { path: "/opportunities/spring-grant", description: "A grant." },
  );
  const grantEntity = grant.mainEntity as Record<string, unknown>;
  assert.equal(grantEntity["@type"], "MonetaryGrant");
  assert.deepEqual(grantEntity.funder, { "@type": "Organization", name: "North Fund" });
  assert.equal(grantEntity.offers, undefined);

  const contest = opportunityJsonLd(
    { title: "Story Contest", type: "contest", deadline: { date: "2026-12-06", kind: "exact" }, fee: { status: "paid", amountCents: 1500, currency: "USD" } },
    { path: "/opportunities/story-contest", description: "A contest." },
  );
  const contestEntity = contest.mainEntity as Record<string, unknown>;
  assert.equal(contestEntity["@type"], "CreativeWork");
  assert.equal(contestEntity.expires, "2026-12-06T23:59:00");
  assert.deepEqual(contestEntity.offers, { "@type": "Offer", price: 15, priceCurrency: "USD", name: "Entry fee", availabilityEnds: "2026-12-06T23:59:00" });
});

test("homepage entity names the brand and its search", () => {
  const graph = siteEntityJsonLd()["@graph"] as Array<Record<string, unknown>>;
  assert.deepEqual(graph.map((node) => node["@type"]), ["Organization", "WebSite"]);
});

test("roundup posts and FAQ pages are recognised", () => {
  assert.equal(isRoundupTitle("12 Open Calls to Apply for in Spring 2026"), true);
  assert.equal(isRoundupTitle("Applicant FAQ's and Tips"), true);
  assert.equal(isRoundupTitle("Spring Fellowship 2027"), false);
  assert.equal(isRoundupTitle("2027 Poetry Prize"), false);
  assert.equal(isRoundupTitle("2026 Open Calls Festival"), false);
});

test("only an exact deadline in the past counts as passed", () => {
  const now = new Date("2026-10-07T12:00:00Z");
  assert.equal(hasPassedExactDeadline({ kind: "exact", date: "2026-10-06" }, now), true);
  assert.equal(hasPassedExactDeadline({ kind: "exact", date: "2026-10-07" }, now), false);
  assert.equal(hasPassedExactDeadline({ kind: "inferred", date: "2024-01-01" }, now), false);
  assert.equal(hasPassedExactDeadline({ kind: "rolling" }, now), false);
});
