import { Pool } from "pg";
import type { RankingGenre, ComputedMagazineRankings } from "@missa/radar-engine";

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

export class PostgresMagazineRankingRepository {
  constructor(private readonly pool: Pool) {}

  async listRankings(filter: MagazineRankingsFilter = {}): Promise<MagazineRankingPage> {
    const year = filter.year ?? 2026;
    const genre = filter.genre ?? "overall";
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 100);
    const offset = Math.max(filter.offset ?? 0, 0);

    const values: unknown[] = [year, genre];
    const whereConditions = [`r.ranking_year = $1`, `r.genre = $2`];

    if (filter.tier) {
      values.push(filter.tier);
      whereConditions.push(`r.prestige_tier = $${values.length}`);
    }

    const whereClause = whereConditions.join(" AND ");

    const query = `
      SELECT
        r.profile_id,
        p.name,
        COALESCE(NULLIF(p.name_key, ''), p.id) as slug,
        p.website_url,
        m.image_url as media_url,
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
      WHERE ${whereClause}
      ORDER BY r.rank_position ASC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    values.push(limit, offset);

    try {
      const res = await this.pool.query(query, values);
      const total = Number(res.rows[0]?.total_count ?? 0);
      const items: MagazineRankingRow[] = res.rows.map((row) => ({
        profileId: String(row.profile_id),
        name: String(row.name),
        slug: String(row.slug).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
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
        medianResponseDays: row.median_response_days != null ? Number(row.median_response_days) : null,
        regularFeeCents: Number(row.regular_fee_cents),
        contributorPayCents: Number(row.contributor_pay_cents),
        simultaneousPolicy: String(row.simultaneous_policy),
      }));

      return { items, total, year, genre };
    } catch {
      return { items: [], total: 0, year, genre };
    }
  }

  async getMagazineStanding(profileId: string, year: number = 2026): Promise<MagazineRankingRow[]> {
    try {
      const res = await this.pool.query(
        `SELECT
          r.profile_id,
          p.name,
          COALESCE(NULLIF(p.name_key, ''), p.id) as slug,
          p.website_url,
          NULL as media_url,
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
        LEFT JOIN missa_magazine_rankings prev
          ON prev.profile_id = r.profile_id
          AND prev.genre = r.genre
          AND prev.ranking_year = (r.ranking_year - 1)
        WHERE r.profile_id = $1 AND r.ranking_year = $2
        ORDER BY CASE WHEN r.genre = 'overall' THEN 1 ELSE 2 END, r.rank_position ASC`,
        [profileId, year]
      );

      return res.rows.map((row) => ({
        profileId: String(row.profile_id),
        name: String(row.name),
        slug: String(row.slug),
        websiteUrl: row.website_url ? String(row.website_url) : null,
        mediaUrl: null,
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
        medianResponseDays: row.median_response_days != null ? Number(row.median_response_days) : null,
        regularFeeCents: Number(row.regular_fee_cents),
        contributorPayCents: Number(row.contributor_pay_cents),
        simultaneousPolicy: String(row.simultaneous_policy),
      }));
    } catch {
      return [];
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
        ]
      );

      // Compute new median response days from all telemetry for this profile
      const medRes = await this.pool.query(
        `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY response_days) as median_days
         FROM missa_submission_telemetry
         WHERE profile_id = $1 AND response_days IS NOT NULL AND response_days > 0`,
        [input.profileId]
      );

      const rawMedian = medRes.rows[0]?.median_days;
      const newMedian = rawMedian != null ? Math.round(Number(rawMedian)) : null;

      if (newMedian != null) {
        // Calculate new turnaround score: Lightning (<30d)=15, Swift (<60d)=13, Standard (<90d)=10, Slow (<180d)=7, Glacial (>=180d)=4
        const turnaroundScore = newMedian <= 30 ? 15 : (newMedian <= 60 ? 13 : (newMedian <= 90 ? 10 : (newMedian <= 180 ? 7 : 4)));

        await this.pool.query(
          `UPDATE missa_magazine_rankings
           SET median_response_days = $1,
               turnaround_score = $2,
               total_score = accolades_score + pay_score + $2 + fees_score + respect_score + format_ethics_score,
               updated_at = NOW()
           WHERE profile_id = $3 AND ranking_year = 2026`,
          [newMedian, turnaroundScore, input.profileId]
        );
      }

      return { success: true, newMedianDays: newMedian };
    } catch (err) {
      console.error("[PostgresMagazineRankingRepository] Error recording telemetry:", err);
      return { success: false, newMedianDays: null };
    }
  }
}
