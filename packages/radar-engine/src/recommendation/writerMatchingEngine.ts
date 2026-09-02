/**
 * Personalized Writer Matching & Recommendation Feed Engine
 *
 * Implements Missa's writer-opportunity matching heuristics, multi-factor scoring rubric (0-100),
 * category feed generators, and human-readable match explanations.
 */

import type { Opportunity } from "../domain/types.js";

export type WriterGenre =
  | "Poetry"
  | "Fiction"
  | "Creative Nonfiction"
  | "Essays"
  | "Translation"
  | "Flash Fiction"
  | "Art"
  | "Drama";

export type WriterFormat = "Print" | "Digital" | "Chapbook" | "Book" | "Audio";

export type WriterFeePreference = "free_only" | "low_fee_acceptable" | "any";

export interface WriterMatchingProfile {
  userId: string;
  primaryGenres: WriterGenre[];
  subgenres?: string[]; // e.g. ["Sci-Fi", "Speculative", "Lyric Essay", "Eco-Poetry"]
  preferredFormats?: WriterFormat[];
  feePreference: WriterFeePreference; // low_fee <= $5
  maxFeeCents?: number; // e.g. 300 ($3.00)
  simultaneousSubmissionNeeded?: boolean;
  savedOpportunityIds?: string[];
  submittedPublisherIds?: string[]; // Exclude or de-prioritize already submitted
  submittedOpportunityIds?: string[];
}

export type SubmissionStateType =
  | "closing_soon"
  | "currently_open"
  | "always_open"
  | "opening_soon"
  | "closed";

export type RecommendationTier =
  | "urgent_priority"
  | "standard_fit"
  | "active_window"
  | "upcoming_window"
  | "closed";

export interface SubmissionStateBadge {
  state: SubmissionStateType;
  label: string;
  badgeColor: "amber" | "green" | "blue" | "purple" | "gray" | "emerald" | "indigo";
  recommendationTier: RecommendationTier;
}

export interface CandidateOpportunityLike {
  id?: string;
  opportunityId?: string;
  title?: string;
  publisherName?: string;
  publisherKind?: string;
  organizationName?: string;
  organizationId?: string;
  websiteUrl?: string;
  submissionUrl?: string;
  guidelinesUrl?: string;
  sourceUrl?: string;
  status?: string;
  genres?: string[];
  formats?: string[];
  feeStatus?: "free" | "fee" | "no-fee" | "paid" | "unknown";
  feeCents?: number;
  openDate?: string;
  deadlineDate?: string;
  deadlineKind?: string;
  simultaneousAllowed?: boolean;
  fields?: {
    title?: string;
    organizationName?: string;
    organizationId?: string;
    type?: string;
    genres?: string[];
    taxonomyAssignments?: Array<{
      termId?: string;
      sourcePhrase?: string;
      normalizedPhrase?: string;
    }>;
    openDate?: string;
    deadline?: {
      kind?: string;
      date?: string;
      raw?: string;
    };
    fee?: {
      amountCents?: number;
      disclosed?: boolean;
      raw?: string;
      currency?: string;
    };
    formats?: string[];
    simultaneousAllowed?: boolean;
    submissionUrl?: string;
    guidelinesUrl?: string;
  };
}

export interface OpportunityMatchItem {
  opportunityId: string;
  title: string;
  publisherName: string;
  publisherKind: string;
  websiteUrl: string;
  submissionUrl?: string;
  genres: string[];
  formats?: string[];
  submissionState: SubmissionStateBadge;
  feeStatus: "free" | "fee" | "unknown";
  feeCents: number;
  matchScore: number;
  matchReasons: string[];
  eligible: boolean;
}

export interface OpportunityMatchResult {
  opportunityId: string;
  matchScore: number;
  scoreBreakdown: {
    genre: number;
    state: number;
    fee: number;
    format: number;
    novelty: number;
  };
  matchReasons: string[];
  submissionState: SubmissionStateBadge;
  feeStatus: "free" | "fee" | "unknown";
  feeCents: number;
  eligible: boolean;
  disqualificationReason?: string;
}

export type FeedCategory =
  | "urgent"
  | "fee_free"
  | "opening_soon"
  | "small_press_manuscripts"
  | "submit_today"
  | "all";

