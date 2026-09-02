import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCreatorProfileInput,
  normalizeCreatorPrivacyInput,
} from "../src/creatorProfileRepository.js";
import { CreatorCommandValidationError } from "../src/creatorRepository.js";

test("creator Profile normalization trims public identity and bounds text", () => {
  assert.deepEqual(normalizeCreatorProfileInput({ displayName: "  Ada  ", bio: "  Poet and editor.  " }), {
    displayName: "Ada",
    bio: "Poet and editor.",
  });
  assert.deepEqual(normalizeCreatorProfileInput({ displayName: "Ada", bio: "   " }), {
    displayName: "Ada",
    bio: null,
  });
  assert.throws(() => normalizeCreatorProfileInput({ displayName: " ", bio: null }), CreatorCommandValidationError);
  assert.throws(() => normalizeCreatorProfileInput({ displayName: "x".repeat(121), bio: null }), CreatorCommandValidationError);
  assert.throws(() => normalizeCreatorProfileInput({ displayName: "Ada", bio: "x".repeat(2001) }), CreatorCommandValidationError);
});

test("creator privacy normalization preserves the existing three-field contract", () => {
  assert.deepEqual(normalizeCreatorPrivacyInput({ displayName: "public", bio: "private", trackedOpportunityCount: "private" }), {
    displayName: "public",
    bio: "private",
    trackedOpportunityCount: "private",
  });
  assert.throws(
    () => normalizeCreatorPrivacyInput({ displayName: "friends" as "public", bio: "private", trackedOpportunityCount: "private" }),
    CreatorCommandValidationError,
  );
});
