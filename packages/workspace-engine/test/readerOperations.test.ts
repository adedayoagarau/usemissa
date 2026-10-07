import assert from "node:assert/strict";
import test from "node:test";
import { planDistribution, readerConflict, readerProgress, scoreCalibration } from "../src/index.js";

const readers = [
  { accountId: "acct_a", label: "Ada" },
  { accountId: "acct_b", label: "Ben" },
  { accountId: "acct_c", label: "Cho" },
];

test("reader progress counts open, complete, recused and overdue per reader", () => {
  const rows = readerProgress({
    now: "2026-10-06T12:00:00.000Z",
    readers,
    assignments: [
      { id: "as_1", reviewerAccountId: "acct_a", submissionId: "sub_1", completedAt: "2026-10-01T00:00:00.000Z" },
      { id: "as_2", reviewerAccountId: "acct_a", submissionId: "sub_2" },
      { id: "as_3", reviewerAccountId: "acct_a", submissionId: "sub_3", expiresAt: "2026-10-05T00:00:00.000Z" },
      { id: "as_4", reviewerAccountId: "acct_b", submissionId: "sub_1", recusedAt: "2026-10-02T00:00:00.000Z" },
    ],
    recommendations: [{ reviewAssignmentId: "as_1", score: 70, recordedAt: "2026-10-01T00:00:00.000Z" }],
  });
  const ada = rows.find((row) => row.reviewerAccountId === "acct_a")!;
  assert.equal(ada.assigned, 3);
  assert.equal(ada.completed, 1);
  assert.equal(ada.open, 2);
  assert.equal(ada.overdue, 1);
  assert.equal(ada.percentComplete, 33);
  assert.equal(ada.averageScore, 70);
  const ben = rows.find((row) => row.reviewerAccountId === "acct_b")!;
  assert.equal(ben.recused, 1);
  assert.equal(ben.percentComplete, 0);
  const cho = rows.find((row) => row.reviewerAccountId === "acct_c")!;
  assert.equal(cho.assigned, 0);
  assert.equal(rows[0]!.reviewerAccountId, "acct_a", "readers with the most open work sort first");
});

test("calibration compares against shared submissions before the round mean", () => {
  const assignments = [
    // Ada and Ben both read sub_1 and sub_2; Ada scores 10 below Ben every time.
    { id: "a1", reviewerAccountId: "acct_a", submissionId: "sub_1", completedAt: "x" },
    { id: "b1", reviewerAccountId: "acct_b", submissionId: "sub_1", completedAt: "x" },
    { id: "a2", reviewerAccountId: "acct_a", submissionId: "sub_2", completedAt: "x" },
    { id: "b2", reviewerAccountId: "acct_b", submissionId: "sub_2", completedAt: "x" },
    { id: "a3", reviewerAccountId: "acct_a", submissionId: "sub_3", completedAt: "x" },
    { id: "b3", reviewerAccountId: "acct_b", submissionId: "sub_3", completedAt: "x" },
    // Cho alone read a strong packet; without shared reads only the round mean is available.
    { id: "c1", reviewerAccountId: "acct_c", submissionId: "sub_4", completedAt: "x" },
    { id: "c2", reviewerAccountId: "acct_c", submissionId: "sub_5", completedAt: "x" },
    { id: "c3", reviewerAccountId: "acct_c", submissionId: "sub_6", completedAt: "x" },
  ];
  const recommendations = [
    { reviewAssignmentId: "a1", score: 50, recordedAt: "x" }, { reviewAssignmentId: "b1", score: 70, recordedAt: "x" },
    { reviewAssignmentId: "a2", score: 40, recordedAt: "x" }, { reviewAssignmentId: "b2", score: 60, recordedAt: "x" },
    { reviewAssignmentId: "a3", score: 60, recordedAt: "x" }, { reviewAssignmentId: "b3", score: 80, recordedAt: "x" },
    { reviewAssignmentId: "c1", score: 90, recordedAt: "x" }, { reviewAssignmentId: "c2", score: 92, recordedAt: "x" }, { reviewAssignmentId: "c3", score: 88, recordedAt: "x" },
  ];
  const result = scoreCalibration({ readers, assignments, recommendations });
  const ada = result.readers.find((row) => row.reviewerAccountId === "acct_a")!;
  const ben = result.readers.find((row) => row.reviewerAccountId === "acct_b")!;
  const cho = result.readers.find((row) => row.reviewerAccountId === "acct_c")!;
  assert.equal(ada.calibration, "harsh");
  assert.equal(ada.deviation, -10);
  assert.equal(ada.sharedSubmissions, 3);
  assert.equal(ben.calibration, "generous");
  assert.equal(ben.deviation, 10);
  assert.equal(cho.sharedSubmissions, 0);
  assert.equal(cho.calibration, "generous");
  assert.match(cho.explanation, /round average/);
  assert.equal(result.scoredAssignments, 9);
  assert.equal(result.readers[0]!.reviewerAccountId, "acct_a", "harshest reader sorts first");
});