export interface FeedOptions {
  category?: FeedCategory | string;
  genre?: string;
  feeMode?: "free_only" | "all";
  state?: "active" | "closing_soon" | "opening_soon" | "closed" | string;
  limit?: number;
  cursor?: string;
  now?: Date | string;
}

export interface FeedResult {
  feed: OpportunityMatchItem[];
  totalMatches: number;
  nextCursor?: string | null;
}

export interface MatchOptions {
  now?: Date | string;
}

// ---------------------------------------------------------------------------
// Normalization Helpers
// ---------------------------------------------------------------------------

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[-_]/g, " ");
}

const GENRE_SYNONYMS: Record<string, string[]> = {
  poetry: ["poetry", "poem", "poet", "poems", "verse", "eco-poetry", "lyric poetry"],
  fiction: ["fiction", "short fiction", "short story", "stories", "prose fiction", "novel"],
  "creative nonfiction": [
    "creative nonfiction",
    "creative non fiction",
    "cnf",
    "nonfiction",
    "non fiction",
    "memoir",
    "personal narrative",
  ],
  essays: ["essays", "essay", "personal essay", "lyric essay", "critical essay"],
  translation: ["translation", "translations", "translated work", "translated poetry", "translated fiction"],
  "flash fiction": ["flash fiction", "flash", "microfiction", "micro fiction", "flash prose", "short short"],
  art: ["art", "visual art", "artwork", "illustration", "photography", "cover art"],
  drama: ["drama", "play", "plays", "playwriting", "screenplay", "script", "theatre", "theater"],
};

function matchesGenreFamily(target: string, query: string): boolean {
  const normTarget = normalizeText(target);
  const normQuery = normalizeText(query);

  if (normTarget === normQuery) return true;
  if (normTarget.includes(normQuery) || normQuery.includes(normTarget)) return true;

  for (const [canonical, synonyms] of Object.entries(GENRE_SYNONYMS)) {
    const isQuerySynonym = canonical === normQuery || synonyms.some((s) => normalizeText(s) === normQuery);
    const isTargetSynonym = canonical === normTarget || synonyms.some((s) => normalizeText(s) === normTarget);
    if (isQuerySynonym && isTargetSynonym) return true;
  }

  return false;
}

export function extractOpportunityDetails(opportunity: CandidateOpportunityLike | Opportunity) {
  const opp = opportunity as any;
  const id: string =
    opp.id ||
    opp.opportunityId ||
    "opp_unknown";

  const title: string =
    opp.fields?.title ||
    opp.title ||
    "Untitled Opportunity";

  const publisherName: string =
    opp.fields?.organizationName ||
    opp.organizationName ||
    opp.publisherName ||
    "Independent Publisher";

  const organizationId: string =
    opp.fields?.organizationId ||
    opp.organizationId ||
    "";

  const publisherKind: string =
    opp.fields?.type ||
    opp.publisherKind ||
    "literary_magazine";

  const websiteUrl: string =
    opp.fields?.guidelinesUrl ||
    opp.guidelinesUrl ||
    opp.websiteUrl ||
    opp.sourceUrl ||
    "";

  const submissionUrl: string =
    opp.fields?.submissionUrl ||
    opp.submissionUrl ||
    websiteUrl ||
    "";

  const genres: string[] =
    opp.fields?.genres && opp.fields.genres.length > 0
      ? (opp.fields.genres as string[])
      : opp.genres && opp.genres.length > 0
      ? (opp.genres as string[])
      : [];

  const taxonomyAssignments: Array<{ termId?: string; sourcePhrase?: string; normalizedPhrase?: string }> =
    opp.fields?.taxonomyAssignments ?? [];

  const formats: string[] =
    opp.fields?.formats ??
    opp.formats ??
    [];

  // Fee details
  let feeCents = 0;
  let feeStatus: "free" | "fee" | "unknown" = "unknown";

  if (opp.fields?.fee) {
    const feeInfo = opp.fields.fee;
    if (feeInfo.disclosed) {
      feeCents = feeInfo.amountCents ?? 0;
      feeStatus = feeCents === 0 ? "free" : "fee";
    } else {
      feeCents = feeInfo.amountCents ?? 0;
      feeStatus = feeCents === 0 ? "free" : "fee";
    }
  } else if (opp.feeCents !== undefined) {
    feeCents = opp.feeCents;
    feeStatus = feeCents === 0 ? "free" : "fee";
  } else if (opp.feeStatus !== undefined) {
    if (opp.feeStatus === "free" || opp.feeStatus === "no-fee") {
      feeStatus = "free";
      feeCents = 0;
    } else if (opp.feeStatus === "paid" || opp.feeStatus === "fee") {
      feeStatus = "fee";
      feeCents = opp.feeCents ?? 300;
    } else {
      feeStatus = "unknown";
      feeCents = 0;
    }
  } else {
    feeStatus = "free";
    feeCents = 0;
  }

  // Dates & status
  const status: string = opp.status ?? "open";
  const deadlineDate: string | undefined =
    opp.fields?.deadline?.date ||
    opp.deadlineDate ||
    undefined;
  const deadlineKind: string =
    opp.fields?.deadline?.kind ||
    opp.deadlineKind ||
    "exact";
  const openDate: string | undefined =
    opp.fields?.openDate ||
    opp.openDate ||
    undefined;

  const simultaneousAllowed: boolean =
    opp.fields?.simultaneousAllowed ??
    opp.simultaneousAllowed ??
    true;

  return {
    id,
    title,
    publisherName,
    organizationId,
    publisherKind,
    websiteUrl,
    submissionUrl,
    genres,
    taxonomyAssignments,
    formats,
    feeCents,
    feeStatus,
    status,
    deadlineDate,
    deadlineKind,
    openDate,
    simultaneousAllowed,
  };
}

