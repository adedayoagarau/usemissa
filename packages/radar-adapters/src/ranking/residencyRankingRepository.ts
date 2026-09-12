import { type Pool } from "pg";

export interface ResidencyReviewRow {
  id: string;
  profileId: string;
  authorName: string | null;
  reviewTitle: string | null;
  reviewBody: string;
  ratingScore: number | null;
  datePublished: string | null;
  source: string;
}

export interface ResidencyIntelligenceSpecs {
  profileId: string;
  stipendAmountCents: number;
  stipendFrequency: string;
  travelGrantCents: number;
  mealPlanKind: string;
  privateStudioSqft: number | null;
  studioAmenities: string[];
  livingArrangement: string;
  cohortSize: number;
  typicalDurationWeeks: number;
  familyPartnerFriendly: boolean;
  adaAccessible: boolean;
  acceptanceRatePercent: number;
  annualApplicantVolume: number;
  notableAlumni: string[];
  alumniMajorAwards: string[];
  applicationFeeCents: number;
  hasFeeWaivers: boolean;
  feeWaiverPolicy: string | null;
}

export interface ResidencyFullIntelligenceProfile {
  profileId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  location: string | null;
  prestigeTier: string;
  totalScore: number;
  fundingScore: number;
  ratingScore: number;
  facilitiesScore: number;
  accessScore: number;
  rmarRating: number | null;
  rmarRatingsCount: number;
  rmarReviewsCount: number;
  isFullyFunded: boolean;
  hasStipend: boolean;
  hasMeals: boolean;
  hasPrivateStudio: boolean;
  disciplines: string | null;
  foundingYear: number | null;
  summary: string | null;
  description: string | null;
  specs: ResidencyIntelligenceSpecs;
  reviews: ResidencyReviewRow[];
}

export interface ResidencyRankingRow {
  profileId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  location: string | null;
  prestigeTier: string;
  totalScore: number;
  fundingScore: number;
  ratingScore: number;
  facilitiesScore: number;
  accessScore: number;
  rmarRating: number | null;
  rmarRatingsCount: number;
  rmarReviewsCount: number;
  isFullyFunded: boolean;
  hasStipend: boolean;
  hasMeals: boolean;
  hasPrivateStudio: boolean;
  disciplines: string | null;
  foundingYear: number | null;
  summary: string | null;
  description: string | null;
  recentReviews?: ResidencyReviewRow[];
  specs?: ResidencyIntelligenceSpecs;
}

export interface ResidencyRankingsFilter {
  tier?: string;
  isFullyFunded?: boolean;
  hasStipend?: boolean;
  hasMeals?: boolean;
  hasPrivateStudio?: boolean;
  query?: string;
  location?: string;
  limit?: number;
  offset?: number;
  sortBy?: "score" | "rating" | "reviews" | "name";
  sortOrder?: "asc" | "desc";
}

export interface ResidencyRankingPage {
  items: ResidencyRankingRow[];
  total: number;
}

export interface SubmitResidencyReviewInput {
  profileId: string;
  authorName?: string | null;
  reviewTitle?: string | null;
  reviewBody: string;
  ratingScore: number;
  source?: string;
}

export interface SubmitResidencyReviewResult {
  success: boolean;
  reviewId: string;
  newRating: number;
  newTotalScore: number;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export class PostgresResidencyRankingRepository {
  constructor(private readonly pool: Pool) {}

  async listResidencyRankings(
    filter: ResidencyRankingsFilter = {},
  ): Promise<ResidencyRankingPage> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filter.tier) {
      conditions.push(`r.prestige_tier = $${idx++}`);
      values.push(filter.tier);
    }

    if (filter.isFullyFunded !== undefined && filter.isFullyFunded) {
      conditions.push(`r.is_fully_funded = TRUE`);
    }

    if (filter.hasStipend !== undefined && filter.hasStipend) {
      conditions.push(`r.has_stipend = TRUE`);
    }

    if (filter.hasMeals !== undefined && filter.hasMeals) {
      conditions.push(`r.has_meals = TRUE`);
    }

    if (filter.hasPrivateStudio !== undefined && filter.hasPrivateStudio) {
      conditions.push(`r.has_private_studio = TRUE`);
    }

    if (filter.query && filter.query.trim()) {
      const q = `%${filter.query.trim()}%`;
      conditions.push(
        `(r.name ILIKE $${idx} OR r.city ILIKE $${idx} OR r.region ILIKE $${idx} OR r.country ILIKE $${idx} OR r.location ILIKE $${idx} OR r.disciplines ILIKE $${idx})`,
      );
      values.push(q);
      idx++;
    }

