import { Pool } from "pg";
import { recognitionForPublication } from "../literary/index.js";
import {
  DECISION_MODEL_VERSION,
  TIER_THRESHOLDS,
  buildSubmissionPlan,
  compareCandidates,
  decideMagazine,
  formFromGenreLabel,
  type DecisionBrief,
  type Exclusion,
  type MagazineDecision,
  type MagazineFacts,
  type SubmissionPlan,
} from "./submissionDecision.js";

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
  /** The writer's country, for prizes with nationality rules. */
  writerCountry?: string;
  /**
   * The date reading periods are checked against (YYYY-MM-DD). Defaults to
   * today in UTC; pass it to reproduce a plan exactly.
   */
  asOf?: string;
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
  /** Rules, the four scores, tier and prize routes from the decision model. */
  decision: MagazineDecision;
}

export interface ExcludedMagazine {
  profileId: string;
  name: string;
  slug: string;
  exclusions: Exclusion[];
}

/** Which model produced a response, so a plan can be reproduced. */
export interface DecisionModelInfo {
  version: string;
  asOf: string;
  weights: "standard" | "debut";
  tierThresholds: typeof TIER_THRESHOLDS;
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
  /** The submission plan for this brief. */
  plan?: SubmissionPlan;
  /** Full cards for every magazine in the plan, in plan order. */
  planCards?: ManuscriptMatchCard[];
  /** Magazines whose recorded rules rule the piece out, with the reasons (at most 150). */
  excluded?: ExcludedMagazine[];
  excludedCount?: number;
  model?: DecisionModelInfo;
  /** Present only for a name search: every matching magazine, best fit first. */
  searchResults?: ManuscriptMatchCard[];
}

const EXCLUDED_LIST_LIMIT = 150;

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
          mr.blind_reading as rk_blind_reading,
          mr.contributor_pay_cents as rk_contributor_pay_cents,
          obs.reading_period as obs_reading_period,
          obs.genres_json as obs_genres,
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
        LEFT JOIN LATERAL (
          SELECT o.reading_period, o.genres_json
          FROM gary_profile_observations o
          WHERE o.profile_id = gp.id
          ORDER BY o.observed_at DESC NULLS LAST
          LIMIT 1
        ) obs ON TRUE
        LEFT JOIN publication_editorial_specs pes ON pes.profile_id = gp.id
        LEFT JOIN publication_compensation_details pcd ON pcd.profile_id = gp.id
        LEFT JOIN publication_telemetry_analytics pta ON pta.profile_id = gp.id
        LEFT JOIN publication_aesthetic_profiles pap ON pap.profile_id = gp.id
        WHERE (gp.profile_kind IN ('literary_magazine', 'small_press', 'organization', 'visual_arts_organization')
           OR mr.profile_id IS NOT NULL)
          AND ($1::text IS NULL OR gp.name ILIKE $1)
        ORDER BY mr.total_score DESC NULLS LAST, gp.id
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
    // Lanes hold only magazines whose recorded rules allow the piece now.
    const eligible = scoredCards.filter(
      (card) => card.decision.exclusions.length === 0,
    );

    const dreamReach = eligible
      .filter((c) => c.prestigeTier === "tier_1")
      .slice(0, 10);
    const debutChampions = eligible
      .filter((c) => c.aesthetic.isDebutChampion && c.prestigeTier !== "tier_1")
      .slice(0, 10);
    const rapidPro = eligible
      .filter(
        (c) =>
          c.compensation.isProRate ||
          (c.telemetry.medianResponseDays !== null &&
            c.telemetry.medianResponseDays <= 30) ||
          (c.telemetry.responseBand === "under_3_months" &&
            c.compensation.paysContributors === true),
      )
      .slice(0, 10);
    const simultaneousPackets = eligible
      .filter((c) => c.specs.allowsSimultaneous !== false)
      .slice(0, 15);
    const prizeTrack = eligible
      .filter(
        (c) =>
          c.recognition.pushcart !== null ||
          c.recognition.anthologySelections > 0 ||
          c.recognition.prizeSelections > 0,
      )
      .slice(0, 15);

    const plan = buildSubmissionPlan(
      scoredCards.map((card) => ({
        profileId: card.profileId,
        name: card.name,
        slug: card.slug,
        decision: card.decision,
        allowsSimultaneous: card.specs.allowsSimultaneous,
        medianResponseDays: card.telemetry.medianResponseDays,
        responseBand: card.telemetry.responseBand,
      })),
    );
    const byId = new Map(scoredCards.map((card) => [card.profileId, card]));
    const planCards = [
      ...plan.rounds.flatMap((round) => round.picks),
      ...plan.opensLater,
    ]
      .map((pick) => byId.get(pick.profileId))
      .filter((card): card is ManuscriptMatchCard => card !== undefined);
    // Magazines opening later are listed in the plan, not again as ruled out.
    const openingLater = new Set(plan.opensLater.map((pick) => pick.profileId));
    const excluded: ExcludedMagazine[] = scoredCards
      .filter(
        (card) =>
          card.decision.exclusions.length > 0 &&
          !openingLater.has(card.profileId),
      )
      .map((card) => ({
        profileId: card.profileId,
        name: card.name,
        slug: card.slug,
        exclusions: card.decision.exclusions,
      }))
      .sort((a, b) =>
        a.name.toLowerCase() < b.name.toLowerCase()
          ? -1
          : a.name.toLowerCase() > b.name.toLowerCase()
            ? 1
            : a.profileId < b.profileId
              ? -1
              : 1,
      );

    return {
      status: "available",
      totalAnalyzed: rows.length,
      matchedCount: eligible.length,
      dreamReach,
      debutChampions,
      rapidPro,
      simultaneousPackets,
      prizeTrack,
      plan,
      planCards,
      excluded: excluded.slice(0, EXCLUDED_LIST_LIMIT),
      excludedCount: excluded.length,
      model: decisionModelInfo(input),
    };
  }

  /**
   * Score every row against the brief with the decision model, in the
   * model's fixed order (see compareCandidates).
   */
  scoreRows(rows: any[], input: ManuscriptMatchInput): ManuscriptMatchCard[] {
    const genre = rankingGenre(input.genre);
    const brief = decisionBrief(input);
    const asOf = resolveAsOf(input.asOf);

    const cards = rows.map((row): ManuscriptMatchCard => {
      const maxWords = nullableNumber(row.max_word_count);
      const minWords = nullableNumber(row.min_word_count);
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

      const writingStyles: string[] = row.writing_styles ?? [];
      const authorComps: string[] = row.author_comps ?? [];
      const poetryForms: string[] = row.poetry_forms ?? [];
      const slushRatio = nullableNumber(row.unsolicited_slush_ratio_percent);
      const debutScore = nullableNumber(row.debut_author_friendly_score);
      const isDebutChampion =
        row.is_debut_champion === true || row.rk_debut_friendly === true;

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

      const medianResponseDays =
        nullableNumber(row.median_response_days) ??
        nullableNumber(row.rk_median_days);
      const responseBand: string | null =
        medianResponseDays === null ? (row.rk_response_band ?? null) : null;

      const pushcartRank = nullableNumber(row.pushcart_rank);
      const pushcart =
        pushcartRank !== null
          ? {
              rank: pushcartRank,
              genre: String(row.pushcart_genre ?? genre),
              edition: Number(row.pushcart_edition),
            }
          : null;
      const anthologyCount = nullableNumber(row.anthology_count) ?? 0;
      const anthologyRecent = parseAnthologyRecent(row.anthology_recent);
      const anthologyAuthors: string[] = row.anthology_authors ?? [];
      const prizePieces = recognitionForPublication(String(row.name ?? ""));
      const prestigeTier = indexTierKey(row.prestige_tier);

      const facts: MagazineFacts = {
        prestigeTier,
        acceptedForms: acceptedForms(row.obs_genres),
        readingPeriod:
          typeof row.obs_reading_period === "string"
            ? row.obs_reading_period
            : null,
        maxWords,
        minWords,
        allowsSimultaneous,
        blindReading: nullableBoolean(row.rk_blind_reading),
        chargesFee,
        submissionFeeCents: submissionFee,
        hasFeeWaivers,
        paysContributors,
        isProRate,
        payKind,
        contributorPayCents: nullableNumber(row.rk_contributor_pay_cents),
        medianResponseDays,
        responseBand,
        acceptanceRatePercent: nullableNumber(row.acceptance_rate_percent),
        slushRatioPercent: slushRatio,
        isDebutFriendly: isDebutChampion,
        writingStyles,
        poetryForms,
        authorComps,
        pushcart,
        anthologyCount,
        anthologyAuthors,
        prizePieces,
      };
      const decision = decideMagazine(facts, brief, asOf);

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
        .sort(
          (a, b) =>
            b.year - a.year ||
            (a.writer < b.writer ? -1 : a.writer > b.writer ? 1 : 0),
        )
        .slice(0, 4);

      let fitCategory: MatchCategory = "packet_builder";
      if (prestigeTier === "tier_1") {
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

      return {
        profileId: row.profile_id,
        name: row.name,
        slug: manuscriptMatchProfileSlug(row.name, row.slug ?? row.profile_id),
        websiteUrl: row.website_url,
        prestigeTier,
        matchScore: decision.composite,
        fitCategory,
        reasons: positiveReasons(decision),
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
          publishedComps: decision.publishedComps,
        },
        decision,
      };
    });

    return cards.sort(compareCandidates);
  }
}

