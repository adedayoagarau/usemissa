import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreatorHome,
  greetingFor,
  recordHref,
  type HomeApplication,
} from "./creator-home.ts";

const now = new Date(2026, 9, 3, 9, 0, 0);
const day = (offset: number) => {
  const d = new Date(Date.UTC(2026, 9, 3 + offset));
  return d.toISOString().slice(0, 10);
};
function app(id: string, patch: Partial<HomeApplication>): HomeApplication {
  return {
    opportunityId: id,
    title: `Call ${id}`,
    organizationName: "Org",
    myStatus: "interested",
    deadline: null,
    deadlineKind: "fixed",
    submittedAt: null,
    updatedAt: "2026-10-01T00:00:00Z",
    preparationTotal: 0,
    preparationDone: 0,
    preparationItems: [],
    ...patch,
  };
}

test("This week's three ranks overdue start-by, then ready, then response check-ins", () => {
  const home = buildCreatorHome({
    now,
    applications: [
      app("late", {
        myStatus: "preparing",
        deadline: day(9),
        preparationTotal: 2,
        preparationDone: 0,
        preparationItems: [
          { label: "Manuscript", state: "missing", linked: false },
          { label: "Artist statement", state: "missing", linked: false },
        ],
      }),
      app("ready", { myStatus: "ready-to-submit", deadline: day(3) }),
      app("waiting", {
        myStatus: "submitted",
        submittedAt: "2026-09-07T12:00:00Z",
      }),
      app("later", { myStatus: "interested", deadline: day(60) }),
    ],
    reminders: [
      {
        opportunityId: "waiting",
        kind: "response",
        dueAt: "2026-10-02T09:00:00Z",
        state: "scheduled",
      },
    ],
    goals: [],
    openings: [
      { opportunityId: "new", title: "New call", reason: "Matches poetry" },
    ],
  });
  assert.deepEqual(
    home.thisWeek.map((move) => move.opportunityId),
    ["late", "ready", "waiting"],
  );
  assert.match(home.thisWeek[0].reason, /^Start-by passed/);
  assert.equal(home.thisWeek[0].href, recordHref("late", "prepare"));
  assert.equal(home.thisWeek[1].actionLabel, "Record submission");
  assert.equal(home.awaiting[0].attention, true);
  assert.match(home.awaiting[0].detail, /No response yet/);
  assert.deepEqual(
    home.closingThisWeek.map((row) => row.opportunityId),
    ["ready"],
  );
});

test("recent decisions and empty accounts stay honest", () => {
  const home = buildCreatorHome({
    now,
    applications: [
      app("no", { myStatus: "declined", updatedAt: "2026-09-28T00:00:00Z" }),
      app("old", { myStatus: "accepted", updatedAt: "2026-06-01T00:00:00Z" }),
    ],
    reminders: [],
    goals: [],
  });
  assert.deepEqual(
    home.recentDecisions.map((row) => row.opportunityId),
    ["no"],
  );
  assert.match(home.recentDecisions[0].detail, /^Not selected/);
  assert.equal(home.thisWeek.length, 0);
  assert.equal(
    buildCreatorHome({ now, applications: [], reminders: [], goals: [] }).counts
      .tracked,
    0,
  );
});

test("a just-opened call fills a free slot but never outranks deadline work", () => {
  const home = buildCreatorHome({
    now,
    applications: [app("soon", { myStatus: "interested", deadline: day(5) })],
    reminders: [],
    goals: [],
    openings: [
      { opportunityId: "fresh", title: "Fresh call", reason: "Matches poetry" },
    ],
  });
  assert.deepEqual(
    home.thisWeek.map((move) => move.opportunityId),
    ["soon", "fresh"],
  );
  assert.equal(home.thisWeek[1].href, "/opportunities/fresh");
});

