import test from "node:test";
import assert from "node:assert/strict";
import {
  PILLAR_MAX,
  assignMissaTier,
  buildSubmissionPortfolioPlan,
  computeAccoladeBaseline,
  computeAccoladesScore,
  computeFeesScore,
  computePayScore,
  computeRespectScore,
  computeTurnaroundScore,
  isProPay,
  rankMagazines,
  scoreMagazine,
  turnaroundPointsForDays,
  type MagazineScoringInput,
  type RankedMagazinePlanningCandidate,
} from "../src/ranking/magazineRankingEngine.js";

const SOURCE =
  "https://cliffordgarstang.com/2026-literary-magazine-ranking-fiction/";

/** A magazine with no recorded facts beyond what each test adds. */
function magazine(
  overrides: Partial<MagazineScoringInput> = {},
): MagazineScoringInput {
  return {
    profileId: "mag",
    name: "Magazine",
    genresPublished: ["fiction"],
    pushcart: [],
    anthologyCitations: [],
    medianResponseDays: null,
    responseTimeBand: null,
    simultaneousSubmissions: null,
    queryAllowedAfterDays: null,
    regularSubmissionFeeCents: null,
    chargesSubmissionFee: null,
    hasSubsidizedFeeCategory: null,
    contributorPay: { kind: null },
    digitalArchive: null,
    blindReading: null,
    debutFriendly: null,
    ...overrides,
  };
}

const baseline = { overall: 64, fiction: 64, poetry: 64, nonfiction: 64 };

test("unknown facts score the midpoint of each pillar and are marked unknown", () => {
  const score = scoreMagazine(magazine(), "fiction", 2026, baseline);

  assert.equal(score.payScore, PILLAR_MAX.pay / 2);
  assert.equal(score.turnaroundScore, PILLAR_MAX.turnaround / 2);
  assert.equal(score.feesScore, PILLAR_MAX.fees / 2);
  assert.equal(score.respectScore, 5.5); // simultaneous 3 of 6 + query 2.5 of 1–4
  assert.equal(score.formatAndEthicsScore, PILLAR_MAX.formatEthics / 2);
  assert.deepEqual(score.pillarStatus, {
    accolades: "recorded",
    pay: "unknown",
    turnaround: "unknown",
    fees: "unknown",
    respect: "unknown",
    formatEthics: "unknown",
  });
  assert.equal(score.coverage, 0.4); // only the 40 accolade points are recorded
});

test("unknown is neither rewarded nor punished relative to recorded extremes", () => {
  const unknown = computePayScore({ kind: null }).score;
  assert.ok(unknown > computePayScore({ kind: "unpaid" }).score);
  assert.ok(
    unknown < computePayScore({ kind: null, prosePerWordCents: 10 }).score,
  );

  const unknownFee = computeFeesScore({
    regularSubmissionFeeCents: null,
    chargesSubmissionFee: null,
    hasSubsidizedFeeCategory: null,
  }).score;
  assert.ok(
    unknownFee >
      computeFeesScore({
        regularSubmissionFeeCents: 900,
        chargesSubmissionFee: true,
        hasSubsidizedFeeCategory: false,
      }).score,
  );
  assert.ok(
    unknownFee <
      computeFeesScore({
        regularSubmissionFeeCents: 0,
        chargesSubmissionFee: false,
        hasSubsidizedFeeCategory: null,
      }).score,
  );
});

test("a recorded range scores its own midpoint and is marked partial", () => {
  assert.deepEqual(computePayScore({ kind: "cash" }), {
    score: 8.5,
    status: "partial",
  });
  assert.deepEqual(
    computeFeesScore({
      regularSubmissionFeeCents: null,
      chargesSubmissionFee: true,
      hasSubsidizedFeeCategory: null,
    }),
    { score: 5.5, status: "partial" },
  );
  assert.deepEqual(
    computeRespectScore({
      simultaneousSubmissions: "allowed",
      queryAllowedAfterDays: null,
    }),
    { score: 8.5, status: "partial" },
  );
});

