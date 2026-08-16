import assert from "node:assert/strict";
import test from "node:test";

import { publicProfileHandleRoute } from "./profile-handle-routing";

test("a renamed Profile handle redirects its permanent alias to the canonical page", () => {
  assert.deepEqual(
    publicProfileHandleRoute("@amaka", {
      resolution: "alias",
      handleKey: "amaka-obi",
      displayHandle: "amaka-obi",
      subjectType: "user",
      subjectId: "user_amaka",
      state: "claimed",
      reservedFromProfileId: null,
      claimedAt: "2026-08-16T00:00:00.000Z",
    }),
    {
      handle: "amaka-obi",
      path: "/@amaka-obi",
      redirectTo: "/@amaka-obi",
    },
  );
});

test("a Profile handle casing variant redirects to its normalized canonical page", () => {
  assert.deepEqual(
    publicProfileHandleRoute("@Amaka-Obi", {
      resolution: "canonical",
      handleKey: "amaka-obi",
      displayHandle: "amaka-obi",
      subjectType: "user",
      subjectId: "user_amaka",
      state: "claimed",
      reservedFromProfileId: null,
      claimedAt: "2026-08-16T00:00:00.000Z",
    }),
    {
      handle: "amaka-obi",
      path: "/@amaka-obi",
      redirectTo: "/@amaka-obi",
    },
  );
});
