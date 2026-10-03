import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLifecycle,
  eventProvenance,
  isBeforeSubmission,
  lifecycleStep,
  nextMove,
} from "./application-lifecycle.ts";

test("maps every detailed status onto one of six lifecycle steps", () => {
  assert.equal(lifecycleStep("interested"), "saved");
  assert.equal(lifecycleStep("draft-started"), "preparing");
  assert.equal(lifecycleStep("ready-to-submit"), "ready");
  assert.equal(lifecycleStep("received"), "submitted");
  assert.equal(lifecycleStep("shortlisted"), "in-review");
  assert.equal(lifecycleStep("declined"), "outcome");
  assert.equal(lifecycleStep("archived"), "archived");
  assert.equal(isBeforeSubmission("ready-to-submit"), true);
  assert.equal(isBeforeSubmission("submitted"), false);
});

test("labels who established each transition", () => {
  assert.deepEqual(eventProvenance({ source: "user" }), { kind: "creator", label: "Recorded by you" });
  assert.equal(eventProvenance({ source: "user", note: "Missa submission sub_1" }).kind, "missa-hosted");
  assert.equal(eventProvenance({ source: "email" }).kind, "creator");
  assert.equal(eventProvenance({ source: "organization-api" }).kind, "organization");
  assert.equal(eventProvenance({ source: "radar" }).kind, "inferred");
});

test("dates steps from history and never invents a date", () => {
  const steps = buildLifecycle({
    status: "shortlisted",
    statusLabel: "Shortlisted",
    submittedAt: "2026-09-02T12:00:00Z",
    history: [
      { id: "3", to: "shortlisted", source: "email", recordedAt: "2026-09-20T10:00:00Z", occurredOn: "2026-09-19" },
      { id: "1", to: "interested", source: "user", recordedAt: "2026-08-01T10:00:00Z" },
    ],
  });
  assert.deepEqual(steps.map((step) => step.state), ["complete", "complete", "complete", "complete", "current", "upcoming"]);
  assert.equal(steps[0].date, "2026-08-01T10:00:00Z");
  assert.equal(steps[1].date, undefined, "Preparing was skipped in history; no date is invented");
  assert.equal(steps[3].date, "2026-09-02T12:00:00Z");
  assert.equal(steps[4].detail, "Shortlisted");
  assert.equal(steps[4].date, "2026-09-19");
  assert.equal(steps[4].provenance?.label, "Recorded by you from email evidence");
});

test("a hosted receipt confirms submission and organization decisions reach Outcome", () => {
  const steps = buildLifecycle({
    status: "preparing",
    statusLabel: "Preparing",
    history: [],
    hosted: { submittedAt: "2026-09-10T09:00:00Z", decisions: [{ title: "Poem", outcome: "accepted" }] },
  });
  assert.equal(steps[3].provenance?.kind, "missa-hosted");
  assert.equal(steps[3].date, "2026-09-10T09:00:00Z");
  assert.equal(steps[5].state, "current");
  assert.equal(steps[5].provenance?.kind, "organization");
  assert.equal(steps[5].detail, "Poem: accepted");
});

test("a step keeps the event that first reached it", () => {
  const steps = buildLifecycle({
    status: "declined",
    statusLabel: "Declined",
    history: [
      { id: "3", to: "declined", source: "email", recordedAt: "2026-09-28T00:00:00Z" },
      { id: "2", to: "received", source: "radar", recordedAt: "2026-08-24T00:00:00Z" },
      { id: "1", to: "submitted", source: "user", recordedAt: "2026-08-19T00:00:00Z", occurredOn: "2026-08-19" },
    ],
  });
  assert.equal(steps[3].date, "2026-08-19");
  assert.equal(steps[3].provenance?.kind, "creator");
});

test("an archived application keeps the furthest step it reached", () => {
  const steps = buildLifecycle({
    status: "archived",
    statusLabel: "Archived",
    history: [
      { id: "2", to: "archived", source: "user", recordedAt: "2026-09-03T00:00:00Z" },
      { id: "1", to: "preparing", source: "user", recordedAt: "2026-09-01T00:00:00Z" },
    ],
  });
  assert.equal(steps.findIndex((step) => step.state === "current"), 1);
});

test("suggests one next move and never treats external navigation as submission", () => {
  assert.equal(nextMove({ status: "saved" }).kind, "start-preparing");
  assert.equal(nextMove({ status: "preparing", checklist: { total: 3, done: 1 } }).reason.startsWith("2 preparation steps remain"), true);
  assert.equal(nextMove({ status: "ready-to-submit" }).kind, "record-submission");
  assert.equal(nextMove({ status: "in-review" }).kind, "record-response");
  assert.equal(nextMove({ status: "saved", hosted: true }).kind, "none");
});
