import assert from "node:assert/strict";
import test from "node:test";

import {
  parseApplicationId,
  parseTrackerView,
  resolveTrackerFocus,
  viewShowsStatus,
} from "./trackerViews";

test("parses Tracker views and My applications aliases", () => {
  assert.equal(parseTrackerView("saved"), "saved");
  assert.equal(parseTrackerView("awaiting"), "submissions");
  assert.equal(parseTrackerView("history"), "submissions");
  assert.equal(parseTrackerView("submissions"), "submissions");
  assert.equal(parseTrackerView("calendar"), "calendar");
  assert.equal(parseTrackerView(" Archive "), "archive");
  assert.equal(parseTrackerView(""), "active");
  assert.equal(parseTrackerView(undefined), "active");
  assert.equal(parseTrackerView("board"), "active");
});

test("bounds application ids", () => {
  assert.equal(parseApplicationId("  opp-1 "), "opp-1");
  assert.equal(parseApplicationId(undefined), "");
  assert.equal(parseApplicationId("x".repeat(500)).length, 240);
});

test("views list the statuses they promise", () => {
  assert.equal(viewShowsStatus("saved", "interested"), true);
  assert.equal(viewShowsStatus("saved", "preparing"), true);
  assert.equal(viewShowsStatus("saved", "submitted"), false);
  assert.equal(viewShowsStatus("submissions", "in-review"), true);
  assert.equal(viewShowsStatus("submissions", "accepted"), true);
  assert.equal(viewShowsStatus("active", "archived"), false);
  assert.equal(viewShowsStatus("archive", "archived"), true);
  assert.equal(viewShowsStatus("calendar", "archived"), true);
});

const items = [
  { opportunityId: "saved-1", myStatus: "saved" as const },
  { opportunityId: "sent-1", myStatus: "submitted" as const },
  { opportunityId: "hosted-1", myStatus: "submitted" as const },
  { opportunityId: "old-1", myStatus: "archived" as const },
];
const submissions = [{ id: "sub-1", radarOpportunityId: "hosted-1" }];

test("selects the requested Tracker item in the requested view", () => {
  assert.deepEqual(
    resolveTrackerFocus({
      view: "saved",
      applicationId: "saved-1",
      items,
      submissions,
    }),
    { view: "saved", opportunityId: "saved-1", missing: false },
  );
  assert.deepEqual(
    resolveTrackerFocus({
      view: parseTrackerView("awaiting"),
      applicationId: "sent-1",
      items,
      submissions,
    }),
    { view: "submissions", opportunityId: "sent-1", missing: false },
  );
});

test("moves to the view that lists the requested item", () => {
  assert.deepEqual(
    resolveTrackerFocus({
      view: "saved",
      applicationId: "sent-1",
      items,
      submissions,
    }),
    { view: "submissions", opportunityId: "sent-1", missing: false },
  );
  assert.deepEqual(
    resolveTrackerFocus({
      view: "active",
      applicationId: "old-1",
      items,
      submissions,
    }),
    { view: "archive", opportunityId: "old-1", missing: false },
  );
  // Calendar links carry no view; Active lists the item.
  assert.deepEqual(
    resolveTrackerFocus({
      view: "active",
      applicationId: "saved-1",
      items,
      submissions,
    }),
    { view: "active", opportunityId: "saved-1", missing: false },
  );
});

test("selects the Missa receipt when submissions list it instead of the item", () => {
  assert.deepEqual(
    resolveTrackerFocus({
      view: "submissions",
      applicationId: "hosted-1",
      items,
      submissions,
    }),
    { view: "submissions", submissionId: "sub-1", missing: false },
  );
  assert.deepEqual(
    resolveTrackerFocus({
      view: "saved",
      applicationId: "sub-1",
      items: [],
      submissions,
    }),
    { view: "submissions", submissionId: "sub-1", missing: false },
  );
});

test("keeps the requested view and reports an unknown application", () => {
  assert.deepEqual(
    resolveTrackerFocus({
      view: "saved",
      applicationId: "someone-else",
      items,
      submissions,
    }),
    { view: "saved", missing: true },
  );
});

test("opens receipts when an account has receipts but no tracked items", () => {
  assert.deepEqual(
    resolveTrackerFocus({
      view: "active",
      applicationId: "",
      items: [],
      submissions,
    }),
    { view: "submissions", missing: false },
  );
  assert.deepEqual(
    resolveTrackerFocus({
      view: "calendar",
      applicationId: "",
      items: [],
      submissions,
    }),
    { view: "calendar", missing: false },
  );
  assert.deepEqual(
    resolveTrackerFocus({ view: "active", applicationId: "", items: [], submissions: [] }),
    { view: "active", missing: false },
  );
});
