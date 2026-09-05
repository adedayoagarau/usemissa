export type RankingGenre = "fiction" | "poetry" | "nonfiction" | "overall";

export type MissaPrestigeTier =
  | "Tier 1 (Flagship Luminary)"
  | "Tier 2 (High Distinction)"
  | "Tier 3 (Distinguished Contemporary)"
  | "Tier 4 (Emerging & Community)";

export interface LiteraryAwardCitation {
  genre: "fiction" | "poetry" | "nonfiction" | "hybrid";
  anthology:
    | "Pushcart Prize"
    | "Best American Short Stories"
    | "Best American Essays"
    | "Best American Poetry"
    | "O. Henry Prize"
    | "Best of the Net"
    | "Best Small Fictions"
    | "Best Microfiction"
    | "Whiting / Major Grant";
  awardType: "win" | "special_mention" | "notable";
  year: number;
}

export interface MagazineScoringInput {
  profileId: string;
  name: string;
  genresPublished: Array<"fiction" | "poetry" | "nonfiction">;
  awards: LiteraryAwardCitation[];
  medianResponseDays: number | null;
  simultaneousSubmissions: "allowed" | "conditional" | "forbidden" | "unknown";
  queryAllowedAfterDays: number | null;
  regularSubmissionFeeCents: number; // 0 = free
  hasSubsidizedFeeCategory: boolean;
  contributorPay: {
    poetryPerPoemCents?: number | null;
    prosePerPieceCents?: number | null;
    prosePerWordCents?: number | null;
    copiesOnly?: boolean;
    unpaid?: boolean;
  };
  digitalPermanenceArchive: boolean;
  openAccessOnline: boolean;
  printArchivalLongevityYears: number | null;
  blindReadingProcess: boolean;
  debutFriendlyRoster: boolean;
}

export interface ScoreBreakdown {
  accoladesScore: number; // Max 40
  payScore: number; // Max 15
  turnaroundScore: number; // Max 15
  feesScore: number; // Max 15
  respectScore: number; // Max 10
  formatAndEthicsScore: number; // Max 5
  totalScore: number; // 0 - 100
  tier: MissaPrestigeTier;
}

export interface ComputedMagazineRankings {
  profileId: string;
  name: string;
  rankingYear: number;
  overall: ScoreBreakdown & { rankPosition: number };
  genres: Partial<Record<"fiction" | "poetry" | "nonfiction", ScoreBreakdown & { rankPosition: number }>>;
}

/**
 * Computes the accolade points for a specific genre (or all genres for composite)
 * using a 10-year rolling window and 5-year recency decay.
 */
export function computeAccoladesScore(
  awards: LiteraryAwardCitation[],
  targetGenre: RankingGenre,
  currentYear: number = 2026
): number {
  let rawPoints = 0;

  for (const award of awards) {
    const age = currentYear - award.year;
    if (age < 0 || age > 10) continue; // Outside 10-year window

    // Filter by genre unless evaluating overall
    if (targetGenre !== "overall") {
      if (award.genre !== targetGenre && award.genre !== "hybrid") {
        continue;
      }
    }

    const isRecent = age <= 5;
    const decayMultiplier = isRecent ? 1.0 : 0.5;

    let basePoints = 0;
    switch (award.anthology) {
      case "Pushcart Prize":
        basePoints = award.awardType === "win" ? 5.0 : 2.0;
        break;
      case "Best American Short Stories":
      case "Best American Essays":
      case "Best American Poetry":
        basePoints = award.awardType === "win" ? 5.0 : 1.5;
        break;
      case "O. Henry Prize":
        basePoints = 5.0;
        break;
      case "Best of the Net":
        basePoints = award.awardType === "win" ? 3.5 : 1.0;
        break;
      case "Best Small Fictions":
        basePoints = 2.5;
        break;
      case "Best Microfiction":
        basePoints = 2.0;
        break;
      case "Whiting / Major Grant":
        basePoints = 2.0;
        break;
      default:
        basePoints = 1.0;
    }

    rawPoints += basePoints * decayMultiplier;
  }

  // Max 40 points for accolades
  return Math.min(40, Math.round(rawPoints * 10) / 10);
}

/**
 * Contributor compensation scoring (Max 15 pts)
 */
