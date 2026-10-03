import type { MagazineScheduleResult } from "../availability/magazineSchedule.js";

export type RankingGenre = "fiction" | "poetry" | "nonfiction" | "overall";
export type ScoredGenre = Exclude<RankingGenre, "overall">;

export type MissaPrestigeTier =
  | "Tier 1 (Flagship Luminary)"
  | "Tier 2 (High Distinction)"
  | "Tier 3 (Distinguished Contemporary)"
  | "Tier 4 (Emerging & Community)";

export const TIER_THRESHOLDS = { tier1: 75, tier2: 60, tier3: 45 } as const;

export type PillarKey =
  "accolades" | "pay" | "turnaround" | "fees" | "respect" | "formatEthics";

export const PILLAR_MAX: Record<PillarKey, number> = {
  accolades: 40,
  pay: 15,
  turnaround: 15,
  fees: 15,
  respect: 10,
  formatEthics: 5,
};

export const PILLAR_KEYS = Object.keys(PILLAR_MAX) as PillarKey[];

/**
 * How much of a pillar rests on recorded facts.
 * - recorded: every fact the pillar uses comes from a cited source.
 * - partial: a source records a range (for example "pays in cash" with no
 *   amount), so the pillar scores the midpoint of that range.
 * - unknown: no source records the facts, so the pillar scores the midpoint
 *   of its full range. Unknown is never treated as good or bad.
 */
export type FactStatus = "recorded" | "partial" | "unknown";

export interface PillarResult {
  score: number;
  status: FactStatus;
}

export type ResponseTimeBand =
  "under_3_months" | "3_to_6_months" | "over_6_months";
export type SimultaneousPolicy = "allowed" | "conditional" | "forbidden";
export type ContributorPayKind = "cash" | "copies_only" | "unpaid";

/**
 * One row of Clifford Garstang's annual Pushcart ranking table. Garstang
 * publishes a rank and a ten-year weighted score of Pushcart Prizes and
 * special mentions per genre; he does not publish the per-year counts.
 * A magazine missing from a year's table had no Pushcart points in his window.
 */
export interface PushcartRankingRecord {
  genre: ScoredGenre;
  editionYear: number;
  score: number;
  rank: number;
  sourceUrl: string;
}

export type CitedAnthology = "Best Small Fictions" | "Best Microfiction";

/** An anthology selection whose source names the magazine. */
export interface AnthologyCitation {
  genre: ScoredGenre | "hybrid";
  anthology: CitedAnthology;
  year: number;
  sourceUrl: string;
}

export const ANTHOLOGY_CITATION_POINTS: Record<CitedAnthology, number> = {
  "Best Small Fictions": 2.5,
  "Best Microfiction": 2,
};

/** Anthology selections add at most this many of the 40 accolade points. */
export const ANTHOLOGY_POINTS_CAP = 10;

export interface ContributorPayFacts {
  kind: ContributorPayKind | null;
  poetryPerPoemCents?: number | null;
  prosePerPieceCents?: number | null;
  prosePerWordCents?: number | null;
}

/**
 * Every fact is null unless a cited source records it. The engine never
 * substitutes a default for a missing fact.
 */
export interface MagazineScoringInput {
  profileId: string;
  name: string;
  genresPublished: ScoredGenre[];
  pushcart: PushcartRankingRecord[];
  anthologyCitations: AnthologyCitation[];
  medianResponseDays: number | null;
  responseTimeBand: ResponseTimeBand | null;
  simultaneousSubmissions: SimultaneousPolicy | null;
  queryAllowedAfterDays: number | null;
  regularSubmissionFeeCents: number | null;
  chargesSubmissionFee: boolean | null;
  hasSubsidizedFeeCategory: boolean | null;
  contributorPay: ContributorPayFacts;
  digitalArchive: boolean | null;
  blindReading: boolean | null;
  debutFriendly: boolean | null;
}

export type PillarStatusMap = Record<PillarKey, FactStatus>;

