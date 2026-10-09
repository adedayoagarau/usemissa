import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyWritingPractice,
  startPracticeSession,
  endPracticeSession,
  sessionElapsed,
  readWritingPractice,
  practiceWeek,
  practiceDay,
} from "./writing-practice";
test("sessions require opt-in, allow revision and survive reload without double counting", () => {
  const off = emptyWritingPractice();
  assert.equal(startPracticeSession(off, "writing", 1000, "a"), off);
  const started = startPracticeSession(
    { ...off, enabled: true },
    "revision",
    1000,
    "a",
  );
  assert.equal(startPracticeSession(started, "writing", 2000, "b"), started);
  const loaded = readWritingPractice(JSON.stringify(started));
  assert.equal(loaded.sessions[0].kind, "revision");
  const ended = endPracticeSession(loaded, 61000);
  assert.equal(sessionElapsed(ended.sessions[0]), 60000);
  assert.deepEqual(endPracticeSession(ended, 90000), ended);
});
test("calendar uses local dates, Monday weeks and crosses year boundaries", () => {
  assert.equal(practiceDay(new Date(2026, 0, 1, 23)), "2026-01-01");
  assert.deepEqual(practiceWeek(new Date(2026, 0, 1)), [
    "2025-12-29",
    "2025-12-30",
    "2025-12-31",
    "2026-01-01",
    "2026-01-02",
    "2026-01-03",
    "2026-01-04",
  ]);
});
test("invalid storage falls back safely and clock rollback never adds negative time", () => {
  assert.deepEqual(readWritingPractice("broken"), emptyWritingPractice());
  const started = startPracticeSession(
    { ...emptyWritingPractice(), enabled: true },
    "writing",
    2000,
    "a",
  );
  assert.equal(
    sessionElapsed(endPracticeSession(started, 1000).sessions[0]),
    0,
  );
});
test("screenplay guide sets explicit page typography and optional celebrations stay off until chosen", async () => {
  const { writingStartingGuideDocument } = await import("./writing-practice");
  const doc = writingStartingGuideDocument("screenplay");
  assert.equal(doc.pageSize, "letter");
  assert.equal(doc.typeface, "courier-prime");
  assert.equal(doc.textSize, 12);
  assert.equal(doc.pages[0].format.lineHeight, 1);
  assert.equal(doc.pages[0].format.margins.left, 38.1);
  assert.equal(emptyWritingPractice().celebrateMilestones, false);
  const legacy = JSON.parse(JSON.stringify(emptyWritingPractice()));
  delete legacy.celebrateMilestones;
  assert.equal(
    readWritingPractice(JSON.stringify(legacy)).celebrateMilestones,
    false,
  );
  assert.equal(
    readWritingPractice(
      JSON.stringify({ ...emptyWritingPractice(), celebrateMilestones: true }),
    ).celebrateMilestones,
    true,
  );
});