// ---------------------------------------------------------------------------
// Submission State & Urgency Derivation
// ---------------------------------------------------------------------------

export function deriveSubmissionStateBadge(
  details: ReturnType<typeof extractOpportunityDetails>,
  now: Date
): { stateBadge: SubmissionStateBadge; urgencyScore: number; reason?: string } {
  const { status, deadlineDate, deadlineKind, openDate } = details;

  // Closed status or expired deadline
  if (status === "closed" || status === "archived") {
    return {
      stateBadge: {
        state: "closed",
        label: "Closed",
        badgeColor: "gray",
        recommendationTier: "closed",
      },
      urgencyScore: 0,
      reason: "Window is currently closed",
    };
  }

  // Calculate day differences
  let daysUntilDeadline: number | undefined;
  if (deadlineDate) {
    const deadlineTime = new Date(deadlineDate).getTime();
    const nowTime = now.getTime();
    daysUntilDeadline = Math.ceil((deadlineTime - nowTime) / (1000 * 60 * 60 * 24));
  }

  let daysUntilOpen: number | undefined;
  if (openDate) {
    const openTime = new Date(openDate).getTime();
    const nowTime = now.getTime();
    daysUntilOpen = Math.ceil((openTime - nowTime) / (1000 * 60 * 60 * 24));
  }

  // Expired deadline check
  if (daysUntilDeadline !== undefined && daysUntilDeadline < 0) {
    return {
      stateBadge: {
        state: "closed",
        label: "Closed",
        badgeColor: "gray",
        recommendationTier: "closed",
      },
      urgencyScore: 0,
      reason: "Submission deadline has passed",
    };
  }

  // 1. Closing Soon (1 - 14 days)
  if (
    status === "closing-soon" ||
    (daysUntilDeadline !== undefined && daysUntilDeadline >= 0 && daysUntilDeadline <= 14)
  ) {
    const days = daysUntilDeadline ?? 7;
    const label =
      days === 0
        ? "Closes today"
        : days === 1
        ? "Closes tomorrow"
        : `Closes in ${days} days`;

    return {
      stateBadge: {
        state: "closing_soon",
        label,
        badgeColor: "amber",
        recommendationTier: "urgent_priority",
      },
      urgencyScore: 30,
      reason: `Window closing soon (${days} days left)`,
    };
  }

  // 2. Currently Open with known deadline
  if (
    status === "open" ||
    status === "deadline-extended" ||
    (daysUntilDeadline !== undefined && daysUntilDeadline > 14)
  ) {
    if (deadlineKind !== "rolling" && deadlineKind !== "until-filled" && daysUntilDeadline !== undefined) {
      const label = `Open (${daysUntilDeadline} days left)`;
      return {
        stateBadge: {
          state: "currently_open",
          label,
          badgeColor: "green",
          recommendationTier: "standard_fit",
        },
        urgencyScore: 25,
        reason: "Currently open with known deadline",
      };
    }
  }

  // 3. Always Open / Rolling / Year-Round
  if (
    deadlineKind === "rolling" ||
    deadlineKind === "until-filled" ||
    (!deadlineDate && (status === "open" || status === "discovered"))
  ) {
    return {
      stateBadge: {
        state: "always_open",
        label: "Always open",
        badgeColor: "blue",
        recommendationTier: "active_window",
      },
      urgencyScore: 20,
      reason: "Year-round reading window",
    };
  }

  // 4. Opening Soon (Opens within 45 days)
  if (
    status === "opening-soon" ||
    (daysUntilOpen !== undefined && daysUntilOpen >= 0 && daysUntilOpen <= 45)
  ) {
    const days = daysUntilOpen ?? 30;
    const label = days === 1 ? "Opens tomorrow" : `Opens in ${days} days`;
    return {
      stateBadge: {
        state: "opening_soon",
        label,
        badgeColor: "purple",
        recommendationTier: "upcoming_window",
      },
      urgencyScore: 15,
      reason: `Reading window opens soon (${days} days)`,
    };
  }

  // Default currently open fallback
  return {
    stateBadge: {
      state: "currently_open",
      label: "Currently open",
      badgeColor: "green",
      recommendationTier: "standard_fit",
    },
    urgencyScore: 25,
    reason: "Currently open for submissions",
  };
}

