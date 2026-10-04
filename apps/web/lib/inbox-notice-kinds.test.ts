import test from "node:test";
import assert from "node:assert/strict";
import { changeNoticeSummary, DEADLINE_NOTICE_KINDS, deadlineNoticeView, isDeadlineNoticeKind } from "./inbox-notice-kinds";

const now = new Date("2026-10-04T09:00:00Z");

test("every deadline notice kind has a category, group and action", () => {
  for (const kind of DEADLINE_NOTICE_KINDS) {
    const view = deadlineNoticeView({ kind, title: "Title", body: "Body", opportunityId: "opp_1" }, now);
    assert.ok(view.category, kind);
    assert.ok(view.actionLabel, kind);
    assert.ok(view.reason.endsWith("."), kind);
    assert.ok(view.actionHref.startsWith("/"), kind);
  }
  assert.equal(isDeadlineNoticeKind("deadline-day"), true);
  assert.equal(isDeadlineNoticeKind("new-match"), false);
});

test("a plan change shows its own was/now text with readable dates", () => {
  const view = deadlineNoticeView(
    {
      kind: "obligations-moved",
      title: "Your plan moved with the date: Poetry Fellowship",
      body: "The deadline moved from 2026-10-03 to 2026-10-10, so one step moved: Final draft.",
      opportunityId: "opp_1",
      actionHref: "/tracker?view=saved&application=opp_1",
    },
    now,
  );
  assert.equal(view.group, "changes");
  assert.equal(view.summary, "The deadline moved from Oct 3 to Oct 10, so one step moved: Final draft.");
  assert.equal(view.actionHref, "/tracker?view=saved&application=opp_1");
  assert.equal(view.actionLabel, "Review plan");
});

test("notices without a usable link fall back to the right page", () => {
  assert.equal(
    deadlineNoticeView({ kind: "opens-soon", title: "t", body: "b", opportunityId: "opp 1" }, now).actionHref,
    "/opportunities/opp%201",
  );
  assert.equal(
    deadlineNoticeView({ kind: "time-to-query", title: "t", body: "b", opportunityId: "opp_1", actionHref: "https://elsewhere.example" }, now).actionHref,
    "/tracker?view=awaiting&application=opp_1",
  );
  assert.equal(deadlineNoticeView({ kind: "gone-quiet", title: "t", body: "", opportunityId: null }, now).actionHref, "/tracker");
});

test("opening alerts are quiet discovery; the deadline-day alarm needs attention", () => {
  assert.equal(deadlineNoticeView({ kind: "opens-soon", title: "t", body: "b" }, now).group, "discovery");
  assert.equal(deadlineNoticeView({ kind: "deadline-day", title: "t", body: "b" }, now).group, "attention");
});

test("moved deadlines show what changed instead of generic copy", () => {
  assert.equal(
    changeNoticeSummary("deadline-changed", "The official deadline moved from 2026-10-07 to 2026-10-21. Your calendar and deadline reminders now use the new date.", now),
    "The official deadline moved from Oct 7 to Oct 21. Your calendar and deadline reminders now use the new date.",
  );
  assert.equal(changeNoticeSummary("new-match", "Anything", now), null);
  assert.equal(changeNoticeSummary("deadline-changed", "  ", now), null);
});
