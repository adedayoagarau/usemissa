import test from "node:test";
import assert from "node:assert/strict";
import {
  handleClaimAccessMode,
  normalizeUserHandleInput,
} from "../src/handleNamespace.js";

test("claim-time normalization is the shared deterministic gate", () => {
  assert.equal(normalizeUserHandleInput("Writer's Room"), "writers-room");
  assert.equal(normalizeUserHandleInput("@Granta"), "granta");
  assert.equal(normalizeUserHandleInput("grаnta"), null);
});

test("handle claims default to the protected invitee window", () => {
  assert.equal(handleClaimAccessMode(), "invite-only");
});
