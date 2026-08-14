import test from "node:test";
import assert from "node:assert/strict";
import { destinationIsProven } from "../src/evidenceRepairWorker.js";

test("evidence repair accepts a destination on the same official host", () => {
  assert.equal(destinationIsProven("https://example.org/opportunities", "", "https://example.org/apply/1"), true);
});

test("evidence repair requires an external destination to be linked by source HTML", () => {
  assert.equal(destinationIsProven("https://example.org/opportunities", '<a href="https://apply.example.net/call/1">Apply</a>', "https://apply.example.net/call/1"), true);
  assert.equal(destinationIsProven("https://example.org/opportunities", "<p>Apply elsewhere</p>", "https://apply.example.net/call/1"), false);
});
