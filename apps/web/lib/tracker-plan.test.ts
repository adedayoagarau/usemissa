import assert from "node:assert/strict";
import test from "node:test";

import {
  attentionObligations,
  canCarry,
  dueLabel,
  planBuckets,
  quietLabel,
  rowDeadline,
  rowResponseClock,
  startByForPlan,
  viewerToday,
} from "./tracker-plan";

const clock = { now: new Date("2026-10-04T15:00:00Z"), timeZone: "UTC" };

test("rows describe the deadline with the exact closing time when known", () => {
  const moment = rowDeadline(
    {
      deadline: "2026-10-08",
      deadlineKind: "exact",
      deadlineTime: "2026-10-09T03:59:00Z",
      deadlineTimezone: "America/New_York",
    },
    clock,
  );
  assert.equal(moment.state, "open");
  assert.equal(moment.urgent, true);
  assert.equal(moment.closesSource, "11:59 pm EDT, Oct 8");
  assert.match(moment.closesLocal ?? "", /Oct 9/);
  assert.equal(rowDeadline({ deadlineKind: "rolling" }, clock).label, "Rolling deadline");
  assert.equal(viewerToday(clock), "2026-10-04");
});

test("quiet line appears after three weeks without activity, only before submission", () => {
  assert.equal(quietLabel({ myStatus: "preparing", lastActivityAt: "2026-09-01T00:00:00Z" }, clock), "No activity in 4 weeks");
  assert.equal(quietLabel({ myStatus: "saved", lastActivityAt: "2026-09-13T15:00:00Z" }, clock), "No activity in 3 weeks");
  assert.equal(quietLabel({ myStatus: "saved", lastActivityAt: "2026-09-20T00:00:00Z" }, clock), null);
  assert.equal(quietLabel({ myStatus: "submitted", lastActivityAt: "2026-01-01T00:00:00Z" }, clock), null);
  assert.equal(quietLabel({ myStatus: "preparing" }, clock), null);
});

test("response clock uses only the stated window and never invents one", () => {
  const stated = rowResponseClock(
    { myStatus: "submitted", submittedAt: "2026-08-01", expectedResponseBy: "2026-09-15" },
    clock,
  );
  assert.equal(stated?.state, "past-stated");
  assert.equal(stated?.statedDays, 45);
  assert.equal(stated?.basis, "Stated by the organization");

  const unknown = rowResponseClock({ myStatus: "in-review", submittedAt: "2026-09-20" }, clock);
  assert.equal(unknown?.state, "no-window");
  assert.equal(unknown?.label, "Waiting 14 days");

  assert.equal(rowResponseClock({ myStatus: "submitted" }, clock), null);
  assert.equal(rowResponseClock({ myStatus: "accepted", submittedAt: "2026-08-01" }, clock), null);
});

test("Plan view buckets calls in preparation by time left", () => {
  const items = [
    { title: "Soon", myStatus: "preparing", deadline: "2026-10-20", deadlineKind: "exact" },
    { title: "Sooner", myStatus: "saved", deadline: "2026-10-10", deadlineKind: "exact" },
    { title: "Spring", myStatus: "saved", deadline: "2026-12-15", deadlineKind: "exact" },
    { title: "Next year", myStatus: "saved", deadline: "2027-06-01", deadlineKind: "exact" },
    { title: "Rolling", myStatus: "saved", deadlineKind: "rolling" },
    { title: "Gone", myStatus: "saved", deadline: "2026-09-01", deadlineKind: "exact" },
    { title: "Sent", myStatus: "submitted", deadline: "2026-10-10", deadlineKind: "exact" },
  ];
  const buckets = planBuckets(items, clock);
  assert.deepEqual(
    buckets.map((bucket) => [bucket.label, bucket.items.map((item) => item.title)]),
    [
      ["Act now", ["Sooner", "Soon"]],
      ["Develop", ["Spring"]],
      ["Plan ahead", []],
      ["Later", ["Next year"]],
      ["Rolling or undated", ["Rolling"]],
      ["Closed", ["Gone"]],
    ],
  );
  assert.deepEqual(
    planBuckets([], clock).map((bucket) => bucket.key),
    ["act-now", "develop", "plan-ahead", "later"],
  );
});

