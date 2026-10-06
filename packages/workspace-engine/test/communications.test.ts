import assert from "node:assert/strict";
import test from "node:test";
import {
  COMMUNICATION_TEMPLATES,
  WorkspaceEngine,
  canTransitionCommunication,
  communicationContentHash,
  defaultRecipientsFor,
  describeOutcomes,
  joinTitles,
  renderMergeFields,
  stageForCommunicationKind,
  unknownMergeFields,
} from "../src/index.js";

test("templates cover every kind and stage letters name their stage", () => {
  assert.deepEqual(COMMUNICATION_TEMPLATES.map((template) => template.kind), ["rejection-with-dignity", "longlist", "shortlist", "finalists", "decision", "custom"]);
  assert.equal(stageForCommunicationKind("longlist"), "longlist");
  assert.equal(stageForCommunicationKind("finalists"), "finalist");
  assert.equal(stageForCommunicationKind("rejection-with-dignity"), undefined);
  for (const template of COMMUNICATION_TEMPLATES) assert.deepEqual(unknownMergeFields(`${template.defaultSubject}\n${template.defaultBody}`), []);
});

test("merge fields render and unknown fields are reported", () => {
  assert.equal(renderMergeFields("Dear {{submitterName}}, about {{ workTitles }}.", { submitterName: "Rosa", workTitles: "Saltwater" }), "Dear Rosa, about Saltwater.");
  assert.equal(renderMergeFields("{{missing}}", {}), "");
  assert.deepEqual(unknownMergeFields("{{submitterName}} {{prize}} {{prize}}"), ["prize"]);
  assert.equal(joinTitles(["A", "B", "C"]), "A, B and C");
  assert.equal(joinTitles([]), "your submission");
  assert.equal(describeOutcomes(["accepted", "declined", "declined"]), "1 accepted, 2 declined");
  assert.equal(describeOutcomes([]), "not yet decided");
  assert.notEqual(communicationContentHash("a", "b"), communicationContentHash("a", "c"));
});

test("default recipients follow each kind's audience", () => {
  const candidates = [
    { submissionId: "sub_declined", submitterAccountId: "acct_1", status: "declined", works: [{ id: "w1", title: "One", outcome: "declined" }, { id: "w2", title: "Two", outcome: "accepted" }], stagesTold: [] },
    { submissionId: "sub_open", submitterAccountId: "acct_2", status: "in-review", works: [{ id: "w3", title: "Three" }], stagesTold: [] },
    { submissionId: "sub_told", submitterAccountId: "acct_3", status: "in-review", works: [{ id: "w4", title: "Four" }], stagesTold: ["longlist" as const] },
    { submissionId: "sub_withdrawn", submitterAccountId: "acct_4", status: "withdrawn", works: [{ id: "w5", title: "Five" }], stagesTold: [] },
  ];
  assert.deepEqual(defaultRecipientsFor("rejection-with-dignity", candidates), [{ submissionId: "sub_declined", submitterAccountId: "acct_1", workIds: ["w1"] }]);
  assert.deepEqual(defaultRecipientsFor("longlist", candidates).map((item) => item.submissionId), ["sub_open"]);
  assert.deepEqual(defaultRecipientsFor("shortlist", candidates).map((item) => item.submissionId), ["sub_open", "sub_told"]);
  assert.deepEqual(defaultRecipientsFor("decision", candidates), [{ submissionId: "sub_declined", submitterAccountId: "acct_1", workIds: ["w1", "w2"] }]);
  assert.deepEqual(defaultRecipientsFor("custom", candidates).map((item) => item.submissionId), ["sub_declined", "sub_open", "sub_told"]);
});

test("batch lifecycle is approval-gated", () => {
  assert.ok(canTransitionCommunication("draft", "awaiting-approval"));
  assert.ok(!canTransitionCommunication("draft", "sending"));
  assert.ok(canTransitionCommunication("approved", "sending"));
  assert.ok(!canTransitionCommunication("sent", "sending"));
  assert.ok(canTransitionCommunication("partially-sent", "sending"));
});

