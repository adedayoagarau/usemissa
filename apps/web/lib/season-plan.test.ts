import assert from "node:assert/strict";
import test from "node:test";

import {
  comingBack,
  feeBudget,
  laterTarget,
  monthStart,
  seasonCrunchWeeks,
  thisWeeksThree,
  type SeasonCall,
} from "./season-plan.ts";

const call = (id: string, overrides: Partial<SeasonCall> = {}): SeasonCall => ({
  trackedId: `t-${id}`,
  opportunityId: id,
  title: `Call ${id}`,
  myStatus: "preparing",
  revision: 1,
  deadlineKind: "exact",
  feeStatus: "unknown",
  ...overrides,
});

test("this week's three puts late steps first, then the soonest dates", () => {
  const actions = thisWeeksThree({
    today: "2026-10-05",
    calls: [
      call("a", { deadline: "2026-10-08" }),
      call("b", { deadline: "2026-10-07" }),
      call("c", { deadline: "2026-10-20" }),
      call("done", { deadline: "2026-10-06", myStatus: "submitted" }),
    ],
    obligations: [
      { id: "late", opportunityId: "a", opportunityTitle: "Call a", kind: "sub-deadline", label: "Ask for references", dueOn: "2026-10-03", state: "open" },
      { id: "same-day", opportunityId: "a", opportunityTitle: "Call a", kind: "start-by", label: "Start", dueOn: "2026-10-07", state: "open" },
      { id: "closed", opportunityId: "done", opportunityTitle: "Call done", kind: "sub-deadline", label: "Upload", dueOn: "2026-10-05", state: "open" },
      { id: "finished", opportunityId: "a", opportunityTitle: "Call a", kind: "sub-deadline", label: "Draft", dueOn: "2026-10-05", state: "done" },
    ],
  });
  assert.deepEqual(
    actions.map((action) => action.id),
    ["obligation:late", "deadline:b", "obligation:same-day"],
  );
  assert.equal(actions[0]!.daysAway, -2);
  assert.equal(actions[0]!.title, "Ask for references · Call a");
  assert.equal(actions[1]!.href, "/tracker?application=b");
});

test("crunch weeks count deadlines of calls in preparation", () => {
  const weeks = seasonCrunchWeeks(
    [
      call("a", { deadline: "2026-10-06" }),
      call("b", { deadline: "2026-10-07" }),
      call("c", { deadline: "2026-10-09" }),
      call("d", { deadline: "2026-10-09", myStatus: "submitted" }),
      call("e"),
    ],
    "2026-10-05",
    8,
  );
  assert.equal(weeks.length, 8);
  assert.equal(weeks[0]!.weekStart, "2026-10-05");
  assert.equal(weeks[0]!.count, 3);
  assert.equal(weeks[0]!.crunch, true);
  assert.equal(weeks[1]!.count, 0);
});

test("month starts roll over the year", () => {
  assert.equal(monthStart("2026-12-14"), "2026-12-01");
  assert.equal(monthStart("2026-12-14", 1), "2027-01-01");
  assert.equal(monthStart("2026-12-14", 2), "2027-02-01");
});

test("the fee budget uses the open tier and counts savings still available", () => {
  const budget = feeBudget({
    today: "2026-10-05",
    calls: [
      call("tiered", { deadline: "2026-10-30", feeStatus: "paid", feeCents: 4000, feeCurrency: "USD" }),
      call("flat", { deadline: "2026-11-15", feeStatus: "paid", feeCents: 2500, feeCurrency: "USD" }),
      call("free", { deadline: "2026-10-12", feeStatus: "no-fee" }),
      call("unknown", { deadline: "2026-11-02" }),
      call("later", { deadline: "2027-01-10", feeStatus: "paid", feeCents: 9900 }),
      call("submitted", { deadline: "2026-10-10", feeStatus: "paid", feeCents: 500, myStatus: "submitted" }),
    ],
    tiersByOpportunity: new Map([
      [
        "tiered",
        [
          { id: "early", label: "Early-bird", closesOn: "2026-10-01", feeCents: 1500, feeCurrency: "USD" },
          { id: "regular", label: "Regular", closesOn: "2026-10-15", feeCents: 2500, feeCurrency: "USD" },
          { id: "late", label: "Late", closesOn: "2026-10-30", feeCents: 4000, feeCurrency: "USD" },
        ],
      ],
    ]),
  });
  assert.deepEqual(
    budget.lines.map((line) => line.opportunityId),
    ["free", "tiered", "unknown", "flat"],
  );
  const tiered = budget.lines.find((line) => line.opportunityId === "tiered")!;
  assert.equal(tiered.feeCents, 2500);
  assert.equal(tiered.tierLabel, "Regular");
  assert.equal(tiered.savingsCents, 1500);
  assert.equal(tiered.savingsUntil, "2026-10-15");
  assert.deepEqual(budget.totals, [{ currency: "USD", thisMonthCents: 2500, nextMonthCents: 2500, savingsCents: 1500 }]);
  assert.equal(budget.unknownCount, 1);
});

test("coming back lists predictions for closed cycles only, soonest first", () => {
  const rows = comingBack(
    [
      { opportunityId: "x", title: "Later", deadline: "2026-01-01", relation: "tracked", forecast: { expectedClose: "2027-03-01", confidence: "low", basedOnCycles: 2 } },
      { opportunityId: "y", title: "Sooner", relation: "following", forecast: { expectedOpenStart: "2026-11-01", expectedOpenEnd: "2026-11-20", confidence: "high", basedOnCycles: 5 } },
      { opportunityId: "z", title: "Open now", deadline: "2026-12-01", relation: "tracked", forecast: { expectedClose: "2027-12-01", confidence: "high", basedOnCycles: 3 } },
      { opportunityId: "w", title: "Passed", relation: "tracked", forecast: { expectedClose: "2026-01-01", confidence: "high", basedOnCycles: 3 } },
    ],
    "2026-10-05",
  );
  assert.deepEqual(rows.map((row) => [row.opportunityId, row.label]), [
    ["y", "Predicted to open"],
    ["x", "Predicted deadline"],
  ]);
});

test("a later target moves a week but never past the deadline", () => {
  assert.equal(laterTarget("2026-10-10", "2026-10-30"), "2026-10-17");
  assert.equal(laterTarget("2026-10-27", "2026-10-30"), "2026-10-30");
  assert.equal(laterTarget("2026-10-30", "2026-10-30"), null);
  assert.equal(laterTarget("2026-10-10", undefined), "2026-10-17");
});
