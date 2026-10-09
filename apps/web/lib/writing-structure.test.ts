import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_STRUCTURE,
  structureSchema,
  validDate,
  writingDays,
  goalSummary,
  continuityAlerts,
  filterStructurePieces,
} from "./writing-structure.ts";

test("defaults and safe bounds reject duplicate ids and impossible dates", () => {
  assert.deepEqual(structureSchema.parse({}), EMPTY_STRUCTURE);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2025-02-29"), false);
  assert.equal(
    structureSchema.safeParse({ goal: { deadline: "2025-02-29" } }).success,
    false,
  );
  assert.equal(
    structureSchema.safeParse({ goal: { target: Infinity } }).success,
    false,
  );
  assert.equal(
    structureSchema.safeParse({
      records: [
        { id: "a", kind: "person", name: "" },
        { id: "a", kind: "place", name: "" },
      ],
    }).success,
    false,
  );
});
test("calendar arithmetic is inclusive across DST, excludes days off and handles expired goals", () => {
  assert.equal(writingDays("2026-03-06", "2026-03-09", [0, 6]), 2);
  assert.equal(writingDays("2026-03-06", "2026-03-06", []), 1);
  assert.equal(writingDays("2026-03-07", "2026-03-06", []), 0);
  assert.equal(
    writingDays("2026-03-06", "2026-03-09", [0, 1, 2, 3, 4, 5, 6]),
    0,
  );
});
test("goal totals scope pieces, clamp progress and do not divide by zero", () => {
  const goal = {
    target: 100,
    deadline: "2026-03-09",
    daysOff: [0, 6],
    pieceIds: ["a"],
  };
  assert.deepEqual(
    goalSummary(
      goal,
      [
        { id: "a", wordCount: 30 },
        { id: "b", wordCount: 500 },
      ],
      "2026-03-06",
    ),
    { words: 30, remaining: 70, days: 2, daily: 35, percent: 30 },
  );
  assert.equal(
    goalSummary(
      { ...goal, pieceIds: [] },
      [{ id: "a", wordCount: 500 }],
      "2026-03-10",
    ).percent,
    100,
  );
  assert.equal(goalSummary(goal, [], "2026-03-10").daily, null);
});
test("timeline compares declared ranges and dependencies, never flags flashbacks alone", () => {
  const first = {
    id: "a",
    label: "Later",
    start: "2026-03-09",
    end: "",
    tellingOrder: 1,
    afterId: "",
    pieceId: "",
    notes: "",
  };
  const second = {
    ...first,
    id: "b",
    label: "Earlier",
    start: "2026-03-06",
    tellingOrder: 2,
  };
  assert.deepEqual(continuityAlerts([first, second]), []);
  assert.equal(
    continuityAlerts([first, { ...second, afterId: "a" }]).length,
    1,
  );
  assert.equal(
    continuityAlerts([
      { ...first, afterId: "b" },
      { ...second, afterId: "a" },
    ]).filter((a) => a.message.includes("loop")).length,
    2,
  );
  assert.equal(continuityAlerts([{ ...second, end: "2026-03-05" }]).length, 1);
});
test("saved views combine exact custom value, status and literal text search", () => {
  const pieces = [
    { id: "a", title: "A garden", synopsis: "Winter", status: "draft" },
    { id: "b", title: "Garden", synopsis: "Summer", status: "final" },
  ];
  const view = {
    id: "v",
    name: "",
    query: "WINTER",
    status: "draft" as const,
    fieldId: "mood",
    fieldValue: "quiet",
  };
  assert.deepEqual(
    filterStructurePieces(pieces, view, { a: { mood: "quiet" } }).map(
      (p) => p.id,
    ),
    ["a"],
  );
  assert.equal(
    filterStructurePieces(
      pieces,
      { ...view, fieldValue: "Quiet" },
      { a: { mood: "quiet" } },
    ).length,
    0,
  );
});
test("custom values honor types and bounded definitions", () => {
  const state = {
    ...EMPTY_STRUCTURE,
    customFields: [{ id: "date", name: "Date", kind: "date", options: [] }],
    pieceValues: { a: { date: "2026-02-30" } },
  };
  assert.equal(structureSchema.safeParse(state).success, false);
  assert.equal(
    structureSchema.safeParse({
      ...state,
      pieceValues: { a: { date: "2026-02-28" } },
    }).success,
    true,
  );
  assert.equal(
    structureSchema.safeParse({
      ...EMPTY_STRUCTURE,
      customFields: Array.from({ length: 31 }, (_, i) => ({
        id: `f${i}`,
        name: "",
        kind: "text",
      })),
    }).success,
    false,
  );
});