export function computePayScore(pay: MagazineScoringInput["contributorPay"]): number {
  if (pay.unpaid) return 0;

  const poemCents = pay.poetryPerPoemCents ?? 0;
  const proseCents = pay.prosePerPieceCents ?? 0;
  const wordCents = pay.prosePerWordCents ?? 0;

  // Pro tier (>= $50/poem or >= $100/piece or >= 5 cents/word)
  if (poemCents >= 5000 || proseCents >= 10000 || wordCents >= 5) {
    return 15;
  }

  // Semi-pro ($25-$49 poem or $40-$99 piece)
  if (poemCents >= 2500 || proseCents >= 4000) {
    return 10;
  }

  // Token honorarium ($10-$24)
  if (poemCents >= 1000 || proseCents >= 1000) {
    return 5;
  }

  // Contributor copies
  if (pay.copiesOnly) {
    return 2;
  }

  return 0;
}

/**
 * Turnaround speed scoring (Max 15 pts)
 */
export function computeTurnaroundScore(medianDays: number | null): number {
  if (medianDays === null) return 7; // Neutral median fallback when unknown

  if (medianDays <= 30) return 15; // Lightning
  if (medianDays <= 60) return 12; // Swift
  if (medianDays <= 120) return 8; // Standard
  if (medianDays <= 180) return 4; // Slow
  if (medianDays <= 365) return 1; // Very extended
  return 0; // > 1 year
}

/**
 * Regular submission fees scoring (Max 15 pts)
 */
export function computeFeesScore(
  feeCents: number,
  hasSubsidizedFeeCategory: boolean
): number {
  if (feeCents === 0) return 15; // 100% Free all year

  if (hasSubsidizedFeeCategory) {
    return 11; // Free tier or waivers available
  }

  if (feeCents <= 350) return 7; // $1 - $3.50 platform cost pass-through
  if (feeCents <= 500) return 4; // $4 - $5 standard fee
  return 0; // > $5 fee for regular reading
}

/**
 * Editorial respect: simultaneous submissions & query policy (Max 10 pts)
 */
export function computeRespectScore(
  simultaneous: MagazineScoringInput["simultaneousSubmissions"],
  queryAllowedAfterDays: number | null
): number {
  let score = 0;

  // Simultaneous (Max 6 pts)
  if (simultaneous === "allowed") score += 6;
  else if (simultaneous === "conditional") score += 3;
  // forbidden = 0

  // Query transparency (Max 4 pts)
  if (queryAllowedAfterDays !== null && queryAllowedAfterDays <= 180) {
    score += 4;
  } else if (queryAllowedAfterDays !== null) {
    score += 2;
  } else {
    score += 1;
  }

  return score;
}

/**
 * Ethics, format longevity, and debut support (Max 5 pts)
 */
export function computeFormatAndEthicsScore(input: {
  digitalPermanenceArchive: boolean;
  openAccessOnline: boolean;
  printArchivalLongevityYears: number | null;
  blindReadingProcess: boolean;
  debutFriendlyRoster: boolean;
}): number {
  let score = 0;

  if (input.digitalPermanenceArchive || (input.printArchivalLongevityYears && input.printArchivalLongevityYears >= 10)) {
    score += 2;
  }
  if (input.blindReadingProcess) score += 1.5;
  if (input.debutFriendlyRoster) score += 1.5;

  return Math.min(5, Math.round(score * 10) / 10);
}

/**
 * Tier assigner based on final 0-100 score
 */
export function assignMissaTier(score: number): MissaPrestigeTier {
  if (score >= 75) return "Tier 1 (Flagship Luminary)";
  if (score >= 60) return "Tier 2 (High Distinction)";
  if (score >= 45) return "Tier 3 (Distinguished Contemporary)";
  return "Tier 4 (Emerging & Community)";
}

/**
 * Computes score breakdown for a given genre or overall
 */
