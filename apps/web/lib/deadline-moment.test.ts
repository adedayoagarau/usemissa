import assert from "node:assert/strict";
import test from "node:test";

import { addDays, calendarDateIn, daysBetween, describeDeadline } from "./deadline-moment.ts";

const NOW = new Date("2026-10-03T15:00:00Z");

test("date-only deadlines count calendar days in the viewer's day", () => {
  const moment = describeDeadline({ kind: "exact", date: "2026-10-08" }, { now: NOW, viewerTimeZone: "Africa/Lagos" });
  assert.equal(moment.state, "open");
  assert.equal(moment.daysLeft, 5);
  assert.equal(moment.urgent, true);
  assert.equal(moment.label, "Closes Oct 8 · 5 days left");
  assert.equal(moment.shortLabel, "5 days left");
  assert.equal(moment.closesSource, undefined);
});

test("a west-of-UTC evening does not turn tomorrow into today", () => {
  const evening = new Date("2026-10-04T02:00:00Z"); // Oct 3, 7pm in Los Angeles
  const moment = describeDeadline({ kind: "exact", date: "2026-10-04" }, { now: evening, viewerTimeZone: "America/Los_Angeles" });
  assert.equal(moment.label, "Closes tomorrow");
});

test("exact closing times show the source zone and the viewer's zone", () => {
  const moment = describeDeadline(
    { kind: "exact", date: "2026-10-10", time: "2026-10-11T03:59:00Z", timezone: "America/New_York" },
    { now: NOW, viewerTimeZone: "Africa/Lagos" },
  );
  assert.equal(moment.closesSource, "11:59 pm EDT, Oct 10");
  assert.match(moment.closesLocal ?? "", /4:59 am .*Oct 11/u);
  assert.equal(moment.closesOn, "2026-10-11");
  assert.equal(moment.daysLeft, 8);
});

test("the local line is omitted when the zones agree", () => {
  const moment = describeDeadline(
    { kind: "exact", date: "2026-10-10", time: "2026-10-11T03:59:00Z", timezone: "America/New_York" },
    { now: NOW, viewerTimeZone: "America/New_York" },
  );
  assert.equal(moment.closesLocal, undefined);
});

test("an exact time that has passed is closed even on the same day", () => {
  const moment = describeDeadline(
    { kind: "exact", date: "2026-10-03", time: "2026-10-03T12:00:00Z", timezone: "UTC" },
    { now: NOW, viewerTimeZone: "UTC" },
  );
  assert.equal(moment.state, "closed");
});

test("countdown stops after thirty days and urgency after seven", () => {
  assert.equal(describeDeadline({ date: "2026-10-20" }, { now: NOW, viewerTimeZone: "UTC" }).urgent, false);
  assert.equal(describeDeadline({ date: "2026-12-01" }, { now: NOW, viewerTimeZone: "UTC" }).label, "Closes Dec 1");
  assert.equal(describeDeadline({ date: "2027-01-15" }, { now: NOW, viewerTimeZone: "UTC" }).label, "Closes Jan 15, 2027");
});

test("undated kinds read as their own state, never as a missing date", () => {
  assert.equal(describeDeadline({ kind: "rolling" }).state, "rolling");
  assert.equal(describeDeadline({ kind: "year-round" }).label, "Open all year");
  assert.equal(describeDeadline({ kind: "seasonal" }).state, "seasonal");
  assert.equal(describeDeadline({ kind: "conflicting", date: "2026-10-09" }, { now: NOW }).state, "needs-review");
  assert.equal(describeDeadline({}).label, "Deadline not listed");
});

test("date helpers", () => {
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(daysBetween("2026-10-03", "2026-10-31"), 28);
  assert.equal(calendarDateIn(new Date("2026-10-04T02:00:00Z"), "America/Los_Angeles"), "2026-10-03");
});
