import { Pool } from "pg";

export interface PublicationEditorialSpecs {
  profileId: string;
  maxWordCount: number | null;
  minWordCount: number | null;
  maxPoemsPerSubmission: number | null;
  maxPages: number | null;
  allowsSimultaneous: boolean;
  requiresBlindReview: boolean;
  allowsReprints: boolean;
  coverLetterPolicy: string | null;
  acceptedFileFormats: string[];
  specificGuidelines: string | null;
}

export interface PublicationCompensationDetails {
  profileId: string;
  paysContributors: boolean;
  payRateKind: "per_word" | "flat_rate" | "copies_only" | "unpaid" | "variable" | null;
  rateCentsPerWord: number | null;
  flatRateCents: number | null;
  isProRate: boolean;
  rightsAcquired: "fnasr" | "non_exclusive" | "all_rights" | "first_electronic" | string | null;
  rightsReversionMonths: number | null;
  hasFeeWaivers: boolean;
  feeWaiverPolicy: string | null;
  submissionFeeCents: number | null;
}

export interface PublicationResponseBucket {
  bucketDays: string;
  percentage: number;
  count: number;
}

export interface PublicationTelemetryAnalytics {
  profileId: string;
  avgResponseDays: number | null;
  medianResponseDays: number | null;
  fastestResponseDays: number | null;
  slowestResponseDays: number | null;
  acceptanceRatePercent: number | null;
  tieredRejectionRatePercent: number | null;
  submittableFreeCapDepletionDays: number | null;
  freeCapStatus: "unlimited" | "healthy" | "at_risk" | "depleted" | null;
  responseCurveDistribution: PublicationResponseBucket[];
  currentQueueDepth: number | null;
  telemetryConfidenceScore: number | null;
  lastTelemetryUpdateAt: string | null;
}

export interface PublicationAestheticProfile {
  profileId: string;
  writingStyles: string[];
  poetryForms: string[];
  thematicInterests: string[];
  authorComps: string[];
  editorialMotto: string | null;
  unsolicitedSlushRatioPercent: number | null;
  debutAuthorFriendlyScore: number | null;
  isDebutChampion: boolean;
}

export interface OpportunityContestJudge {
  id: string;
  opportunityId: string | null;
  profileId: string | null;
  contestName: string;
  judgeName: string;
  judgeBio: string | null;
  judgeAestheticNotes: string | null;
  judgePraisedAuthors: string[];
  pastWinnersLineage: Array<{
    year: number;
    winnerName: string;
    winningPieceTitle: string;
    genre: string;
    resultingPressOrPrize?: string;
  }>;
}