test("recorded facts score exactly and are marked recorded", () => {
  assert.deepEqual(computePayScore({ kind: "copies_only" }), {
    score: 2,
    status: "recorded",
  });
  assert.deepEqual(
    computePayScore({ kind: "cash", poetryPerPoemCents: 5000 }),
    { score: 15, status: "recorded" },
  );
  assert.deepEqual(
    computeFeesScore({
      regularSubmissionFeeCents: null,
      chargesSubmissionFee: false,
      hasSubsidizedFeeCategory: null,
    }),
    { score: 15, status: "recorded" },
  );
  assert.deepEqual(
    computeRespectScore({
      simultaneousSubmissions: "forbidden",
      queryAllowedAfterDays: 90,
    }),
    { score: 4, status: "recorded" },
  );
});

test("pro pay matches the 5¢ per word threshold used by the filter", () => {
  assert.equal(isProPay({ kind: "cash", prosePerWordCents: 5 }), true);
  assert.equal(isProPay({ kind: "cash", prosePerWordCents: 4 }), false);
  assert.equal(
    isProPay({ kind: "cash" }),
    false,
    "an unrecorded amount is never pro",
  );
});

test("turnaround uses one shared band table for medians and reported bands", () => {
  assert.equal(turnaroundPointsForDays(30), 15);
  assert.equal(turnaroundPointsForDays(60), 12);
  assert.equal(turnaroundPointsForDays(90), 8);
  assert.equal(turnaroundPointsForDays(120), 8);
  assert.equal(turnaroundPointsForDays(180), 4);
  assert.equal(turnaroundPointsForDays(365), 1);
  assert.equal(turnaroundPointsForDays(400), 0);

  assert.deepEqual(
    computeTurnaroundScore({
      medianResponseDays: 45,
      responseTimeBand: "over_6_months",
    }),
    {
      score: 12,
      status: "recorded",
    },
  );
  assert.deepEqual(
    computeTurnaroundScore({
      medianResponseDays: null,
      responseTimeBand: "under_3_months",
    }),
    {
      score: 11.5,
      status: "partial",
    },
  );
  assert.deepEqual(
    computeTurnaroundScore({
      medianResponseDays: null,
      responseTimeBand: "3_to_6_months",
    }),
    {
      score: 6,
      status: "partial",
    },
  );
  assert.deepEqual(
    computeTurnaroundScore({
      medianResponseDays: null,
      responseTimeBand: null,
    }),
    {
      score: 7.5,
      status: "unknown",
    },
  );
});

test("tiers break at 75, 60 and 45", () => {
  assert.equal(assignMissaTier(75), "Tier 1 (Flagship Luminary)");
  assert.equal(assignMissaTier(74.9), "Tier 2 (High Distinction)");
  assert.equal(assignMissaTier(60), "Tier 2 (High Distinction)");
  assert.equal(assignMissaTier(59.9), "Tier 3 (Distinguished Contemporary)");
  assert.equal(assignMissaTier(45), "Tier 3 (Distinguished Contemporary)");
  assert.equal(assignMissaTier(44.9), "Tier 4 (Emerging & Community)");
});

test("a fully recorded flagship magazine reaches tier 1", () => {
  const score = scoreMagazine(
    magazine({
      pushcart: [
        {
          genre: "fiction",
          editionYear: 2026,
          score: 64,
          rank: 1,
          sourceUrl: SOURCE,
        },
      ],
      medianResponseDays: 30,
      simultaneousSubmissions: "allowed",
      queryAllowedAfterDays: 120,
      regularSubmissionFeeCents: 0,
      chargesSubmissionFee: false,
      contributorPay: { kind: "cash", prosePerPieceCents: 50000 },
      digitalArchive: true,
      blindReading: true,
      debutFriendly: true,
    }),
    "fiction",
    2026,
    baseline,
  );
  assert.equal(score.totalScore, 100);
  assert.equal(score.tier, "Tier 1 (Flagship Luminary)");
  assert.equal(score.coverage, 1);
});

