import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  canonicalOpportunityIsPublic,
  canonicalPublicOpportunityPredicate,
} from "../src/canonicalOpportunityProjection.js";

test("canonical public projection excludes every non-approved and compatibility-only state", () => {
  assert.equal(canonicalOpportunityIsPublic("published"), true);
  for (const state of [
    "rejected",
    "conflicted",
    "stale-unapproved",
    "private",
    "draft",
    "pending-review",
    null,
    undefined,
  ]) {
    assert.equal(canonicalOpportunityIsPublic(state), false, String(state));
  }
});

test("canonical SQL predicate is exact and rejects unsafe aliases", () => {
  assert.equal(
    canonicalPublicOpportunityPredicate("opportunity"),
    "opportunity.publication_state = 'published'",
  );
  assert.throws(() => canonicalPublicOpportunityPredicate("o; drop table opportunities"));
});

test("all creator Opportunity enrichments recheck the canonical public boundary", () => {
  for (const relativePath of [
    "../../src/canonicalTracker.ts",
    "../../src/canonicalTrackerImport.ts",
    "../../src/creatorCalendarRepository.ts",
    "../../src/creatorInboxRepository.ts",
    "../../src/creatorLibraryRepository.ts",
  ]) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    assert.match(source, /publication_state|canonicalPublicOpportunityPredicate/, relativePath);
    assert.doesNotMatch(source, /radar_opportunities/, relativePath);
  }
  const projection = readFileSync(new URL("../../src/postgresStore.ts", import.meta.url), "utf8");
  assert.match(projection, /opportunity\.publication_state='published'/);
});
