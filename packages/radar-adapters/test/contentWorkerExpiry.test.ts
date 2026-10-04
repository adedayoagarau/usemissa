import test from "node:test";
import assert from "node:assert/strict";
import { expireUnconfirmedContent } from "../src/contentWorker.js";

const held = { decision: "needs-human" as const, score: 80, reasons: ["The organization still needs source confirmation."], checks: {} };
const now = new Date("2026-10-10T00:00:00.000Z");

test("a write-up waiting on confirmation stays held for its first seven days", () => {
  assert.equal(expireUnconfirmedContent(held, "2026-10-05T00:00:00.000Z", now).decision, "needs-human");
});

test("a write-up still unconfirmed after seven days is blocked so nothing waits on a person", () => {
  const result = expireUnconfirmedContent(held, "2026-10-01T00:00:00.000Z", now);
  assert.equal(result.decision, "blocked");
  assert.equal(result.checks.confirmationExpired, true);
  assert.match(result.reasons.at(-1) ?? "", /seven days/);
});

test("approved and blocked write-ups pass through unchanged", () => {
  const approved = { ...held, decision: "approved" as const };
  assert.equal(expireUnconfirmedContent(approved, "2026-01-01T00:00:00.000Z", now), approved);
  assert.equal(expireUnconfirmedContent(held, null, now).decision, "needs-human");
});