export interface ScoreBreakdown {
  accoladesScore: number; // Max 40
  payScore: number; // Max 15
  turnaroundScore: number; // Max 15
  feesScore: number; // Max 15
  respectScore: number; // Max 10
  formatAndEthicsScore: number; // Max 5
  totalScore: number; // 0 - 100
  tier: MissaPrestigeTier;
  pillarStatus: PillarStatusMap;
  /** Share of the 100 points backed by recorded facts (partial counts half). */
  coverage: number;
}

export interface ComputedMagazineRankings {
  profileId: string;
  name: string;
  rankingYear: number;
  overall: ScoreBreakdown & { rankPosition: number };
  genres: Partial<
    Record<ScoredGenre, ScoreBreakdown & { rankPosition: number }>
  >;
}

/** Highest Pushcart score in the cohort, per genre (overall = sum of genres). */
export type AccoladeBaseline = Record<RankingGenre, number>;

const round1 = (value: number) => Math.round(value * 10) / 10;

function range(min: number, max: number, status: FactStatus): PillarResult {
  return { score: round1((min + max) / 2), status };
}

function combineStatus(parts: boolean[]): FactStatus {
  const known = parts.filter(Boolean).length;
  if (known === parts.length) return "recorded";
  return known === 0 ? "unknown" : "partial";
}

/** Garstang's recorded score for the ranking year, per genre or summed for overall. */
export function pushcartScoreFor(
  records: PushcartRankingRecord[],
  genre: RankingGenre,
  rankingYear: number,
): number {
  return records
    .filter(
      (r) =>
        r.editionYear === rankingYear &&
        (genre === "overall" || r.genre === genre),
    )
    .reduce((sum, r) => sum + r.score, 0);
}

export function computeAccoladeBaseline(
  magazines: Pick<MagazineScoringInput, "pushcart">[],
  rankingYear: number,
): AccoladeBaseline {
  const baseline: AccoladeBaseline = {
    overall: 0,
    fiction: 0,
    poetry: 0,
    nonfiction: 0,
  };
  for (const mag of magazines) {
    for (const genre of Object.keys(baseline) as RankingGenre[]) {
      baseline[genre] = Math.max(
        baseline[genre],
        pushcartScoreFor(mag.pushcart, genre, rankingYear),
      );
    }
  }
  return baseline;
}

/**
 * Accolades (max 40). Pushcart standing is 40 × √(score ÷ top score in the
 * cohort), so the top magazine in each genre earns 40 and the square root
 * keeps single special mentions visible. Each cited Best Small Fictions or
 * Best Microfiction selection in the last ten years adds points (full weight
 * for the last five years, half before that), up to ANTHOLOGY_POINTS_CAP, so
 * Pushcart standing stays the main signal. Garstang's table lists every
 * magazine with Pushcart points, so the pillar is recorded whenever the
 * year's table is loaded.
 */
export function computeAccoladesScore(
  input: Pick<MagazineScoringInput, "pushcart" | "anthologyCitations">,
  genre: RankingGenre,
  rankingYear: number,
  baseline: AccoladeBaseline,
): PillarResult {
  const top = baseline[genre];
  let citationPoints = 0;
  for (const citation of input.anthologyCitations) {
    const age = rankingYear - citation.year;
    if (age < 0 || age > 9) continue;
    if (
      genre !== "overall" &&
      citation.genre !== genre &&
      citation.genre !== "hybrid"
    )
      continue;
    citationPoints +=
      ANTHOLOGY_CITATION_POINTS[citation.anthology] * (age <= 4 ? 1 : 0.5);
  }
  citationPoints = Math.min(ANTHOLOGY_POINTS_CAP, citationPoints);

  if (top <= 0) {
    // No Pushcart table for this year: only citations are recorded.
    if (citationPoints > 0) {
      return {
        score: round1(Math.min(PILLAR_MAX.accolades, citationPoints)),
        status: "partial",
      };
    }
    return range(0, PILLAR_MAX.accolades, "unknown");
  }

  const own = pushcartScoreFor(input.pushcart, genre, rankingYear);
  const pushcartPoints =
    PILLAR_MAX.accolades * Math.sqrt(Math.min(1, own / top));
  return {
    score: round1(
      Math.min(PILLAR_MAX.accolades, pushcartPoints + citationPoints),
    ),
    status: "recorded",
  };
}

