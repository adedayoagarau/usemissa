import assert from "node:assert/strict";
import { test } from "node:test";

import { legacyProfileUserId } from "./profileRedirectPath";

test("legacy profile paths resolve to the user id", () => {
  assert.equal(legacyProfileUserId("/profile/user_123"), "user_123");
});

test("reserved static profile routes are not treated as user ids", () => {
  assert.equal(legacyProfileUserId("/profile/portfolio"), null);
  assert.equal(legacyProfileUserId("/profile/Portfolio"), null);
});

test("non-matching profile paths are ignored", () => {
  assert.equal(legacyProfileUserId("/profile"), null);
  assert.equal(legacyProfileUserId("/profile/"), null);
  assert.equal(legacyProfileUserId("/profile/user_123/edit"), null);
  assert.equal(legacyProfileUserId("/profiles/user_123"), null);
});