export function scoreMagazine(
  input: MagazineScoringInput,
  genre: RankingGenre,
  currentYear: number = 2026
): ScoreBreakdown {
  const accoladesScore = computeAccoladesScore(input.awards, genre, currentYear);
  const payScore = computePayScore(input.contributorPay);
  const turnaroundScore = computeTurnaroundScore(input.medianResponseDays);
  const feesScore = computeFeesScore(input.regularSubmissionFeeCents, input.hasSubsidizedFeeCategory);
  const respectScore = computeRespectScore(input.simultaneousSubmissions, input.queryAllowedAfterDays);
  const formatAndEthicsScore = computeFormatAndEthicsScore({
    digitalPermanenceArchive: input.digitalPermanenceArchive,
    openAccessOnline: input.openAccessOnline,
    printArchivalLongevityYears: input.printArchivalLongevityYears,
    blindReadingProcess: input.blindReadingProcess,
    debutFriendlyRoster: input.debutFriendlyRoster,
  });

  const totalScore = Math.min(
    100,
    Math.round(
      (accoladesScore + payScore + turnaroundScore + feesScore + respectScore + formatAndEthicsScore) * 10
    ) / 10
  );

  return {
    accoladesScore,
    payScore,
    turnaroundScore,
    feesScore,
    respectScore,
    formatAndEthicsScore,
    totalScore,
    tier: assignMissaTier(totalScore),
  };
}

/**
 * Batch scores and ranks an entire roster of magazines across Overall and individual Genres
 */
export function rankMagazines(
  magazines: MagazineScoringInput[],
  currentYear: number = 2026
): ComputedMagazineRankings[] {
  const interim = magazines.map((mag) => {
    const overallScore = scoreMagazine(mag, "overall", currentYear);
    const genreScores: Partial<Record<"fiction" | "poetry" | "nonfiction", ScoreBreakdown>> = {};

    for (const g of mag.genresPublished) {
      genreScores[g] = scoreMagazine(mag, g, currentYear);
    }

    return {
      mag,
      overallScore,
      genreScores,
    };
  });

  // Rank overall
  interim.sort((a, b) => b.overallScore.totalScore - a.overallScore.totalScore);
  const overallRanks = new Map<string, number>();
  interim.forEach((item, index) => {
    overallRanks.set(item.mag.profileId, index + 1);
  });

  // Rank Fiction
  const fictionRoster = interim
    .filter((i) => i.genreScores.fiction !== undefined)
    .sort((a, b) => (b.genreScores.fiction?.totalScore ?? 0) - (a.genreScores.fiction?.totalScore ?? 0));
  const fictionRanks = new Map<string, number>();
  fictionRoster.forEach((item, index) => {
    fictionRanks.set(item.mag.profileId, index + 1);
  });

  // Rank Poetry
  const poetryRoster = interim
    .filter((i) => i.genreScores.poetry !== undefined)
    .sort((a, b) => (b.genreScores.poetry?.totalScore ?? 0) - (a.genreScores.poetry?.totalScore ?? 0));
  const poetryRanks = new Map<string, number>();
  poetryRoster.forEach((item, index) => {
    poetryRanks.set(item.mag.profileId, index + 1);
  });

  // Rank Nonfiction
  const nonfictionRoster = interim
    .filter((i) => i.genreScores.nonfiction !== undefined)
    .sort((a, b) => (b.genreScores.nonfiction?.totalScore ?? 0) - (a.genreScores.nonfiction?.totalScore ?? 0));
  const nonfictionRanks = new Map<string, number>();
  nonfictionRoster.forEach((item, index) => {
    nonfictionRanks.set(item.mag.profileId, index + 1);
  });

  return interim.map((item) => {
    const id = item.mag.profileId;
    const finalGenres: ComputedMagazineRankings["genres"] = {};

    if (item.genreScores.fiction) {
      finalGenres.fiction = {
        ...item.genreScores.fiction,
        rankPosition: fictionRanks.get(id) ?? 0,
      };
    }
    if (item.genreScores.poetry) {
      finalGenres.poetry = {
        ...item.genreScores.poetry,
        rankPosition: poetryRanks.get(id) ?? 0,
      };
    }
    if (item.genreScores.nonfiction) {
      finalGenres.nonfiction = {
        ...item.genreScores.nonfiction,
        rankPosition: nonfictionRanks.get(id) ?? 0,
      };
    }

    return {
      profileId: id,
      name: item.mag.name,
      rankingYear: currentYear,
      overall: {
        ...item.overallScore,
        rankPosition: overallRanks.get(id) ?? 0,
      },
      genres: finalGenres,
    };
  });
}

export type SubmissionStrategyPreset = "balanced" | "aggressive_moonshot" | "velocity_low_friction";

export interface StrategyCriteria {
  genre: RankingGenre;
  preset: SubmissionStrategyPreset;
  maxFeeCents?: number; // e.g. 0 for free only
  requireSimultaneousSubmissions?: boolean;
  maxTurnaroundDays?: number; // e.g. 90
  payingOnly?: boolean;
  limit?: number; // total targets (default 7)
}