function seed() {
  let tick = 0;
  const engine = new WorkspaceEngine({ now: () => `2026-10-0${1 + (tick++ % 8)}T10:00:00.000Z` });
  const team = engine.createEntity("org_1", "Editorial");
  const program = engine.createProgram(team.id, "Prize");
  const call = engine.createOpenCall(program.id, "2027 Poetry Prize");
  engine.publishOpenCall(call.id);
  const path = engine.createSubmissionPath(call.id, [], [{ type: "text", label: "Title", required: true }]);
  const first = engine.createSubmission(path.id, "acct_rosa", [{ title: "Saltwater" }, { title: "Night bus" }]);
  const second = engine.createSubmission(path.id, "acct_ivo", [{ title: "Notes" }]);
  const otherTeam = engine.createEntity("org_2", "Elsewhere");
  const otherProgram = engine.createProgram(otherTeam.id, "Other");
  const otherCall = engine.createOpenCall(otherProgram.id, "Other call");
  const otherPath = engine.createSubmissionPath(otherCall.id, [], []);
  const foreign = engine.createSubmission(otherPath.id, "acct_zed", [{ title: "Foreign" }]);
  return { engine, call, first, second, foreign };
}

test("engine creates, approves, sends and reports stage events for a batch", () => {
  const { engine, call, first, second, foreign } = seed();
  assert.throws(() => engine.createCommunicationBatch("org_1", { openCallId: call.id, kind: "longlist", subject: "s", body: "b", recipients: [{ submissionId: foreign.id, submitterAccountId: "acct_zed", workIds: [] }], createdByAccountId: "acct_admin" }), /not part of this organization/);
  const batch = engine.createCommunicationBatch("org_1", {
    openCallId: call.id,
    kind: "longlist",
    subject: "You are on the longlist",
    body: "Dear {{submitterName}}",
    recipients: [
      { submissionId: first.id, submitterAccountId: first.submitterAccountId, workIds: ["work_9999", engine.worksForSubmission(first.id)[0]!.id] },
      { submissionId: second.id, submitterAccountId: second.submitterAccountId, workIds: [] },
    ],
    createdByAccountId: "acct_admin",
  });
  assert.equal(batch.status, "draft");
  assert.equal(batch.stage, "longlist");
  assert.deepEqual(batch.recipients[0]!.workIds, [engine.worksForSubmission(first.id)[0]!.id], "unknown work ids are dropped");
  assert.throws(() => engine.beginCommunicationSend("org_1", batch.id, "acct_admin"), /Only an approved letter/);
  engine.requestCommunicationApproval("org_1", batch.id, "acct_admin");
  assert.throws(() => engine.approveCommunicationBatch("org_1", batch.id, "acct_admin", { secondApproverRequired: true }), /different admin/);
  assert.equal(batch.status, "awaiting-approval");
  engine.approveCommunicationBatch("org_1", batch.id, "acct_other", { secondApproverRequired: true });
  assert.equal(batch.status, "approved");
  assert.equal(batch.approvedByAccountId, "acct_other");
  // An edit after approval invalidates it.
  assert.throws(() => engine.updateCommunicationBatch("org_1", batch.id, { subject: "Changed" }, "acct_admin"), /no longer be edited/);
  batch.subject = "Changed";
  assert.throws(() => engine.beginCommunicationSend("org_1", batch.id, "acct_admin"), /approve it again/);
  batch.subject = "You are on the longlist";
  engine.beginCommunicationSend("org_1", batch.id, "acct_admin");
  assert.equal(batch.status, "sending");
  engine.recordCommunicationRecipientResult("org_1", batch.id, first.id, { status: "sent", effectId: "eff_1" });
  engine.recordCommunicationRecipientResult("org_1", batch.id, second.id, { status: "failed", reason: "Provider rejected" });
  engine.finishCommunicationSend("org_1", batch.id, "acct_admin");
  assert.equal(batch.status, "partially-sent");
  assert.deepEqual(engine.stageEventsForSubmission(first.id).map((event) => event.stage), ["longlist"]);
  assert.deepEqual(engine.stageEventsForSubmission(second.id), []);
  // A retry pass completes the batch.
  engine.beginCommunicationSend("org_1", batch.id, "acct_admin");
  engine.recordCommunicationRecipientResult("org_1", batch.id, second.id, { status: "sent", effectId: "eff_2" });
  engine.finishCommunicationSend("org_1", batch.id, "acct_admin");
  assert.equal(batch.status, "sent");
  assert.ok(batch.sentAt);
  assert.equal(engine.communicationBatchesForOrganization("org_1").length, 1);
  assert.equal(engine.communicationBatchesForOrganization("org_2").length, 0);
  assert.ok(engine.store.auditLog.some((entry) => entry.action === "communication.approved" && entry.accountId === "acct_other"));
});

