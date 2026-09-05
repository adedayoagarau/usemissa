import assert from "node:assert/strict";
import test from "node:test";

import { safeAuthRedirect } from "./authRedirect";

test("keeps normalized same-origin auth destinations", () => {
  assert.equal(
    safeAuthRedirect("/opportunities/north-river?from=search#requirements"),
    "/opportunities/north-river?from=search#requirements",
  );
  assert.equal(safeAuthRedirect("/tracker"), "/tracker");
  assert.equal(safeAuthRedirect("/saved"), "/saved");
  assert.equal(safeAuthRedirect("/saved?sort=deadline"), "/saved?sort=deadline");
  assert.equal(safeAuthRedirect("/calendar"), "/calendar");
  assert.equal(safeAuthRedirect("/reviews/assigned"), "/reviews/assigned");
});

test("rejects external, encoded-external, control, backslash, and admin destinations", () => {
  for (const value of [
    "https://example.com",
    "//example.com",
    "/%2Fexample.com",
    "/\\example.com",
    "/opportunities\n/admin",
    "/admin",
    "/admin/accounts",
    "/a%64min",
    "/admin%2Faccounts",
    "/api/auth/session",
    "/organization/org_1",
    "/design-system",
  ]) {
    assert.equal(safeAuthRedirect(value), "/opportunities");
  }
});
