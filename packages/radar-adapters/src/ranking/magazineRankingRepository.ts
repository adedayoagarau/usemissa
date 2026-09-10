import { Pool } from "pg";
import {
  resolveMagazineSchedule,
  type ComputedMagazineRankings,
  type MagazineScheduleResult,
  type RankingGenre,
} from "@missa/radar-engine";

export interface MagazineRankingOpportunity {
  id: string;
  title: string;
  deadline: string | null;
  status: "open" | "closed" | "unknown";
  detailUrl: string | null;
  officialWebsite: string | null;
}

export interface MagazineRankingRow {
  profileId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  mediaUrl: string | null;
  rankingYear: number;
  genre: RankingGenre;
  rankPosition: number;
  previousYearRank: number | null;
  rankDelta: number | null; // Positive = climbed, Negative = slipped, null = new entry
  prestigeTier: string;
  totalScore: number;
  accoladesScore: number;
  payScore: number;
  turnaroundScore: number;
  feesScore: number;
  respectScore: number;
  formatEthicsScore: number;
  medianResponseDays: number | null;
  regularFeeCents: number;
  contributorPayCents: number;
  simultaneousPolicy: string;
  activeOpportunity: MagazineRankingOpportunity | null;
  schedule: MagazineScheduleResult | null;
}

export interface MagazineTelemetrySummary {
  profileId: string;
  sampleSize: number;
  decidedReports: number;
  acceptanceRate: number | null;
  medianResponseDays: number | null;
  p90ResponseDays: number | null;
  distribution: {
    under30: number;
    days31To60: number;
    days61To90: number;
    days90Plus: number;
  };
  outcomes: {
    accepted: number;
    personalRejections: number;
    formRejections: number;
    withdrawn: number;
    pending: number;
  };
  latestReportAt: string | null;
}

export interface MagazineRankingsFilter {
  year?: number;
  genre?: RankingGenre;
  tier?: string;
  limit?: number;
  offset?: number;
}

