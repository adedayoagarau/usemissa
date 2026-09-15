import assert from "node:assert/strict";
import test from "node:test";

import {
  firstViableDeadlineSchedule,
  isAhead,
  isBeforeDeadlineClose,
  isTimeOfDay,
  reminderDateForOffset,
  reminderInstant,
  viableTimeOfDay,
} from "./reminder-schedule.ts";

test("validates a wall-clock time of day", () => {
  assert.equal(isTimeOfDay("09:00"), true);
  assert.equal(isTimeOfDay("23:59"), true);
  assert.equal(isTimeOfDay("00:00"), true);
  assert.equal(isTimeOfDay("24:00"), false);
  assert.equal(isTimeOfDay("9:00"), false);
  assert.equal(isTimeOfDay("09:60"), false);
  assert.equal(isTimeOfDay(""), false);
});

test("shifts the deadline date back by whole days across month boundaries", () => {
  assert.equal(reminderDateForOffset("2026-09-14", 0), "2026-09-14");
  assert.equal(reminderDateForOffset("2026-09-14", 1), "2026-09-13");
  assert.equal(reminderDateForOffset("2026-09-14", 14), "2026-08-31");
  assert.equal(reminderDateForOffset("2026-01-01", 1), "2025-12-31");
});

test("builds the reminder instant in the viewer's own timezone", () => {
  const instant = reminderInstant("2026-09-14", "09:00");
  assert.ok(instant);
  assert.equal(instant.getFullYear(), 2026);
  assert.equal(instant.getMonth(), 8);
  assert.equal(instant.getDate(), 14);
  assert.equal(instant.getHours(), 9);
  assert.equal(instant.getMinutes(), 0);
  assert.equal(reminderInstant("2026-09-14", "9am"), null);
});

test("keeps the morning default while it is still ahead", () => {
  const now = new Date(2026, 8, 14, 8, 0, 0);
  assert.equal(viableTimeOfDay("2026-09-14", now), "09:00");
  assert.equal(isAhead("2026-09-14", "09:00", now), true);
});

test("offers a later time today once the morning default has passed", () => {
  const now = new Date(2026, 8, 14, 11, 25, 0);
  const timeOfDay = viableTimeOfDay("2026-09-14", now);
  assert.equal(timeOfDay, "12:00");
  assert.equal(isAhead("2026-09-14", timeOfDay, now), true);
});

test("clamps a very late same-day reminder instead of rolling into tomorrow", () => {
  const now = new Date(2026, 8, 14, 23, 50, 0);
  const timeOfDay = viableTimeOfDay("2026-09-14", now);
  assert.equal(timeOfDay, "23:59");
  assert.equal(isAhead("2026-09-14", timeOfDay, now), true);
});

test("keeps the morning default for a future reminder date", () => {
  const now = new Date(2026, 8, 14, 11, 25, 0);
  assert.equal(viableTimeOfDay("2026-09-20", now), "09:00");
});

test("falls back to the day before, then the deadline day itself", () => {
  const twoDaysOut = firstViableDeadlineSchedule(
    "2026-09-16",
    new Date(2026, 8, 14, 11, 25, 0),
    [1, 0],
  );
  assert.deepEqual(twoDaysOut, { offsetDays: 1, timeOfDay: "09:00" });

  const sameDay = firstViableDeadlineSchedule(
    "2026-09-14",
    new Date(2026, 8, 14, 11, 25, 0),
    [1, 0],
  );
  assert.deepEqual(sameDay, { offsetDays: 0, timeOfDay: "12:00" });
});

test("returns no schedule once the deadline day has ended", () => {
  assert.equal(
    firstViableDeadlineSchedule(
      "2026-09-13",
      new Date(2026, 8, 14, 9, 0, 0),
      [1, 0],
    ),
    null,
  );
});

test("keeps reminder instants before a provider-stated close", () => {
  const close = new Date(2026, 8, 14, 17, 0, 0).toISOString();
  assert.equal(isBeforeDeadlineClose("2026-09-14", "16:59", close), true);
  assert.equal(isBeforeDeadlineClose("2026-09-14", "17:00", close), false);
  assert.equal(isBeforeDeadlineClose("2026-09-14", "17:01", close), false);
  assert.equal(isBeforeDeadlineClose("2026-09-14", "17:01"), true);
});

test("bounds a same-day default to the last minute before close", () => {
  const now = new Date(2026, 8, 14, 16, 35, 0);
  const close = new Date(2026, 8, 14, 17, 0, 0).toISOString();
  assert.deepEqual(firstViableDeadlineSchedule("2026-09-14", now, [0], close), {
    offsetDays: 0,
    timeOfDay: "16:59",
  });
});

test("returns no same-day schedule after a provider-stated close", () => {
  const now = new Date(2026, 8, 14, 17, 0, 0);
  const close = new Date(2026, 8, 14, 17, 0, 0).toISOString();
  assert.equal(
    firstViableDeadlineSchedule("2026-09-14", now, [0], close),
    null,
  );
});

test("uses the closing minute when the close includes later seconds", () => {
  const now = new Date(2026, 8, 14, 16, 59, 10);
  const close = new Date(2026, 8, 14, 17, 0, 30).toISOString();
  assert.deepEqual(firstViableDeadlineSchedule("2026-09-14", now, [0], close), {
    offsetDays: 0,
    timeOfDay: "17:00",
  });
});
