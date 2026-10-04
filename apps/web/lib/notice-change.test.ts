import test from "node:test";
import assert from "node:assert/strict";
import { noticeChange, readableNoticeText } from "./notice-change";

const now = new Date("2026-10-04T09:00:00Z");

test("ISO dates in notice text become short dates", () => {
  assert.equal(
    readableNoticeText("The official deadline moved from 2026-10-07 to 2027-01-21.", now),
    "The official deadline moved from Oct 7 to Jan 21, 2027.",
  );
});

test("a moved deadline gives its was and now values", () => {
  assert.deepEqual(noticeChange("The official deadline moved from 2026-10-07 to 2026-10-21. Your calendar now uses the new date.", now), {
    was: "Oct 7",
    now: "Oct 21",
  });
});

test("plan and forecast notices give their was and now values", () => {
  assert.deepEqual(noticeChange("The deadline moved from Oct 3 to Oct 10, so 2 steps moved: Final draft, Upload.", now), {
    was: "Oct 3",
    now: "Oct 10",
  });
  assert.deepEqual(
    noticeChange("The predicted opening moved from between Feb 1 and Feb 14 to Feb 20, now confirmed by the source.", now),
    { was: "between Feb 1 and Feb 14", now: "Feb 20" },
  );
});

test("text without a change gives nothing", () => {
  assert.equal(noticeChange("Applications are open.", now), null);
  assert.equal(noticeChange(null, now), null);
});