export interface EditorialIntelligenceFullProfile {
  profileId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  /** Null when the publication has no stored ranking row. */
  prestigeTier: string | null;
  /** Each section is null when Missa holds no stored record for it. */
  specs: PublicationEditorialSpecs | null;
  compensation: PublicationCompensationDetails | null;
  telemetry: PublicationTelemetryAnalytics | null;
  aesthetic: PublicationAestheticProfile | null;
  judges: OpportunityContestJudge[];
  masthead: Array<{
    editorName: string;
    role: string;
    genres: string[];
    manuscriptWishlist: string | null;
  }>;
  /** Anthology selections, each with the source that names the magazine. */
  awards: Array<{
    anthology: string;
    year: number;
    awardType: string;
    genre: string;
    pieceTitle: string | null;
    authorName: string | null;
    sourceUrl: string;
  }>;
  /** Clifford Garstang's latest Pushcart ranking rows for this magazine. */
  pushcart: Array<{
    editionYear: number;
    genre: string;
    rank: number;
    score: number;
    sourceUrl: string;
  }>;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export class PostgresEditorialIntelligenceRepository {
  constructor(private readonly pool: Pool) {}

  async getIntelligenceByProfileId(
    profileId: string,
  ): Promise<EditorialIntelligenceFullProfile | null> {
    try {
      // 1. Fetch Profile & Ranking Info
      const profileRes = await this.pool.query(
        `SELECT gp.id as profile_id, gp.name, COALESCE(gp.name_key, gp.id) as slug, gp.website_url,
                mr.prestige_tier as prestige_tier
         FROM gary_profiles gp
         LEFT JOIN missa_magazine_rankings mr ON mr.profile_id = gp.id AND mr.ranking_year = 2026
         WHERE gp.id = $1
         LIMIT 1`,
        [profileId],
      );

      if (profileRes.rows.length === 0) {
        return null;
      }

      const pRow = profileRes.rows[0];


      // 2. Fetch Specs
      const specsRes = await this.pool.query(
        `SELECT * FROM publication_editorial_specs WHERE profile_id = $1`,
        [profileId],
      );

      const specs: PublicationEditorialSpecs | null = specsRes.rows[0]
        ? {
            profileId,
            maxWordCount: specsRes.rows[0].max_word_count,
            minWordCount: specsRes.rows[0].min_word_count,
            maxPoemsPerSubmission: specsRes.rows[0].max_poems_per_submission,
            maxPages: specsRes.rows[0].max_pages,
            allowsSimultaneous: Boolean(specsRes.rows[0].allows_simultaneous),
            requiresBlindReview: Boolean(specsRes.rows[0].requires_blind_review),
            allowsReprints: Boolean(specsRes.rows[0].allows_reprints),
            coverLetterPolicy: specsRes.rows[0].cover_letter_policy ?? null,
            acceptedFileFormats: specsRes.rows[0].accepted_file_formats ?? [],
            specificGuidelines: specsRes.rows[0].specific_guidelines,
          }
        : null;

      // 3. Fetch Compensation
      const compRes = await this.pool.query(
        `SELECT * FROM publication_compensation_details WHERE profile_id = $1`,
        [profileId],
      );

      const compensation: PublicationCompensationDetails | null = compRes.rows[0]
        ? {
            profileId,
            paysContributors: Boolean(compRes.rows[0].pays_contributors),
            payRateKind: compRes.rows[0].pay_rate_kind ?? null,
            rateCentsPerWord: compRes.rows[0].rate_cents_per_word != null
              ? Number(compRes.rows[0].rate_cents_per_word)
              : null,
            flatRateCents: compRes.rows[0].flat_rate_cents != null
              ? Number(compRes.rows[0].flat_rate_cents)
              : null,
            isProRate: Boolean(compRes.rows[0].is_pro_rate),
            rightsAcquired: compRes.rows[0].rights_acquired ?? null,
            rightsReversionMonths: compRes.rows[0].rights_reversion_months != null
              ? Number(compRes.rows[0].rights_reversion_months)
              : null,
            hasFeeWaivers: Boolean(compRes.rows[0].has_fee_waivers),
            feeWaiverPolicy: compRes.rows[0].fee_waiver_policy,
            submissionFeeCents: nullableNumber(compRes.rows[0].submission_fee_cents),
          }
        : null;

      // 4. Fetch Telemetry
      const telemRes = await this.pool.query(
        `SELECT * FROM publication_telemetry_analytics WHERE profile_id = $1`,
        [profileId],
      );

      const telemRow = telemRes.rows[0];
      const telemetry: PublicationTelemetryAnalytics | null = telemRow
        ? {
            profileId,
            avgResponseDays: nullableNumber(telemRow.avg_response_days),
            medianResponseDays: nullableNumber(telemRow.median_response_days),
            fastestResponseDays: nullableNumber(telemRow.fastest_response_days),
            slowestResponseDays: nullableNumber(telemRow.slowest_response_days),
            acceptanceRatePercent: nullableNumber(telemRow.acceptance_rate_percent),
            tieredRejectionRatePercent: nullableNumber(telemRow.tiered_rejection_rate_percent),
            submittableFreeCapDepletionDays: nullableNumber(telemRow.submittable_free_cap_depletion_days),
            freeCapStatus: telemRow.free_cap_status ?? null,
            responseCurveDistribution: Array.isArray(telemRow.response_curve_distribution)
              ? telemRow.response_curve_distribution
              : [],
            currentQueueDepth: nullableNumber(telemRow.current_queue_depth),
            telemetryConfidenceScore: nullableNumber(telemRow.telemetry_confidence_score),
            lastTelemetryUpdateAt: telemRow.last_telemetry_update_at
              ? new Date(telemRow.last_telemetry_update_at).toISOString()
              : null,
          }
        : null;

      // 5. Fetch Aesthetic Profile
      const aestheticRes = await this.pool.query(
        `SELECT * FROM publication_aesthetic_profiles WHERE profile_id = $1`,
        [profileId],
      );

      const aesthetic: PublicationAestheticProfile | null = aestheticRes.rows[0]
        ? {
            profileId,
            writingStyles: aestheticRes.rows[0].writing_styles ?? [],
            poetryForms: aestheticRes.rows[0].poetry_forms ?? [],
            thematicInterests: aestheticRes.rows[0].thematic_interests ?? [],
            authorComps: aestheticRes.rows[0].author_comps ?? [],
            editorialMotto: aestheticRes.rows[0].editorial_motto ?? null,
            unsolicitedSlushRatioPercent: nullableNumber(aestheticRes.rows[0].unsolicited_slush_ratio_percent),
            debutAuthorFriendlyScore: nullableNumber(aestheticRes.rows[0].debut_author_friendly_score),
            isDebutChampion: Boolean(aestheticRes.rows[0].is_debut_champion),
          }
        : null;

      // 6. Fetch Contest Judges
      const judgesRes = await this.pool.query(
        `SELECT * FROM opportunity_contest_judges WHERE profile_id = $1 ORDER BY updated_at DESC`,
        [profileId],
      );

      const judges: OpportunityContestJudge[] = judgesRes.rows.map((row) => ({
            id: String(row.id),
            opportunityId: row.opportunity_id ? String(row.opportunity_id) : null,
            profileId: row.profile_id ? String(row.profile_id) : null,
            contestName: String(row.contest_name),
            judgeName: String(row.judge_name),
            judgeBio: row.judge_bio ? String(row.judge_bio) : null,
            judgeAestheticNotes: row.judge_aesthetic_notes ? String(row.judge_aesthetic_notes) : null,
            judgePraisedAuthors: Array.isArray(row.judge_praised_authors) ? row.judge_praised_authors : [],
            pastWinnersLineage: Array.isArray(row.past_winners_lineage) ? row.past_winners_lineage : [],
          }));

      // 7. Fetch Masthead
      const mastheadRes = await this.pool.query(
        `SELECT editor_name, role, genres, manuscript_wishlist
         FROM magazine_editorial_masthead
         WHERE profile_id = $1
         ORDER BY id ASC`,
        [profileId],
      );

      const masthead = mastheadRes.rows.map((row) => ({
        editorName: String(row.editor_name),
        role: String(row.role ?? "Editor"),
        genres: Array.isArray(row.genres) ? row.genres : [],
        manuscriptWishlist: row.manuscript_wishlist ? String(row.manuscript_wishlist) : null,
      }));

      // 8. Fetch sourced anthology selections and Pushcart standing
      const [awardsRes, pushcartRes] = await Promise.all([
        this.pool.query(
          `SELECT anthology, award_year, award_type, genre, piece_title, author_name, source_url
           FROM missa_literary_awards
           WHERE profile_id = $1
           ORDER BY award_year DESC
           LIMIT 10`,
          [profileId],
        ),
        this.pool.query(
          `SELECT edition_year, genre, source_rank, source_score, source_url
           FROM missa_pushcart_rankings
           WHERE profile_id = $1
             AND edition_year = (SELECT MAX(edition_year) FROM missa_pushcart_rankings WHERE profile_id = $1)
           ORDER BY source_rank ASC`,
          [profileId],
        ),
      ]);

      const awards = awardsRes.rows.map((row) => ({
        anthology: String(row.anthology),
        year: Number(row.award_year),
        awardType: String(row.award_type),
        genre: String(row.genre),
        pieceTitle: row.piece_title ? String(row.piece_title) : null,
        authorName: row.author_name ? String(row.author_name) : null,
        sourceUrl: String(row.source_url),
      }));

      const pushcart = pushcartRes.rows.map((row) => ({
        editionYear: Number(row.edition_year),
        genre: String(row.genre),
        rank: Number(row.source_rank),
        score: Number(row.source_score),
        sourceUrl: String(row.source_url),
      }));

      if (
        !specs &&
        !compensation &&
        !telemetry &&
        !aesthetic &&
        judges.length === 0 &&
        masthead.length === 0 &&
        awards.length === 0 &&
        pushcart.length === 0
      ) {
        // A profile row alone is not editorial intelligence.
        return null;
      }

      return {
        profileId,
        name: String(pRow.name),
        slug: String(pRow.slug),
        websiteUrl: pRow.website_url ? String(pRow.website_url) : null,
        prestigeTier: pRow.prestige_tier ? String(pRow.prestige_tier) : null,
        specs,
        compensation,
        telemetry,
        aesthetic,
        judges,
        masthead,
        awards,
        pushcart,
      };
    } catch (err) {
      console.error("[PostgresEditorialIntelligenceRepository] Error fetching intelligence:", err);
      return null;
    }
  }

  async getIntelligenceBySlug(slug: string): Promise<EditorialIntelligenceFullProfile | null> {
    try {
      const res = await this.pool.query(
        `SELECT id FROM gary_profiles WHERE name_key = $1 OR id = $1 LIMIT 1`,
        [slug],
      );
      if (res.rows.length === 0) return null;
      return this.getIntelligenceByProfileId(res.rows[0].id);
    } catch {
      return null;
    }
  }
}
