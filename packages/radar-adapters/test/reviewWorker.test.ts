import test from "node:test";
import assert from "node:assert/strict";
import { editorialReview, isDurablePublicationGateError, reviewCandidate, reviewPublishMode, type ReviewCandidate } from "../src/reviewWorker.js";
import { holdReasonsFromChecks, mapPublicationHoldRow, planPublicationApproval } from "../src/publicationHoldAdmin.js";
import { publicationRubricSchema } from "../src/publicationRubricSchema.js";
import { evaluatePublicationRubric } from "../src/publicationRubric.js";

function candidate(overrides: Partial<ReviewCandidate> = {}): ReviewCandidate {
  return {
    opportunityId: "opp_review_test",
    title: "Verified call",
    status: "open",
    submissionState: "available",
    deadlineDate: "2026-10-01",
    submissionUrl: "https://example.com/submit",
    guidelinesUrl: "https://example.com/guidelines",
    sourceUrl: "https://example.com/call",
    processingSucceededAt: "2026-08-04T00:00:00.000Z",
    organizationConfirmed: true,
    callProfilePresent: true,
    readingPeriodKind: "exact",
    evidenceCount: 2,
    destinationReconciled: true,
    contentApproved: true,
    ...overrides,
  };
}

test("review publishes only a fully evidenced active call", () => {
  const result = reviewCandidate(candidate());
  assert.equal(result.decision, "publish");
  assert.equal(result.score, 100);
});

test("review routes unconfirmed organizations to human review", () => {
  const result = reviewCandidate(candidate({ organizationConfirmed: false }));
  assert.equal(result.decision, "needs-human");
  assert.match(result.reasons.join(" "), /confirmation/);
});

test("review never auto-publishes an explicitly review-only ingestion record", () => {
  const result = reviewCandidate(candidate({ reviewOnly: true }));
  assert.equal(result.decision, "needs-human");
  assert.match(result.reasons.join(" "), /explicitly held for human review/i);
  assert.equal(result.checks.reviewOnly, true);
});

test("review suppresses unsafe destinations", () => {
  const result = reviewCandidate(candidate({ submissionState: "unsafe" }));
  assert.equal(result.decision, "suppress");
});

test("review suppresses directories and roundup pages as aggregate evidence", () => {
  const result = reviewCandidate(candidate({ title: "Best Literary Magazines: 100+ Places to Submit in 2026" }));
  assert.equal(result.decision, "suppress");
  assert.match(result.reasons.join(" "), /directory or roundup/i);
  assert.equal(result.checks.aggregateIdentity, true);
});

test("review does not mistake an individual magazine submission call for a roundup", () => {
  assert.equal(reviewCandidate(candidate({ title: "Utopia Science Fiction Magazine Submissions" })).decision, "publish");
});

test("review never auto-publishes a placeholder opportunity identity", () => {
  const result = reviewCandidate(candidate({ title: "example.org/submissions" }));
  assert.equal(result.decision, "needs-human");
  assert.match(result.reasons.join(" "), /identity/i);
});

test("review requires explicit destination reconciliation and approved content", () => {
  const result = reviewCandidate(candidate({ destinationReconciled: false, contentApproved: false }));
  assert.equal(result.decision, "needs-human");
  assert.equal(result.score, 60);
  assert.match(result.reasons.join(" "), /reconciliation/i);
  assert.match(result.reasons.join(" "), /content review/i);
  assert.equal((result.checks.gates as Record<string, string>).authorityDestination, "review");
  assert.equal((result.checks.gates as Record<string, string>).completeness, "review");
});

test("recognizes only the durable publication constraint as a human-review conflict", () => {
  assert.equal(isDurablePublicationGateError({ code: "23514", message: "Publication gates failed for opportunity opp_test" }), true);
  assert.equal(isDurablePublicationGateError({ code: "23514", message: "A different check constraint failed" }), false);
  assert.equal(isDurablePublicationGateError(new Error("Publication gates failed for opportunity opp_test")), false);
});

