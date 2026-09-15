import assert from "node:assert/strict";
import test from "node:test";

import { reminderInput } from "./creator-reminders.ts";

const baseDeadline = {
  opportunityId: "art-worker-artist-grant",
  kind: "deadline" as const,
  offsetDays: 0 as const,
  timezone: "America/Los_Angeles",
};

test("accepts a selected deadline reminder time", () => {
  const result = reminderInput.safeParse({
    ...baseDeadline,
    timeOfDay: "16:30",
  });
  assert.equal(result.success, true);
  if (result.success && result.data.kind === "deadline")
    assert.equal(result.data.timeOfDay, "16:30");
});

test("keeps 9am compatibility for an older deadline reminder client", () => {
  const result = reminderInput.safeParse(baseDeadline);
  assert.equal(result.success, true);
  if (result.success && result.data.kind === "deadline")
    assert.equal(result.data.timeOfDay, "09:00");
});

test("rejects malformed deadline reminder times", () => {
  assert.equal(
    reminderInput.safeParse({ ...baseDeadline, timeOfDay: "25:00" }).success,
    false,
  );
  assert.equal(
    reminderInput.safeParse({ ...baseDeadline, timeOfDay: "4pm" }).success,
    false,
  );
});
