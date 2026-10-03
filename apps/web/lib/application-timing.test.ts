import assert from "node:assert/strict";
import test from "node:test";

import { closingTimeLabel, deadlineCountdown } from "./application-timing.ts";

const now = new Date(2026, 9, 3, 10, 0, 0);

test("counts calendar days and never invents a countdown for rolling calls", () => {
  assert.deepEqual(deadlineCountdown("2026-10-03", "fixed", now), { days: 0, label: "Due today", urgent: true });
  assert.equal(deadlineCountdown("2026-10-04", "fixed", now)?.label, "Due tomorrow");
  assert.deepEqual(deadlineCountdown("2026-10-13", "fixed", now), { days: 10, label: "10 days left", urgent: false });
  assert.equal(deadlineCountdown("2026-10-09", "fixed", now)?.urgent, true);
  assert.equal(deadlineCountdown("2026-10-01", "fixed", now)?.label, "Deadline passed");
  assert.equal(deadlineCountdown(null, "unknown", now), null);
  assert.equal(deadlineCountdown("2026-10-20", "rolling", now), null);
});

test("shows the provider closing time and the creator's local equivalent", () => {
  const label = closingTimeLabel("2026-11-03T22:00:00Z", "America/New_York", "Africa/Lagos");
  assert.match(label.provider, /5:00\sPM\sEST/);
  assert.match(label.local ?? "", /11:00\sPM\sGMT\+1/);
  assert.equal(closingTimeLabel("2026-11-03T22:00:00Z", "UTC", "UTC").local, undefined);
  assert.match(closingTimeLabel("2026-11-03T23:30:00Z", "UTC", "Africa/Lagos").local ?? "", /Nov 4/);
});
