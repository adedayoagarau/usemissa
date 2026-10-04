import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RESIDENCY_PILLAR_MAX,
  computeAccessScore,
  computeFacilitiesScore,
  computeFundingScore,
  computeRatingsScore,
  rankResidencies,
  scoreResidency,
  type ResidencyScoringInput,
} from "../src/ranking/residencyRankingEngine.js";

const unknown: ResidencyScoringInput = {
  profileId: "p",
  name: "Program",
  freeToAttend: null,
  hasStipend: null,
  meals: null,
  privateStudio: null,
  rating: null,
  foundedYear: null,
  directoryCount: 1,
  openCall: null,
};

test("a program with nothing on record scores the middle of every pillar", () => {
  const score = scoreResidency(unknown, 2026);
  assert.equal(score.fundingScore, 17.5);
  assert.equal(score.ratingsScore, 15);
  assert.equal(score.facilitiesScore, 10);
  // Longevity 2.5, one directory 2.5, open call 2.5.
  assert.equal(score.accessScore, 7.5);
  assert.equal(score.totalScore, 50);
  assert.deepEqual(score.pillarStatus, {
    funding: "unknown",
    ratings: "unknown",
    facilities: "unknown",
    access: "partial",
  });
  // Only the directories part of access (half of its 15 points) is recorded.
  assert.equal(score.coverage, 0.075);
});

test("recorded funding and facilities earn their points; recorded absences earn none", () => {
  assert.deepEqual(computeFundingScore({ freeToAttend: true, hasStipend: true }), {
    score: 35,
    status: "recorded",
  });
  assert.deepEqual(computeFundingScore({ freeToAttend: false, hasStipend: null }), {
    score: 5,
    status: "partial",
  });
  assert.deepEqual(computeFacilitiesScore({ meals: "some", privateStudio: false }), {
    score: 7,
    status: "recorded",
  });
  assert.deepEqual(computeFacilitiesScore({ meals: "all", privateStudio: null }), {
    score: 15,
    status: "partial",
  });
});

test("ratings are weighed against five neutral ratings", () => {
  const one = computeRatingsScore({ rating: { value: 5, count: 1 } });
  const many = computeRatingsScore({ rating: { value: 4.6, count: 41 } });
  assert.equal(one.status, "recorded");
  assert.ok(one.score < many.score, "one perfect rating counts for less than many good ones");
  assert.ok(many.score <= RESIDENCY_PILLAR_MAX.ratings);
  assert.equal(computeRatingsScore({ rating: null }).score, 15);
});

test("access counts years running, directories and a current open call", () => {
  assert.deepEqual(
    computeAccessScore({ foundedYear: 1907, directoryCount: 2, openCall: true }, 2026),
    { score: 15, status: "recorded" },
  );
  assert.deepEqual(
    computeAccessScore({ foundedYear: 2024, directoryCount: 1, openCall: null }, 2026),
    { score: 6, status: "partial" },
  );
});

test("ranking orders by total, then ratings, then name", () => {
  const ranked = rankResidencies(
    [
      { ...unknown, profileId: "b", name: "Beta" },
      { ...unknown, profileId: "a", name: "Alpha" },
      { ...unknown, profileId: "c", name: "Gamma", freeToAttend: true, hasStipend: true },
    ],
    2026,
  );
  assert.deepEqual(
    ranked.map((r) => [r.name, r.rankPosition]),
    [
      ["Gamma", 1],
      ["Alpha", 2],
      ["Beta", 3],
    ],
  );
});