test("durable publication schema permits only a fact-preserving published-to-closed transition", () => {
  assert.match(publicationRubricSchema, /old\.publication_state = 'published'/);
  assert.match(publicationRubricSchema, /new\.status = 'closed'/);
  assert.match(publicationRubricSchema, /new\.deadline_date is not distinct from old\.deadline_date/);
  assert.match(publicationRubricSchema, /new\.open_date is not distinct from old\.open_date/);
  assert.match(publicationRubricSchema, /new\.deadline_kind is not distinct from old\.deadline_kind/);
  assert.match(publicationRubricSchema, /new\.submission_state is not distinct from old\.submission_state/);
  assert.match(publicationRubricSchema, /new\.id like 'opp_v2_%'/);
  assert.match(publicationRubricSchema, /new\.source_id like 'v2_source_%'/);
  assert.match(publicationRubricSchema, /ingestion-v2 is review-only/);
});

test("publication availability distinguishes upcoming from available now", () => {
  const openingSoon = evaluatePublicationRubric({
    ...candidate(),
    status: "opening-soon",
    openDate: "2099-09-01",
    deadlineDate: null,
    deadlineKind: "unknown",
    readingPeriodKind: "unknown",
  });
  assert.equal(openingSoon.decision, "publish");
  assert.equal(openingSoon.checks.availabilityState, "opening-soon");

  const unsupported = evaluatePublicationRubric({
    ...candidate(),
    status: "opening-soon",
    openDate: null,
    deadlineDate: null,
    deadlineKind: "unknown",
    readingPeriodKind: "unknown",
  });
  assert.equal(unsupported.decision, "needs-human");
  assert.equal(unsupported.checks.availabilityState, "uncertain");
});

test("durable publication schema accepts verified opening dates and open-ended intake modes", () => {
  assert.match(publicationRubricSchema, /new\.status = 'opening-soon'.*new\.open_date/s);
  assert.match(publicationRubricSchema, /new\.deadline_date >= current_date/);
  assert.match(publicationRubricSchema, /new\.deadline_kind in \('rolling', 'year-round', 'until-filled'\)/);
  assert.match(publicationRubricSchema, /update of publication_state, source_id, status, open_date, deadline_date, deadline_kind/);
});

test("publish mode defaults to auto and accepts only queue as the opt-in alternative", () => {
  assert.equal(reviewPublishMode(undefined), "auto");
  assert.equal(reviewPublishMode(""), "auto");
  assert.equal(reviewPublishMode(" QUEUE "), "queue");
  assert.equal(reviewPublishMode("auto"), "auto");
  assert.equal(reviewPublishMode("publish"), "auto");
});

test("queue mode holds a fully evidenced call for editorial review instead of publishing", () => {
  const result = editorialReview(candidate({ title: "Rattle Poetry Prize", organizationName: "Rattle" }), "queue");
  assert.equal(result.decision, "needs-human");
  assert.equal(result.rubricPublish, true);
  assert.deepEqual(result.holdReasons, ["held-for-editorial-review"]);
  assert.equal(result.checks.publishMode, "queue");
  assert.match(result.reasons.join(" "), /held for editorial approval/i);
});

test("auto mode publishes a fully evidenced call with an identifying title", () => {
  const result = editorialReview(candidate({ title: "Rattle Poetry Prize", organizationName: "Rattle" }), "auto");
  assert.equal(result.decision, "publish");
  assert.deepEqual(result.holdReasons, []);
});

test("a generic title with no organization never auto-publishes", () => {
  for (const title of ["POETRY", "Fiction", "glean 2026/27", "kluge fellowships", "house in the neighborhood", "🌟 Short Story Submission — ALWAYS OPEN"]) {
    const result = editorialReview(candidate({ title, organizationName: null }), "auto");
    assert.equal(result.decision, "needs-human", title);
    assert.deepEqual(result.holdReasons, ["missing-organization"], title);
  }
});