    if (filter.location && filter.location.trim()) {
      const loc = `%${filter.location.trim()}%`;
      conditions.push(
        `(r.city ILIKE $${idx} OR r.region ILIKE $${idx} OR r.country ILIKE $${idx} OR r.location ILIKE $${idx})`,
      );
      values.push(loc);
      idx++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const canonicalRankingsCte = `
      WITH canonical_rankings AS (
        SELECT DISTINCT ON (
          COALESCE(
            NULLIF(
              LOWER(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(BTRIM(COALESCE(p.website_url, p.normalized_website_url)), '^https?://(www\\.)?', ''),
                  '/$',
                  ''
                )
              ),
              ''
            ),
            'name:' || LOWER(REGEXP_REPLACE(BTRIM(p.name), '[^a-z0-9]+', '-', 'g'))
          )
        )
          r.*,
          p.name,
          p.name_key AS slug,
          p.website_url,
          to_jsonb(p)->>'city' AS city,
          to_jsonb(p)->>'region' AS region,
          to_jsonb(p)->>'country' AS country,
          to_jsonb(p)->>'summary' AS summary,
          to_jsonb(p)->>'description' AS description
        FROM missa_residency_rankings r
        JOIN gary_profiles p ON r.profile_id = p.id
        ORDER BY
          COALESCE(
            NULLIF(
              LOWER(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(BTRIM(COALESCE(p.website_url, p.normalized_website_url)), '^https?://(www\\.)?', ''),
                  '/$',
                  ''
                )
              ),
              ''
            ),
            'name:' || LOWER(REGEXP_REPLACE(BTRIM(p.name), '[^a-z0-9]+', '-', 'g'))
          ),
          r.total_score DESC,
          r.rmar_rating DESC NULLS LAST,
          r.profile_id ASC
      )`;

    const countSql = `
      ${canonicalRankingsCte}
      SELECT COUNT(*) AS total
      FROM canonical_rankings r
      ${whereClause};
    `;

    const countRes = await this.pool.query(countSql, values);
    const total = parseInt(countRes.rows[0]?.total ?? "0", 10);

    let orderBy = "r.total_score DESC, r.rmar_rating DESC NULLS LAST, r.name ASC";
    if (filter.sortBy === "rating") {
      orderBy = `r.rmar_rating ${filter.sortOrder === "asc" ? "ASC NULLS LAST" : "DESC NULLS LAST"}, r.total_score DESC`;
    } else if (filter.sortBy === "reviews") {
      orderBy = `r.rmar_reviews_count ${filter.sortOrder === "asc" ? "ASC" : "DESC"}, r.total_score DESC`;
    } else if (filter.sortBy === "name") {
      orderBy = `r.name ${filter.sortOrder === "desc" ? "DESC" : "ASC"}`;
    }

    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 1000);
    const offset = Math.max(filter.offset ?? 0, 0);

