import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("onboarding finish never claims a handle while claiming is closed", () => {
  const source = readFileSync(
    new URL("../components/creator-onboarding.tsx", import.meta.url),
    "utf8",
  );

  // The finish action must gate the handle POST on handleClaimingOpen, otherwise
  // invite-only accounts fail with "could not hold this Missa address" instead
  // of completing setup without a public handle.
  assert.match(
    source,
    /if \(!claimedHandle && handleClaimingOpen && normalizedHandle\)/u,
  );
});
