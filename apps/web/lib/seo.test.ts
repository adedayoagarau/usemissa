import assert from "node:assert/strict";
import { test } from "node:test";

import { hasListingFilters, pageMetadata } from "./seo";

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
