import assert from "node:assert/strict";
import test from "node:test";

import type { OpportunityBrowseProjection, OpportunityRepositoryQuery } from "@missa/radar-engine";
import { MISSA_TAXONOMY } from "@missa/taxonomy";

import { discoveryCollection } from "./discoveryGuides";
import { matchesQuery } from "./opportunityRepository";

function listing(title: string, termIds: string[] = []): OpportunityBrowseProjection {
  return {
    title,
    organizationName: "Example Arts",
    genres: [],
    type: "grant",
    taxonomy: { termIds, primaryTermIds: [] },
  } as unknown as OpportunityBrowseProjection;
}

function collectionQuery(slug: string): OpportunityRepositoryQuery {
  const collection = discoveryCollection(slug);
  assert.ok(collection, `missing collection ${slug}`);
  return collection.query;
}

test("emerging collection ignores taxonomy labels that contain 'emerging'", () => {
  const query = collectionQuery("emerging-writers-artists");
  const labelled = MISSA_TAXONOMY.terms.find((term) => /\bemerging\b/i.test(term.preferredLabel));
  assert.ok(labelled, "expected a taxonomy label that contains 'emerging'");
  const interdisciplinary = listing("BAM Next Wave Festival", [labelled.id]);

  assert.equal(matchesQuery(interdisciplinary, { ...query, mentionsAny: undefined, query: "emerging" }), true);
  assert.equal(matchesQuery(interdisciplinary, query), false);
  assert.equal(matchesQuery(listing("New Voices: an Open Call for Emerging Artists"), query), true);
});

test("disabled and neurodivergent collection finds calls that never say 'disability'", () => {
  const query = collectionQuery("disabled-neurodivergent-opportunities");
  const titles = [
    "Fellowship for writers with disabilities",
    "Residency for disabled artists",
    "Open call for d/Deaf filmmakers",
    "Grant for chronically ill poets",
    "Mentorship for neurodivergent illustrators",
  ];

  for (const title of titles) {
    assert.equal(matchesQuery(listing(title), { ...query, mentionsAny: undefined, query: "disability" }), false, title);
    assert.equal(matchesQuery(listing(title), query), true, title);
  }
  assert.equal(matchesQuery(listing("Poetry prize"), query), false);
});