/** Pro rate thresholds used by the pay pillar and the "pro pay" filter. */
export const PRO_PAY_THRESHOLDS = {
  perWordCents: 5,
  perPoemCents: 5000,
  perPieceCents: 10000,
} as const;

function payPointsForAmounts(pay: ContributorPayFacts): number | null {
  const poem = pay.poetryPerPoemCents ?? null;
  const piece = pay.prosePerPieceCents ?? null;
  const word = pay.prosePerWordCents ?? null;
  if (poem == null && piece == null && word == null) return null;
  const p = poem ?? 0;
  const pc = piece ?? 0;
  const w = word ?? 0;
  if (
    p >= PRO_PAY_THRESHOLDS.perPoemCents ||
    pc >= PRO_PAY_THRESHOLDS.perPieceCents ||
    w >= PRO_PAY_THRESHOLDS.perWordCents
  )
    return 15; // Pro
  if (p >= 2500 || pc >= 4000) return 10; // Semi-pro
  if (p >= 1000 || pc >= 1000) return 5; // Token honorarium
  return p > 0 || pc > 0 || w > 0 ? 2 : 0;
}

/** Contributor compensation (max 15). */
export function computePayScore(pay: ContributorPayFacts): PillarResult {
  if (pay.kind === "unpaid") return { score: 0, status: "recorded" };
  if (pay.kind === "copies_only") return { score: 2, status: "recorded" };
  const amountPoints = payPointsForAmounts(pay);
  if (amountPoints != null) {
    return {
      score: pay.kind === "cash" ? Math.max(2, amountPoints) : amountPoints,
      status: "recorded",
    };
  }
  if (pay.kind === "cash") return range(2, PILLAR_MAX.pay, "partial");
  return range(0, PILLAR_MAX.pay, "unknown");
}

export function isProPay(pay: ContributorPayFacts): boolean {
  const result = computePayScore(pay);
  return result.status === "recorded" && result.score >= PILLAR_MAX.pay;
}

/** Turnaround points for a known median response time. */
export function turnaroundPointsForDays(medianDays: number): number {
  if (medianDays <= 30) return 15; // Lightning
  if (medianDays <= 60) return 12; // Swift
  if (medianDays <= 120) return 8; // Standard
  if (medianDays <= 180) return 4; // Slow
  if (medianDays <= 365) return 1; // Very extended
  return 0; // > 1 year
}

/**
 * Writer reports become a magazine's recorded median response time only once
 * it has this many decided reports with a response time.
 */
export const MIN_REPORTS_FOR_MEDIAN = 5;

export const RESPONSE_BAND_DAYS: Record<ResponseTimeBand, [number, number]> = {
  under_3_months: [0, 90],
  "3_to_6_months": [91, 180],
  over_6_months: [181, Number.POSITIVE_INFINITY],
};

/**
 * Turnaround (max 15). The single source of truth for turnaround points: the
 * seed scripts and the report-response path both call this.
 * A median (from enough writer reports) is recorded; a magazine's reported
 * response band is partial and scores the midpoint of that band's points.
 */
export function computeTurnaroundScore(facts: {
  medianResponseDays: number | null;
  responseTimeBand: ResponseTimeBand | null;
}): PillarResult {
  if (facts.medianResponseDays != null) {
    return {
      score: turnaroundPointsForDays(facts.medianResponseDays),
      status: "recorded",
    };
  }
  if (facts.responseTimeBand) {
    const [minDays, maxDays] = RESPONSE_BAND_DAYS[facts.responseTimeBand];
    return range(
      turnaroundPointsForDays(maxDays),
      turnaroundPointsForDays(minDays),
      "partial",
    );
  }
  return range(0, PILLAR_MAX.turnaround, "unknown");
}

