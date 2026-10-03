import type { MagazineScoringInput } from "@missa/radar-engine";

const SAMPLE_SOURCE = "about:sample";

function sample(
  index: number,
  pushcartScore: number,
  facts: Partial<MagazineScoringInput> = {},
): MagazineScoringInput {
  return {
    profileId: `sample-magazine-${index}`,
    name: `Sample Magazine ${String.fromCharCode(64 + index)}`,
    genresPublished: ["fiction", "poetry"],
    pushcart: [
      { genre: "fiction", editionYear: 2026, score: pushcartScore, rank: index, sourceUrl: SAMPLE_SOURCE },
      { genre: "poetry", editionYear: 2026, score: pushcartScore / 2, rank: index, sourceUrl: SAMPLE_SOURCE },
    ],
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
    ...facts,
  };
}

/**
 * Fictional sample magazines for the labelled, non-production rankings
 * preview. They are not real publications and carry no real facts, so the
 * preview never attributes invented awards or policies to a real magazine.
 */
export const SEED_MAGAZINES: MagazineScoringInput[] = [
  sample(1, 48, { responseTimeBand: "3_to_6_months", simultaneousSubmissions: "allowed", contributorPay: { kind: "cash" } }),
  sample(2, 36, { chargesSubmissionFee: false, regularSubmissionFeeCents: 0 }),
  sample(3, 24, { responseTimeBand: "under_3_months", contributorPay: { kind: "copies_only" } }),
  sample(4, 12),
  sample(5, 6, { simultaneousSubmissions: "forbidden", chargesSubmissionFee: true }),
  sample(6, 1.5),
];