// ---------------------------------------------------------------------------
// Single Opportunity Match Calculation (0 - 100 Rubric)
// ---------------------------------------------------------------------------

export function calculateOpportunityMatchScore(
  writerProfile: WriterMatchingProfile,
  opportunity: CandidateOpportunityLike | Opportunity,
  options?: MatchOptions
): OpportunityMatchResult {
  const now = options?.now ? new Date(options.now) : new Date();
  const details = extractOpportunityDetails(opportunity);
  const matchReasons: string[] = [];

  let isDisqualified = false;
  let disqualificationReason: string | undefined;

  // -------------------------------------------------------------------------
  // 1. Genre Compatibility (S_genre, Max: 40 pts)
  // -------------------------------------------------------------------------
  let genreScore = 0;
  const oppGenres: string[] = [
    ...details.genres,
    ...details.taxonomyAssignments.flatMap((t) => [t.sourcePhrase, t.normalizedPhrase].filter(Boolean) as string[]),
  ];

  let matchedPrimaryGenre: string | null = null;
  let isExactPrimaryMatch = false;
  let matchedSubgenre: string | null = null;

  for (const primary of writerProfile.primaryGenres) {
    const hasMatch = oppGenres.some((g) => matchesGenreFamily(g, primary));
    if (hasMatch) {
      matchedPrimaryGenre = primary;
      // Exact single genre focus or identical match
      if (
        oppGenres.length === 1 ||
        oppGenres.some((g) => normalizeText(g) === normalizeText(primary))
      ) {
        isExactPrimaryMatch = true;
      }
      break;
    }
  }

  // Check subgenres if not exact
  if (writerProfile.subgenres && writerProfile.subgenres.length > 0) {
    for (const sub of writerProfile.subgenres) {
      const hasSubMatch =
        oppGenres.some((g) => matchesGenreFamily(g, sub)) ||
        normalizeText(details.title).includes(normalizeText(sub));
      if (hasSubMatch) {
        matchedSubgenre = sub;
        break;
      }
    }
  }

  if (isExactPrimaryMatch && matchedPrimaryGenre) {
    genreScore = 40;
    matchReasons.push(`Matches your primary genre: ${matchedPrimaryGenre}`);
  } else if (matchedPrimaryGenre) {
    genreScore = 30;
    matchReasons.push(`Matches your primary genre: ${matchedPrimaryGenre}`);
  } else if (matchedSubgenre) {
    genreScore = 30;
    matchReasons.push(`Matches your subgenre: ${matchedSubgenre}`);
  } else {
    // No genre overlap: Disqualified (0 pts)
    genreScore = 0;
    isDisqualified = true;
    disqualificationReason = "No matching genre overlap";
  }

  // -------------------------------------------------------------------------
  // 2. Submission State Urgency (S_state, Max: 30 pts)
  // -------------------------------------------------------------------------
  const { stateBadge, urgencyScore, reason: stateReason } = deriveSubmissionStateBadge(details, now);
  const stateScore = urgencyScore;
  if (stateReason && stateBadge.state !== "closed") {
    matchReasons.push(stateReason);
  }

  // -------------------------------------------------------------------------
  // 3. Fee Alignment (S_fee, Max: 20 pts)
  // -------------------------------------------------------------------------
  let feeScore = 0;
  const isFree = details.feeStatus === "free" || details.feeCents === 0;

  if (writerProfile.feePreference === "free_only") {
    if (isFree) {
      feeScore = 20;
      matchReasons.push("Fee-free submission");
    } else {
      feeScore = 0;
      isDisqualified = true;
      disqualificationReason = "Reading fee required ($" + (details.feeCents / 100).toFixed(2) + "), but profile requires free only";
    }
  } else if (writerProfile.feePreference === "low_fee_acceptable") {
    const maxFee = writerProfile.maxFeeCents ?? 500;
    if (isFree) {
      feeScore = 20;
      matchReasons.push("Fee-free submission");
    } else if (details.feeCents <= maxFee) {
      feeScore = 15;
      matchReasons.push(`Low reading fee ($${(details.feeCents / 100).toFixed(2)})`);
    } else {
      feeScore = 5;
      matchReasons.push(`Paid submission ($${(details.feeCents / 100).toFixed(2)})`);
    }
  } else {
    // feePreference === 'any'
    feeScore = 15;
    if (isFree) {
      matchReasons.push("Fee-free submission");
    } else {
      matchReasons.push(`Reading fee: $${(details.feeCents / 100).toFixed(2)}`);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Format & Publisher Kind Alignment (S_format, Max: 10 pts)
  // -------------------------------------------------------------------------
  let formatScore = 0;
  if (!writerProfile.preferredFormats || writerProfile.preferredFormats.length === 0) {
    formatScore = 10;
  } else {
    let matchedFormat: string | null = null;
    for (const fmt of writerProfile.preferredFormats) {
      const matches =
        details.formats.some((f) => normalizeText(f) === normalizeText(fmt)) ||
        (fmt === "Print" && details.publisherKind.includes("print")) ||
        (fmt === "Digital" && (details.publisherKind.includes("digital") || details.publisherKind.includes("online") || details.publisherKind.includes("web"))) ||
        (fmt === "Chapbook" && (details.publisherKind.includes("chapbook") || normalizeText(details.title).includes("chapbook"))) ||
        (fmt === "Book" && (details.publisherKind.includes("press") || details.publisherKind.includes("book") || normalizeText(details.title).includes("book")));

      if (matches) {
        matchedFormat = fmt;
        break;
      }
    }

    if (matchedFormat) {
      formatScore = 10;
      matchReasons.push(`Matches preferred format: ${matchedFormat}`);
    } else {
      // General format default
      formatScore = 5;
    }
  }

  // -------------------------------------------------------------------------
  // 5. Novelty Penalty / Boost (S_novelty)
  // -------------------------------------------------------------------------
  let noveltyScore = 0;
  const isSubmittedOrg =
    details.organizationId &&
    writerProfile.submittedPublisherIds?.includes(details.organizationId);
  const isSubmittedOpp =
    writerProfile.submittedOpportunityIds?.includes(details.id) ||
    writerProfile.submittedPublisherIds?.includes(details.id);

  if (isSubmittedOrg || isSubmittedOpp) {
    noveltyScore = -50;
    matchReasons.push("Previously submitted");
  }

  if (writerProfile.savedOpportunityIds?.includes(details.id)) {
    noveltyScore += 10;
    matchReasons.push("Bookmarked in your library");
  }

  // Simultaneous submission check
  if (writerProfile.simultaneousSubmissionNeeded && details.simultaneousAllowed) {
    matchReasons.push("Simultaneous submissions allowed");
  }

  // -------------------------------------------------------------------------
  // Final Score Clamping (0 - 100)
  // -------------------------------------------------------------------------
  let finalScore = 0;
  if (!isDisqualified) {
    const rawScore = genreScore + stateScore + feeScore + formatScore + noveltyScore;
    finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  }

  return {
    opportunityId: details.id,
    matchScore: isDisqualified ? 0 : finalScore,
    scoreBreakdown: {
      genre: genreScore,
      state: stateScore,
      fee: feeScore,
      format: formatScore,
      novelty: noveltyScore,
    },
    matchReasons,
    submissionState: stateBadge,
    feeStatus: details.feeStatus,
    feeCents: details.feeCents,
    eligible: !isDisqualified && finalScore > 0,
    disqualificationReason,
  };
}

// ---------------------------------------------------------------------------
// Personalized Feed Generator
// ---------------------------------------------------------------------------

export async function generatePersonalizedFeed(
  pool: Array<CandidateOpportunityLike | Opportunity>,
  writerProfile: WriterMatchingProfile,
  options?: FeedOptions
): Promise<FeedResult> {
  const now = options?.now ? new Date(options.now) : new Date();
  const limit = options?.limit && options.limit > 0 ? options.limit : 20;

  // 1. Calculate matches for each candidate in the pool
  const scoredItems: OpportunityMatchItem[] = [];

  for (const candidate of pool) {
    const details = extractOpportunityDetails(candidate);
    const match = calculateOpportunityMatchScore(writerProfile, candidate, { now });

    if (!match.eligible && !options?.category?.includes("debug")) {
      continue;
    }

    // Category / Fee / State filtering
    if (options?.feeMode === "free_only" && match.feeStatus !== "free") {
      continue;
    }

    if (options?.genre && !oppMatchesSpecificGenre(details.genres, options.genre)) {
      continue;
    }

    if (options?.state) {
      if (options.state === "active") {
        if (
          match.submissionState.state !== "closing_soon" &&
          match.submissionState.state !== "currently_open" &&
          match.submissionState.state !== "always_open"
        ) {
          continue;
        }
      } else if (match.submissionState.state !== options.state) {
        continue;
      }
    }

    if (options?.category) {
      const cat = options.category;
      if (cat === "urgent" && match.submissionState.state !== "closing_soon") {
        continue;
      }
      if (cat === "fee_free" && match.feeStatus !== "free") {
        continue;
      }
      if (cat === "opening_soon" && match.submissionState.state !== "opening_soon") {
        continue;
      }
      if (cat === "submit_today") {
        if (
          match.submissionState.state !== "closing_soon" &&
          match.submissionState.state !== "currently_open" &&
          match.submissionState.state !== "always_open"
        ) {
          continue;
        }
      }
      if (cat === "small_press_manuscripts") {
        const isSmallPressOrManuscript =
          details.formats.some((f) => /chapbook|book|manuscript/i.test(f)) ||
          /small_press|press|book_publisher|chapbook/i.test(details.publisherKind) ||
          /chapbook|manuscript|book contest|full-length|collection/i.test(details.title);
        if (!isSmallPressOrManuscript) {
          continue;
        }
      }
    }

    scoredItems.push({
      opportunityId: details.id,
      title: details.title,
      publisherName: details.publisherName,
      publisherKind: details.publisherKind,
      websiteUrl: details.websiteUrl,
      submissionUrl: details.submissionUrl,
      genres: details.genres,
      formats: details.formats,
      submissionState: match.submissionState,
      feeStatus: match.feeStatus,
      feeCents: match.feeCents,
      matchScore: match.matchScore,
      matchReasons: match.matchReasons,
      eligible: match.eligible,
    });
  }

  // 2. Sort by matchScore descending, with urgency and deadline as tie-breaker
  scoredItems.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    // Urgent closing soon first
    if (a.submissionState.state === "closing_soon" && b.submissionState.state !== "closing_soon") {
      return -1;
    }
    if (b.submissionState.state === "closing_soon" && a.submissionState.state !== "closing_soon") {
      return 1;
    }
    return a.title.localeCompare(b.title);
  });

  // 3. Pagination cursor decoding & encoding
  let startIndex = 0;
  if (options?.cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(options.cursor, "base64").toString("utf8"));
      if (typeof decoded.offset === "number" && decoded.offset >= 0) {
        startIndex = decoded.offset;
      }
    } catch {
      // Invalid cursor defaults to 0
      startIndex = 0;
    }
  }

  const paginatedFeed = scoredItems.slice(startIndex, startIndex + limit);
  const nextOffset = startIndex + limit;
  const nextCursor =
    nextOffset < scoredItems.length
      ? Buffer.from(JSON.stringify({ offset: nextOffset })).toString("base64")
      : null;

  return {
    feed: paginatedFeed,
    totalMatches: scoredItems.length,
    nextCursor,
  };
}

function oppMatchesSpecificGenre(genres: string[], targetGenre: string): boolean {
  return genres.some((g) => matchesGenreFamily(g, targetGenre));
}
