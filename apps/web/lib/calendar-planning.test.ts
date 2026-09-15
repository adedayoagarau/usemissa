import assert from "node:assert/strict";
import test from "node:test";

import {
  calendarSourceEvents,
  canSetDeadlineReminder,
} from "./calendar-planning.ts";

test("only application deadline events offer deadline reminders", () => {
  const events = calendarSourceEvents([
    {
      opportunityId: "opp-1",
      title: "Future call",
      myStatus: "saved",
      oppStatus: "opening-soon",
      openDate: "2099-01-01",
      deadline: "2099-01-31",
      deadlineKind: "fixed",
      deadlineTime: "2099-01-31T17:00:00.000Z",
      deadlineTimezone: "UTC",
    },
    {
      opportunityId: "opp-2",
      title: "Submitted call",
      myStatus: "submitted",
      expectedResponseBy: "2099-02-28",
    },
  ]);

  const opening = events.find((event) => event.id === "opens:opp-1");
  const deadline = events.find((event) => event.id === "deadline:opp-1");
  const response = events.find((event) => event.id === "response:opp-2");

  assert.ok(opening);
  assert.ok(deadline);
  assert.ok(response);
  assert.equal(canSetDeadlineReminder(opening), false);
  assert.equal(canSetDeadlineReminder(deadline), true);
  assert.equal(canSetDeadlineReminder(response), false);
  assert.equal(deadline.deadlineTime, "2099-01-31T17:00:00.000Z");
  assert.equal(deadline.deadlineTimezone, "UTC");
});

test("a persisted official deadline event can offer a reminder", () => {
  assert.equal(
    canSetDeadlineReminder({
      id: "event-1",
      title: "Official deadline",
      startAt: "2099-01-31T00:00:00.000Z",
      endAt: "2099-02-01T00:00:00.000Z",
      allDay: true,
      color: "ochre",
      revision: 1,
      kind: "tracker",
      purpose: "official-deadline",
    }),
    true,
  );
});
