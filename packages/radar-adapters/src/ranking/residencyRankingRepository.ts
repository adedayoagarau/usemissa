import { type Pool } from "pg";
import { firstOwnUrl, isIntermediaryName, isIntermediaryUrl } from "@missa/radar-engine";
import {
  RESIDENCY_PILLAR_KEYS,
  resolveMagazineSchedule,
  scoreResidency,
  type MagazineScheduleResult,
  type FactStatus,
  type ResidencyMeals,
  type ResidencyPillarStatusMap,
} from "@missa/radar-engine";

export interface ResidencyReviewRow {
  id: string;
  profileId: string;
  authorName: string | null;
  reviewTitle: string | null;
  reviewBody: string;
  ratingScore: number | null;
  datePublished: string | null;
  source: string;
  sourceUrl: string | null;
}

export interface ResidencyAmount {
  /** Whole currency units as the program lists them. */
  amount: number;
  /** Currency as the directory names it, for example "US Dollar (USD)". */
  currency: string | null;
}

export interface ResidencyRankingRow {
  profileId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  location: string | null;
  rankPosition: number;
  prestigeTier: string;
  totalScore: number;
  fundingScore: number;
  ratingScore: number;
  facilitiesScore: number;
  accessScore: number;
  /** True when a program records no residency fee; false when it charges one. */
  freeToAttend: boolean | null;
  residencyFee: ResidencyAmount | null;
  hasStipend: boolean | null;
  stipend: ResidencyAmount | null;
  applicationFee: ResidencyAmount | null;
  meals: ResidencyMeals | null;
  privateStudio: boolean | null;
  acceptedCount: number | null;
  applicantPool: number | null;
  housing: string | null;
  wheelchair: string | null;
  residencyLength: string | null;
  disciplines: string | null;
  foundingYear: number | null;
  /** Residents' rating combining the ratings site and Missa writers' reviews. */
  rating: number | null;
  ratingCount: number;
  rmarRating: number | null;
  rmarRatingsCount: number;
  rmarReviewsCount: number;
  /** Residency directories that list the program. */
  directories: string[];
  openCall: { title: string; url: string; deadline: string | null } | null;
  /** Open-call state for the badge ("Open now", "Closes in 12 days"), from the current call. */
  schedule: MagazineScheduleResult | null;
  /** Where each recorded fact comes from: fee, stipend, meals, studio, rating… */
  factSources: Record<string, { url: string; recordedOn: string }>;
  pillarStatus: ResidencyPillarStatusMap;
  /** Share of the 100 points backed by recorded facts, 0–1. */
  coverage: number;
  computedOn: string | null;
}

export interface ResidencyRankingsFilter {
  query?: string;
  limit?: number;
  offset?: number;
}

export interface ResidencyRankingPage {
  items: ResidencyRankingRow[];
  total: number;
}

export interface SubmitResidencyReviewInput {
  profileId: string;
  /**
   * Deterministic id for account-tied reviews. A second insert with the same
   * id is ignored, which keeps one review per account per residency without a
   * dedicated account column.
   */
  reviewId?: string;
  authorName?: string | null;
  reviewTitle?: string | null;
  reviewBody: string;
  ratingScore: number;
  source?: string;
}

export interface SubmitResidencyReviewResult {
  success: boolean;
  /** True when a review with the same id already exists; nothing changed. */
  duplicate?: boolean;
  reviewId: string;
  newRating: number;
  newTotalScore: number;
}

