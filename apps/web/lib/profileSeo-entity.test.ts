import assert from "node:assert/strict";
import { test } from "node:test";

import { profileEntity } from "./profileSeo";

const magazine = {
  kind: "literary_magazine" as const,
  slug: "the-quarry",
  name: "The Quarry",
  summary: "Poetry and short fiction.",
  websiteUrl: "https://quarry.example",
  city: undefined,
  country: undefined,
  countryCode: undefined,
  readingPeriod: undefined,
  submissionGuidelinesUrl: undefined,
  genres: ["poetry", "fiction"],
  socialLinks: {},
  logoUrl: undefined,
  opportunities: [],
};

// Google's profile page feature rejects any mainEntity that is not a Person or
// an Organization ("Invalid object type for field mainEntity").
test("a magazine profile's main entity is an Organization", () => {
  const entity = profileEntity(magazine as never);
  assert.equal(entity["@type"], "Organization");
  assert.deepEqual(entity.knowsAbout, ["poetry", "fiction"]);
  assert.equal(entity.genre, undefined);
});

test("every profile kind yields an Organization", () => {
  for (const kind of ["small_press", "residency_center", "grant_foundation", "gallery", "organization"]) {
    assert.equal(profileEntity({ ...magazine, kind } as never)["@type"], "Organization");
  }
});