test("editing a letter awaiting approval returns it to draft and cancelled letters stay cancelled", () => {
  const { engine, call, first } = seed();
  const batch = engine.createCommunicationBatch("org_1", { openCallId: call.id, kind: "custom", subject: "Update", body: "Hello", recipients: [{ submissionId: first.id, submitterAccountId: first.submitterAccountId, workIds: [] }], createdByAccountId: "acct_admin" });
  engine.requestCommunicationApproval("org_1", batch.id, "acct_admin");
  engine.updateCommunicationBatch("org_1", batch.id, { body: "Hello again" }, "acct_admin");
  assert.equal(batch.status, "draft");
  assert.equal(batch.body, "Hello again");
  engine.cancelCommunicationBatch("org_1", batch.id, "acct_admin");
  assert.equal(batch.status, "cancelled");
  assert.throws(() => engine.requestCommunicationApproval("org_1", batch.id, "acct_admin"), /cannot move/);
});

test("applyDistribution assigns, skips duplicates and moves submissions into review", () => {
  const { engine, call, first, second } = seed();
  const round = engine.createReviewRound(call.id, "Readers");
  engine.assignReviewer(round.id, first.id, "acct_a");
  const result = engine.applyDistribution(round.id, [
    { submissionId: first.id, reviewerAccountId: "acct_a" },
    { submissionId: first.id, reviewerAccountId: "acct_b" },
    { submissionId: second.id, reviewerAccountId: "acct_b" },
    { submissionId: "sub_missing", reviewerAccountId: "acct_b" },
  ], "acct_admin");
  assert.equal(result.created.length, 2);
  assert.deepEqual(result.skipped.map((item) => item.reason), ["already assigned", "Unknown submission: sub_missing"]);
  assert.equal(engine.store.submissions.get(first.id)!.status, "in-review");
  assert.equal(engine.store.submissions.get(second.id)!.status, "in-review");
  assert.ok(engine.store.auditLog.some((entry) => entry.action === "review-assignment.distributed"));
});

test("round due dates apply to open reads only and distribution carries them", () => {
  const { engine, call, first, second } = seed();
  const round = engine.createReviewRound(call.id, "Readers");
  const done = engine.assignReviewer(round.id, first.id, "acct_a");
  engine.recordReview(done.id, 70);
  const open = engine.assignReviewer(round.id, second.id, "acct_a");
  assert.equal(engine.setRoundDueDate("org_1", round.id, "2026-11-01T17:00:00.000Z", "acct_admin"), 1);
  assert.equal(open.expiresAt, "2026-11-01T17:00:00.000Z");
  assert.equal(done.expiresAt, undefined, "completed reads keep their own record");
  assert.equal(engine.roundDueDate(round.id), "2026-11-01T17:00:00.000Z");
  const result = engine.applyDistribution(round.id, [{ submissionId: first.id, reviewerAccountId: "acct_b" }], "acct_admin", { expiresAt: engine.roundDueDate(round.id) });
  assert.equal(result.created[0]!.expiresAt, "2026-11-01T17:00:00.000Z");
  assert.throws(() => engine.setRoundDueDate("org_2", round.id, undefined), /not part of this organization/);
  assert.throws(() => engine.setRoundDueDate("org_1", round.id, "not a date"), /valid date/);
});

test("readers declare conflicts on their own open reads and withdrawn reads cannot be scored", () => {
  const { engine, call, first, second } = seed();
  const round = engine.createReviewRound(call.id, "Readers");
  const mine = engine.assignReviewer(round.id, first.id, "acct_a");
  assert.throws(() => engine.declareReviewConflict(mine.id, "acct_b", "I know them"), /Unknown review assignment/);
  assert.throws(() => engine.declareReviewConflict(mine.id, "acct_a", "  "), /why/);
  engine.declareReviewConflict(mine.id, "acct_a", "I taught the submitter last year");
  assert.ok(mine.recusedAt);
  assert.throws(() => engine.recordReview(mine.id, 50), /withdrawn/);
  const scored = engine.assignReviewer(round.id, second.id, "acct_a");
  engine.recordReview(scored.id, 60);
  assert.throws(() => engine.declareReviewConflict(scored.id, "acct_a", "Late conflict"), /completed read/);
});

test("withdrawing a reader's open reads leaves completed reads alone", () => {
  const { engine, call, first, second } = seed();
  const round = engine.createReviewRound(call.id, "Readers");
  const done = engine.assignReviewer(round.id, first.id, "acct_a");
  engine.recordReview(done.id, 80);
  const open = engine.assignReviewer(round.id, second.id, "acct_a");
  const withdrawn = engine.withdrawOpenReads("org_1", round.id, "acct_a", "Reader away", "acct_admin");
  assert.deepEqual(withdrawn.map((item) => item.id), [open.id]);
  assert.equal(open.recusalReason, "Reader away");
  assert.equal(done.recusedAt, undefined);
});
