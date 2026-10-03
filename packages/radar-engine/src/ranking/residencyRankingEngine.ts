import {
  assignMissaTier,
  type FactStatus,
  type MissaPrestigeTier,
  type PillarResult,
} from "./magazineRankingEngine.js";

/**
 * Residency index. Every fact is recorded by a cited directory listing or is
 * null; a fact not on record scores the midpoint of the points it could earn,
 * so missing records neither reward nor punish a program.
 */
export type ResidencyPillarKey = "funding" | "ratings" | "facilities" | "access";

export const RESIDENCY_PILLAR_MAX: Record<ResidencyPillarKey, number> = {
  funding: 35,
  ratings: 30,
  facilities: 20,
  access: 15,
};

export const RESIDENCY_PILLAR_KEYS = Object.keys(
  RESIDENCY_PILLAR_MAX,
) as ResidencyPillarKey[];

export type ResidencyPillarStatusMap = Record<ResidencyPillarKey, FactStatus>;

export type ResidencyMeals = "all" | "some" | "none";

/** Residents' ratings are weighed against five neutral ratings of 3 out of 5. */
export const RATING_PRIOR = { value: 3, weight: 5 } as const;

export interface ResidencyScoringInput {
  profileId: string;
  name: string;
  /** True when the program records no residency fee; false when it charges one. */
  freeToAttend: boolean | null;
  /** True when the program records a stipend for artists; false when it records none. */
  hasStipend: boolean | null;
  meals: ResidencyMeals | null;
  /** True for private studios, false for shared ones. */
  privateStudio: boolean | null;
  /** Combined residents' rating (1–5) and how many ratings it averages. */
  rating: { value: number; count: number } | null;
  foundedYear: number | null;
  /** How many residency directories list the program (at least one). */
  directoryCount: number;
  /** True when a current open call is on record; null when none is on record. */
  openCall: true | null;
}

export interface ResidencyScoreBreakdown {
  totalScore: number;
  fundingScore: number;
  ratingsScore: number;
  facilitiesScore: number;
  accessScore: number;
  tier: MissaPrestigeTier;
  pillarStatus: ResidencyPillarStatusMap;
  /** Share of the 100 points backed by recorded facts, 0–1. */
  coverage: number;
}

export interface RankedResidency extends ResidencyScoringInput, ResidencyScoreBreakdown {
  rankPosition: number;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Points for one fact: recorded points when known, half the maximum when not. */
function part<T>(value: T | null, max: number, points: (value: T) => number) {
  return value == null ? { score: max / 2, known: false } : { score: points(value), known: true };
}

function statusOf(known: boolean[]): FactStatus {
  const recorded = known.filter(Boolean).length;
  if (recorded === known.length) return "recorded";
  return recorded === 0 ? "unknown" : "partial";
}

/** Funding (35): 25 when attending costs nothing, 10 more for a stipend. */
export function computeFundingScore(
  input: Pick<ResidencyScoringInput, "freeToAttend" | "hasStipend">,
): PillarResult {
  const free = part(input.freeToAttend, 25, (free) => (free ? 25 : 0));
  const stipend = part(input.hasStipend, 10, (paid) => (paid ? 10 : 0));
  return {
    score: round1(free.score + stipend.score),
    status: statusOf([free.known, stipend.known]),
  };
}

/**
 * Residents' ratings (30). The average is weighed against five neutral
 * ratings, so a single 5-star rating counts for less than forty of them.
 */
export function computeRatingsScore(
  input: Pick<ResidencyScoringInput, "rating">,
): PillarResult {
  const max = RESIDENCY_PILLAR_MAX.ratings;
  if (!input.rating || input.rating.count <= 0) {
    return { score: max / 2, status: "unknown" };
  }
  const { value, count } = input.rating;
  const adjusted =
    (value * count + RATING_PRIOR.value * RATING_PRIOR.weight) /
    (count + RATING_PRIOR.weight);
  return {
    score: round1(Math.min(max, Math.max(0, (max * (adjusted - 1)) / 4))),
    status: "recorded",
  };
}

/** Room to work (20): meals (10 all, 7 some, 0 none) and a private studio (10). */
export function computeFacilitiesScore(
  input: Pick<ResidencyScoringInput, "meals" | "privateStudio">,
): PillarResult {
  const meals = part(input.meals, 10, (meals) =>
    meals === "all" ? 10 : meals === "some" ? 7 : 0,
  );
  const studio = part(input.privateStudio, 10, (own) => (own ? 10 : 0));
  return {
    score: round1(meals.score + studio.score),
    status: statusOf([meals.known, studio.known]),
  };
}

/**
 * Standing and access (15): years running (5), directories listing the
 * program (5) and a current open call on record (5).
 */
export function computeAccessScore(
  input: Pick<ResidencyScoringInput, "foundedYear" | "directoryCount" | "openCall">,
  year: number,
): PillarResult {
  const longevity = part(input.foundedYear, 5, (founded) => {
    const age = year - founded;
    if (age >= 25) return 5;
    if (age >= 10) return 3.5;
    if (age >= 3) return 2;
    return 1;
  });
  const directories = input.directoryCount >= 2 ? 5 : 2.5;
  const call = part(input.openCall, 5, () => 5);
  return {
    score: round1(longevity.score + directories + call.score),
    status: statusOf([longevity.known, true, call.known]),
  };
}

export function computeResidencyCoverage(status: ResidencyPillarStatusMap): number {
  let covered = 0;
  for (const key of RESIDENCY_PILLAR_KEYS) {
    if (status[key] === "recorded") covered += RESIDENCY_PILLAR_MAX[key];
    else if (status[key] === "partial") covered += RESIDENCY_PILLAR_MAX[key] / 2;
  }
  return Math.round(covered * 10) / 1000;
}

export function scoreResidency(
  input: ResidencyScoringInput,
  year: number,
): ResidencyScoreBreakdown {
  const pillars: Record<ResidencyPillarKey, PillarResult> = {
    funding: computeFundingScore(input),
    ratings: computeRatingsScore(input),
    facilities: computeFacilitiesScore(input),
    access: computeAccessScore(input, year),
  };
  const pillarStatus = Object.fromEntries(
    RESIDENCY_PILLAR_KEYS.map((key) => [key, pillars[key].status]),
  ) as ResidencyPillarStatusMap;
  const totalScore = round1(
    Math.min(
      100,
      RESIDENCY_PILLAR_KEYS.reduce((sum, key) => sum + pillars[key].score, 0),
    ),
  );
  return {
    totalScore,
    fundingScore: pillars.funding.score,
    ratingsScore: pillars.ratings.score,
    facilitiesScore: pillars.facilities.score,
    accessScore: pillars.access.score,
    tier: assignMissaTier(totalScore),
    pillarStatus,
    coverage: computeResidencyCoverage(pillarStatus),
  };
}

/** Ranks by total, then ratings, then name. */
export function rankResidencies(
  inputs: ResidencyScoringInput[],
  year: number,
): RankedResidency[] {
  return inputs
    .map((input) => ({ ...input, ...scoreResidency(input, year) }))
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore ||
        b.ratingsScore - a.ratingsScore ||
        a.name.localeCompare(b.name),
    )
    .map((residency, index) => ({ ...residency, rankPosition: index + 1 }));
}
