import test from "node:test";
import assert from "node:assert/strict";
import { isDurablePublicationGateError, reviewCandidate, type ReviewCandidate } from "../src/reviewWorker.js";

function candidate(overrides: Partial<ReviewCandidate> = {}): ReviewCandidate {
  return {
    opportunityId: "opp_review_test",
    title: "Verified call",
    status: "open",
    submissionState: "available",
    deadlineDate: "2026-09-01",
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

test("review suppresses unsafe destinations", () => {
  const result = reviewCandidate(candidate({ submissionState: "unsafe" }));
  assert.equal(result.decision, "suppress");
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
