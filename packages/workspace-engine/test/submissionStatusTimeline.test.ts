import assert from "node:assert/strict";
import test from "node:test";
import { submissionStatusTimeline } from "../src/index.js";

const base = {
  status: "in-review",
  submittedAt: "2026-09-01T10:00:00.000Z",
  hasActiveReview: true,
  stageEvents: [{ stage: "longlist" as const, at: "2026-09-20T10:00:00.000Z" }],
  decisions: [],
  works: [{ id: "w1", title: "Saltwater" }, { id: "w2", title: "Night bus" }],
  organizationName: "North River Review",
};

test("minimal transparency hides stages and review", () => {
  const timeline = submissionStatusTimeline({ ...base, transparency: "minimal" });
  assert.deepEqual(timeline.steps.map((step) => step.id), ["received", "decision"]);
  assert.equal(timeline.current.id, "received");
  assert.equal(timeline.summary, "Received 1 Sept 2026");
});

test("stages transparency shows announced stages and declared upcoming ones", () => {
  const timeline = submissionStatusTimeline({ ...base, transparency: "stages", declaredStages: ["longlist", "shortlist"], stageLabels: { shortlist: "Short list" } });
  assert.deepEqual(timeline.steps.map((step) => [step.id, step.state]), [
    ["received", "complete"],
    ["longlist", "current"],
    ["shortlist", "upcoming"],
    ["decision", "upcoming"],
  ]);
  assert.equal(timeline.steps[2]!.label, "Short list");
  assert.equal(timeline.summary, "Longlist since 20 Sept 2026");
});

test("full transparency adds in-review and decisions close the timeline", () => {
  const open = submissionStatusTimeline({ ...base, stageEvents: [], transparency: "full" });
  assert.deepEqual(open.steps.map((step) => [step.id, step.state]), [["received", "complete"], ["in-review", "current"], ["decision", "upcoming"]]);
  assert.equal(open.summary, "In review");
  const decided = submissionStatusTimeline({
    ...base,
    status: "mixed",
    transparency: "full",
    decisions: [
      { workId: "w1", outcome: "accepted", decidedAt: "2026-10-01T10:00:00.000Z" },
      { workId: "w2", outcome: "declined", decidedAt: "2026-10-02T10:00:00.000Z" },
    ],
  });
  assert.equal(decided.current.id, "decision");
  assert.equal(decided.current.detail, "Decided for each Work");
  assert.equal(decided.steps.find((step) => step.id === "longlist")!.state, "complete");
  const partial = submissionStatusTimeline({ ...base, transparency: "full", decisions: [{ workId: "w1", outcome: "accepted", decidedAt: "2026-10-01T10:00:00.000Z" }] });
  assert.equal(partial.summary, "1 of 2 Works decided");
  const unanimous = submissionStatusTimeline({ ...base, transparency: "full", decisions: [{ workId: "w1", outcome: "declined", decidedAt: "x" }, { workId: "w2", outcome: "declined", decidedAt: "y" }] });
  assert.equal(unanimous.summary, "Declined");
});

test("withdrawn submissions end at withdrawn", () => {
  const timeline = submissionStatusTimeline({ ...base, status: "withdrawn", transparency: "full" });
  assert.deepEqual(timeline.steps.map((step) => step.id), ["received", "withdrawn"]);
  assert.equal(timeline.summary, "Withdrawn");
});

test("an expected decision date is shown, and said plainly when it has passed", () => {
  const upcoming = submissionStatusTimeline({ ...base, transparency: "stages", expectedDecisionBy: "2026-12-12", now: "2026-10-06T00:00:00.000Z" });
  assert.match(upcoming.steps.at(-1)!.detail!, /Expected by 12 Dec 2026/);
  const late = submissionStatusTimeline({ ...base, transparency: "stages", expectedDecisionBy: "2026-09-30", now: "2026-10-06T00:00:00.000Z" });
  assert.match(late.steps.at(-1)!.detail!, /running later than planned/);
});
