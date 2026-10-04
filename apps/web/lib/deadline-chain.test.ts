import assert from "node:assert/strict";
import test from "node:test";

import { crunchWeeks, cushion, recalculateChain, resolveDueDate, startBy, triageBucket, weekStartOf } from "./deadline-chain.ts";

test("offsets are signed days from the anchor", () => {
  assert.equal(resolveDueDate("2026-11-30", -30), "2026-10-31");
  assert.equal(resolveDueDate("2026-11-30", 14), "2026-12-14");
});

test("keep moves anchored items with the deadline; done items never move", () => {
  const moves = recalculateChain(
    [
      { id: "refs", dueOn: "2026-10-31", offsetDays: -30, bufferPolicy: "keep" },
      { id: "draft", dueOn: "2026-11-23", offsetDays: -7, bufferPolicy: "keep", state: "done" },
      { id: "fixed", dueOn: "2026-11-01", offsetDays: null, bufferPolicy: "keep" },
    ],
    "2026-11-30",
    "2026-12-07",
  );
  assert.deepEqual(moves, [{ id: "refs", from: "2026-10-31", to: "2026-11-07" }]);
});

test("absorb turns an extension into slack but follows an earlier deadline", () => {
  const items = [{ id: "a", dueOn: "2026-11-23", offsetDays: -7, bufferPolicy: "absorb" as const }];
  assert.deepEqual(recalculateChain(items, "2026-11-30", "2026-12-07"), []);
  assert.deepEqual(recalculateChain(items, "2026-11-30", "2026-11-27"), [{ id: "a", from: "2026-11-23", to: "2026-11-20" }]);
});

test("ignore never moves and an unchanged anchor produces no moves", () => {
  assert.deepEqual(recalculateChain([{ id: "a", dueOn: "2026-11-23", offsetDays: -7, bufferPolicy: "ignore" }], "2026-11-30", "2026-12-30"), []);
  assert.deepEqual(recalculateChain([{ id: "a", dueOn: "2026-11-23", offsetDays: -7, bufferPolicy: "keep" }], "2026-11-30", "2026-11-30"), []);
});

test("start-by explains its arithmetic", () => {
  const plan = startBy({ effortHours: 12, weeklyHours: 6, finishOn: "2026-11-30", bufferDays: 2, today: "2026-10-03" });
  assert.equal(plan.workingDays, 14);
  assert.equal(plan.startOn, "2026-11-14");
  assert.equal(plan.feasible, true);
  assert.equal(plan.reason, "About 12 hours of work at 6 hours a week takes 14 days and 2 days of slack.");
  assert.equal(startBy({ effortHours: 40, weeklyHours: 3, finishOn: "2026-10-20", bufferDays: 0, today: "2026-10-03" }).feasible, false);
});

test("cushion finds work that no longer fits and says why", () => {
  const results = cushion(
    [
      { id: "b", title: "Grant", finishOn: "2026-10-31", effortHours: 24 },
      { id: "a", title: "Residency", finishOn: "2026-10-17", effortHours: 8 },
    ],
    7,
    "2026-10-03",
  );
  assert.deepEqual(results.map((r) => [r.id, r.status]), [["a", "fits"], ["b", "does-not-fit"]]);
  assert.equal(results[1].suggestion, "drop-or-defer");
  assert.deepEqual(results[1].competingIds, ["a"]);
  assert.equal(cushion([{ id: "x", title: "X", finishOn: "2026-10-10", effortHours: 2 }], 0, "2026-10-03")[0].suggestion, "add-hours");
});

test("triage buckets", () => {
  assert.equal(triageBucket(null), "undated");
  assert.equal(triageBucket(-1), "closed");
  assert.equal(triageBucket(30), "act-now");
  assert.equal(triageBucket(31), "develop");
  assert.equal(triageBucket(120), "plan-ahead");
  assert.equal(triageBucket(400), "later");
});

test("crunch weeks group deadlines by Monday", () => {
  assert.equal(weekStartOf("2026-10-03"), "2026-09-28");
  const weeks = crunchWeeks(
    [
      { id: "1", date: "2026-10-05" },
      { id: "2", date: "2026-10-06" },
      { id: "3", date: "2026-10-11" },
      { id: "4", date: "2026-10-12" },
      { id: "old", date: "2026-09-01" },
    ],
    "2026-10-03",
    4,
  );
  assert.equal(weeks[0].weekStart, "2026-09-28");
  assert.deepEqual(weeks[1].ids, ["1", "2", "3"]);
  assert.equal(weeks[1].crunch, true);
  assert.equal(weeks[2].count, 1);
});