test("Needs attention lists open steps due within a week for tracked calls", () => {
  const steps = [
    { id: "a", label: "Budget", dueOn: "2026-10-09", state: "open", opportunityId: "o1", opportunityTitle: "Grant" },
    { id: "b", label: "References", dueOn: "2026-10-05", state: "open", opportunityId: "o1", opportunityTitle: "Grant" },
    { id: "c", label: "Done", dueOn: "2026-10-05", state: "done", opportunityId: "o1", opportunityTitle: "Grant" },
    { id: "d", label: "Later", dueOn: "2026-10-20", state: "open", opportunityId: "o1", opportunityTitle: "Grant" },
    { id: "e", label: "Removed call", dueOn: "2026-10-06", state: "open", opportunityId: "gone", opportunityTitle: "Gone" },
  ];
  assert.deepEqual(
    attentionObligations(steps, new Set(["o1"]), "2026-10-04").map((step) => step.id),
    ["b", "a"],
  );
  const format = (iso: string) => iso.slice(5);
  assert.equal(dueLabel("2026-10-04", "2026-10-04", format), "Due today");
  assert.equal(dueLabel("2026-10-05", "2026-10-04", format), "Due tomorrow");
  assert.equal(dueLabel("2026-10-09", "2026-10-04", format), "Due 10-09");
  assert.equal(dueLabel("2026-10-01", "2026-10-04", format), "Was due 10-01");
});

test("start-by finishes against the personal target and needs weekly hours", () => {
  const steps = [
    { kind: "sub-deadline", state: "open", effortHours: 10 },
    { kind: "sub-deadline", state: "done", effortHours: 40 },
    { kind: "obligation", state: "open", effortHours: 30 },
  ];
  const plan = startByForPlan({
    steps,
    type: "grant",
    weeklyHours: 7,
    bufferDays: 2,
    deadline: "2026-11-30",
    personalTargetOn: "2026-11-20",
    today: "2026-10-04",
  });
  assert.equal(plan.status, "ready");
  if (plan.status !== "ready") return;
  assert.equal(plan.finishLabel, "target");
  assert.equal(plan.result.workingDays, 10);
  assert.equal(plan.result.startOn, "2026-11-08");
  assert.equal(plan.result.feasible, true);

  assert.deepEqual(
    startByForPlan({ steps, weeklyHours: null, bufferDays: 2, deadline: "2026-11-30", today: "2026-10-04" }),
    { status: "needs-hours" },
  );
  assert.deepEqual(startByForPlan({ steps, weeklyHours: 5, bufferDays: 2, today: "2026-10-04" }), { status: "no-date" });

  const fromTemplates = startByForPlan({ steps: [], type: "grant", weeklyHours: 7, bufferDays: 0, deadline: "2026-11-30", today: "2026-10-04" });
  assert.equal(fromTemplates.status, "ready");
  if (fromTemplates.status === "ready") assert.ok(fromTemplates.result.workingDays > 1);
});

test("carry applies to declined, withdrawn and closed-before-submission calls", () => {
  assert.equal(canCarry({ myStatus: "declined" }), true);
  assert.equal(canCarry({ myStatus: "withdrawn" }), true);
  assert.equal(canCarry({ myStatus: "saved", deadlineState: "closed" }), true);
  assert.equal(canCarry({ myStatus: "preparing", opportunityStatus: "closed" }), true);
  assert.equal(canCarry({ myStatus: "saved", deadlineState: "open" }), false);
  assert.equal(canCarry({ myStatus: "submitted", deadlineState: "closed" }), false);
  assert.equal(canCarry({ myStatus: "accepted" }), false);
  assert.equal(canCarry({ myStatus: "declined", isManual: true }), false);
});