test("accolades scale with √(Pushcart score ÷ cohort top) and only use the ranking year's table", () => {
  const input = magazine({
    pushcart: [
      {
        genre: "fiction",
        editionYear: 2026,
        score: 16,
        rank: 20,
        sourceUrl: SOURCE,
      },
      {
        genre: "fiction",
        editionYear: 2025,
        score: 64,
        rank: 1,
        sourceUrl: SOURCE,
      },
    ],
  });
  // √(16/64) = 0.5 → 20 points; the 2025 row does not count toward 2026.
  assert.deepEqual(computeAccoladesScore(input, "fiction", 2026, baseline), {
    score: 20,
    status: "recorded",
  });
  // Absent from the year's table: zero Pushcart points, still recorded.
  assert.deepEqual(
    computeAccoladesScore(magazine(), "fiction", 2026, baseline),
    { score: 0, status: "recorded" },
  );
});

test("anthology citations add points only for their genre and within ten years", () => {
  const input = magazine({
    anthologyCitations: [
      {
        genre: "fiction",
        anthology: "Best Small Fictions",
        year: 2025,
        sourceUrl: "https://example.org/bsf",
      },
      {
        genre: "fiction",
        anthology: "Best Microfiction",
        year: 2019,
        sourceUrl: "https://example.org/bmf",
      },
      {
        genre: "fiction",
        anthology: "Best Microfiction",
        year: 2014,
        sourceUrl: "https://example.org/old",
      },
    ],
  });
  // 2.5 (recent) + 2 × 0.5 (six to ten years old); 2014 is outside the window.
  assert.equal(
    computeAccoladesScore(input, "fiction", 2026, baseline).score,
    3.5,
  );
  assert.equal(computeAccoladesScore(input, "poetry", 2026, baseline).score, 0);
});

test("anthology selections add at most ten accolade points", () => {
  const input = magazine({
    anthologyCitations: Array.from({ length: 12 }, (_, index) => ({
      genre: "fiction" as const,
      anthology: "Best Microfiction" as const,
      year: 2025,
      sourceUrl: `https://example.org/bmf-${index}`,
    })),
  });
  assert.equal(
    computeAccoladesScore(input, "fiction", 2026, baseline).score,
    10,
  );
});

test("without a Pushcart table for the year, accolades are unknown rather than zero", () => {
  const empty = { overall: 0, fiction: 0, poetry: 0, nonfiction: 0 };
  assert.deepEqual(computeAccoladesScore(magazine(), "fiction", 2026, empty), {
    score: 20,
    status: "unknown",
  });
});

test("genre indexes score each genre's own Pushcart record and overall sums them", () => {
  const poetryMag = magazine({
    profileId: "poetry-mag",
    name: "Poetry Magazine",
    genresPublished: ["poetry", "fiction"],
    pushcart: [
      {
        genre: "poetry",
        editionYear: 2026,
        score: 40,
        rank: 1,
        sourceUrl: SOURCE,
      },
      {
        genre: "fiction",
        editionYear: 2026,
        score: 1,
        rank: 90,
        sourceUrl: SOURCE,
      },
    ],
  });
  const fictionMag = magazine({
    profileId: "fiction-mag",
    name: "Fiction Magazine",
    genresPublished: ["fiction"],
    pushcart: [
      {
        genre: "fiction",
        editionYear: 2026,
        score: 30,
        rank: 1,
        sourceUrl: SOURCE,
      },
    ],
  });

  const ranked = rankMagazines([fictionMag, poetryMag], 2026);
  const poetry = ranked.find((r) => r.profileId === "poetry-mag")!;
  const fiction = ranked.find((r) => r.profileId === "fiction-mag")!;

  assert.equal(poetry.genres.poetry?.rankPosition, 1);
  assert.equal(poetry.genres.poetry?.accoladesScore, 40);
  assert.equal(fiction.genres.fiction?.rankPosition, 1);
  assert.equal(poetry.genres.fiction?.rankPosition, 2);
  assert.equal(
    fiction.genres.poetry,
    undefined,
    "a magazine enters only the genres it publishes",
  );
  // Overall: 41 vs 30 summed points, so the poetry magazine leads.
  assert.equal(poetry.overall.rankPosition, 1);
  assert.equal(poetry.overall.accoladesScore, 40);
});