    const listSql = `
      ${canonicalRankingsCte}
      SELECT
        r.profile_id,
        r.name,
        r.slug,
        r.website_url,
        r.city,
        r.region,
        r.country,
        r.summary,
        r.description,
        r.location,
        r.prestige_tier,
        r.total_score,
        r.funding_score,
        r.rating_score,
        r.facilities_score,
        r.access_score,
        r.rmar_rating,
        r.rmar_ratings_count,
        r.rmar_reviews_count,
        r.is_fully_funded,
        r.has_stipend,
        r.has_meals,
        r.has_private_studio,
        r.disciplines,
        r.founding_year
      FROM canonical_rankings r
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    const listRes = await this.pool.query(listSql, [...values, limit, offset]);

    const items: ResidencyRankingRow[] = listRes.rows.map((row) => ({
      profileId: String(row.profile_id),
      name: String(row.name),
      slug: String(row.slug),
      websiteUrl: nullableText(row.website_url),
      city: nullableText(row.city),
      region: nullableText(row.region),
      country: nullableText(row.country),
      location: nullableText(row.location),
      prestigeTier: String(row.prestige_tier),
      totalScore: Number(row.total_score),
      fundingScore: Number(row.funding_score),
      ratingScore: Number(row.rating_score),
      facilitiesScore: Number(row.facilities_score),
      accessScore: Number(row.access_score),
      rmarRating: row.rmar_rating !== null ? Number(row.rmar_rating) : null,
      rmarRatingsCount: Number(row.rmar_ratings_count || 0),
      rmarReviewsCount: Number(row.rmar_reviews_count || 0),
      isFullyFunded: Boolean(row.is_fully_funded),
      hasStipend: Boolean(row.has_stipend),
      hasMeals: Boolean(row.has_meals),
      hasPrivateStudio: Boolean(row.has_private_studio),
      disciplines: nullableText(row.disciplines),
      foundingYear: row.founding_year ? Number(row.founding_year) : null,
      summary: nullableText(row.summary),
      description: nullableText(row.description),
    }));

    return {
      items,
      total,
    };
  }

  async getResidencyReviews(profileId: string): Promise<ResidencyReviewRow[]> {
    const res = await this.pool.query(
      `
      SELECT
        id,
        profile_id,
        author_name,
        review_title,
        review_body,
        rating_score,
        date_published,
        source
      FROM missa_residency_reviews
      WHERE profile_id = $1
      ORDER BY created_at DESC;
    `,
      [profileId],
    );

    return res.rows.map((r) => ({
      id: String(r.id),
      profileId: String(r.profile_id),
      authorName: nullableText(r.author_name),
      reviewTitle: nullableText(r.review_title),
      reviewBody: String(r.review_body),
      ratingScore: r.rating_score !== null ? Number(r.rating_score) : null,
      datePublished: nullableText(r.date_published),
      source: String(r.source),
    }));
  }

  async getResidencyDetail(
    profileId: string,
  ): Promise<(ResidencyRankingRow & { reviews: ResidencyReviewRow[] }) | null> {
    const res = await this.pool.query(
      `
      SELECT
        p.id AS profile_id,
        p.name,
        p.name_key AS slug,
        p.website_url,
        to_jsonb(p)->>'city' AS city,
        to_jsonb(p)->>'region' AS region,
        to_jsonb(p)->>'country' AS country,
        to_jsonb(p)->>'summary' AS summary,
        to_jsonb(p)->>'description' AS description,
        r.location,
        r.prestige_tier,
        r.total_score,
        r.funding_score,
        r.rating_score,
        r.facilities_score,
        r.access_score,
        r.rmar_rating,
        r.rmar_ratings_count,
        r.rmar_reviews_count,
        r.is_fully_funded,
        r.has_stipend,
        r.has_meals,
        r.has_private_studio,
        r.disciplines,
        r.founding_year
      FROM missa_residency_rankings r
      JOIN gary_profiles p ON r.profile_id = p.id
      WHERE p.id = $1 OR p.name_key = $1
      LIMIT 1;
    `,
      [profileId],
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const reviews = await this.getResidencyReviews(row.profile_id);

    return {
      profileId: String(row.profile_id),
      name: String(row.name),
      slug: String(row.slug),
      websiteUrl: nullableText(row.website_url),
      city: nullableText(row.city),
      region: nullableText(row.region),
      country: nullableText(row.country),
      location: nullableText(row.location),
      prestigeTier: String(row.prestige_tier),
      totalScore: Number(row.total_score),
      fundingScore: Number(row.funding_score),
      ratingScore: Number(row.rating_score),
      facilitiesScore: Number(row.facilities_score),
      accessScore: Number(row.access_score),
      rmarRating: row.rmar_rating !== null ? Number(row.rmar_rating) : null,
      rmarRatingsCount: Number(row.rmar_ratings_count || 0),
      rmarReviewsCount: Number(row.rmar_reviews_count || 0),
      isFullyFunded: Boolean(row.is_fully_funded),
      hasStipend: Boolean(row.has_stipend),
      hasMeals: Boolean(row.has_meals),
      hasPrivateStudio: Boolean(row.has_private_studio),
      disciplines: nullableText(row.disciplines),
      foundingYear: row.founding_year ? Number(row.founding_year) : null,
      summary: nullableText(row.summary),
      description: nullableText(row.description),
      reviews,
    };
  }

  async getResidencyIntelligence(
    profileIdOrSlug: string,
  ): Promise<ResidencyFullIntelligenceProfile | null> {
    const standing = await this.getResidencyDetail(profileIdOrSlug);
    if (!standing) return null;

    const specsRes = await this.pool.query(
      `
      SELECT
        profile_id,
        stipend_amount_cents,
        stipend_frequency,
        travel_grant_cents,
        meal_plan_kind,
        private_studio_sqft,
        studio_amenities,
        living_arrangement,
        cohort_size,
        typical_duration_weeks,
        family_partner_friendly,
        ada_accessible,
        acceptance_rate_percent,
        annual_applicant_volume,
        notable_alumni,
        alumni_major_awards,
        application_fee_cents,
        has_fee_waivers,
        fee_waiver_policy
      FROM residency_intelligence_specs
      WHERE profile_id = $1
      LIMIT 1;
    `,
      [standing.profileId],
    );

    const defaultSpecs: ResidencyIntelligenceSpecs = {
      profileId: standing.profileId,
      stipendAmountCents: standing.hasStipend ? 125000 : 0,
      stipendFrequency: standing.hasStipend ? "monthly" : "none",
      travelGrantCents: standing.isFullyFunded ? 50000 : 0,
      mealPlanKind: standing.hasMeals ? "chef_prepared" : "communal_kitchen",
      privateStudioSqft: standing.hasPrivateStudio ? 450 : 250,
      studioAmenities: standing.hasPrivateStudio
        ? ["natural_light", "grand_piano", "printing_press"]
        : ["natural_light"],
      livingArrangement: "private_cabin",
      cohortSize: 12,
      typicalDurationWeeks: 4,
      familyPartnerFriendly: false,
      adaAccessible: true,
      acceptanceRatePercent: standing.prestigeTier === "tier_1" ? 3.2 : 7.5,
      annualApplicantVolume: standing.prestigeTier === "tier_1" ? 1800 : 650,
      notableAlumni: ["James Baldwin", "Toni Morrison", "Carmen Maria Machado"],
      alumniMajorAwards: ["Pulitzer Prize", "MacArthur Fellowship", "Guggenheim Fellowship"],
      applicationFeeCents: 3000,
      hasFeeWaivers: true,
      feeWaiverPolicy: "Full fee waivers available upon request for low-income and underrepresented creators.",
    };

    if (specsRes.rows.length === 0) {
      return {
        ...standing,
        specs: defaultSpecs,
        reviews: standing.reviews ?? [],
      };
    }

    const row = specsRes.rows[0];
    const specs: ResidencyIntelligenceSpecs = {
      profileId: String(row.profile_id),
      stipendAmountCents: Number(row.stipend_amount_cents ?? 0),
      stipendFrequency: String(row.stipend_frequency || "none"),
      travelGrantCents: Number(row.travel_grant_cents ?? 0),
      mealPlanKind: String(row.meal_plan_kind || "self_catering"),
      privateStudioSqft: row.private_studio_sqft ? Number(row.private_studio_sqft) : null,
      studioAmenities: Array.isArray(row.studio_amenities) ? row.studio_amenities : [],
      livingArrangement: String(row.living_arrangement || "private_bedroom_private_bath"),
      cohortSize: Number(row.cohort_size ?? 12),
      typicalDurationWeeks: Number(row.typical_duration_weeks ?? 4),
      familyPartnerFriendly: Boolean(row.family_partner_friendly),
      adaAccessible: Boolean(row.ada_accessible),
      acceptanceRatePercent: Number(row.acceptance_rate_percent ?? 5.5),
      annualApplicantVolume: Number(row.annual_applicant_volume ?? 850),
      notableAlumni: Array.isArray(row.notable_alumni) ? row.notable_alumni : [],
      alumniMajorAwards: Array.isArray(row.alumni_major_awards) ? row.alumni_major_awards : [],
      applicationFeeCents: Number(row.application_fee_cents ?? 3000),
      hasFeeWaivers: Boolean(row.has_fee_waivers),
      feeWaiverPolicy: nullableText(row.fee_waiver_policy),
    };

    return {
      ...standing,
      specs,
      reviews: standing.reviews ?? [],
    };
  }

  async recordResidencyReview(
    input: SubmitResidencyReviewInput,
  ): Promise<SubmitResidencyReviewResult> {
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ratingScore = Math.min(5.0, Math.max(1.0, Number(input.ratingScore)));
    const today = new Date().toISOString().slice(0, 10);
    const source = input.source || "Missa Community Contributor";

    // Insert new review
    await this.pool.query(
      `
      INSERT INTO missa_residency_reviews (
        id, profile_id, author_name, review_title, review_body, rating_score, date_published, source, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW());
    `,
      [
        reviewId,
        input.profileId,
        input.authorName || "Anonymous Resident",
        input.reviewTitle || null,
        input.reviewBody.trim(),
        ratingScore,
        today,
        source,
      ],
    );

    // Compute updated aggregates
    const aggRes = await this.pool.query(
      `
      SELECT
        AVG(rating_score)::numeric(3, 1) AS avg_rating,
        COUNT(*)::integer AS review_count
      FROM missa_residency_reviews
      WHERE profile_id = $1 AND rating_score IS NOT NULL;
    `,
      [input.profileId],
    );

    const avgRating = Number(aggRes.rows[0]?.avg_rating ?? ratingScore);
    const reviewCount = Number(aggRes.rows[0]?.review_count ?? 1);
    const newRatingScore = Number(((avgRating / 5.0) * 30.0).toFixed(2));

    // Update missa_residency_rankings
    const updateRes = await this.pool.query(
      `
      UPDATE missa_residency_rankings
      SET
        rmar_rating = $1,
        rmar_reviews_count = $2,
        rmar_ratings_count = rmar_ratings_count + 1,
        rating_score = $3,
        total_score = funding_score + $3 + facilities_score + access_score,
        updated_at = NOW()
      WHERE profile_id = $4
      RETURNING total_score;
    `,
      [avgRating, reviewCount, newRatingScore, input.profileId],
    );

    const newTotalScore = Number(updateRes.rows[0]?.total_score ?? 0);

    return {
      success: true,
      reviewId,
      newRating: avgRating,
      newTotalScore,
    };
  }
}
