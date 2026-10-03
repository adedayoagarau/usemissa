import assert from "node:assert/strict";
import test from "node:test";

import { responseClock } from "./response-clock.ts";

test("inside the stated window", () => {
  const clock = responseClock({ submittedOn: "2026-09-01", today: "2026-10-01", statedDays: 60 });
  assert.equal(clock.state, "waiting");
  assert.equal(clock.label, "Waiting 30 days of about 60");
  assert.equal(clock.basis, "Stated by the organization");
});

test("past the stated window", () => {
  assert.equal(responseClock({ submittedOn: "2026-07-01", today: "2026-10-01", statedDays: 60 }).state, "past-stated");
});

test("observed data needs at least five reports", () => {
  const thin = responseClock({ submittedOn: "2026-07-01", today: "2026-10-01", observed: { p50Days: 30, p90Days: 45, sampleSize: 4 } });
  assert.equal(thin.state, "no-window");
  const enough = responseClock({ submittedOn: "2026-07-01", today: "2026-10-01", observed: { p50Days: 30, p90Days: 45, sampleSize: 12 } });
  assert.equal(enough.state, "time-to-query");
  assert.equal(enough.basis, "Observed from 12 Missa creators");
});

test("no reply promised", () => {
  assert.equal(
    responseClock({ submittedOn: "2026-07-01", today: "2026-10-01", statedDays: 30, repliesNotGuaranteed: true }).state,
    "no-reply-expected",
  );
});

test("no window is never filled with a guess", () => {
  const clock = responseClock({ submittedOn: "2026-09-30", today: "2026-10-01" });
  assert.equal(clock.state, "no-window");
  assert.equal(clock.label, "Waiting 1 day");
});
