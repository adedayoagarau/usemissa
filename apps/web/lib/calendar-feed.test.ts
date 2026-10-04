import assert from "node:assert/strict";
import test from "node:test";

import { ALL_CALENDAR_FEED_TYPES, calendarFeedUrl, webcalUrl } from "./calendar-feed.ts";

const base = "https://missa.test/api/users/u1/calendar.ics?token=abc";

test("a feed with every type leaves types off and states alarms", () => {
  assert.equal(calendarFeedUrl(base, ALL_CALENDAR_FEED_TYPES, true), `${base}&alarms=1`);
});

test("a feed with some types lists them in a stable order", () => {
  assert.equal(
    calendarFeedUrl(base, ["target", "deadline", "stage"], false),
    `${base}&types=deadline,stage,target&alarms=0`,
  );
});

test("rebuilding a link replaces earlier choices", () => {
  const first = calendarFeedUrl(base, ["deadline"], false);
  assert.equal(calendarFeedUrl(first, ALL_CALENDAR_FEED_TYPES, true), `${base}&alarms=1`);
});

test("webcal links keep the rest of the address", () => {
  assert.equal(webcalUrl(base), "webcal://missa.test/api/users/u1/calendar.ics?token=abc");
});
