import assert from "node:assert/strict";
import test from "node:test";
import { canonicalTrackerStatus } from "../src/canonicalTracker.js";
import { readFileSync } from "node:fs";

const statuses = [
  "interested", "saved", "preparing", "draft-started", "ready-to-submit",
  "submitted", "received", "in-review", "longlisted", "shortlisted", "finalist",
  "accepted", "declined", "waitlisted", "revision-requested", "withdrawn",
  "partially-withdrawn", "delivered", "archived",
] as const;

test("canonical Tracker preserves the complete creator lifecycle vocabulary", () => {
  for (const status of statuses) assert.equal(canonicalTrackerStatus(status), status);
  assert.equal(canonicalTrackerStatus("unknown"), null);
});

test("first Save returns the tracked revision needed by the next safe mutation", () => {
  const source = readFileSync(new URL("../src/canonicalTracker.ts", import.meta.url), "utf8");
  assert.match(source, /CanonicalTrackerSave[\s\S]*tracked:[\s\S]*revision:\s*number/);
  assert.match(source, /function trackedRow[\s\S]*revision:\s*row\.revision/);
});