test("calibration withholds a label until enough scores exist", () => {
  const result = scoreCalibration({
    readers,
    assignments: [{ id: "a1", reviewerAccountId: "acct_a", submissionId: "sub_1", completedAt: "x" }],
    recommendations: [{ reviewAssignmentId: "a1", score: 10, recordedAt: "x" }],
  });
  const ada = result.readers.find((row) => row.reviewerAccountId === "acct_a")!;
  assert.equal(ada.calibration, "insufficient-data");
  assert.match(ada.explanation, /1 of 3 scores/);
});

test("reader conflicts are detected pair by pair with public domains ignored", () => {
  const submission = { id: "sub_1", submitterAccountId: "acct_s", submitterName: "Rosa Lind", submitterEmailDomain: "northriver.org", existingReviewerAccountIds: ["acct_b"], recusedReviewerAccountIds: ["acct_c"] };
  assert.equal(readerConflict({ accountId: "acct_s", label: "Self", openAssignments: 0 }, submission)?.reason, "self-submission");
  assert.equal(readerConflict({ accountId: "acct_a", label: "Ada", openAssignments: 0, emailDomain: "northriver.org" }, submission)?.reason, "shared-email-domain");
  assert.equal(readerConflict({ accountId: "acct_a", label: "Ada", openAssignments: 0, emailDomain: "gmail.com" }, { ...submission, submitterEmailDomain: "gmail.com" }), undefined);
  assert.equal(readerConflict({ accountId: "acct_a", label: "Ada", openAssignments: 0, name: "rosa lind" }, submission)?.reason, "name-match");
  assert.equal(readerConflict({ accountId: "acct_a", label: "Ada", openAssignments: 0, declaredConflictSubmissionIds: ["sub_1"] }, submission)?.reason, "declared-conflict");
  assert.equal(readerConflict({ accountId: "acct_b", label: "Ben", openAssignments: 0 }, submission)?.reason, "already-assigned");
  assert.equal(readerConflict({ accountId: "acct_c", label: "Cho", openAssignments: 0 }, submission)?.reason, "previously-recused");
  assert.equal(readerConflict({ accountId: "acct_a", label: "Ada", openAssignments: 0, emailDomain: "elsewhere.org" }, submission), undefined);
});

test("distribution balances load, honours conflicts and reports under-coverage", () => {
  const plan = planDistribution({
    readersPerSubmission: 2,
    readers: [
      { accountId: "acct_a", label: "Ada", openAssignments: 4 },
      { accountId: "acct_b", label: "Ben", openAssignments: 0 },
      { accountId: "acct_c", label: "Cho", openAssignments: 0, capacity: 1 },
    ],
    submissions: [
      { id: "sub_1", submitterAccountId: "acct_x", existingReviewerAccountIds: [] },
      { id: "sub_2", submitterAccountId: "acct_y", existingReviewerAccountIds: ["acct_b"] },
      { id: "sub_3", submitterAccountId: "acct_b", existingReviewerAccountIds: [] },
    ],
  });
  // Submissions with the fewest readers fill first: sub_1 and sub_3 (none) before sub_2 (one).
  // sub_1: Ben (0) then Cho (0); Cho is now at its capacity of 1.
  assert.deepEqual(plan.assignments.filter((item) => item.submissionId === "sub_1").map((item) => item.reviewerAccountId).sort(), ["acct_b", "acct_c"]);
  // sub_3 is Ben's own submission and Cho is full, so only Ada fits.
  assert.deepEqual(plan.assignments.filter((item) => item.submissionId === "sub_3").map((item) => item.reviewerAccountId), ["acct_a"]);
  // sub_2 already has Ben and needs one more: Ada is the only eligible reader left.
  assert.deepEqual(plan.assignments.filter((item) => item.submissionId === "sub_2").map((item) => item.reviewerAccountId), ["acct_a"]);
  assert.ok(plan.conflicts.some((conflict) => conflict.submissionId === "sub_3" && conflict.reviewerAccountId === "acct_b" && conflict.reason === "self-submission"));
  assert.ok(plan.conflicts.some((conflict) => conflict.reason === "at-capacity" && conflict.reviewerAccountId === "acct_c"));
  assert.ok(!plan.conflicts.some((conflict) => conflict.reason === "already-assigned"), "existing readers are not reported as conflicts");
  assert.deepEqual(plan.underCovered, [{ submissionId: "sub_3", requested: 2, planned: 1, existing: 0 }]);
  const ada = plan.load.find((row) => row.reviewerAccountId === "acct_a")!;
  assert.equal(ada.added, 2);
  assert.equal(ada.after, 6);
});

test("distribution is deterministic for the same input", () => {
  const input = {
    readersPerSubmission: 1,
    readers: [
      { accountId: "acct_b", label: "Ben", openAssignments: 0 },
      { accountId: "acct_a", label: "Ada", openAssignments: 0 },
    ],
    submissions: [
      { id: "sub_2", submitterAccountId: "acct_x", existingReviewerAccountIds: [] },
      { id: "sub_1", submitterAccountId: "acct_y", existingReviewerAccountIds: [] },
    ],
  };
  const first = planDistribution(input);
  const second = planDistribution({ ...input, readers: [...input.readers].reverse(), submissions: [...input.submissions].reverse() });
  assert.deepEqual(first.assignments, second.assignments);
  assert.deepEqual(first.assignments, [
    { submissionId: "sub_1", reviewerAccountId: "acct_a" },
    { submissionId: "sub_2", reviewerAccountId: "acct_b" },
  ]);
});