export interface MagazineRankingPage {
  items: MagazineRankingRow[];
  total: number;
  year: number;
  genre: RankingGenre;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateText(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function opportunityStatus(
  value: unknown,
): MagazineRankingOpportunity["status"] {
  const status = String(value ?? "unknown");
  if (
    ["open", "opening-soon", "closing-soon", "deadline-extended"].includes(
      status,
    )
  )
    return "open";
  if (["closed", "archived"].includes(status)) return "closed";
  return "unknown";
}

function rankingRow(row: Record<string, unknown>): MagazineRankingRow {
  const activeOpportunity = nullableText(row.active_opportunity_id)
    ? {
        id: String(row.active_opportunity_id),
        title: String(row.active_opportunity_title ?? "Open call"),
        deadline: dateText(row.active_opportunity_deadline),
        status: opportunityStatus(row.active_opportunity_status),
        detailUrl: nullableText(row.active_opportunity_detail_url),
        officialWebsite: nullableText(row.active_opportunity_official_website),
      }
    : null;
  const schedule = resolveMagazineSchedule({
    readingPeriod: nullableText(row.reading_period),
    opportunities: activeOpportunity
      ? [
          {
            id: activeOpportunity.id,
            title: activeOpportunity.title,
            status: activeOpportunity.status,
            deadline: activeOpportunity.deadline,
            opensAt: dateText(row.active_opportunity_open_date),
          },
        ]
      : null,
  });

  return {
    profileId: String(row.profile_id),
    name: String(row.name),
    slug: String(row.slug)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    websiteUrl: row.website_url ? String(row.website_url) : null,
    mediaUrl: row.media_url ? String(row.media_url) : null,
    rankingYear: Number(row.ranking_year),
    genre: row.genre as RankingGenre,
    rankPosition: Number(row.rank_position),
    previousYearRank: row.prev_rank != null ? Number(row.prev_rank) : null,
    rankDelta: row.rank_delta != null ? Number(row.rank_delta) : null,
    prestigeTier: String(row.prestige_tier),
    totalScore: Number(row.total_score),
    accoladesScore: Number(row.accolades_score),
    payScore: Number(row.pay_score),
    turnaroundScore: Number(row.turnaround_score),
    feesScore: Number(row.fees_score),
    respectScore: Number(row.respect_score),
    formatEthicsScore: Number(row.format_ethics_score),
    medianResponseDays:
      row.median_response_days != null
        ? Number(row.median_response_days)
        : null,
    regularFeeCents: Number(row.regular_fee_cents),
    contributorPayCents: Number(row.contributor_pay_cents),
    simultaneousPolicy: String(row.simultaneous_policy),
    activeOpportunity,
    schedule,
  };
}

function emptyTelemetrySummary(profileId: string): MagazineTelemetrySummary {
  return {
    profileId,
    sampleSize: 0,
    decidedReports: 0,
    acceptanceRate: null,
    medianResponseDays: null,
    p90ResponseDays: null,
    distribution: {
      under30: 0,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
    },
    outcomes: {
      accepted: 0,
      personalRejections: 0,
      formRejections: 0,
      withdrawn: 0,
      pending: 0,
    },
    latestReportAt: null,
  };
}

export class PostgresMagazineRankingRepository {
  constructor(private readonly pool: Pool) {}

  async listRankings(
    filter: MagazineRankingsFilter = {},
  ): Promise<MagazineRankingPage> {
    const year = filter.year ?? 2026;
    const genre = filter.genre ?? "overall";
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 1000);
    const offset = Math.max(filter.offset ?? 0, 0);

    const values: unknown[] = [year, genre];
    const whereConditions = [`r.ranking_year = $1`, `r.genre = $2`];

    if (filter.tier) {
      values.push(filter.tier);
      whereConditions.push(`r.prestige_tier = $${values.length}`);
    }

    const whereClause = whereConditions.join(" AND ");

    const query = `
      WITH latest_observation AS (
        SELECT DISTINCT ON (profile_id) profile_id, reading_period
        FROM gary_profile_observations
        ORDER BY profile_id, observed_at DESC
      )
      SELECT
        r.profile_id,
        p.name,
        COALESCE(NULLIF(p.name_key, ''), p.id) as slug,
        p.website_url,
        m.image_url as media_url,
        latest_observation.reading_period,
        active_opp.id as active_opportunity_id,
        active_opp.title as active_opportunity_title,
        active_opp.status as active_opportunity_status,
        active_opp.open_date as active_opportunity_open_date,
        active_opp.deadline_date as active_opportunity_deadline,
        active_opp.detail_url as active_opportunity_detail_url,
        active_opp.official_website as active_opportunity_official_website,
        r.ranking_year,
        r.genre,
        r.rank_position,
        prev.rank_position as prev_rank,
        CASE
          WHEN prev.rank_position IS NULL THEN NULL
          ELSE (prev.rank_position - r.rank_position)
        END as rank_delta,
        r.prestige_tier,
        r.total_score,
        r.accolades_score,
        r.pay_score,
        r.turnaround_score,
        r.fees_score,
        r.respect_score,
        r.format_ethics_score,
        r.median_response_days,
        r.regular_fee_cents,
        r.contributor_pay_cents,
        r.simultaneous_policy,
        COUNT(*) OVER() as total_count
      FROM missa_magazine_rankings r
      JOIN gary_profiles p ON p.id = r.profile_id
      LEFT JOIN latest_observation ON latest_observation.profile_id = p.id
      LEFT JOIN missa_magazine_rankings prev
        ON prev.profile_id = r.profile_id
        AND prev.genre = r.genre
        AND prev.ranking_year = (r.ranking_year - 1)
      LEFT JOIN LATERAL (
        SELECT image_url
        FROM gary_organization_media
        WHERE profile_id = p.id AND review_status = 'verified'
        ORDER BY is_lead DESC, (media_group = 'identity') DESC, display_order ASC
        LIMIT 1
      ) m ON true
      LEFT JOIN LATERAL (
        SELECT
          o.id,
          o.title,
          o.status,
          o.open_date::text as open_date,
          o.deadline_date::text as deadline_date,
          COALESCE(o.guidelines_url, s.url) AS detail_url,
          COALESCE(o.submission_url, o.guidelines_url, s.url) AS official_website
        FROM opportunities o
        JOIN opportunity_sources s ON s.id = o.source_id
        LEFT JOIN opportunity_profile_links l
          ON l.opportunity_id = o.id
          AND l.profile_id = p.id
          AND l.status = 'confirmed'
          AND l.verified_until > now()
        WHERE (o.organization_id = p.id OR l.profile_id = p.id)
          AND o.publication_state = 'published'
          AND o.status IN ('opening-soon', 'open', 'closing-soon', 'deadline-extended')
          AND (o.deadline_date IS NULL OR o.deadline_date >= current_date)
        ORDER BY
          CASE WHEN o.status = 'closing-soon' THEN 0 WHEN o.deadline_date IS NOT NULL THEN 1 ELSE 2 END,
          o.deadline_date ASC NULLS LAST,
          o.title ASC
        LIMIT 1
      ) active_opp ON true
      WHERE ${whereClause}
      ORDER BY r.rank_position ASC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    values.push(limit, offset);

    const res = await this.pool.query(query, values);
    const total = Number(res.rows[0]?.total_count ?? 0);
    const items: MagazineRankingRow[] = res.rows.map((row) => rankingRow(row));

    return { items, total, year, genre };
  }

  async getMagazineStanding(
    profileId: string,
    year: number = 2026,
  ): Promise<MagazineRankingRow[]> {
    try {
      const res = await this.pool.query(
        `WITH latest_observation AS (
          SELECT DISTINCT ON (profile_id) profile_id, reading_period
          FROM gary_profile_observations
          ORDER BY profile_id, observed_at DESC
        )
        SELECT
          r.profile_id,
          p.name,
          COALESCE(NULLIF(p.name_key, ''), p.id) as slug,
          p.website_url,
          NULL as media_url,
          latest_observation.reading_period,
          active_opp.id as active_opportunity_id,
          active_opp.title as active_opportunity_title,
          active_opp.status as active_opportunity_status,
          active_opp.open_date as active_opportunity_open_date,
          active_opp.deadline_date as active_opportunity_deadline,
          active_opp.detail_url as active_opportunity_detail_url,
          active_opp.official_website as active_opportunity_official_website,
          r.ranking_year,
          r.genre,
          r.rank_position,
          prev.rank_position as prev_rank,
          CASE
            WHEN prev.rank_position IS NULL THEN NULL
            ELSE (prev.rank_position - r.rank_position)
          END as rank_delta,
          r.prestige_tier,
          r.total_score,
          r.accolades_score,
          r.pay_score,
          r.turnaround_score,
          r.fees_score,
          r.respect_score,
          r.format_ethics_score,
          r.median_response_days,
          r.regular_fee_cents,
          r.contributor_pay_cents,
          r.simultaneous_policy
        FROM missa_magazine_rankings r
        JOIN gary_profiles p ON p.id = r.profile_id
        LEFT JOIN latest_observation ON latest_observation.profile_id = p.id
        LEFT JOIN missa_magazine_rankings prev
          ON prev.profile_id = r.profile_id
          AND prev.genre = r.genre
          AND prev.ranking_year = (r.ranking_year - 1)
        LEFT JOIN LATERAL (
          SELECT
            o.id,
            o.title,
            o.status,
            o.open_date::text as open_date,
            o.deadline_date::text as deadline_date,
            COALESCE(o.guidelines_url, s.url) AS detail_url,
            COALESCE(o.submission_url, o.guidelines_url, s.url) AS official_website
          FROM opportunities o
          JOIN opportunity_sources s ON s.id = o.source_id
          LEFT JOIN opportunity_profile_links l
            ON l.opportunity_id = o.id
            AND l.profile_id = p.id
            AND l.status = 'confirmed'
            AND l.verified_until > now()
          WHERE (o.organization_id = p.id OR l.profile_id = p.id)
            AND o.publication_state = 'published'
            AND o.status IN ('opening-soon', 'open', 'closing-soon', 'deadline-extended')
            AND (o.deadline_date IS NULL OR o.deadline_date >= current_date)
          ORDER BY
            CASE WHEN o.status = 'closing-soon' THEN 0 WHEN o.deadline_date IS NOT NULL THEN 1 ELSE 2 END,
            o.deadline_date ASC NULLS LAST,
            o.title ASC
          LIMIT 1
        ) active_opp ON true
        WHERE r.profile_id = $1 AND r.ranking_year = $2
        ORDER BY CASE WHEN r.genre = 'overall' THEN 1 ELSE 2 END, r.rank_position ASC`,
        [profileId, year],
      );

      return res.rows.map((row) => rankingRow(row));
    } catch {
      return [];
    }
  }

  async getTelemetrySummary(
    profileId: string,
  ): Promise<MagazineTelemetrySummary> {
    try {
      const res = await this.pool.query(
        `SELECT
          COUNT(*)::int as sample_size,
          COUNT(*) FILTER (WHERE outcome IS NOT NULL AND outcome <> 'pending')::int as decided_reports,
          COUNT(*) FILTER (WHERE outcome = 'accepted')::int as accepted,
          COUNT(*) FILTER (WHERE outcome = 'rejected' AND rejection_type IN ('tiered_personal', 'editor_note'))::int as personal_rejections,
          COUNT(*) FILTER (WHERE outcome = 'rejected' AND (rejection_type IS NULL OR rejection_type = 'form'))::int as form_rejections,
          COUNT(*) FILTER (WHERE outcome = 'withdrawn')::int as withdrawn,
          COUNT(*) FILTER (WHERE outcome = 'pending')::int as pending,
          COUNT(*) FILTER (WHERE response_days > 0 AND response_days <= 30)::int as under_30,
          COUNT(*) FILTER (WHERE response_days BETWEEN 31 AND 60)::int as days_31_60,
          COUNT(*) FILTER (WHERE response_days BETWEEN 61 AND 90)::int as days_61_90,
          COUNT(*) FILTER (WHERE response_days > 90)::int as days_90_plus,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY response_days) FILTER (WHERE response_days > 0) as median_days,
          percentile_cont(0.9) WITHIN GROUP (ORDER BY response_days) FILTER (WHERE response_days > 0) as p90_days,
          MAX(created_at)::text as latest_report_at
        FROM missa_submission_telemetry
        WHERE profile_id = $1`,
        [profileId],
      );

      const row = res.rows[0] as Record<string, unknown> | undefined;
      if (!row) return emptyTelemetrySummary(profileId);
      const sampleSize = Number(row.sample_size ?? 0);
      const decidedReports = Number(row.decided_reports ?? 0);
      const accepted = Number(row.accepted ?? 0);
      return {
        profileId,
        sampleSize,
        decidedReports,
        acceptanceRate:
          decidedReports > 0
            ? Math.round((accepted / decidedReports) * 1000) / 10
            : null,
        medianResponseDays:
          row.median_days != null ? Math.round(Number(row.median_days)) : null,
        p90ResponseDays:
          row.p90_days != null ? Math.round(Number(row.p90_days)) : null,
        distribution: {
          under30: Number(row.under_30 ?? 0),
          days31To60: Number(row.days_31_60 ?? 0),
          days61To90: Number(row.days_61_90 ?? 0),
          days90Plus: Number(row.days_90_plus ?? 0),
        },
        outcomes: {
          accepted,
          personalRejections: Number(row.personal_rejections ?? 0),
          formRejections: Number(row.form_rejections ?? 0),
          withdrawn: Number(row.withdrawn ?? 0),
          pending: Number(row.pending ?? 0),
        },
        latestReportAt: row.latest_report_at
          ? String(row.latest_report_at)
          : null,
      };
    } catch {
      return emptyTelemetrySummary(profileId);
    }
  }

  async recordSubmissionTelemetry(input: {
    profileId: string;
    userId?: string | null;
    genre?: string | null;
    submittedDate: string;
    decisionDate?: string | null;
    responseDays?: number | null;
    outcome?: "accepted" | "rejected" | "withdrawn" | "pending" | null;
    rejectionType?: "form" | "tiered_personal" | "editor_note" | null;
    feePaidCents?: number;
  }): Promise<{ success: boolean; newMedianDays: number | null }> {
    try {
      const id = `telem_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;

      let calcDays = input.responseDays ?? null;
      if (calcDays == null && input.submittedDate && input.decisionDate) {
        const d1 = new Date(input.submittedDate).getTime();
        const d2 = new Date(input.decisionDate).getTime();
        if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
          calcDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        }
      }

