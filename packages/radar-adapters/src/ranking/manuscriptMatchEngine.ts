import { Pool } from "pg";

export interface ManuscriptMatchInput {
  genre: "fiction" | "poetry" | "nonfiction" | "flash" | "hybrid";
  wordCount?: number;
  poemCount?: number;
  lineCount?: number;
  aestheticTags?: string[];
  compAuthors?: string[];
  isDebutAuthor?: boolean;
  feeTolerance?: "free_only" | "fee_ok_with_waivers" | "any";
  minPayRate?: "pro_rates_only" | "any_paying" | "all";
  allowSimultaneous?: boolean;
  limit?: number;
  /**
   * Name search across the whole index. When set, the response carries the
   * matching magazines in `searchResults`, scored against the same brief.
   */
  query?: string;
}

export type MatchCategory =
  | "dream_reach"
  | "debut_champion"
  | "rapid_pro"
  | "packet_builder";

export interface ManuscriptMatchCard {
  profileId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  prestigeTier: "tier_1" | "tier_2" | "tier_3" | "unranked";
  matchScore: number; // 0 to 100
  fitCategory: MatchCategory;
  reasons: string[];
  specs: {
    maxWordCount: number | null;
    minWordCount: number | null;
    allowsSimultaneous: boolean;
    requiresBlindReview: boolean;
  };
  /** Values are null when Missa holds no stored record for them. */
  compensation: {
    paysContributors: boolean | null;
    payRateKind: string | null;
    isProRate: boolean;
    rateCentsPerWord: number | null;
    flatRateCents: number | null;
    hasFeeWaivers: boolean;
    submissionFeeCents: number | null;
  };
  telemetry: {
    medianResponseDays: number | null;
    acceptanceRatePercent: number | null;
    freeCapStatus: string | null;
    submittableFreeCapDepletionDays: number | null;
  };
  aesthetic: {
    writingStyles: string[];
    poetryForms: string[];
    authorComps: string[];
    editorialMotto: string | null;
    unsolicitedSlushRatioPercent: number | null;
    debutAuthorFriendlyScore: number | null;
    isDebutChampion: boolean;
  };
}

/**
 * `available` means the publication index was read (it may still have no
 * matches). `unavailable` means the index could not be read; callers must show
 * that state rather than substitute sample publications.
 */
export type ManuscriptMatchStatus = "available" | "unavailable";

export interface ManuscriptMatchResponse {
  status: ManuscriptMatchStatus;
  totalAnalyzed: number;
  matchedCount: number;
  dreamReach: ManuscriptMatchCard[];
  debutChampions: ManuscriptMatchCard[];
  rapidPro: ManuscriptMatchCard[];
  simultaneousPackets: ManuscriptMatchCard[];
  /** Present only for a name search: every matching magazine, best fit first. */
  searchResults?: ManuscriptMatchCard[];
}

/** Searches shorter than this return no rows rather than the whole index. */
export const MANUSCRIPT_SEARCH_MIN_LENGTH = 2;
const MANUSCRIPT_SEARCH_LIMIT = 40;

/** Escape LIKE wildcards so a typed "%" or "_" matches literally. */
function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

/**
 * Stored tiers are the engine labels ("Tier 1 (Flagship Luminary)" …); the
 * match cards use short keys. Tier 4 has no card group, so it maps to tier_3.
 */
