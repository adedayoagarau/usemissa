import assert from "node:assert/strict";
import { test } from "node:test";

import { createStore, eraseWorkspaceAccountData } from "../src/index.js";

test("workspace erasure removes drafts and unfinished reviews but retains submitted records", () => {
  const store = createStore();
  store.submissions.set("submission_one", {
    id: "submission_one",
    submissionPathId: "path_one",
    submitterAccountId: "account_creator",
    status: "submitted",
    submittedAt: "2026-08-16T00:00:00.000Z",
    answers: { biography: "Submitted answer" },
  });
  store.submissionDrafts.set("draft_one", {
    id: "draft_one",
    submissionPathId: "path_two",
    submitterAccountId: "account_creator",
    answers: {
      biography: "Unsubmitted answer",
      manuscript:
        "https://missa.private.blob.vercel-storage.com/private-draft.pdf",
    },
    workTitles: ["Draft Work"],
    updatedAt: "2026-08-16T00:00:00.000Z",
    expiresAt: "2026-09-16T00:00:00.000Z",
  });
  store.reviewAssignments.set("assignment_open", {
    id: "assignment_open",
    reviewRoundId: "round_one",
    submissionId: "submission_other",
    reviewerAccountId: "account_creator",
  });
  store.reviewAssignments.set("assignment_complete", {
    id: "assignment_complete",
    reviewRoundId: "round_one",
    submissionId: "submission_other",
    reviewerAccountId: "account_creator",
    completedAt: "2026-08-16T00:00:00.000Z",
  });
  store.reviewRecommendations.set("assignment_open", {
    reviewAssignmentId: "assignment_open",
    notes: "Unfinished notes",
    recordedAt: "2026-08-16T00:00:00.000Z",
  });
  store.reviewRecommendations.set("assignment_complete", {
    reviewAssignmentId: "assignment_complete",
    notes: "Completed notes",
    recordedAt: "2026-08-16T00:00:00.000Z",
  });

  const result = eraseWorkspaceAccountData(store, "account_creator");

  assert.deepEqual(result, {
    retainedSubmissions: 1,
    retainedCompletedReviews: 1,
    removedDrafts: 1,
    removedOpenReviewAssignments: 1,
    removedDraftAssetUrls: [
      "https://missa.private.blob.vercel-storage.com/private-draft.pdf",
    ],
  });
  assert.equal(store.submissions.has("submission_one"), true);
  assert.equal(store.submissionDrafts.size, 0);
  assert.equal(store.reviewAssignments.has("assignment_open"), false);
  assert.equal(store.reviewRecommendations.has("assignment_open"), false);
  assert.equal(store.reviewAssignments.has("assignment_complete"), true);
  assert.equal(store.reviewRecommendations.has("assignment_complete"), true);
});
