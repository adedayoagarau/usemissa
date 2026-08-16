import assert from "node:assert/strict";
import test from "node:test";
import {
  parseDirectoryHandleRecommendationsCsv,
  selectDirectoryHandleReservations,
} from "../src/directoryHandleReservations.js";

const headers = [
  "profileId",
  "name",
  "websiteUrl",
  "candidateA",
  "candidateB",
  "decision",
  "reason",
  "officialSocialAccounts",
  "socialUsernames",
  "socialEvidenceUrls",
  "socialConfidence",
  "socialConflicts",
  "unverifiedSocialCandidates",
  "humanReview",
  "humanReviewReason",
  "socialCheckedAt",
  "socialResearchNotes",
  "suggestedHandle",
  "suggestionSource",
  "selectedCandidateField",
  "corroboratingSocialAccounts",
  "suggestionConfidence",
  "suggestionConflicts",
  "suggestionHumanReview",
  "suggestionReason",
].join(",");

function row(input: {
  profileId: string;
  candidateA?: string;
  candidateB?: string;
  suggestedHandle: string;
  suggestionSource?: string;
  selectedCandidateField?: string;
  suggestionConfidence?: string;
  suggestionConflicts?: string;
  suggestionHumanReview?: string;
}): string {
  const values = [
    input.profileId,
    "Test Journal",
    "https://test.example",
    input.candidateA ?? "",
    input.candidateB ?? "",
    "review",
    "handle-namespace-unavailable",
    "[]",
    "",
    "",
    "none",
    "[]",
    "[]",
    "true",
    "",
    "2026-08-14",
    "",
    input.suggestedHandle,
    input.suggestionSource ?? "existing-candidateA",
    input.selectedCandidateField ?? "candidateA",
    "",
    input.suggestionConfidence ?? "medium",
    input.suggestionConflicts ?? "[]",
    input.suggestionHumanReview ?? "false",
    "selected exact candidate",
  ];
  return values.join(",");
}

test("selects exact tokens from pipe-delimited candidate cells", () => {
  const rows = parseDirectoryHandleRecommendationsCsv(
    `${headers}\n${row({
      profileId: "profile_1",
      candidateA: "shore|theshore",
      suggestedHandle: "theshore",
    })}\n`,
  );
  const selection = selectDirectoryHandleReservations(rows);
  assert.equal(selection.candidates.length, 1);
  assert.equal(selection.candidates[0]?.derivation, "name");
});

test("does not auto-reserve review, fallback, duplicate, or invalid rows", () => {
  const rows = parseDirectoryHandleRecommendationsCsv(
    [
      headers,
      row({
        profileId: "profile_review",
        candidateA: "reviewjournal",
        suggestedHandle: "reviewjournal",
        suggestionHumanReview: "true",
      }),
      row({
        profileId: "profile_fallback",
        suggestedHandle: "socialjournal",
        suggestionSource: "verified-social-fallback",
        selectedCandidateField: "",
      }),
      row({
        profileId: "profile_invalid",
        candidateA: "123journal",
        suggestedHandle: "123journal",
      }),
      row({
        profileId: "profile_duplicate_a",
        candidateA: "samejournal",
        suggestedHandle: "samejournal",
      }),
      row({
        profileId: "profile_duplicate_b",
        candidateA: "samejournal",
        suggestedHandle: "samejournal",
      }),
    ].join("\n") + "\n",
  );
  const selection = selectDirectoryHandleReservations(rows);
  assert.equal(selection.candidates.length, 0);
  assert.equal(selection.exclusions.length, 5);
  assert.deepEqual(
    selection.exclusions.map((exclusion) => exclusion.reason),
    [
      "human-review",
      "fallback-source",
      "invalid-normalization",
      "conflict",
      "conflict",
    ],
  );
});

test("requires candidate membership to be exact and deterministic", () => {
  const rows = parseDirectoryHandleRecommendationsCsv(
    `${headers}\n${row({
      profileId: "profile_2",
      candidateA: "selectedjournal",
      suggestedHandle: "differentjournal",
    })}\n`,
  );
  const selection = selectDirectoryHandleReservations(rows);
  assert.equal(selection.candidates.length, 0);
  assert.equal(selection.exclusions[0]?.reason, "candidate-membership");
});