function feeBandPoints(feeCents: number): number {
  if (feeCents === 0) return 15; // Free all year
  if (feeCents <= 350) return 7; // $1 - $3.50 platform pass-through
  if (feeCents <= 500) return 4; // $4 - $5 standard fee
  return 0; // > $5
}

const SUBSIDIZED_FEE_POINTS = 11;

/** Regular submission fees (max 15). */
export function computeFeesScore(facts: {
  regularSubmissionFeeCents: number | null;
  chargesSubmissionFee: boolean | null;
  hasSubsidizedFeeCategory: boolean | null;
}): PillarResult {
  const fee = facts.regularSubmissionFeeCents;
  const subsidized = facts.hasSubsidizedFeeCategory;
  if (fee === 0 || facts.chargesSubmissionFee === false)
    return { score: 15, status: "recorded" };

  if (fee != null) {
    const band = feeBandPoints(fee);
    if (subsidized === true)
      return { score: SUBSIDIZED_FEE_POINTS, status: "recorded" };
    if (subsidized === false) return { score: band, status: "recorded" };
    return range(band, Math.max(band, SUBSIDIZED_FEE_POINTS), "partial");
  }

  if (facts.chargesSubmissionFee === true) {
    if (subsidized === true)
      return { score: SUBSIDIZED_FEE_POINTS, status: "recorded" };
    return range(
      0,
      subsidized === false ? 7 : SUBSIDIZED_FEE_POINTS,
      "partial",
    );
  }

  if (subsidized === true)
    return range(SUBSIDIZED_FEE_POINTS, PILLAR_MAX.fees, "partial");
  return range(0, PILLAR_MAX.fees, "unknown");
}

/** Editorial respect: simultaneous submissions (6) and query policy (4). */
export function computeRespectScore(facts: {
  simultaneousSubmissions: SimultaneousPolicy | null;
  queryAllowedAfterDays: number | null;
}): PillarResult {
  const sim = facts.simultaneousSubmissions;
  const simPoints =
    sim === "allowed"
      ? 6
      : sim === "conditional"
        ? 3
        : sim === "forbidden"
          ? 0
          : 3;
  const query = facts.queryAllowedAfterDays;
  const queryPoints = query == null ? 2.5 : query <= 180 ? 4 : 2;
  return {
    score: round1(simPoints + queryPoints),
    status: combineStatus([sim != null, query != null]),
  };
}

/** Archive (2), blind reading (1.5), debut-friendly roster (1.5). Max 5. */
export function computeFormatAndEthicsScore(facts: {
  digitalArchive: boolean | null;
  blindReading: boolean | null;
  debutFriendly: boolean | null;
}): PillarResult {
  const part = (value: boolean | null, points: number) =>
    value == null ? points / 2 : value ? points : 0;
  return {
    score: round1(
      part(facts.digitalArchive, 2) +
        part(facts.blindReading, 1.5) +
        part(facts.debutFriendly, 1.5),
    ),
    status: combineStatus([
      facts.digitalArchive != null,
      facts.blindReading != null,
      facts.debutFriendly != null,
    ]),
  };
}

export function assignMissaTier(score: number): MissaPrestigeTier {
  if (score >= TIER_THRESHOLDS.tier1) return "Tier 1 (Flagship Luminary)";
  if (score >= TIER_THRESHOLDS.tier2) return "Tier 2 (High Distinction)";
  if (score >= TIER_THRESHOLDS.tier3)
    return "Tier 3 (Distinguished Contemporary)";
  return "Tier 4 (Emerging & Community)";
}

export function computeCoverage(status: PillarStatusMap): number {
  let covered = 0;
  for (const key of PILLAR_KEYS) {
    if (status[key] === "recorded") covered += PILLAR_MAX[key];
    else if (status[key] === "partial") covered += PILLAR_MAX[key] / 2;
  }
  return Math.round(covered * 10) / 1000;
}

