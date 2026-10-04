import { Pool } from "pg";
import {
  normalizeWriterName,
  recognitionForPublication,
} from "../literary/index.js";

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
  "dream_reach" | "debut_champion" | "rapid_pro" | "packet_builder";

/** A prize-recognised piece this magazine published. */
export interface ManuscriptRecognitionPiece {
  /** The anthology or prize that picked it. */
  source: string;
  year: number;
  writer: string;
  work: string | null;
}

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
    /** null when no source records the policy. */
    allowsSimultaneous: boolean | null;
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
    /** A listed band such as "under_3_months" when no median is recorded. */
    responseBand: string | null;
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
  /** Prize and anthology record, all from cited sources. */
  recognition: {
    /** Pushcart Prize tally rank in the brief's genre, latest edition. */
    pushcart: { rank: number; genre: string; edition: number } | null;
    /** Best Microfiction and Best Small Fictions selections. */
    anthologySelections: number;
    /** O. Henry, Best American Short Stories and prize-winning stories. */
    prizeSelections: number;
    /** Newest recognised pieces, at most four. */
    recent: ManuscriptRecognitionPiece[];
    /** Writers from the brief this magazine has published prize-recognised work by. */
    publishedComps: string[];
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
  /** Magazines with a recorded prize or anthology record, best fit first. */
  prizeTrack: ManuscriptMatchCard[];
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
export function indexTierKey(
  value: unknown,
): ManuscriptMatchCard["prestigeTier"] {
  const label = typeof value === "string" ? value : "";
  if (label === "tier_1" || label === "tier_2" || label === "tier_3")
    return label;
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

function nullableBoolean(value: unknown): boolean | null {
  return value === null || value === undefined ? null : Boolean(value);
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
    prizeTrack: [],
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

/** The ranking and Pushcart genre that a manuscript form is judged in. */
export function rankingGenre(
  genre: ManuscriptMatchInput["genre"],
): "fiction" | "poetry" | "nonfiction" {
  if (genre === "poetry") return "poetry";
  if (genre === "nonfiction") return "nonfiction";
  return "fiction";
}

const BAND_LABELS: Record<string, string> = {
  under_3_months: "under 3 months",
  "3_to_6_months": "3 to 6 months",
  over_6_months: "over 6 months",
};

type AnthologyPiece = {
  anthology: string;
  award_year: number;
  author_name: string | null;
  piece_title: string | null;
};

function parseAnthologyRecent(value: unknown): AnthologyPiece[] {
  if (Array.isArray(value)) return value as AnthologyPiece[];
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as AnthologyPiece[]) : [];
    } catch {
      return [];
    }
  }
  return [];
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
      return {
        ...emptyManuscriptMatchResponse("available"),
        searchResults: [],
      };
    }

    try {
      // Facts come from two places: the detailed publication_* tables and the
      // cited facts the Missa index records (missa_magazine_rankings, with
      // fact_sources). Detailed values win; index facts fill the gaps.
      const sql = `
        SELECT
          gp.id as profile_id,
          gp.name,
          COALESCE(gp.name_key, gp.id) as slug,
          gp.website_url,
          COALESCE(mr.prestige_tier, 'unranked') as prestige_tier,
          COALESCE(mr.total_score, 0) as total_score,
          mr.pay_kind as rk_pay_kind,
          mr.regular_fee_cents as rk_fee_cents,
          mr.charges_reading_fee as rk_charges_fee,
          mr.simultaneous_policy as rk_simultaneous,
          mr.response_time_band as rk_response_band,
          mr.median_response_days as rk_median_days,
          mr.debut_friendly as rk_debut_friendly,
          aw.anthology_count,
          aw.anthology_authors,
          aw.anthology_recent,
          pc.source_rank as pushcart_rank,
          pc.edition_year as pushcart_edition,
          pc.genre as pushcart_genre,
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
        LEFT JOIN LATERAL (
          SELECT
            count(*)::int AS anthology_count,
            array_agg(DISTINCT a.author_name) FILTER (WHERE a.author_name IS NOT NULL) AS anthology_authors,
            (
              SELECT json_agg(recent)
              FROM (
                SELECT a2.anthology, a2.award_year, a2.author_name, a2.piece_title
                FROM missa_literary_awards a2
                WHERE a2.profile_id = gp.id
                ORDER BY a2.award_year DESC
                LIMIT 3
              ) recent
            ) AS anthology_recent
          FROM missa_literary_awards a
          WHERE a.profile_id = gp.id
        ) aw ON TRUE
        LEFT JOIN LATERAL (
          SELECT p.source_rank, p.edition_year, p.genre
          FROM missa_pushcart_rankings p
          WHERE p.profile_id = gp.id AND p.genre = $3
          ORDER BY p.edition_year DESC, p.source_rank
          LIMIT 1
        ) pc ON TRUE
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
        rankingGenre(input.genre),
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
          (c.telemetry.medianResponseDays !== null &&
            c.telemetry.medianResponseDays <= 30) ||
          (c.telemetry.responseBand === "under_3_months" &&
            c.compensation.paysContributors === true),
      )
      .slice(0, 10);
    const simultaneousPackets = scoredCards
      .filter((c) => c.specs.allowsSimultaneous !== false)
      .slice(0, 15);
    const prizeTrack = scoredCards
      .filter(
        (c) =>
          c.recognition.pushcart !== null ||
          c.recognition.anthologySelections > 0 ||
          c.recognition.prizeSelections > 0,
      )
      .slice(0, 15);

    return {
      status: "available",
      totalAnalyzed: rows.length,
      matchedCount: scoredCards.length,
      dreamReach,
      debutChampions,
      rapidPro,
      simultaneousPackets,
      prizeTrack,
    };
  }

  /**
   * Score every row against the brief, best fit first.
   *
   * The score starts at 50 and moves only on recorded facts: guidelines,
   * fees, pay, reply time, debut record, prize record and published writers.
   * A missing fact neither adds nor subtracts; every point added has a
   * matching reason the writer can read.
   */
  scoreRows(rows: any[], input: ManuscriptMatchInput): ManuscriptMatchCard[] {
    const scoredCards: ManuscriptMatchCard[] = [];
    const genre = rankingGenre(input.genre);

    const normAestheticTags = (input.aestheticTags ?? []).map((t) =>
      t.toLowerCase().trim(),
    );
    const compKeys = new Map(
      (input.compAuthors ?? []).map((name) => [
        normalizeWriterName(name),
        name,
      ]),
    );

    for (const row of rows) {
      let score = 50;
      const reasons: string[] = [];

      // Guidelines
      const maxWords = row.max_word_count ? Number(row.max_word_count) : null;
      const minWords = row.min_word_count ? Number(row.min_word_count) : null;
      const allowsSimultaneous: boolean | null =
        row.allows_simultaneous !== null &&
        row.allows_simultaneous !== undefined
          ? Boolean(row.allows_simultaneous)
          : row.rk_simultaneous === "allowed" ||
              row.rk_simultaneous === "conditional"
            ? true
            : row.rk_simultaneous === "forbidden"
              ? false
              : null;
      const requiresBlind = row.requires_blind_review ?? false;

      if (input.wordCount && maxWords) {
        if (input.wordCount <= maxWords) {
          score += 10;
          reasons.push(
            `Within word limit (${input.wordCount.toLocaleString()} / max ${maxWords.toLocaleString()} words)`,
          );
        } else {
          score -= 30;
        }
      }
      if (input.wordCount && minWords && input.wordCount < minWords) {
        score -= 20;
      }

      if (input.allowSimultaneous) {
        if (allowsSimultaneous === true) {
          score += 5;
          reasons.push("Accepts simultaneous submissions");
        } else if (allowsSimultaneous === false) {
          score -= 20;
        }
      }

      // Aesthetic profile (recorded comps and styles)
      const writingStyles: string[] = row.writing_styles ?? [];
      const authorComps: string[] = row.author_comps ?? [];
      const poetryForms: string[] = row.poetry_forms ?? [];

      let compOverlapCount = 0;
      for (const comp of compKeys.keys()) {
        if (authorComps.some((c) => normalizeWriterName(c) === comp)) {
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
        score += Math.min(12, compOverlapCount * 6);
        reasons.push("Lists a comparable writer you named");
      }
      if (styleOverlapCount > 0) {
        score += Math.min(10, styleOverlapCount * 4);
        reasons.push("Aesthetic style alignment");
      }

      // Debut friendliness
      const slushRatio = nullableNumber(row.unsolicited_slush_ratio_percent);
      const debutScore = nullableNumber(row.debut_author_friendly_score);
      const isDebutChampion =
        row.is_debut_champion === true || row.rk_debut_friendly === true;
      if (input.isDebutAuthor) {
        if (isDebutChampion) {
          score += 10;
          reasons.push("Publishes debut writers");
        } else if (slushRatio !== null && slushRatio >= 70) {
          score += 10;
          reasons.push(
            `${slushRatio}% of published work came from open submissions`,
          );
        }
      }

      // Fees
      const submissionFee =
        nullableNumber(row.submission_fee_cents) ??
        nullableNumber(row.rk_fee_cents) ??
        (row.rk_charges_fee === false ? 0 : null);
      const chargesFee =
        submissionFee !== null
          ? submissionFee > 0
          : row.rk_charges_fee === true
            ? true
            : null;
      const hasFeeWaivers = row.has_fee_waivers === true;
      if (chargesFee === false) {
        score += input.feeTolerance === "free_only" ? 6 : 2;
        reasons.push("Free to submit");
      } else if (chargesFee === true && input.feeTolerance === "free_only") {
        if (hasFeeWaivers) {
          score += 2;
          reasons.push("Fee waiver available");
        } else {
          score -= 15;
        }
      }

      // Pay
      const payKind: string | null =
        row.pay_rate_kind || row.rk_pay_kind || null;
      const paysContributors: boolean | null =
        nullableBoolean(row.pays_contributors) ??
        (row.rk_pay_kind === "cash"
          ? true
          : row.rk_pay_kind === "unpaid" || row.rk_pay_kind === "copies_only"
            ? false
            : null);
      const isProRate = row.is_pro_rate === true;
      if (input.minPayRate === "pro_rates_only") {
        if (isProRate) {
          score += 10;
          reasons.push("Pays professional rates");
        } else if (paysContributors === false) {
          score -= 15;
        }
      } else if (input.minPayRate === "any_paying") {
        if (paysContributors === true) {
          score += 8;
          reasons.push("Pays contributors");
        } else if (paysContributors === false) {
          score -= 15;
        }
      } else if (paysContributors === true) {
        score += 4;
        reasons.push("Pays contributors");
      }

      // Reply time
      const medianResponseDays =
        nullableNumber(row.median_response_days) ??
        nullableNumber(row.rk_median_days);
      const responseBand: string | null =
        medianResponseDays === null ? (row.rk_response_band ?? null) : null;
      if (medianResponseDays !== null) {
        if (medianResponseDays <= 60) {
          score += 4;
          reasons.push(`Replies in about ${medianResponseDays} days`);
        } else if (medianResponseDays > 180) {
          score -= 4;
        }
      } else if (responseBand === "under_3_months") {
        score += 3;
        reasons.push(`Usually replies in ${BAND_LABELS[responseBand]}`);
      } else if (responseBand === "over_6_months") {
        score -= 3;
      }

      // Prize record
      const pushcartRank = nullableNumber(row.pushcart_rank);
      const pushcart =
        pushcartRank !== null
          ? {
              rank: pushcartRank,
              genre: String(row.pushcart_genre ?? genre),
              edition: Number(row.pushcart_edition),
            }
          : null;
      if (pushcart) {
        score += pushcart.rank <= 25 ? 10 : pushcart.rank <= 75 ? 7 : 4;
        reasons.push(
          `Ranked #${pushcart.rank} for Pushcart Prizes in ${pushcart.genre} (${pushcart.edition})`,
        );
      }

      const anthologyCount = nullableNumber(row.anthology_count) ?? 0;
      const anthologyRecent = parseAnthologyRecent(row.anthology_recent);
      if (anthologyCount > 0) {
        // Microfiction anthologies matter most to flash, then other fiction.
        const weight =
          input.genre === "flash" ? 2 : genre === "fiction" ? 1 : 0.5;
        score += Math.min(10, anthologyCount * weight);
        reasons.push(
          `${anthologyCount} ${anthologyCount === 1 ? "piece" : "pieces"} chosen for Best Microfiction or Best Small Fictions`,
        );
      }

      const prizePieces = recognitionForPublication(String(row.name ?? ""));
      if (prizePieces.length > 0) {
        const weight = genre === "fiction" ? 2 : 1;
        score += Math.min(12, prizePieces.length * weight);
        reasons.push(
          `${prizePieces.length} ${prizePieces.length === 1 ? "story" : "stories"} chosen for the O. Henry Prize, Best American Short Stories or a major prize`,
        );
      }

      // Writers from the brief this magazine has published recognised work by
      const publishedComps = new Set<string>();
      const anthologyAuthors: string[] = row.anthology_authors ?? [];
      for (const author of anthologyAuthors) {
        const named = compKeys.get(normalizeWriterName(author));
        if (named) publishedComps.add(named);
      }
      for (const piece of prizePieces) {
        const named = compKeys.get(normalizeWriterName(piece.writer));
        if (named) publishedComps.add(named);
      }
      if (publishedComps.size > 0) {
        score += Math.min(20, publishedComps.size * 12);
        reasons.unshift(`Published ${[...publishedComps].join(", ")}`);
      }

      const recent: ManuscriptRecognitionPiece[] = [
        ...prizePieces.map((piece) => ({
          source: piece.source,
          year: piece.year,
          writer: piece.writer,
          work: piece.work,
        })),
        ...anthologyRecent
          .filter((piece) => piece.author_name)
          .map((piece) => ({
            source: piece.anthology,
            year: Number(piece.award_year),
            writer: String(piece.author_name),
            work: piece.piece_title,
          })),
      ]
        .sort((a, b) => b.year - a.year)
        .slice(0, 4);

      const normalizedScore = Math.max(5, Math.min(99, Math.round(score)));

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
          payRateKind: payKind,
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
          responseBand,
          acceptanceRatePercent: nullableNumber(row.acceptance_rate_percent),
          freeCapStatus: row.free_cap_status || null,
          submittableFreeCapDepletionDays:
            row.submittable_free_cap_depletion_days
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
        recognition: {
          pushcart,
          anthologySelections: anthologyCount,
          prizeSelections: prizePieces.length,
          recent,
          publishedComps: [...publishedComps],
        },
      });
    }

    scoredCards.sort((a, b) => b.matchScore - a.matchScore);
    return scoredCards;
  }
}