export function indexTierKey(value: unknown): ManuscriptMatchCard["prestigeTier"] {
  const label = typeof value === "string" ? value : "";
  if (label === "tier_1" || label === "tier_2" || label === "tier_3") return label;
  if (label.startsWith("Tier 1")) return "tier_1";
  if (label.startsWith("Tier 2")) return "tier_2";
  if (label.startsWith("Tier 3") || label.startsWith("Tier 4")) return "tier_3";
  return "unranked";
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function emptyManuscriptMatchResponse(
  status: ManuscriptMatchStatus,
): ManuscriptMatchResponse {
  return {
    status,
    totalAnalyzed: 0,
    matchedCount: 0,
    dreamReach: [],
    debutChampions: [],
    rapidPro: [],
    simultaneousPackets: [],
  };
}

/** Match the canonical, human-readable slug emitted by ProfileRepository. */
export function manuscriptMatchProfileSlug(
  name: unknown,
  fallback: unknown,
): string {
  const nameSlug = String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return nameSlug.length >= 3 ? nameSlug : String(fallback ?? "");
}

export class ManuscriptMatchEngine {
  constructor(private pool: Pool | null) {}

  async matchManuscript(
    input: ManuscriptMatchInput,
  ): Promise<ManuscriptMatchResponse> {
    const limit = input.limit ?? 50;
    const query = input.query?.trim() ?? "";
    const searching = query.length > 0;

    if (!this.pool) {
      return emptyManuscriptMatchResponse("unavailable");
    }
    if (searching && query.length < MANUSCRIPT_SEARCH_MIN_LENGTH) {
      return { ...emptyManuscriptMatchResponse("available"), searchResults: [] };
    }

    try {
      const sql = `
        SELECT
          gp.id as profile_id,
          gp.name,
          COALESCE(gp.name_key, gp.id) as slug,
          gp.website_url,
          COALESCE(mr.prestige_tier, 'unranked') as prestige_tier,
          COALESCE(mr.total_score, 0) as total_score,
          pes.max_word_count,
          pes.min_word_count,
          pes.max_poems_per_submission,
          pes.allows_simultaneous,
          pes.requires_blind_review,
          pes.accepted_file_formats,
          pcd.pays_contributors,
          pcd.pay_rate_kind,
          pcd.rate_cents_per_word,
          pcd.flat_rate_cents,
          pcd.is_pro_rate,
          pcd.has_fee_waivers,
          pcd.submission_fee_cents,
          pta.median_response_days,
          pta.acceptance_rate_percent,
          pta.free_cap_status,
          pta.submittable_free_cap_depletion_days,
          pap.writing_styles,
          pap.poetry_forms,
          pap.thematic_interests,
          pap.author_comps,
          pap.editorial_motto,
          pap.unsolicited_slush_ratio_percent,
          pap.debut_author_friendly_score,
          pap.is_debut_champion
        FROM gary_profiles gp
        LEFT JOIN LATERAL (
          SELECT ranking_rows.*
          FROM missa_magazine_rankings ranking_rows
          WHERE ranking_rows.profile_id = gp.id
            AND ranking_rows.ranking_year = (SELECT MAX(ranking_year) FROM missa_magazine_rankings)
          ORDER BY (ranking_rows.genre = 'overall') DESC, ranking_rows.total_score DESC
          LIMIT 1
        ) mr ON TRUE
        LEFT JOIN publication_editorial_specs pes ON pes.profile_id = gp.id
        LEFT JOIN publication_compensation_details pcd ON pcd.profile_id = gp.id
        LEFT JOIN publication_telemetry_analytics pta ON pta.profile_id = gp.id
        LEFT JOIN publication_aesthetic_profiles pap ON pap.profile_id = gp.id
        WHERE (gp.profile_kind IN ('literary_magazine', 'small_press', 'organization', 'visual_arts_organization')
           OR mr.profile_id IS NOT NULL)
          AND ($1::text IS NULL OR gp.name ILIKE $1)
        ORDER BY mr.total_score DESC NULLS LAST
        LIMIT $2;
      `;

      const { rows } = await this.pool.query(sql, [
        searching ? likePattern(query) : null,
        searching ? MANUSCRIPT_SEARCH_LIMIT : 500,
      ]);
      if (!rows || rows.length === 0) {
        return searching
          ? { ...emptyManuscriptMatchResponse("available"), searchResults: [] }
          : emptyManuscriptMatchResponse("available");
      }

      if (!searching) return this.scoreAndGroupRows(rows, input, limit);
      const searchResults = this.scoreRows(rows, input);
      return {
        ...emptyManuscriptMatchResponse("available"),
        totalAnalyzed: rows.length,
        matchedCount: searchResults.length,
        searchResults,
      };
    } catch (err) {
      console.warn("[ManuscriptMatchEngine] Postgres query failed:", err);
      return emptyManuscriptMatchResponse("unavailable");
    }
  }

  /** Score stored publication rows. Exposed for tests; no rows are invented. */
  scoreAndGroupRows(
    rows: any[],
    input: ManuscriptMatchInput,
    _limit: number,
  ): ManuscriptMatchResponse {
    const scoredCards = this.scoreRows(rows, input);

    const dreamReach = scoredCards
      .filter((c) => c.prestigeTier === "tier_1")
      .slice(0, 10);
    const debutChampions = scoredCards
      .filter((c) => c.aesthetic.isDebutChampion && c.prestigeTier !== "tier_1")
      .slice(0, 10);
    const rapidPro = scoredCards
      .filter(
        (c) =>
          c.compensation.isProRate ||
          (c.telemetry.medianResponseDays !== null && c.telemetry.medianResponseDays <= 30),
      )
      .slice(0, 10);
    const simultaneousPackets = scoredCards
      .filter((c) => c.specs.allowsSimultaneous)
      .slice(0, 15);

    return {
      status: "available",
      totalAnalyzed: rows.length,
      matchedCount: scoredCards.length,
      dreamReach,
      debutChampions,
      rapidPro,
      simultaneousPackets,
    };
  }

  /** Score every row against the brief, best fit first. */
  scoreRows(rows: any[], input: ManuscriptMatchInput): ManuscriptMatchCard[] {
    const scoredCards: ManuscriptMatchCard[] = [];

    const normAestheticTags = (input.aestheticTags ?? []).map((t) =>
      t.toLowerCase().trim(),
    );
    const normCompAuthors = (input.compAuthors ?? []).map((a) =>
      a.toLowerCase().trim(),
    );

    for (const row of rows) {
      let score = 0;
      const reasons: string[] = [];

      const maxWords = row.max_word_count ? Number(row.max_word_count) : null;
      const minWords = row.min_word_count ? Number(row.min_word_count) : null;
      const allowsSimultaneous = row.allows_simultaneous ?? true;
      const requiresBlind = row.requires_blind_review ?? false;

      // 1. Spec Compatibility (Max 25 pts)
      if (input.wordCount && maxWords) {
        if (input.wordCount <= maxWords) {
          score += 20;
          reasons.push(
            `Within word limit (${input.wordCount.toLocaleString()} / max ${maxWords.toLocaleString()} words)`,
          );
        } else {
          score -= 30; // Hard penalty for exceeding word count
        }
      } else {
        score += 15;
      }

      if (input.allowSimultaneous && !allowsSimultaneous) {
        score -= 20; // Does not permit simultaneous submissions
      } else if (allowsSimultaneous) {
        score += 5;
      }

      // 2. Aesthetic DNA & Comp Matching (Max 35 pts)
      const writingStyles: string[] = row.writing_styles ?? [];
      const authorComps: string[] = row.author_comps ?? [];
      const poetryForms: string[] = row.poetry_forms ?? [];

      let compOverlapCount = 0;
      for (const comp of normCompAuthors) {
        if (
          authorComps.some(
            (c) =>
              c.toLowerCase().includes(comp) || comp.includes(c.toLowerCase()),
          )
        ) {
          compOverlapCount++;
        }
      }

      let styleOverlapCount = 0;
      for (const style of normAestheticTags) {
        if (
          writingStyles.some((s) => s.toLowerCase().includes(style)) ||
          poetryForms.some((f) => f.toLowerCase().includes(style))
        ) {
          styleOverlapCount++;
        }
      }

      if (compOverlapCount > 0) {
        score += Math.min(20, compOverlapCount * 10);
        reasons.push(`Comp author alignment`);
      }

      if (styleOverlapCount > 0) {
        score += Math.min(15, styleOverlapCount * 5);
        reasons.push(`Aesthetic style alignment`);
      }

      if (compOverlapCount === 0 && styleOverlapCount === 0) {
        score += 10; // Baseline general editorial fit
      }

      // 3. Debut Friendliness & Slush Ratio (Max 20 pts)
      const slushRatio = nullableNumber(row.unsolicited_slush_ratio_percent);
      const debutScore = nullableNumber(row.debut_author_friendly_score);
      const isDebutChampion = row.is_debut_champion === true;

      if (input.isDebutAuthor) {
        if (isDebutChampion) {
          score += 20;
          reasons.push("Publishes debut writers");
        } else if (slushRatio !== null && slushRatio >= 70) {
          score += 20;
          reasons.push(`${slushRatio}% of published work came from open submissions`);
        } else {
          score += 8;
        }
      } else {
        score += 12;
      }

      // 4. Pay & Fee Preference (Max 20 pts)
      const paysContributors =
        row.pays_contributors === null || row.pays_contributors === undefined
          ? null
          : Boolean(row.pays_contributors);
      const isProRate = row.is_pro_rate === true;
      const submissionFee = nullableNumber(row.submission_fee_cents);
      const hasFeeWaivers = row.has_fee_waivers === true;
      const medianResponseDays = nullableNumber(row.median_response_days);

      if (input.feeTolerance === "free_only" && submissionFee !== null && submissionFee > 0) {
        if (!hasFeeWaivers) {
          score -= 25;
        } else {
          score += 5;
          reasons.push("Fee waiver available");
        }
      } else {
        score += 10;
      }

      if (input.minPayRate === "pro_rates_only") {
        if (isProRate) {
          score += 10;
          reasons.push("Pays professional rates");
        } else {
          score -= 15;
        }
      } else if (paysContributors === true) {
        score += 8;
      }

      const normalizedScore = Math.max(10, Math.min(99, Math.round(score)));

      // Determine fit category
      let fitCategory: MatchCategory = "packet_builder";
      if (indexTierKey(row.prestige_tier) === "tier_1") {
        fitCategory = "dream_reach";
      } else if (isDebutChampion && slushRatio !== null && slushRatio >= 75) {
        fitCategory = "debut_champion";
      } else if (
        isProRate &&
        medianResponseDays !== null &&
        medianResponseDays <= 35
      ) {
        fitCategory = "rapid_pro";
      }

      scoredCards.push({
        profileId: row.profile_id,
        name: row.name,
        slug: manuscriptMatchProfileSlug(row.name, row.slug ?? row.profile_id),
        websiteUrl: row.website_url,
        prestigeTier: indexTierKey(row.prestige_tier),
        matchScore: normalizedScore,
        fitCategory,
        reasons,
        specs: {
          maxWordCount: maxWords,
          minWordCount: minWords,
          allowsSimultaneous,
          requiresBlindReview: requiresBlind,
        },
        compensation: {
          paysContributors,
          payRateKind: row.pay_rate_kind || null,
          isProRate,
          rateCentsPerWord: row.rate_cents_per_word
            ? Number(row.rate_cents_per_word)
            : null,
          flatRateCents: row.flat_rate_cents
            ? Number(row.flat_rate_cents)
            : null,
          hasFeeWaivers,
          submissionFeeCents: submissionFee,
        },
        telemetry: {
          medianResponseDays,
          acceptanceRatePercent: nullableNumber(row.acceptance_rate_percent),
          freeCapStatus: row.free_cap_status || null,
          submittableFreeCapDepletionDays: row.submittable_free_cap_depletion_days
            ? Number(row.submittable_free_cap_depletion_days)
            : null,
        },
        aesthetic: {
          writingStyles,
          poetryForms,
          authorComps,
          editorialMotto: row.editorial_motto ?? null,
          unsolicitedSlushRatioPercent: slushRatio,
          debutAuthorFriendlyScore: debutScore,
          isDebutChampion,
        },
      });
    }

    scoredCards.sort((a, b) => b.matchScore - a.matchScore);
    return scoredCards;
  }
}