      await this.pool.query(
        `INSERT INTO missa_submission_telemetry (
          id, profile_id, user_id, genre, submitted_date, decision_date,
          response_days, outcome, rejection_type, fee_paid_cents
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          input.profileId,
          input.userId ?? null,
          input.genre ?? null,
          input.submittedDate,
          input.decisionDate ?? null,
          calcDays,
          input.outcome ?? null,
          input.rejectionType ?? null,
          input.feePaidCents ?? 0,
        ],
      );

      // Compute new median response days from all telemetry for this profile
      const medRes = await this.pool.query(
        `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY response_days) as median_days
         FROM missa_submission_telemetry
         WHERE profile_id = $1 AND response_days IS NOT NULL AND response_days > 0`,
        [input.profileId],
      );

      const rawMedian = medRes.rows[0]?.median_days;
      const newMedian =
        rawMedian != null ? Math.round(Number(rawMedian)) : null;

      if (newMedian != null) {
        // Calculate new turnaround score: Lightning (<30d)=15, Swift (<60d)=13, Standard (<90d)=10, Slow (<180d)=7, Glacial (>=180d)=4
        const turnaroundScore =
          newMedian <= 30
            ? 15
            : newMedian <= 60
              ? 13
              : newMedian <= 90
                ? 10
                : newMedian <= 180
                  ? 7
                  : 4;

        await this.pool.query(
          `UPDATE missa_magazine_rankings
           SET median_response_days = $1,
               turnaround_score = $2,
               total_score = accolades_score + pay_score + $2 + fees_score + respect_score + format_ethics_score,
               updated_at = NOW()
           WHERE profile_id = $3 AND ranking_year = 2026`,
          [newMedian, turnaroundScore, input.profileId],
        );
      }

      return { success: true, newMedianDays: newMedian };
    } catch (err) {
      console.error(
        "[PostgresMagazineRankingRepository] Error recording telemetry:",
        err,
      );
      return { success: false, newMedianDays: null };
    }
  }
}
