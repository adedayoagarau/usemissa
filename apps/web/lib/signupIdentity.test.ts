import assert from "node:assert/strict";
import test from "node:test";
import { signupIdentity, suggestedHandle } from "./signupIdentity";

test("signupIdentity keeps a supplied given and family name", () => {
  assert.deepEqual(
    signupIdentity({
      givenName: " Adedayo ",
      familyName: " Agarau ",
      usesSingleName: false,
    }),
    {
      givenName: "Adedayo",
      familyName: "Agarau",
      usesSingleName: false,
      displayName: "Adedayo Agarau",
    },
  );
});

test("signupIdentity supports people who use one name", () => {
  assert.deepEqual(
    signupIdentity({
      givenName: "Beyonce",
      familyName: "",
      usesSingleName: true,
    }),
    { givenName: "Beyonce", usesSingleName: true, displayName: "Beyonce" },
  );
});

test("signupIdentity requires a family name unless one-name mode is selected", () => {
  assert.deepEqual(
    signupIdentity({ givenName: "Ayo", familyName: "", usesSingleName: false }),
    {
      field: "familyName",
      message: "Enter your family name, or choose that you use one name.",
    },
  );
});

test("suggestedHandle is deterministic and does not invent a collision suffix", () => {
  assert.equal(suggestedHandle("Adedayo Agarau"), "adedayo-agarau");
  assert.equal(
    suggestedHandle("Chimamanda Ngozi Adichie"),
    "chimamanda-ngozi-adichie",
  );
});