test("a generic title with a known organization is prefixed and can auto-publish", () => {
  const result = editorialReview(candidate({ title: "POETRY", organizationName: "Rattle" }), "auto");
  assert.equal(result.decision, "publish");
  assert.equal(result.title.title, "Rattle — Poetry");
  assert.deepEqual((result.checks.editorial as Record<string, unknown>).rawTitle, "POETRY");
});

test("likely non-opportunities are suppressed with the reason recorded", () => {
  for (const title of ["How to Poet Blog", "The Minnesota Microgrant Partnership - Housing"]) {
    const result = editorialReview(candidate({ title, organizationName: "Example Arts" }), "auto");
    assert.equal(result.decision, "suppress", title);
    assert.ok(result.holdReasons.includes("possible-non-opportunity"), title);
    assert.match(result.reasons.join(" "), /suppressed/, title);
  }
});

test("a listing site's name is never used as the organization", () => {
  const result = editorialReview(candidate({ title: "Poetry", organizationName: "ArtConnect" }), "auto");
  assert.equal(result.decision, "needs-human");
  assert.deepEqual(result.holdReasons, ["missing-organization"]);
  assert.equal(result.title.title, "Poetry");
});

test("rubric suppression still wins over editorial holds", () => {
  const result = editorialReview(candidate({ title: "POETRY", organizationName: null, submissionState: "unsafe" }), "queue");
  assert.equal(result.decision, "suppress");
});

test("editorial reasons are added to an existing rubric hold", () => {
  const result = editorialReview(candidate({ title: "Fiction", organizationName: null, organizationConfirmed: false }), "auto");
  assert.equal(result.decision, "needs-human");
  assert.equal(result.rubricPublish, false);
  assert.deepEqual(result.holdReasons, ["missing-organization"]);
});

test("approval publishes the editorial title and refuses a bare label with no organization", () => {
  assert.deepEqual(planPublicationApproval({ currentTitle: "POETRY", organizationName: null }), {
    ok: false,
    reason: "The title is a bare label and no organization is known. Add the organization to the title before approving.",
  });
  const fixed = planPublicationApproval({ currentTitle: "POETRY", organizationName: null, requestedTitle: "Rattle Poetry Prize" });
  assert.equal(fixed.ok, true);
  assert.equal(fixed.ok && fixed.title, "Rattle Poetry Prize");
  const prefixed = planPublicationApproval({ currentTitle: "POETRY", organizationName: "Rattle" });
  assert.equal(prefixed.ok && prefixed.title, "Rattle — Poetry");
  assert.equal(planPublicationApproval({ currentTitle: "Rattle Poetry Prize", requestedTitle: "ab" }).ok, false);
});

test("the admin queue reads hold reasons and proposes the editorial title", () => {
  assert.deepEqual(holdReasonsFromChecks({ holdReasons: ["missing-organization", "unknown", 3] }), ["missing-organization"]);
  const row = mapPublicationHoldRow({
    job_id: "job_1",
    opportunity_id: "opp_1",
    title: "Visual Art : HUMBLE - Volume IX - Quibble Lit",
    status: "open",
    deadline_date: "2026-11-01",
    submission_url: "https://example.com/submit",
    source_name: "Quibble Lit",
    source_url: "https://example.com/call",
    organization_name: null,
    score: 100,
    reasons: ["Passed every automated gate."],
    checks: { gates: { identity: "pass", safety: "pass" }, holdReasons: ["held-for-editorial-review"], editorial: { rawTitle: "Visual Art : HUMBLE - Volume IX - Quibble Lit" } },
    decided_at: "2026-10-01T00:00:00.000Z",
  });
  assert.equal(row.proposedTitle, "Visual Art: HUMBLE — Volume IX — Quibble Lit");
  assert.deepEqual(row.holdReasons, ["held-for-editorial-review"]);
  assert.equal(row.gatesPassed, true);
  assert.equal(row.needsTitle, false);
});