/** Sums pillar scores into a total, tier and coverage. */
export function combinePillars(
  pillars: Record<PillarKey, PillarResult>,
): ScoreBreakdown {
  const pillarStatus = Object.fromEntries(
    PILLAR_KEYS.map((key) => [key, pillars[key].status]),
  ) as PillarStatusMap;
  const totalScore = Math.min(
    100,
    round1(PILLAR_KEYS.reduce((sum, key) => sum + pillars[key].score, 0)),
  );
  return {
    accoladesScore: pillars.accolades.score,
    payScore: pillars.pay.score,
    turnaroundScore: pillars.turnaround.score,
    feesScore: pillars.fees.score,
    respectScore: pillars.respect.score,
    formatAndEthicsScore: pillars.formatEthics.score,
    totalScore,
    tier: assignMissaTier(totalScore),
    pillarStatus,
    coverage: computeCoverage(pillarStatus),
  };
}

export function scoreMagazine(
  input: MagazineScoringInput,
  genre: RankingGenre,
  rankingYear: number,
  baseline: AccoladeBaseline,
): ScoreBreakdown {
  return combinePillars({
    accolades: computeAccoladesScore(input, genre, rankingYear, baseline),
    pay: computePayScore(input.contributorPay),
    turnaround: computeTurnaroundScore(input),
    fees: computeFeesScore(input),
    respect: computeRespectScore(input),
    formatEthics: computeFormatAndEthicsScore(input),
  });
}

/** Score order: total, then accolades, then name, so ties rank the same way every run. */
export function compareScored(
  a: { totalScore: number; accoladesScore: number; name: string },
  b: { totalScore: number; accoladesScore: number; name: string },
): number {
  return (
    b.totalScore - a.totalScore ||
    b.accoladesScore - a.accoladesScore ||
    a.name.localeCompare(b.name)
  );
}

/**
 * Scores and ranks a roster for overall and each genre. A magazine enters a
 * genre index only if it publishes that genre.
 */
export function rankMagazines(
  magazines: MagazineScoringInput[],
  rankingYear: number,
): ComputedMagazineRankings[] {
  const baseline = computeAccoladeBaseline(magazines, rankingYear);
  const scored = magazines.map((mag) => {
    const genres: Partial<Record<ScoredGenre, ScoreBreakdown>> = {};
    for (const g of mag.genresPublished)
      genres[g] = scoreMagazine(mag, g, rankingYear, baseline);
    return {
      mag,
      overall: scoreMagazine(mag, "overall", rankingYear, baseline),
      genres,
    };
  });

  const ranksFor = (
    pick: (item: (typeof scored)[number]) => ScoreBreakdown | undefined,
  ) => {
    const ranks = new Map<string, number>();
    scored
      .filter((item) => pick(item) !== undefined)
      .sort((a, b) =>
        compareScored(
          { ...pick(a)!, name: a.mag.name },
          { ...pick(b)!, name: b.mag.name },
        ),
      )
      .forEach((item, index) => ranks.set(item.mag.profileId, index + 1));
    return ranks;
  };

  const overallRanks = ranksFor((item) => item.overall);
  const genreRanks = {
    fiction: ranksFor((item) => item.genres.fiction),
    poetry: ranksFor((item) => item.genres.poetry),
    nonfiction: ranksFor((item) => item.genres.nonfiction),
  };

  return scored
    .map((item) => {
      const id = item.mag.profileId;
      const genres: ComputedMagazineRankings["genres"] = {};
      for (const g of ["fiction", "poetry", "nonfiction"] as const) {
        const score = item.genres[g];
        if (score)
          genres[g] = { ...score, rankPosition: genreRanks[g].get(id) ?? 0 };
      }
      return {
        profileId: id,
        name: item.mag.name,
        rankingYear,
        overall: { ...item.overall, rankPosition: overallRanks.get(id) ?? 0 },
        genres,
      };
    })
    .sort((a, b) => a.overall.rankPosition - b.overall.rankPosition);
}

export type SubmissionStrategyPreset =
  "balanced" | "aggressive_moonshot" | "velocity_low_friction";

