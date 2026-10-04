import assert from "node:assert/strict";
import test from "node:test";

import {
  calendarDeadlineFactEvents,
  calendarEventsOnDay,
  calendarFilterFor,
  calendarSourceEvents,
  canSetDeadlineReminder,
  isDeadlineLaneEvent,
  parseCalendarView,
} from "./calendar-planning.ts";

test("deadline facts become stage, tier, step and predicted events", () => {
  const events = calendarDeadlineFactEvents(
    {
      stages: [
        {
          opportunityId: "opp-1",
          title: "Film fund",
          stage: {
            id: "stage-1",
            kind: "letter-of-intent",
            label: "Letter of intent",
            dueOn: "2099-02-01",
            confidence: "confirmed",
          },
        },
      ],
      tiers: [
        {
          opportunityId: "opp-1",
          title: "Film fund",
          deadline: "2099-03-01",
          tier: {
            id: "tier-early",
            tier: "early",
            label: "Early-bird",
            closesOn: "2099-02-10",
            feeCents: 1500,
            feeCurrency: "USD",
            confidence: "probable",
          },
        },
        {
          opportunityId: "opp-1",
          title: "Film fund",
          deadline: "2099-03-01",
          tier: {
            id: "tier-regular",
            tier: "regular",
            label: "Regular",
            closesOn: "2099-03-01",
            feeCents: 3000,
            confidence: "confirmed",
          },
        },
      ],
      obligations: [
        {
          id: "ob-1",
          opportunityId: "opp-1",
          opportunityTitle: "Film fund",
          kind: "sub-deadline",
          label: "Ask for references",
          dueOn: "2099-02-05",
          state: "open",
          revision: 2,
        },
        {
          id: "ob-2",
          opportunityId: "opp-1",
          opportunityTitle: "Film fund",
          kind: "start-by",
          label: "Start",
          dueOn: "2099-01-05",
          state: "done",
          revision: 1,
        },
      ],
      forecasts: [
        {
          opportunityId: "opp-2",
          title: "Residency",
          deadline: "2020-01-01",
          relation: "following",
          forecast: {
            expectedOpenStart: "2099-04-01",
            expectedOpenEnd: "2099-04-10",
            expectedClose: "2099-05-01",
            confidence: "medium",
            basedOnCycles: 3,
          },
        },
        {
          opportunityId: "opp-3",
          title: "Still open",
          deadline: "2099-01-01",
          relation: "tracked",
          forecast: {
            expectedClose: "2100-01-01",
            confidence: "high",
            basedOnCycles: 4,
          },
        },
      ],
    },
    "2098-12-01",
  );
  const byId = new Map(events.map((event) => [event.id, event]));

  const stage = byId.get("stage:stage-1");
  assert.equal(stage?.kind, "stage");
  assert.equal(stage?.confidence, "confirmed");
  assert.equal(calendarFilterFor(stage!), "stage");
  assert.equal(isDeadlineLaneEvent(stage!), true);

  const tier = byId.get("tier:tier-early");
  assert.equal(tier?.sourceLabel, "Fee tier closes · $15 fee");
  assert.equal(tier?.confidence, "needs-checking");
  assert.equal(calendarFilterFor(tier!), "deadline");
  assert.equal(isDeadlineLaneEvent(tier!), true);
  // A tier that closes on the deadline is the deadline itself.
  assert.equal(byId.has("tier:tier-regular"), false);

  const step = byId.get("obligation:ob-1");
  assert.equal(step?.kind, "obligation");
  assert.equal(step?.title, "Ask for references · Film fund");
  assert.equal(step?.sourceLabel, "Step due");
  assert.equal(calendarFilterFor(step!), "obligation");
  assert.equal(isDeadlineLaneEvent(step!), false);
  assert.equal(byId.has("obligation:ob-2"), false);

  const opening = byId.get("forecast-open:opp-2");
  assert.equal(opening?.confidence, "predicted");
  assert.equal(opening?.title, "Predicted opening · Residency");
  assert.equal(opening?.startAt, "2099-04-01T00:00:00");
  assert.equal(opening?.endAt, "2099-04-10T23:59:59.999");
  assert.equal(opening?.actionHref, "/opportunities/opp-2");
  assert.equal(calendarFilterFor(opening!), "predicted");
  assert.equal(calendarEventsOnDay([opening!], "2099-04-05").length, 1);
  assert.ok(byId.get("forecast-close:opp-2"));
  // A call with a published upcoming deadline shows that, not a prediction.
  assert.equal(byId.has("forecast-close:opp-3"), false);
});

test("calendar views come from the query and official deadlines take the lane", () => {
  assert.equal(parseCalendarView("week"), "week");
  assert.equal(parseCalendarView("day"), "day");
  assert.equal(parseCalendarView("agenda"), "agenda");
  assert.equal(parseCalendarView("year"), "month");
  assert.equal(parseCalendarView(undefined), "month");
  const [deadline] = calendarSourceEvents([
    {
      opportunityId: "o",
      title: "Call",
      myStatus: "saved",
      deadline: "2099-01-01",
      deadlineKind: "exact",
    },
  ]);
  assert.equal(isDeadlineLaneEvent(deadline), true);
  assert.equal(
    calendarFilterFor({ ...deadline, kind: "personal", purpose: "preparation" }),
    "preparation",
  );
  assert.equal(
    calendarFilterFor({
      ...deadline,
      kind: "personal",
      purpose: "personal-target",
    }),
    "personal",
  );
});

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
