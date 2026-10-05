import assert from "node:assert/strict";
import test from "node:test";
import { canonicalProfileRedirect } from "./profileRouteKind";

test("keeps a profile on its own route", () => {
  assert.equal(
    canonicalProfileRedirect({ kind: "grant_foundation", slug: "arts-fund" }, { kind: "grant_foundation", slug: "arts-fund" }),
    null,
  );
});

test("redirects a profile requested through another kind's route", () => {
  assert.equal(
    canonicalProfileRedirect({ kind: "literary_magazine", slug: "paris-review" }, { kind: "residency_center", slug: "paris-review" }),
    "/journal/paris-review",
  );
  assert.equal(
    canonicalProfileRedirect({ kind: "residency_center", slug: "yaddo" }, { kind: "small_press", slug: "yaddo" }),
    "/residency/yaddo",
  );
  assert.equal(
    canonicalProfileRedirect({ kind: "organization", slug: "arts council" }, { kind: "grant_foundation", slug: "arts council" }),
    "/org/arts%20council",
  );
});

test("treats an encoded slug as canonical", () => {
  assert.equal(
    canonicalProfileRedirect({ kind: "grant_foundation", slug: "arts council" }, { kind: "grant_foundation", slug: "arts%20council" }),
    null,
  );
});

test("redirects a non-canonical slug to the profile slug", () => {
  assert.equal(
    canonicalProfileRedirect({ kind: "small_press", slug: "graywolf-press" }, { kind: "small_press", slug: "profile_123" }),
    "/press/graywolf-press",
  );
});
