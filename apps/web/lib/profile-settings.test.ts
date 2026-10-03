import assert from "node:assert/strict";
import test from "node:test";
import { MISSA_TAXONOMY, taxonomyLabelFor } from "@missa/taxonomy";

import {
  matchingSummary,
  normalizeProfileSection,
  type OpportunityPreferences,
} from "./profile-settings.ts";

const none: OpportunityPreferences = {
  types: [],
  disciplines: [],
  genres: [],
  locations: [],
  careerStages: [],
  noFeeOnly: false,
  simultaneousRequired: false,
};

test("old profile section links land on their new home", () => {
  assert.equal(normalizeProfileSection(undefined), "profile");
  assert.equal(normalizeProfileSection("overview"), "profile");
  assert.equal(normalizeProfileSection("identity"), "profile");
  assert.equal(normalizeProfileSection("privacy"), "profile");
  assert.equal(normalizeProfileSection("preferences"), "matching");
  assert.equal(normalizeProfileSection("integrations"), "connections");
  assert.equal(normalizeProfileSection("data"), "account");
  assert.equal(normalizeProfileSection("notifications"), "notifications");
  assert.equal(normalizeProfileSection("nonsense"), "profile");
});

test("the matching summary says nothing until something is chosen", () => {
  assert.equal(matchingSummary([], none), null);
});

test("the matching summary reads as one sentence from saved choices", () => {
  const term = MISSA_TAXONOMY.terms.find((candidate) => candidate.selectable)!;
  const label = taxonomyLabelFor(term.id).toLowerCase();
  assert.equal(
    matchingSummary([{ termId: term.id, preference: "include" }], {
      ...none,
      types: ["residency", "grant", "magazine"],
      locations: ["Remote", "Nigeria"],
      noFeeOnly: true,
    }),
    `Residencies, grants, and publications in ${label} open to Remote and Nigeria with no fee.`,
  );
  assert.equal(
    matchingSummary([{ termId: term.id, preference: "exclude" }], {
      ...none,
      careerStages: ["emerging"],
      deadlineWithinDays: 30,
    }),
    `Open calls for emerging writers and artists closing within 30 days. Never ${label}.`,
  );
});