test("a busy week names what slipped, what is due, and what starts next", () => {
  const home = buildCreatorHome({
    now,
    applications: [
      app("late", {
        myStatus: "preparing",
        type: "award",
        deadline: day(21),
        preparationTotal: 2,
        preparationItems: [
          { label: "Letters of support", state: "missing", linked: false },
          { label: "Manuscript", state: "missing", linked: false },
        ],
      }),
      app("harbor", {
        myStatus: "preparing",
        deadline: day(9),
        preparationTotal: 3,
        preparationDone: 1,
        preparationItems: [
          { label: "Artist statement", state: "missing", linked: false },
          { label: "Bio", state: "missing", linked: false },
          { label: "Sample pages", state: "complete", linked: false },
        ],
      }),
      app("waiting", {
        myStatus: "submitted",
        submittedAt: "2026-09-07T12:00:00Z",
      }),
    ],
    reminders: [
      {
        id: "r1",
        revision: 4,
        opportunityId: "waiting",
        kind: "response",
        dueAt: "2026-10-02T09:00:00Z",
        state: "scheduled",
      },
    ],
    goals: [],
  });
  assert.equal(home.situation, "busy");
  assert.equal(
    home.summary,
    "A busy week. One start-by date has passed, one check-in is due, and one call needs starting by Wednesday.",
  );
  const lead = home.thisWeek[0];
  assert.equal(lead.kind, "start-passed");
  assert.equal(lead.tone, "warning");
  assert.equal(lead.type, "award");
  assert.deepEqual(lead.runway, {
    startBy: "2026-10-02",
    deadline: day(21),
    daysLeft: 21,
    behindDays: 1,
    slackDays: 0,
    workDays: 22,
  });
  const checkIn = home.thisWeek.find((move) => move.kind === "check-in");
  assert.deepEqual(checkIn?.reminder, { id: "r1", revision: 4 });

  // The week: today carries the overdue start and the check-in; Wednesday the start-by.
  assert.equal(home.week.days.length, 7);
  assert.deepEqual(
    home.week.days[0].events.map((event) => event.kind),
    ["overdue", "check-in"],
  );
  assert.deepEqual(
    home.week.days[4].events.map((event) => [event.kind, event.opportunityId]),
    [["start-by", "harbor"]],
  );
  assert.deepEqual(
    home.week.later.map((event) => event.opportunityId),
    ["harbor", "late"],
  );

  const late = home.preparing.find((row) => row.opportunityId === "late");
  assert.deepEqual(late?.status, { label: "1 day behind", tone: "warning" });
  const harbor = home.preparing.find((row) => row.opportunityId === "harbor");
  assert.deepEqual(harbor?.status, { label: "On track", tone: "success" });
  assert.deepEqual(harbor?.progress, { done: 1, total: 3 });
});

test("waiting and quiet weeks say so plainly", () => {
  const waiting = buildCreatorHome({
    now,
    applications: [
      app("a", { myStatus: "submitted", submittedAt: "2026-09-20T12:00:00Z" }),
      app("b", { myStatus: "in-review", submittedAt: "2026-09-01T12:00:00Z" }),
    ],
    reminders: [],
    goals: [],
  });
  assert.equal(waiting.situation, "waiting");
  assert.equal(
    waiting.summary,
    "A waiting week. Two submissions are out and nothing closes in the next seven days.",
  );

  const quiet = buildCreatorHome({
    now,
    applications: [app("far", { myStatus: "interested", deadline: day(90) })],
    reminders: [],
    goals: [
      {
        id: "g",
        title: "Six",
        target: 6,
        progress: 6,
        endsOn: day(20),
        startsOn: day(-60),
      },
    ],
  });
  assert.equal(quiet.situation, "quiet");
  assert.equal(
    quiet.summary,
    "A quiet week. Nothing is due and nothing is waiting on you. You reached your goal of 6.",
  );
  assert.equal(quiet.pace?.status, "reached");
});

test("goal pace compares an even spread with what is submitted and what is in reach", () => {
  const home = buildCreatorHome({
    now,
    applications: [
      app("p1", { myStatus: "preparing", deadline: day(9) }),
      app("p2", { myStatus: "preparing", deadline: day(21) }),
      app("after", { myStatus: "preparing", deadline: day(120) }),
    ],
    reminders: [],
    goals: [
      {
        id: "g",
        title: "Six submissions this autumn",
        target: 6,
        progress: 2,
        startsOn: "2026-09-01",
        endsOn: "2026-12-02",
      },
    ],
  });
  const pace = home.pace!;
  assert.equal(pace.expectedByNow, 2);
  assert.equal(pace.status, "on-pace");
  assert.equal(pace.inReach, 2);
  assert.equal(pace.reachable, 4);
  assert.equal(pace.weeksLeft, 9);
  assert.ok(pace.explanation.includes("Preparing never counts as submitted."));

  const noStart = buildCreatorHome({
    now,
    applications: [],
    reminders: [],
    goals: [{ id: "g", title: "Two", target: 2, progress: 0, endsOn: day(30) }],
  });
  assert.equal(noStart.pace?.status, "unknown");
});

test("the greeting follows the creator's timezone and falls back to Hello", () => {
  const instant = new Date("2026-10-03T13:30:00Z");
  assert.equal(greetingFor(instant, "Africa/Lagos"), "Good afternoon");
  assert.equal(greetingFor(instant, "America/Los_Angeles"), "Good morning");
  assert.equal(greetingFor(instant, "Asia/Tokyo"), "Good evening");
  assert.equal(greetingFor(instant), "Hello");
  assert.equal(greetingFor(instant, "Not/AZone"), "Hello");
});

test("an opening shown as a move is not repeated under Selected for you", () => {
  const home = buildCreatorHome({
    now,
    applications: [],
    reminders: [],
    goals: [],
    openings: [
      { opportunityId: "a", title: "A", reason: "Matches poetry" },
      {
        opportunityId: "b",
        title: "B",
        reason: "Matches poetry",
        goalFit: true,
      },
      { opportunityId: "c", title: "C", reason: "Matches poetry" },
      { opportunityId: "d", title: "D", reason: "Matches poetry" },
    ],
  });
  assert.deepEqual(
    home.thisWeek.map((move) => move.opportunityId),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    home.selectedForYou.map((opening) => opening.opportunityId),
    ["d"],
  );
});