/** Today's date in UTC, or the brief's date when it is a valid ISO date. */
function resolveAsOf(asOf: string | undefined): string {
  if (asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf)) return asOf;
  return new Date().toISOString().slice(0, 10);
}

export function decisionModelInfo(
  input: ManuscriptMatchInput,
): DecisionModelInfo {
  return {
    version: DECISION_MODEL_VERSION,
    asOf: resolveAsOf(input.asOf),
    weights: input.isDebutAuthor ? "debut" : "standard",
    tierThresholds: TIER_THRESHOLDS,
  };
}

function decisionBrief(input: ManuscriptMatchInput): DecisionBrief {
  return {
    form: input.genre,
    wordCount: input.wordCount ?? null,
    aestheticTags: input.aestheticTags ?? [],
    compAuthors: input.compAuthors ?? [],
    isDebutAuthor: input.isDebutAuthor === true,
    feeTolerance: input.feeTolerance ?? "any",
    minPayRate: input.minPayRate ?? "all",
    allowSimultaneous: input.allowSimultaneous === true,
    writerCountry: input.writerCountry?.trim() || null,
  };
}

/** Recorded genre labels as form keys; null when none are recorded. */
function acceptedForms(value: unknown): string[] | null {
  let labels: unknown = value;
  if (typeof value === "string") {
    try {
      labels = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(labels)) return null;
  const forms = [
    ...new Set(
      labels
        .filter((label): label is string => typeof label === "string")
        .map(formFromGenreLabel)
        .filter((form): form is string => form !== null),
    ),
  ];
  return forms.length > 0 ? forms : null;
}

/** Reasons that raised a score, fit first, for the short "why" list. */
function positiveReasons(decision: MagazineDecision): string[] {
  return (["fit", "payoff", "odds", "cost"] as const).flatMap((dimension) =>
    decision.scores[dimension].reasons
      .filter((reason) => reason.points > 0)
      .map((reason) => reason.text),
  );
}