test("ranking ties break on accolades then name", () => {
  const baselineInputs = [
    magazine({ profileId: "b", name: "Bravo" }),
    magazine({ profileId: "a", name: "Alpha" }),
  ];
  const ranked = rankMagazines(baselineInputs, 2026);
  assert.deepEqual(
    ranked.map((r) => [r.name, r.overall.rankPosition]),
    [
      ["Alpha", 1],
      ["Bravo", 2],
    ],
  );
});

test("computeAccoladeBaseline takes the cohort top per genre and the top summed overall", () => {
  const result = computeAccoladeBaseline(
    [
      magazine({
        pushcart: [
          {
            genre: "fiction",
            editionYear: 2026,
            score: 10,
            rank: 3,
            sourceUrl: SOURCE,
          },
          {
            genre: "poetry",
            editionYear: 2026,
            score: 12,
            rank: 1,
            sourceUrl: SOURCE,
          },
        ],
      }),
      magazine({
        pushcart: [
          {
            genre: "fiction",
            editionYear: 2026,
            score: 20,
            rank: 1,
            sourceUrl: SOURCE,
          },
        ],
      }),
    ],
    2026,
  );
  assert.deepEqual(result, {
    overall: 22,
    fiction: 20,
    poetry: 12,
    nonfiction: 0,
  });
});

function candidate(
  index: number,
  overrides: Partial<RankedMagazinePlanningCandidate> = {},
): RankedMagazinePlanningCandidate {
  return {
    profileId: `mag-${index + 1}`,
    name: `Magazine ${index + 1}`,
    slug: `mag-${index + 1}`,
    websiteUrl: null,
    rankPosition: index + 1,
    totalScore: 82 - index * 4,
    prestigeTier: assignMissaTier(82 - index * 4),
    medianResponseDays: null,
    regularFeeCents: index % 2 === 0 ? 0 : 300,
    contributorPayCents: null,
    payKind: index < 4 ? "cash" : "unpaid",
    simultaneousPolicy: "allowed",
    ...overrides,
  };
}

test("buildSubmissionPortfolioPlan honors explicit portfolio limits", () => {
  const candidates = Array.from({ length: 8 }, (_, index) => candidate(index));
  const plan = buildSubmissionPortfolioPlan(candidates, {
    genre: "fiction",
    preset: "balanced",
    limit: 4,
  });

  assert.equal(plan.slots.length, 4);
  assert.equal(
    plan.totalEstimatedFeesCents,
    plan.slots.reduce(
      (sum, slot) => sum + (slot.magazine.regularFeeCents ?? 0),
      0,
    ),
  );
  assert.equal(
    plan.expectedTurnaroundDays,
    null,
    "no recorded medians, no invented average",
  );
});

test("portfolio hard filters only pass recorded facts", () => {
  const candidates = [
    candidate(0, {
      regularFeeCents: null,
      simultaneousPolicy: null,
      payKind: null,
    }),
    candidate(1, {
      regularFeeCents: 0,
      simultaneousPolicy: "allowed",
      payKind: "cash",
    }),
  ];
  const plan = buildSubmissionPortfolioPlan(candidates, {
    genre: "fiction",
    preset: "balanced",
    maxFeeCents: 0,
    requireSimultaneousSubmissions: true,
    payingOnly: true,
  });
  assert.deepEqual(
    plan.slots.map((slot) => slot.magazine.profileId),
    ["mag-2"],
  );

  const unfiltered = buildSubmissionPortfolioPlan(candidates, {
    genre: "fiction",
    preset: "balanced",
  });
  assert.equal(unfiltered.unrecordedFeeCount, 1);
});
