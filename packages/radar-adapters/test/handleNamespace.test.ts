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

test("user handle claims are open at signup", () => {
  assert.equal(handleClaimAccessMode(), "open");
});
