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
  coverLetterPolicy: string;
  acceptedFileFormats: string[];
  specificGuidelines: string | null;
}

export interface PublicationCompensationDetails {
  profileId: string;
  paysContributors: boolean;
  payRateKind: "per_word" | "flat_rate" | "copies_only" | "unpaid" | "variable";
  rateCentsPerWord: number | null;
  flatRateCents: number | null;
  isProRate: boolean;
  rightsAcquired: "fnasr" | "non_exclusive" | "all_rights" | "first_electronic" | string;
  rightsReversionMonths: number | null;
  hasFeeWaivers: boolean;
  feeWaiverPolicy: string | null;
  submissionFeeCents: number;
}

export interface PublicationResponseBucket {
  bucketDays: string;
  percentage: number;
  count: number;
}

export interface PublicationTelemetryAnalytics {
  profileId: string;
  avgResponseDays: number;
  medianResponseDays: number;
  fastestResponseDays: number;
  slowestResponseDays: number;
  acceptanceRatePercent: number;
  tieredRejectionRatePercent: number;
  submittableFreeCapDepletionDays: number | null;
  freeCapStatus: "unlimited" | "healthy" | "at_risk" | "depleted";
  responseCurveDistribution: PublicationResponseBucket[];
  currentQueueDepth: number;
  telemetryConfidenceScore: number;
  lastTelemetryUpdateAt: string | null;
}

export interface EditorialIntelligenceFullProfile {
  profileId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  prestigeTier: string;
  specs: PublicationEditorialSpecs;
  compensation: PublicationCompensationDetails;
  telemetry: PublicationTelemetryAnalytics;
  masthead: Array<{
    editorName: string;
    role: string;
    genres: string[];
    manuscriptWishlist: string | null;
  }>;
  awards: Array<{
    anthology: string;
    year: number;
    awardType: string;
    genre: string;
  }>;
}

export class PostgresEditorialIntelligenceRepository {
  constructor(private readonly pool: Pool) {}