/** Source recorded for ratings that come from Missa writers' own reviews. */
export const MISSA_REVIEWS_SOURCE_URL = "https://usemissa.com/rankings/residencies";

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableNumber(value: unknown): number | null {
  return value == null ? null : Number(value);
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function dateText(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function amount(value: unknown, currency: unknown): ResidencyAmount | null {
  return value == null ? null : { amount: Number(value), currency: nullableText(currency) };
}

const FACT_STATUSES: readonly FactStatus[] = ["recorded", "partial", "unknown"];

function pillarStatusFrom(value: unknown): ResidencyPillarStatusMap {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    RESIDENCY_PILLAR_KEYS.map((key) => [
      key,
      FACT_STATUSES.includes(source[key] as FactStatus) ? (source[key] as FactStatus) : "unknown",
    ]),
  ) as ResidencyPillarStatusMap;
}

function factSourcesFrom(value: unknown): ResidencyRankingRow["factSources"] {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const out: ResidencyRankingRow["factSources"] = {};
  for (const [key, entry] of Object.entries(source)) {
    const e = entry as { url?: unknown; recordedOn?: unknown } | null;
    // A fact stays recorded, but a listing platform is never cited on a public page.
    if (e && typeof e.url === "string" && !isIntermediaryUrl(e.url)) {
      out[key] = { url: e.url, recordedOn: String(e.recordedOn ?? "") };
    }
  }
  return out;
}

const MEALS = ["all", "some", "none"] as const;

/** Maps a stored ranking row (with profile name, slug and website) to the public shape. */
export function residencyRow(row: Record<string, unknown>): ResidencyRankingRow {
  const meals = MEALS.find((value) => value === row.meals) ?? null;
  const openCall = nullableText(row.open_call_url) && !isIntermediaryUrl(String(row.open_call_url))
    ? {
        title: String(row.open_call_title ?? "Open call"),
        url: String(row.open_call_url),
        deadline: dateText(row.open_call_deadline),
      }
    : null;
  return {
    profileId: String(row.profile_id),
    name: String(row.name),
    slug: String(row.slug ?? row.profile_id),
    websiteUrl: firstOwnUrl(nullableText(row.website_url)) ?? null,
    location: nullableText(row.location),
    rankPosition: Number(row.rank_position ?? 0),
    prestigeTier: String(row.prestige_tier),
    totalScore: Number(row.total_score),
    fundingScore: Number(row.funding_score),
    ratingScore: Number(row.rating_score),
    facilitiesScore: Number(row.facilities_score),
    accessScore: Number(row.access_score),
    freeToAttend: nullableBoolean(row.free_to_attend),
    residencyFee: amount(row.residency_fee_amount, row.residency_fee_currency),
    hasStipend: nullableBoolean(row.has_stipend),
    stipend: amount(row.stipend_amount, row.stipend_currency),
    applicationFee: amount(row.application_fee_amount, row.application_fee_currency),
    meals,
    privateStudio: nullableBoolean(row.has_private_studio),
    acceptedCount: nullableNumber(row.accepted_count),
    applicantPool: nullableNumber(row.applicant_pool),
    housing: nullableText(row.housing),
    wheelchair: nullableText(row.wheelchair),
    residencyLength: nullableText(row.residency_length),
    disciplines: nullableText(row.disciplines),
    foundingYear: nullableNumber(row.founding_year),
    rating: nullableNumber(row.rating_value),
    ratingCount: Number(row.rating_count ?? 0),
    rmarRating: nullableNumber(row.rmar_rating),
    rmarRatingsCount: Number(row.rmar_ratings_count ?? 0),
    rmarReviewsCount: Number(row.rmar_reviews_count ?? 0),
    // Listing platforms are never credited on a public page.
    directories: Array.isArray(row.directories) ? row.directories.map(String).filter((name) => !isIntermediaryName(name)) : [],
    openCall,
    schedule: openCall
      ? resolveMagazineSchedule({
          readingPeriod: null,
          opportunities: [
            {
              id: openCall.url,
              title: openCall.title,
              status: "open",
              deadline: openCall.deadline,
              opensAt: null,
            },
          ],
        })
      : null,
    factSources: factSourcesFrom(row.fact_sources),
    pillarStatus: pillarStatusFrom(row.pillar_status),
    coverage: Number(row.coverage ?? 0),
    computedOn: dateText(row.computed_on),
  };
}

const RANKING_SELECT = `
  SELECT r.*, p.name, COALESCE(NULLIF(p.name_key, ''), p.id) AS slug, p.website_url
  FROM missa_residency_rankings r
  JOIN gary_profiles p ON p.id = r.profile_id`;

function reviewRow(r: Record<string, unknown>): ResidencyReviewRow {
  return {
    id: String(r.id),
    profileId: String(r.profile_id),
    authorName: nullableText(r.author_name),
    reviewTitle: nullableText(r.review_title),
    reviewBody: String(r.review_body),
    ratingScore: r.rating_score !== null && r.rating_score !== undefined ? Number(r.rating_score) : null,
    datePublished: nullableText(r.date_published),
    source: String(r.source),
    sourceUrl: nullableText(r.source_url),
  };
}

export class PostgresResidencyRankingRepository {
  constructor(private readonly pool: Pool) {}

  async listResidencyRankings(
    filter: ResidencyRankingsFilter = {},
  ): Promise<ResidencyRankingPage> {
    const values: unknown[] = [];
    let where = "";
    if (filter.query?.trim()) {
      values.push(`%${filter.query.trim()}%`);
      where = `WHERE p.name ILIKE $1 OR r.location ILIKE $1 OR r.disciplines ILIKE $1`;
    }
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 1000);
    const offset = Math.max(filter.offset ?? 0, 0);
    const res = await this.pool.query(
      `${RANKING_SELECT}
       ${where}
       ORDER BY r.rank_position ASC NULLS LAST, r.total_score DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    const count = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM missa_residency_rankings r JOIN gary_profiles p ON p.id = r.profile_id ${where}`,
      values,
    );
    return {
      items: res.rows.map(residencyRow),
      total: Number(count.rows[0]?.total ?? 0),
    };
  }

  async getResidencyReviews(profileId: string): Promise<ResidencyReviewRow[]> {
    const res = await this.pool.query(
      `SELECT id, profile_id, author_name, review_title, review_body, rating_score,
              date_published, source, source_url
       FROM missa_residency_reviews
       WHERE profile_id = $1
       ORDER BY date_published DESC NULLS LAST, created_at DESC`,
      [profileId],
    );
    return res.rows.map(reviewRow);
  }

  async getResidencyDetail(
    profileIdOrSlug: string,
  ): Promise<(ResidencyRankingRow & { reviews: ResidencyReviewRow[] }) | null> {
    const res = await this.pool.query(
      `${RANKING_SELECT}
       WHERE p.id = $1 OR p.name_key = $1
       LIMIT 1`,
      [profileIdOrSlug],
    );
    if (res.rows.length === 0) return null;
    const row = residencyRow(res.rows[0]);
    return { ...row, reviews: await this.getResidencyReviews(row.profileId) };
  }

  /** The program's recorded facts and reviews, for the details panel. */
  async getResidencyIntelligence(
    profileIdOrSlug: string,
  ): Promise<(ResidencyRankingRow & { reviews: ResidencyReviewRow[] }) | null> {
    return this.getResidencyDetail(profileIdOrSlug);
  }

  /**
   * Stores a writer's review, then rescores the program's ratings pillar with
   * the engine and re-ranks the index. A program outside the index keeps the
   * review without a score.
   */
  async recordResidencyReview(
    input: SubmitResidencyReviewInput,
  ): Promise<SubmitResidencyReviewResult> {
    const reviewId =
      input.reviewId || `rev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ratingScore = Math.min(5.0, Math.max(1.0, Number(input.ratingScore)));
    const today = new Date().toISOString().slice(0, 10);
    const source = input.source || "Missa Community Contributor";

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO missa_residency_reviews (
           id, profile_id, author_name, review_title, review_body, rating_score,
           date_published, source, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
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
      if (inserted.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, duplicate: true, reviewId, newRating: 0, newTotalScore: 0 };
      }

      const current = await client.query(
        `SELECT * FROM missa_residency_rankings WHERE profile_id = $1 FOR UPDATE`,
        [input.profileId],
      );
      if (current.rows.length === 0) {
        await client.query("COMMIT");
        return { success: true, reviewId, newRating: ratingScore, newTotalScore: 0 };
      }
      const row = current.rows[0];
      const missa = await client.query(
        `SELECT COALESCE(SUM(rating_score), 0)::float AS total, COUNT(*)::int AS count
         FROM missa_residency_reviews
         WHERE profile_id = $1 AND rating_score IS NOT NULL
           AND source NOT ILIKE '%ratemyartistresidency%'`,
        [input.profileId],
      );
      const rmarCount = Number(row.rmar_ratings_count ?? 0);
      const rmarValue = Number(row.rmar_rating ?? 0);
      const count = rmarCount + Number(missa.rows[0].count);
      const value =
        Math.round(((rmarValue * rmarCount + Number(missa.rows[0].total)) / count) * 100) / 100;

      const meals = MEALS.find((m) => m === row.meals) ?? null;
      const score = scoreResidency(
        {
          profileId: input.profileId,
          name: "",
          freeToAttend: nullableBoolean(row.free_to_attend),
          hasStipend: nullableBoolean(row.has_stipend),
          meals,
          privateStudio: nullableBoolean(row.has_private_studio),
          rating: { value, count },
          foundedYear: nullableNumber(row.founding_year),
          directoryCount: Math.max(1, Array.isArray(row.directories) ? row.directories.length : 1),
          openCall: row.open_call_url ? true : null,
        },
        Number(String(dateText(row.computed_on) ?? today).slice(0, 4)),
      );
      await client.query(
        `UPDATE missa_residency_rankings
         SET rating_value = $2, rating_count = $3, rating_score = $4, total_score = $5,
             prestige_tier = $6, pillar_status = $7, coverage = $8,
             fact_sources = CASE WHEN fact_sources ? 'rating' THEN fact_sources
                                 ELSE fact_sources || jsonb_build_object('rating',
                                   jsonb_build_object('url', $9::text, 'recordedOn', $10::text)) END,
             updated_at = NOW()
         WHERE profile_id = $1`,
        [
          input.profileId,
          value,
          count,
          score.ratingsScore,
          score.totalScore,
          score.tier,
          JSON.stringify(score.pillarStatus),
          score.coverage,
          MISSA_REVIEWS_SOURCE_URL,
          today,
        ],
      );
      await client.query(
        `UPDATE missa_residency_rankings r
         SET rank_position = ordered.position
         FROM (
           SELECT r2.profile_id,
                  ROW_NUMBER() OVER (ORDER BY r2.total_score DESC, r2.rating_score DESC, p.name) AS position
           FROM missa_residency_rankings r2
           JOIN gary_profiles p ON p.id = r2.profile_id
         ) ordered
         WHERE ordered.profile_id = r.profile_id`,
      );
      await client.query("COMMIT");
      return { success: true, reviewId, newRating: value, newTotalScore: score.totalScore };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
