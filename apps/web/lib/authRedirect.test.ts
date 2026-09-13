import assert from "node:assert/strict";
import test from "node:test";

import { safeAuthRedirect } from "./authRedirect";

test("keeps normalized same-origin auth destinations", () => {
  assert.equal(
    safeAuthRedirect("/opportunities/north-river?from=search#requirements"),
    "/opportunities/north-river?from=search#requirements",
  );
  assert.equal(safeAuthRedirect("/onboarding"), "/onboarding");
  assert.equal(safeAuthRedirect("/workspace"), "/workspace");
  assert.equal(safeAuthRedirect("/home"), "/home");
  assert.equal(
    safeAuthRedirect("/submissions?status=submitted"),
    "/submissions?status=submitted",
  );
  assert.equal(
    safeAuthRedirect("/organization/org-1/messages"),
    "/organization/org-1/messages",
  );
  assert.equal(safeAuthRedirect("/tracker"), "/tracker");
  assert.equal(safeAuthRedirect("/saved"), "/saved");
  assert.equal(safeAuthRedirect("/saved?sort=deadline"), "/saved?sort=deadline");
  assert.equal(safeAuthRedirect("/calendar"), "/calendar");
  assert.equal(safeAuthRedirect("/following"), "/following");
  assert.equal(safeAuthRedirect("/goals?goal=goal-1"), "/goals?goal=goal-1");
  assert.equal(safeAuthRedirect("/reviews/assigned"), "/reviews/assigned");
  assert.equal(safeAuthRedirect("/reviewer"), "/reviewer");
  assert.equal(safeAuthRedirect("/ask"), "/ask");
  assert.equal(safeAuthRedirect("/insights"), "/insights");
  assert.equal(safeAuthRedirect("/messages"), "/messages");
  assert.equal(safeAuthRedirect("/my-submissions/packet-1"), "/my-submissions/packet-1");
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
    "/design-system",
  ]) {
    assert.equal(safeAuthRedirect(value), "/opportunities");
  }
});