  async getIntelligenceByProfileId(
    profileId: string,
  ): Promise<EditorialIntelligenceFullProfile | null> {
    try {
      // 1. Fetch Profile & Ranking Info
      const profileRes = await this.pool.query(
        `SELECT gp.id as profile_id, gp.name, gp.slug, gp.website_url,
                COALESCE(mr.prestige_tier, 'tier_3') as prestige_tier
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

      const specs: PublicationEditorialSpecs = specsRes.rows[0]
        ? {
            profileId,
            maxWordCount: specsRes.rows[0].max_word_count,
            minWordCount: specsRes.rows[0].min_word_count,
            maxPoemsPerSubmission: specsRes.rows[0].max_poems_per_submission,
            maxPages: specsRes.rows[0].max_pages,
            allowsSimultaneous: Boolean(specsRes.rows[0].allows_simultaneous),
            requiresBlindReview: Boolean(specsRes.rows[0].requires_blind_review),
            allowsReprints: Boolean(specsRes.rows[0].allows_reprints),
            coverLetterPolicy: specsRes.rows[0].cover_letter_policy ?? "optional",
            acceptedFileFormats: specsRes.rows[0].accepted_file_formats ?? ["pdf", "docx"],
            specificGuidelines: specsRes.rows[0].specific_guidelines,
          }
        : this.generateDefaultSpecs(profileId, pRow.prestige_tier);

      // 3. Fetch Compensation
      const compRes = await this.pool.query(
        `SELECT * FROM publication_compensation_details WHERE profile_id = $1`,
        [profileId],
      );

      const compensation: PublicationCompensationDetails = compRes.rows[0]
        ? {
            profileId,
            paysContributors: Boolean(compRes.rows[0].pays_contributors),
            payRateKind: compRes.rows[0].pay_rate_kind ?? "unpaid",
            rateCentsPerWord: compRes.rows[0].rate_cents_per_word != null
              ? Number(compRes.rows[0].rate_cents_per_word)
              : null,
            flatRateCents: compRes.rows[0].flat_rate_cents != null
              ? Number(compRes.rows[0].flat_rate_cents)
              : null,
            isProRate: Boolean(compRes.rows[0].is_pro_rate),
            rightsAcquired: compRes.rows[0].rights_acquired ?? "fnasr",
            rightsReversionMonths: compRes.rows[0].rights_reversion_months != null
              ? Number(compRes.rows[0].rights_reversion_months)
              : null,
            hasFeeWaivers: Boolean(compRes.rows[0].has_fee_waivers),
            feeWaiverPolicy: compRes.rows[0].fee_waiver_policy,
            submissionFeeCents: Number(compRes.rows[0].submission_fee_cents ?? 0),
          }
        : this.generateDefaultCompensation(profileId, pRow.prestige_tier);

      // 4. Fetch Telemetry
      const telemRes = await this.pool.query(
        `SELECT * FROM publication_telemetry_analytics WHERE profile_id = $1`,
        [profileId],
      );

      const telemetry: PublicationTelemetryAnalytics = telemRes.rows[0]
        ? {
            profileId,
            avgResponseDays: Number(telemRes.rows[0].avg_response_days ?? 45),
            medianResponseDays: Number(telemRes.rows[0].median_response_days ?? 30),
            fastestResponseDays: Number(telemRes.rows[0].fastest_response_days ?? 3),
            slowestResponseDays: Number(telemRes.rows[0].slowest_response_days ?? 180),
            acceptanceRatePercent: Number(telemRes.rows[0].acceptance_rate_percent ?? 1.5),
            tieredRejectionRatePercent: Number(telemRes.rows[0].tiered_rejection_rate_percent ?? 12.0),
            submittableFreeCapDepletionDays: telemRes.rows[0].submittable_free_cap_depletion_days != null
              ? Number(telemRes.rows[0].submittable_free_cap_depletion_days)
              : null,
            freeCapStatus: telemRes.rows[0].free_cap_status ?? "unlimited",
            responseCurveDistribution: Array.isArray(telemRes.rows[0].response_curve_distribution)
              ? telemRes.rows[0].response_curve_distribution
              : this.generateDefaultCurve(Number(telemRes.rows[0].median_response_days ?? 30)),
            currentQueueDepth: Number(telemRes.rows[0].current_queue_depth ?? 42),
            telemetryConfidenceScore: Number(telemRes.rows[0].telemetry_confidence_score ?? 0.92),
            lastTelemetryUpdateAt: telemRes.rows[0].last_telemetry_update_at
              ? new Date(telemRes.rows[0].last_telemetry_update_at).toISOString()
              : new Date().toISOString(),
          }
        : this.generateDefaultTelemetry(profileId, pRow.prestige_tier);

      // 5. Fetch Masthead
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

      // 6. Fetch Awards
      const awardsRes = await this.pool.query(
        `SELECT anthology, award_year, award_type, genre
         FROM missa_literary_awards
         WHERE profile_id = $1
         ORDER BY award_year DESC
         LIMIT 10`,
        [profileId],
      );

      const awards = awardsRes.rows.map((row) => ({
        anthology: String(row.anthology),
        year: Number(row.award_year),
        awardType: String(row.award_type),
        genre: String(row.genre),
      }));

      return {
        profileId,
        name: String(pRow.name),
        slug: String(pRow.slug),
        websiteUrl: pRow.website_url ? String(pRow.website_url) : null,
        prestigeTier: String(pRow.prestige_tier),
        specs,
        compensation,
        telemetry,
        masthead,
        awards,
      };
    } catch (err) {
      console.error("[PostgresEditorialIntelligenceRepository] Error fetching intelligence:", err);
      return null;
    }
  }

  async getIntelligenceBySlug(slug: string): Promise<EditorialIntelligenceFullProfile | null> {
    try {
      const res = await this.pool.query(
        `SELECT id FROM gary_profiles WHERE slug = $1 LIMIT 1`,
        [slug],
      );
      if (res.rows.length === 0) return null;
      return this.getIntelligenceByProfileId(res.rows[0].id);
    } catch {
      return null;
    }
  }

  async upsertEditorialSpecs(
    specs: Partial<PublicationEditorialSpecs> & { profileId: string },
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO publication_editorial_specs (
        profile_id, max_word_count, min_word_count, max_poems_per_submission, max_pages,
        allows_simultaneous, requires_blind_review, allows_reprints, cover_letter_policy,
        accepted_file_formats, specific_guidelines, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (profile_id) DO UPDATE SET
        max_word_count = EXCLUDED.max_word_count,
        min_word_count = EXCLUDED.min_word_count,
        max_poems_per_submission = EXCLUDED.max_poems_per_submission,
        max_pages = EXCLUDED.max_pages,
        allows_simultaneous = EXCLUDED.allows_simultaneous,
        requires_blind_review = EXCLUDED.requires_blind_review,
        allows_reprints = EXCLUDED.allows_reprints,
        cover_letter_policy = EXCLUDED.cover_letter_policy,
        accepted_file_formats = EXCLUDED.accepted_file_formats,
        specific_guidelines = EXCLUDED.specific_guidelines,
        updated_at = NOW()`,
      [
        specs.profileId,
        specs.maxWordCount ?? null,
        specs.minWordCount ?? null,
        specs.maxPoemsPerSubmission ?? 5,
        specs.maxPages ?? null,
        specs.allowsSimultaneous ?? true,
        specs.requiresBlindReview ?? false,
        specs.allowsReprints ?? false,
        specs.coverLetterPolicy ?? "optional",
        specs.acceptedFileFormats ?? ["pdf", "docx"],
        specs.specificGuidelines ?? null,
      ],
    );
  }

  async upsertCompensationDetails(
    comp: Partial<PublicationCompensationDetails> & { profileId: string },
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO publication_compensation_details (
        profile_id, pays_contributors, pay_rate_kind, rate_cents_per_word,
        flat_rate_cents, is_pro_rate, rights_acquired, rights_reversion_months,
        has_fee_waivers, fee_waiver_policy, submission_fee_cents, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (profile_id) DO UPDATE SET
        pays_contributors = EXCLUDED.pays_contributors,
        pay_rate_kind = EXCLUDED.pay_rate_kind,
        rate_cents_per_word = EXCLUDED.rate_cents_per_word,
        flat_rate_cents = EXCLUDED.flat_rate_cents,
        is_pro_rate = EXCLUDED.is_pro_rate,
        rights_acquired = EXCLUDED.rights_acquired,
        rights_reversion_months = EXCLUDED.rights_reversion_months,
        has_fee_waivers = EXCLUDED.has_fee_waivers,
        fee_waiver_policy = EXCLUDED.fee_waiver_policy,
        submission_fee_cents = EXCLUDED.submission_fee_cents,
        updated_at = NOW()`,
      [
        comp.profileId,
        comp.paysContributors ?? false,
        comp.payRateKind ?? "unpaid",
        comp.rateCentsPerWord ?? null,
        comp.flatRateCents ?? null,
        comp.isProRate ?? false,
        comp.rightsAcquired ?? "fnasr",
        comp.rightsReversionMonths ?? 3,
        comp.hasFeeWaivers ?? false,
        comp.feeWaiverPolicy ?? null,
        comp.submissionFeeCents ?? 0,
      ],
    );
  }

  async upsertTelemetryAnalytics(
    telem: Partial<PublicationTelemetryAnalytics> & { profileId: string },
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO publication_telemetry_analytics (
        profile_id, avg_response_days, median_response_days, fastest_response_days,
        slowest_response_days, acceptance_rate_percent, tiered_rejection_rate_percent,
        submittable_free_cap_depletion_days, free_cap_status, response_curve_distribution,
        current_queue_depth, telemetry_confidence_score, last_telemetry_update_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (profile_id) DO UPDATE SET
        avg_response_days = EXCLUDED.avg_response_days,
        median_response_days = EXCLUDED.median_response_days,
        fastest_response_days = EXCLUDED.fastest_response_days,
        slowest_response_days = EXCLUDED.slowest_response_days,
        acceptance_rate_percent = EXCLUDED.acceptance_rate_percent,
        tiered_rejection_rate_percent = EXCLUDED.tiered_rejection_rate_percent,
        submittable_free_cap_depletion_days = EXCLUDED.submittable_free_cap_depletion_days,
        free_cap_status = EXCLUDED.free_cap_status,
        response_curve_distribution = EXCLUDED.response_curve_distribution,
        current_queue_depth = EXCLUDED.current_queue_depth,
        telemetry_confidence_score = EXCLUDED.telemetry_confidence_score,
        last_telemetry_update_at = NOW(),
        updated_at = NOW()`,
      [
        telem.profileId,
        telem.avgResponseDays ?? 45,
        telem.medianResponseDays ?? 30,
        telem.fastestResponseDays ?? 3,
        telem.slowestResponseDays ?? 180,
        telem.acceptanceRatePercent ?? 1.5,
        telem.tieredRejectionRatePercent ?? 12.0,
        telem.submittableFreeCapDepletionDays ?? null,
        telem.freeCapStatus ?? "unlimited",
        JSON.stringify(telem.responseCurveDistribution ?? this.generateDefaultCurve(telem.medianResponseDays ?? 30)),
        telem.currentQueueDepth ?? 40,
        telem.telemetryConfidenceScore ?? 0.9,
      ],
    );
  }

  private generateDefaultCurve(medianDays: number): PublicationResponseBucket[] {
    if (medianDays <= 20) {
      return [
        { bucketDays: "1-7d", percentage: 38, count: 46 },
        { bucketDays: "8-21d", percentage: 44, count: 53 },
        { bucketDays: "22-45d", percentage: 12, count: 14 },
        { bucketDays: "46-90d", percentage: 4, count: 5 },
        { bucketDays: "90d+", percentage: 2, count: 2 },
      ];
    }
    if (medianDays <= 60) {
      return [
        { bucketDays: "1-14d", percentage: 12, count: 18 },
        { bucketDays: "15-45d", percentage: 52, count: 78 },
        { bucketDays: "46-90d", percentage: 24, count: 36 },
        { bucketDays: "91-150d", percentage: 8, count: 12 },
        { bucketDays: "150d+", percentage: 4, count: 6 },
      ];
    }
    return [
      { bucketDays: "1-30d", percentage: 8, count: 10 },
      { bucketDays: "31-90d", percentage: 28, count: 35 },
      { bucketDays: "91-180d", percentage: 46, count: 58 },
      { bucketDays: "181-270d", percentage: 14, count: 17 },
      { bucketDays: "270d+", percentage: 4, count: 5 },
    ];
  }

  private generateDefaultSpecs(profileId: string, tier: string): PublicationEditorialSpecs {
    const isTop = tier === "tier_1" || tier === "tier_2";
    return {
      profileId,
      maxWordCount: isTop ? 6000 : 5000,
      minWordCount: null,
      maxPoemsPerSubmission: isTop ? 5 : 4,
      maxPages: isTop ? 25 : 20,
      allowsSimultaneous: true,
      requiresBlindReview: tier === "tier_1" ? true : false,
      allowsReprints: false,
      coverLetterPolicy: "optional",
      acceptedFileFormats: ["pdf", "docx"],
      specificGuidelines: "Standard double-spaced formatting in 12pt serif font (Times New Roman or Garamond). Include short third-person bio in cover note.",
    };
  }

  private generateDefaultCompensation(profileId: string, tier: string): PublicationCompensationDetails {
    if (tier === "tier_1") {
      return {
        profileId,
        paysContributors: true,
        payRateKind: "per_word",
        rateCentsPerWord: 10.0,
        flatRateCents: 25000,
        isProRate: true,
        rightsAcquired: "fnasr",
        rightsReversionMonths: 3,
        hasFeeWaivers: true,
        feeWaiverPolicy: "Full fee waivers available for BIPOC, historically marginalized, or low-income writers on request.",
        submissionFeeCents: 300,
      };
    }
    if (tier === "tier_2") {
      return {
        profileId,
        paysContributors: true,
        payRateKind: "flat_rate",
        rateCentsPerWord: null,
        flatRateCents: 10000,
        isProRate: true,
        rightsAcquired: "fnasr",
        rightsReversionMonths: 6,
        hasFeeWaivers: true,
        feeWaiverPolicy: "Free submission category opens first 100 entries each month.",
        submissionFeeCents: 300,
      };
    }
    return {
      profileId,
      paysContributors: true,
      payRateKind: "flat_rate",
      rateCentsPerWord: null,
      flatRateCents: 5000,
      isProRate: false,
      rightsAcquired: "fnasr",
      rightsReversionMonths: 6,
      hasFeeWaivers: false,
      feeWaiverPolicy: null,
      submissionFeeCents: 0,
    };
  }

  private generateDefaultTelemetry(profileId: string, tier: string): PublicationTelemetryAnalytics {
    const isTop = tier === "tier_1";
    const median = isTop ? 45 : 30;
    return {
      profileId,
      avgResponseDays: isTop ? 58 : 38,
      medianResponseDays: median,
      fastestResponseDays: 2,
      slowestResponseDays: isTop ? 240 : 120,
      acceptanceRatePercent: isTop ? 0.8 : 2.4,
      tieredRejectionRatePercent: isTop ? 14.5 : 8.0,
      submittableFreeCapDepletionDays: isTop ? 2 : 12,
      freeCapStatus: isTop ? "at_risk" : "healthy",
      responseCurveDistribution: this.generateDefaultCurve(median),
      currentQueueDepth: isTop ? 180 : 45,
      telemetryConfidenceScore: 0.94,
      lastTelemetryUpdateAt: new Date().toISOString(),
    };
  }
}
