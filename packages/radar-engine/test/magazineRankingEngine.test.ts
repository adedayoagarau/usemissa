import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSubmissionPortfolioPlan,
  scoreMagazine,
  rankMagazines,
  type MagazineScoringInput,
} from "../src/ranking/magazineRankingEngine.js";

test("scoreMagazine evaluates flagship journals with high accolades, pay, and reasonable fees", () => {
  const input: MagazineScoringInput = {
    profileId: "pshares",
    name: "Ploughshares",
    genresPublished: ["fiction", "poetry", "nonfiction"],
    awards: [
      { genre: "fiction", anthology: "Pushcart Prize", awardType: "win", year: 2024 },
      { genre: "fiction", anthology: "Best American Short Stories", awardType: "win", year: 2025 },
      { genre: "fiction", anthology: "O. Henry Prize", awardType: "win", year: 2023 },
      { genre: "fiction", anthology: "Pushcart Prize", awardType: "win", year: 2022 },
      { genre: "poetry", anthology: "Pushcart Prize", awardType: "win", year: 2023 },
      { genre: "nonfiction", anthology: "Best American Essays", awardType: "win", year: 2024 },
    ],
    medianResponseDays: 90,
    simultaneousSubmissions: "allowed",
    queryAllowedAfterDays: 120,
    regularSubmissionFeeCents: 300,
    hasSubsidizedFeeCategory: true,
    contributorPay: {
      prosePerPieceCents: 15000,
      poetryPerPoemCents: 5000,
    },
    digitalPermanenceArchive: true,
    openAccessOnline: false,
    printArchivalLongevityYears: 50,
    blindReadingProcess: false,
    debutFriendlyRoster: true,
  };

  const fictionScore = scoreMagazine(input, "fiction", 2026);
  assert.ok(fictionScore.totalScore >= 60, `Expected high score >= 60, got ${fictionScore.totalScore}`);
  assert.equal(fictionScore.payScore, 15, "Expected pro pay score");
  assert.equal(fictionScore.feesScore, 11, "Expected subsidized fee score");
  assert.ok(fictionScore.tier.includes("Tier 1") || fictionScore.tier.includes("Tier 2"));
});

test("rankMagazines produces genre-specific and overall ranks accurately", () => {
  const magA: MagazineScoringInput = {
    profileId: "one-story",
    name: "One Story",
    genresPublished: ["fiction"],
    awards: [
      { genre: "fiction", anthology: "Pushcart Prize", awardType: "win", year: 2025 },
      { genre: "fiction", anthology: "Best American Short Stories", awardType: "win", year: 2024 },
    ],
    medianResponseDays: 30,
    simultaneousSubmissions: "forbidden",
    queryAllowedAfterDays: 90,
    regularSubmissionFeeCents: 0,
    hasSubsidizedFeeCategory: false,
    contributorPay: { prosePerPieceCents: 50000 },
    digitalPermanenceArchive: true,
    openAccessOnline: false,
    printArchivalLongevityYears: 20,
    blindReadingProcess: false,
    debutFriendlyRoster: true,
  };

  const magB: MagazineScoringInput = {
    profileId: "poetry-mag",
    name: "Poetry Magazine",
    genresPublished: ["poetry"],
    awards: [
      { genre: "poetry", anthology: "Pushcart Prize", awardType: "win", year: 2025 },
      { genre: "poetry", anthology: "Best American Poetry", awardType: "win", year: 2024 },
    ],
    medianResponseDays: 45,
    simultaneousSubmissions: "allowed",
    queryAllowedAfterDays: 90,
    regularSubmissionFeeCents: 0,
    hasSubsidizedFeeCategory: false,
    contributorPay: { poetryPerPoemCents: 10000 },
    digitalPermanenceArchive: true,
    openAccessOnline: true,
    printArchivalLongevityYears: 110,
    blindReadingProcess: false,
    debutFriendlyRoster: true,
  };

  const rankings = rankMagazines([magA, magB], 2026);
  assert.equal(rankings.length, 2);

  const oneStory = rankings.find((r) => r.profileId === "one-story");
  assert.ok(oneStory?.genres.fiction);
  assert.equal(oneStory.genres.fiction.rankPosition, 1);
  assert.equal(oneStory.genres.poetry, undefined);

  const poetry = rankings.find((r) => r.profileId === "poetry-mag");
  assert.ok(poetry?.genres.poetry);
  assert.equal(poetry.genres.poetry.rankPosition, 1);
  assert.equal(poetry.genres.fiction, undefined);
});

test("buildSubmissionPortfolioPlan honors explicit portfolio limits", () => {
  const candidates = Array.from({ length: 8 }, (_, index) => ({
    profileId: `mag-${index + 1}`,
    name: `Magazine ${index + 1}`,
    slug: `mag-${index + 1}`,
    websiteUrl: null,
    rankPosition: index + 1,
    totalScore: 82 - index * 4,
    prestigeTier:
      index < 2
        ? "Tier 1 (Flagship Luminary)"
        : index < 5
          ? "Tier 2 (High Distinction)"
          : "Tier 3 (Distinguished Contemporary)",
    medianResponseDays: 30 + index * 10,
    regularFeeCents: index % 2 === 0 ? 0 : 300,
    contributorPayCents: index < 4 ? 10000 : 0,
    simultaneousPolicy: "allowed",
  }));

  const plan = buildSubmissionPortfolioPlan(candidates, {
    genre: "fiction",
    preset: "balanced",
    limit: 4,
  });

  assert.equal(plan.slots.length, 4);
  assert.equal(
    plan.totalEstimatedFeesCents,
    plan.slots.reduce((sum, slot) => sum + slot.magazine.regularFeeCents, 0),
  );
});
