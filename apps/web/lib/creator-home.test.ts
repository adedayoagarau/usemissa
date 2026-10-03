import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreatorHome,
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