export interface RecommendedMagazineTierSlot {
  role: "reach" | "target" | "safety";
  roleDescription: string;
  magazine: {
    profileId: string;
    name: string;
    slug: string;
    websiteUrl: string | null;
    rankPosition: number;
    totalScore: number;
    prestigeTier: string;
    medianResponseDays: number | null;
    regularFeeCents: number;
    contributorPayCents: number;
    simultaneousPolicy: string;
  };
}

export interface PortfolioStrategyPlan {
  preset: SubmissionStrategyPreset;
  genre: RankingGenre;
  totalEstimatedFeesCents: number;
  expectedTurnaroundDays: number;
  slots: RecommendedMagazineTierSlot[];
}

/**
 * Deterministic Portfolio Strategy Recommender:
 * Builds an optimal multi-tier submission portfolio from a list of candidate magazines
 * based on the writer's goal (Balanced, Moonshot, or Low-Friction Velocity).
 */
export function buildSubmissionPortfolioPlan(
  candidates: Array<{
    profileId: string;
    name: string;
    slug: string;
    websiteUrl: string | null;
    rankPosition: number;
    totalScore: number;
    prestigeTier: string;
    medianResponseDays: number | null;
    regularFeeCents: number;
    contributorPayCents: number;
    simultaneousPolicy: string;
  }>,
  criteria: StrategyCriteria
): PortfolioStrategyPlan {
  // 1. Filter candidates by writer requirements
  const filtered = candidates.filter((m) => {
    if (criteria.maxFeeCents !== undefined && m.regularFeeCents > criteria.maxFeeCents) {
      return false;
    }
    if (criteria.requireSimultaneousSubmissions && m.simultaneousPolicy === "forbidden") {
      return false;
    }
    if (criteria.maxTurnaroundDays && m.medianResponseDays && m.medianResponseDays > criteria.maxTurnaroundDays) {
      return false;
    }
    if (criteria.payingOnly && m.contributorPayCents === 0) {
      return false;
    }
    return true;
  });

  // Sort candidates by total score descending
  const sorted = [...filtered].sort((a, b) => b.totalScore - a.totalScore);

  // Group into tiers
  const tier1 = sorted.filter((m) => m.totalScore >= 75);
  const tier2 = sorted.filter((m) => m.totalScore >= 60 && m.totalScore < 75);
  const tier3And4 = sorted.filter((m) => m.totalScore < 60);

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
      if (targetCount >= reachCount && targetCount >= safetyCount && targetCount > 0) {
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

  // Pick Tier 1 / Reach
  const pickedIds = new Set<string>();
  const pickFromList = (list: typeof sorted, count: number, role: "reach" | "target" | "safety", desc: string) => {
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
  const reachAdded = pickFromList(tier1, reachCount, "reach", "Reach (High Prestige & Career Defining)");
  if (reachAdded < reachCount) {
    pickFromList(tier2, reachCount - reachAdded, "reach", "Reach (Top Standing)");
  }

  // Assign Target (Tier 2, fallback to Tier 3)
  const targetAdded = pickFromList(tier2, targetCount, "target", "Target (Distinguished & Competitive)");
  if (targetAdded < targetCount) {
    pickFromList(tier3And4, targetCount - targetAdded, "target", "Target (Solid Editorial Footprint)");
  }

  // Assign Safety / Fast Response (Tier 3/4)
  const safetyAdded = pickFromList(tier3And4, safetyCount, "safety", "Safety & Anchor (Prompt Response & Community Voice)");
  if (safetyAdded < safetyCount) {
    pickFromList(sorted, safetyCount - safetyAdded, "safety", "Additional Target");
  }

  const limitedSlots = slots.slice(0, requestedLimit);
  const totalEstimatedFeesCents = limitedSlots.reduce((sum, s) => sum + s.magazine.regularFeeCents, 0);
  const turnaroundSlots = limitedSlots.filter((s) => s.magazine.medianResponseDays != null);
  const expectedTurnaroundDays = turnaroundSlots.length > 0
    ? Math.round(turnaroundSlots.reduce((sum, s) => sum + (s.magazine.medianResponseDays || 0), 0) / turnaroundSlots.length)
    : 75;

  return {
    preset: criteria.preset,
    genre: criteria.genre,
    totalEstimatedFeesCents,
    expectedTurnaroundDays,
    slots: limitedSlots,
  };
}