export interface StrategyCriteria {
  genre: RankingGenre;
  preset: SubmissionStrategyPreset;
  maxFeeCents?: number; // e.g. 0 for free only; only magazines with a recorded fee qualify
  requireSimultaneousSubmissions?: boolean; // only magazines that record allowing them
  maxTurnaroundDays?: number; // e.g. 90; unknown turnaround is not excluded
  payingOnly?: boolean; // only magazines that record paying contributors in cash
  limit?: number; // total targets (default 7)
}

export interface RecommendedMagazineTierSlot {
  role: "reach" | "target" | "safety";
  roleDescription: string;
  magazine: RankedMagazinePlanningCandidate;
}

export interface PortfolioStrategyPlan {
  preset: SubmissionStrategyPreset;
  genre: RankingGenre;
  /** Sum of recorded fees only. */
  totalEstimatedFeesCents: number;
  /** Slots whose fee is not recorded, so the total may be higher. */
  unrecordedFeeCount: number;
  /** Mean of recorded medians; null when no slot has a recorded median. */
  expectedTurnaroundDays: number | null;
  slots: RecommendedMagazineTierSlot[];
}

export interface RankedMagazinePlanningCandidate {
  profileId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  rankPosition: number;
  totalScore: number;
  prestigeTier: string;
  medianResponseDays: number | null;
  responseTimeBand?: ResponseTimeBand | null;
  regularFeeCents: number | null;
  chargesReadingFee?: boolean | null;
  contributorPayCents: number | null;
  payKind?: ContributorPayKind | null;
  simultaneousPolicy: SimultaneousPolicy | null;
  debutFriendly?: boolean | null;
  formatEthicsScore?: number;
  activeOpportunity?: {
    id: string;
    title: string;
    deadline: string | null;
    status: string;
    detailUrl: string | null;
    officialWebsite: string | null;
  } | null;
  schedule?: MagazineScheduleResult | null;
}

/**
 * Deterministic Portfolio Strategy Recommender:
 * Builds a multi-tier submission portfolio from a list of candidate magazines
 * based on the writer's goal (Balanced, Moonshot, or Low-Friction Velocity).
 */
