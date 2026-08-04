import test from "node:test";
import assert from "node:assert/strict";
import { reviewCandidate, type ReviewCandidate } from "../src/reviewWorker.js";

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
    sourceCheckedAt: "2026-08-04T00:00:00.000Z",
    processingSucceededAt: "2026-08-04T00:00:00.000Z",
    organizationConfirmed: true,
    callProfilePresent: true,
    readingPeriodKind: "exact",
    evidenceCount: 2,
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
