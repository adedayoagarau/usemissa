import test from "node:test";
import assert from "node:assert/strict";
import { destinationIsProven, isAggregatorHost, organizationIsProven } from "../src/evidenceRepairWorker.js";

test("evidence repair accepts a destination on the same official host", () => {
  assert.equal(destinationIsProven("https://example.org/opportunities", "", "https://example.org/apply/1"), true);
});

test("aggregator hosts never become the inferred organization", () => {
  assert.equal(isAggregatorHost("https://www.transartists.org/en/air/example"), true);
  assert.equal(organizationIsProven({ sourceUrl: "https://curatorspace.com/opportunities/1", authorityKind: "directory", destinationProven: true }), false);
});

test("a direct organization source may prove its linked external application destination", () => {
  assert.equal(organizationIsProven({ sourceUrl: "https://example-residency.org/apply", authorityKind: "official-source", destinationProven: true }), true);
  assert.equal(organizationIsProven({ sourceUrl: "https://example-residency.org/apply", authorityKind: "official-source", destinationProven: false }), false);
});

test("evidence repair requires an external destination to be linked by source HTML", () => {
  assert.equal(destinationIsProven("https://example.org/opportunities", '<a href="https://apply.example.net/call/1">Apply</a>', "https://apply.example.net/call/1"), true);
  assert.equal(destinationIsProven("https://example.org/opportunities", "<p>Apply elsewhere</p>", "https://apply.example.net/call/1"), false);
});