export function buildSubmissionPortfolioPlan(
  candidates: RankedMagazinePlanningCandidate[],
  criteria: StrategyCriteria,
): PortfolioStrategyPlan {
  // 1. Filter candidates by writer requirements. A requirement is met only by
  // a recorded fact; an unknown fee or policy does not pass a hard filter.
  const filtered = candidates.filter((m) => {
    if (
      criteria.maxFeeCents !== undefined &&
      (m.regularFeeCents == null || m.regularFeeCents > criteria.maxFeeCents)
    ) {
      return false;
    }
    if (
      criteria.requireSimultaneousSubmissions &&
      m.simultaneousPolicy !== "allowed" &&
      m.simultaneousPolicy !== "conditional"
    ) {
      return false;
    }
    if (
      criteria.maxTurnaroundDays &&
      m.medianResponseDays != null &&
      m.medianResponseDays > criteria.maxTurnaroundDays
    ) {
      return false;
    }
    if (
      criteria.payingOnly &&
      !(m.payKind === "cash" || (m.contributorPayCents ?? 0) > 0)
    ) {
      return false;
    }
    return true;
  });

  // Sort candidates by total score descending
  const sorted = [...filtered].sort((a, b) => b.totalScore - a.totalScore);

  // Group into tiers
  const tier1 = sorted.filter((m) => m.totalScore >= TIER_THRESHOLDS.tier1);
  const tier2 = sorted.filter(
    (m) =>
      m.totalScore >= TIER_THRESHOLDS.tier2 &&
      m.totalScore < TIER_THRESHOLDS.tier1,
  );
  const tier3And4 = sorted.filter((m) => m.totalScore < TIER_THRESHOLDS.tier2);

  const slots: RecommendedMagazineTierSlot[] = [];

  // Determine slot composition
  const requestedLimit = Math.max(1, Math.min(criteria.limit ?? 7, 25));
  let reachCount = 2;
  let targetCount = 3;
  let safetyCount = 2;

  if (criteria.preset === "aggressive_moonshot") {
    reachCount = 4;
    targetCount = 2;
    safetyCount = 1;
  } else if (criteria.preset === "velocity_low_friction") {
    reachCount = 1;
    targetCount = 3;
    safetyCount = 3;
  }

  const defaultSlotCount = reachCount + targetCount + safetyCount;
  if (requestedLimit !== defaultSlotCount) {
    const scale = requestedLimit / defaultSlotCount;
    reachCount = Math.max(0, Math.round(reachCount * scale));
    targetCount = Math.max(0, Math.round(targetCount * scale));
    safetyCount = Math.max(0, Math.round(safetyCount * scale));

    while (reachCount + targetCount + safetyCount < requestedLimit) {
      if (targetCount <= reachCount && targetCount <= safetyCount) {
        targetCount++;
      } else if (safetyCount <= reachCount) {
        safetyCount++;
      } else {
        reachCount++;
      }
    }

    while (reachCount + targetCount + safetyCount > requestedLimit) {
      if (
        targetCount >= reachCount &&
        targetCount >= safetyCount &&
        targetCount > 0
      ) {
        targetCount--;
      } else if (safetyCount >= reachCount && safetyCount > 0) {
        safetyCount--;
      } else if (reachCount > 0) {
        reachCount--;
      } else {
        break;
      }
    }
  }

  const pickedIds = new Set<string>();
  const pickFromList = (
    list: typeof sorted,
    count: number,
    role: "reach" | "target" | "safety",
    desc: string,
  ) => {
    let added = 0;
    for (const item of list) {
      if (added >= count) break;
      if (!pickedIds.has(item.profileId)) {
        pickedIds.add(item.profileId);
        slots.push({
          role,
          roleDescription: desc,
          magazine: item,
        });
        added++;
      }
    }
    return added;
  };

  // Assign Reach (Tier 1, fallback to highest available)
  const reachAdded = pickFromList(
    tier1,
    reachCount,
    "reach",
    "Reach (High Prestige & Career Defining)",
  );
  if (reachAdded < reachCount) {
    pickFromList(
      tier2,
      reachCount - reachAdded,
      "reach",
      "Reach (Top Standing)",
    );
  }

  // Assign Target (Tier 2, fallback to Tier 3)
  const targetAdded = pickFromList(
    tier2,
    targetCount,
    "target",
    "Target (Distinguished & Competitive)",
  );
  if (targetAdded < targetCount) {
    pickFromList(
      tier3And4,
      targetCount - targetAdded,
      "target",
      "Target (Solid Editorial Footprint)",
    );
  }

  // Assign Safety / Fast Response (Tier 3/4)
  const safetyAdded = pickFromList(
    tier3And4,
    safetyCount,
    "safety",
    "Safety & Anchor (Prompt Response & Community Voice)",
  );
  if (safetyAdded < safetyCount) {
    pickFromList(
      sorted,
      safetyCount - safetyAdded,
      "safety",
      "Additional Target",
    );
  }

  const limitedSlots = slots.slice(0, requestedLimit);
  const totalEstimatedFeesCents = limitedSlots.reduce(
    (sum, s) => sum + (s.magazine.regularFeeCents ?? 0),
    0,
  );
  const unrecordedFeeCount = limitedSlots.filter(
    (s) => s.magazine.regularFeeCents == null,
  ).length;
  const turnaroundSlots = limitedSlots.filter(
    (s) => s.magazine.medianResponseDays != null,
  );
  const expectedTurnaroundDays =
    turnaroundSlots.length > 0
      ? Math.round(
          turnaroundSlots.reduce(
            (sum, s) => sum + (s.magazine.medianResponseDays ?? 0),
            0,
          ) / turnaroundSlots.length,
        )
      : null;

  return {
    preset: criteria.preset,
    genre: criteria.genre,
    totalEstimatedFeesCents,
    unrecordedFeeCount,
    expectedTurnaroundDays,
    slots: limitedSlots,
  };
}
