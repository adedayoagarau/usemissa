import assert from "node:assert/strict";
import test from "node:test";

import type { PlanningItem } from "@missa/radar-adapters";
import {
  capacityReport,
  defaultPlanSkipReason,
  defaultPlanTemplates,
  finishDate,
  START_BY_TEMPLATE_KEY,
  templateInputs,
} from "./planning-engine.ts";

const item = (overrides: Partial<PlanningItem> = {}): PlanningItem => ({
  trackedOpportunityId: "t1",
  opportunityId: "o1",
  title: "Residency",
  type: "residency",
  status: "preparing",
  deadline: "2026-12-01",
  deadlineKind: "exact",
  personalTargetOn: null,
  remainingEffortHours: 10,
  openSteps: 3,
  ...overrides,
});

const plus = { startByPlanning: true, capacityPlanning: false };
const pro = { startByPlanning: true, capacityPlanning: true };
const free = { startByPlanning: false, capacityPlanning: false };

test("default plans need start-by planning, a call in preparation and a confirmed deadline ahead", () => {
  const today = "2026-10-04";
  assert.equal(defaultPlanSkipReason(free, item(), today), "plan");
  assert.equal(defaultPlanSkipReason(plus, undefined, today), "not-tracked");
  assert.equal(defaultPlanSkipReason(plus, item({ status: "submitted" }), today), "not-preparing");
  assert.equal(defaultPlanSkipReason(plus, item({ deadlineKind: "estimated" }), today), "no-exact-deadline");
  assert.equal(defaultPlanSkipReason(plus, item({ deadline: null, deadlineKind: "rolling" }), today), "no-exact-deadline");
  assert.equal(defaultPlanSkipReason(plus, item({ deadline: "2026-10-04" }), today), "deadline-passed");
  assert.equal(defaultPlanSkipReason(plus, item({ deadlineKind: "fixed" }), today), undefined);
});

test("template effort follows the creator's own estimates", () => {
  const steps = templateInputs("preparation", "residency", { materialEffort: { statement: 9 } });
  assert.equal(steps.find((step) => step.key === "statement")?.effortHours, 9);
  assert.equal(steps.find((step) => step.key === "upload")?.effortHours, 1);
  const after = templateInputs("acceptance", "grant", { materialEffort: {} });
  assert.ok(after.every((step) => step.anchor === "accepted" && step.offsetDays > 0));
});

test("a start-by step joins the default plan once weekly hours are known", () => {
  const preferences = { materialEffort: {}, weeklyHoursAvailable: null, defaultBufferDays: 2 };
  const dates = { deadline: "2026-12-01", today: "2026-10-04" };
  assert.equal(defaultPlanTemplates("residency", preferences, dates).some((step) => step.key === START_BY_TEMPLATE_KEY), false);

  // Residency steps add up to 10 hours; at 7 hours a week that is 10 days, plus 2 days of slack.
  const planned = defaultPlanTemplates("residency", { ...preferences, weeklyHoursAvailable: 7 }, dates);
  const start = planned[0]!;
  assert.equal(start.key, START_BY_TEMPLATE_KEY);
  assert.equal(start.kind, "start-by");
  assert.equal(start.offsetDays, -12);
  assert.equal(start.effortHours, null, "the start-by step never double counts effort");

  // A personal target finishes earlier, so the start moves earlier too.
  const targeted = defaultPlanTemplates("residency", { ...preferences, weeklyHoursAvailable: 7 }, { ...dates, personalTargetOn: "2026-11-21" });
  assert.equal(targeted[0]!.offsetDays, -22);

  // When the work no longer fits, the plan starts today rather than in the past.
  const late = defaultPlanTemplates("residency", { ...preferences, weeklyHoursAvailable: 1 }, { deadline: "2026-10-20", today: "2026-10-04" });
  assert.equal(late[0]!.offsetDays, -16);
});

test("finish dates prefer the personal target", () => {
  assert.equal(finishDate(item({ personalTargetOn: "2026-11-20" })), "2026-11-20");
  assert.equal(finishDate(item()), "2026-12-01");
  assert.equal(finishDate(item({ deadlineKind: "estimated" })), null);
});

test("capacity is a Pro feature and needs weekly hours", () => {
  const preferences = { weeklyHoursAvailable: 5, defaultBufferDays: 2 };
  assert.deepEqual(capacityReport({ features: plus, preferences, items: [item()], today: "2026-10-04" }), {
    status: "locked",
    feature: "capacityPlanning",
  });
  assert.deepEqual(
    capacityReport({ features: pro, preferences: { ...preferences, weeklyHoursAvailable: null }, items: [item()], today: "2026-10-04" }),
    { status: "needs-hours" },
  );
});

test("capacity uses remaining effort, finish dates and start-by per call", () => {
  const report = capacityReport({
    features: pro,
    preferences: { weeklyHoursAvailable: 7, defaultBufferDays: 2 },
    today: "2026-10-04",
    items: [
      item({ trackedOpportunityId: "late", opportunityId: "o-late", deadline: "2026-12-01", remainingEffortHours: 30 }),
      item({ trackedOpportunityId: "soon", opportunityId: "o-soon", personalTargetOn: "2026-10-14", remainingEffortHours: 12 }),
      item({ trackedOpportunityId: "rolling", opportunityId: "o-rolling", title: "Rolling call", deadline: null, deadlineKind: "rolling" }),
      item({ trackedOpportunityId: "sent", status: "submitted" }),
      item({ trackedOpportunityId: "empty", opportunityId: "o-empty", deadline: "2026-11-01", remainingEffortHours: 0 }),
    ],
  });
  assert.equal(report.status, "ready");
  if (report.status !== "ready") return;
  assert.deepEqual(report.items.map((entry) => entry.id), ["soon", "empty", "late"]);
  const soon = report.items[0]!;
  assert.equal(soon.finishBasis, "personal-target");
  assert.equal(soon.availableHours, 10);
  assert.equal(soon.status, "does-not-fit");
  assert.equal(soon.startBy?.feasible, false);
  assert.equal(report.items[1]!.startBy, undefined, "no start-by without remaining work");
  assert.equal(report.items[2]!.neededHours, 42);
  assert.equal(report.items[2]!.finishBasis, "deadline");
  assert.deepEqual(report.undated, [{ opportunityId: "o-rolling", title: "Rolling call" }]);
});
