import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  MIN_REPORTS_FOR_MEDIAN,
  PILLAR_KEYS,
  combinePillars,
  compareScored,
  computeTurnaroundScore,
  resolveMagazineSchedule,
  type ContributorPayKind,
  type FactStatus,
  type MagazineScheduleResult,
  type PillarKey,
  type PillarStatusMap,
  type RankingGenre,
  type ResponseTimeBand,
  type SimultaneousPolicy,
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
  /** Median of writer reports; null until enough reports exist. */
  medianResponseDays: number | null;
  /** Response time band the magazine reports in its listing. */
  responseTimeBand: ResponseTimeBand | null;
  regularFeeCents: number | null;
  chargesReadingFee: boolean | null;
  contributorPayCents: number | null;
  payKind: ContributorPayKind | null;
  simultaneousPolicy: SimultaneousPolicy | null;
  debutFriendly: boolean | null;
  blindReading: boolean | null;
  digitalArchive: boolean | null;
  telemetryReports: number;
  /** Where each recorded fact comes from: fee, pay, response, simultaneous… */
  factSources: Record<string, { url: string; recordedOn: string }>;
  pillarStatus: PillarStatusMap;
  /** Share of the 100 points backed by recorded facts, 0–1. */
  coverage: number;
  activeOpportunity: MagazineRankingOpportunity | null;
  schedule: MagazineScheduleResult | null;
}

/** One comparison row: how many magazines fall in each recorded category. */
export type CategoryCounts = Record<string, number>;

/** Plain-language facts about the index, read live for the methodology page. */
export interface MagazineIndexAnalytics {
  year: number;
  tiers: Array<{ tier: string; count: number }>;
  honours: {
    magazines: number;
    top10Share: number;
    top50Share: number;
    singleRecognition: number;
    closed: number;
    paused: number;
  };
  /** The fifty most honoured magazines against everyone else, recorded facts only. */
  comparison: {
    fees: { top: CategoryCounts; rest: CategoryCounts };
    pay: { top: CategoryCounts; rest: CategoryCounts };
    response: { top: CategoryCounts; rest: CategoryCounts };
  };
  typicalFeeCents: number | null;
  flash: {
    firstEdition: number;
    magazines: number;
    alsoPushcart: number;
    leaders: Array<{ name: string; selections: number }>;
  };
}

export interface MagazineIndexCoverage {
  year: number;
  magazineCounts: Record<RankingGenre, number>;
  /** Overall index: how many magazines have each pillar recorded, partial or unknown. */
  pillars: Record<PillarKey, Record<FactStatus, number>>;
  averageCoverage: number | null;
  pushcartRows: number;
  anthologyCitations: number;
  writerReports: number;
  lastUpdated: string | null;
  /** Edition years held for each accolade source (accepted snapshots). */
  sourceEditions: Record<string, number[]>;
  /** When the last scheduled or manual update finished, and how. */
  lastRun: { finishedAt: string; status: string } | null;
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

function nullableNumber(value: unknown): number | null {
  return value == null ? null : Number(value);
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

const RESPONSE_BANDS = [
  "under_3_months",
  "3_to_6_months",
  "over_6_months",
] as const;
const PAY_KINDS = ["cash", "copies_only", "unpaid"] as const;
const SIMULTANEOUS_POLICIES = ["allowed", "conditional", "forbidden"] as const;

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function factSourcesFrom(value: unknown): MagazineRankingRow["factSources"] {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const out: MagazineRankingRow["factSources"] = {};
  for (const [key, entry] of Object.entries(source)) {
    const e = entry as { url?: unknown; recordedOn?: unknown } | null;
    if (e && typeof e.url === "string") {
      out[key] = { url: e.url, recordedOn: typeof e.recordedOn === "string" ? e.recordedOn : "" };
    }
  }
  return out;
}

function pillarStatusFrom(value: unknown): PillarStatusMap {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    PILLAR_KEYS.map((key) => [
      key,
      oneOf(source[key], ["recorded", "partial", "unknown"] as const) ??
        "unknown",
    ]),
  ) as PillarStatusMap;
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
    medianResponseDays: nullableNumber(row.median_response_days),
    responseTimeBand: oneOf(row.response_time_band, RESPONSE_BANDS),
    regularFeeCents: nullableNumber(row.regular_fee_cents),
    chargesReadingFee: nullableBoolean(row.charges_reading_fee),
    contributorPayCents: nullableNumber(row.contributor_pay_cents),
    payKind: oneOf(row.pay_kind, PAY_KINDS),
    simultaneousPolicy: oneOf(row.simultaneous_policy, SIMULTANEOUS_POLICIES),
    debutFriendly: nullableBoolean(row.debut_friendly),
    blindReading: nullableBoolean(row.blind_reading),
    digitalArchive: nullableBoolean(row.digital_archive),
    telemetryReports: Number(row.telemetry_reports ?? 0),
    factSources: factSourcesFrom(row.fact_sources),
    pillarStatus: pillarStatusFrom(row.pillar_status),
    coverage: Number(row.coverage ?? 0),
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

/**
 * One row per publication per year and genre: duplicate profiles that share
 * a website (or, without one, a name) collapse to their best-scoring row.
 * Used by the public list and by the coverage counts so both agree.
 */
const CANONICAL_RANKINGS_CTE = `ranking_candidates AS (
        SELECT
          r.*,
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
            'name:' || REGEXP_REPLACE(LOWER(BTRIM(p.name)), '[^a-z0-9]+', '-', 'g')
          ) AS identity_key
        FROM missa_magazine_rankings r
        JOIN gary_profiles p ON p.id = r.profile_id
      ), canonical_rankings AS (
        SELECT *
        FROM (
          SELECT
            candidate.*,
            ROW_NUMBER() OVER (
              PARTITION BY candidate.ranking_year, candidate.genre, candidate.identity_key
              ORDER BY candidate.total_score DESC, candidate.rank_position ASC, candidate.profile_id ASC
            ) AS identity_position
          FROM ranking_candidates candidate
        ) ranked
        WHERE ranked.identity_position = 1
      )`;

export class PostgresMagazineRankingRepository {
  constructor(private readonly pool: Pool) {}

  async listRankings(
    filter: MagazineRankingsFilter = {},
  ): Promise<MagazineRankingPage> {
    const year =
      filter.year ??
      (await this.latestRankingYear()) ??
      new Date().getFullYear();
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
      ), ${CANONICAL_RANKINGS_CTE}
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
        r.response_time_band,
        r.regular_fee_cents,
        r.charges_reading_fee,
        r.contributor_pay_cents,
        r.pay_kind,
        r.simultaneous_policy,
        r.debut_friendly,
        r.blind_reading,
        r.digital_archive,
        r.telemetry_reports,
        r.fact_sources,
        r.pillar_status,
        r.coverage,
        COUNT(*) OVER() as total_count
      FROM canonical_rankings r
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
    year?: number,
  ): Promise<MagazineRankingRow[]> {
    try {
      const rankingYear = year ?? (await this.latestRankingYear());
      if (rankingYear == null) return [];
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
          r.response_time_band,
          r.regular_fee_cents,
          r.charges_reading_fee,
          r.contributor_pay_cents,
          r.pay_kind,
          r.simultaneous_policy,
          r.debut_friendly,
          r.blind_reading,
          r.digital_archive,
          r.telemetry_reports,
          r.fact_sources,
          r.pillar_status,
          r.coverage
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
        [profileId, rankingYear],
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

  /** The most recent year with stored rankings, or null when the index is empty. */
  async latestRankingYear(): Promise<number | null> {
    const res = await this.pool.query(
      `SELECT MAX(ranking_year) AS year FROM missa_magazine_rankings`,
    );
    const year = res.rows[0]?.year;
    return year == null ? null : Number(year);
  }

  /** Patterns in the published index, for the methodology page's charts. */
  async getIndexAnalytics(year?: number): Promise<MagazineIndexAnalytics | null> {
    const rankingYear = year ?? (await this.latestRankingYear());
    if (rankingYear == null) return null;
    const firstEdition = rankingYear - 4;

    const [overall, honours, flash] = await Promise.all([
      this.pool.query(
        `WITH ${CANONICAL_RANKINGS_CTE}
         SELECT prestige_tier, accolades_score::float AS accolades, regular_fee_cents,
                charges_reading_fee, pay_kind, response_time_band
         FROM canonical_rankings
         WHERE ranking_year = $1 AND genre = 'overall'
         ORDER BY accolades_score DESC, total_score DESC`,
        [rankingYear],
      ),
      this.pool.query(
        `WITH standing AS (
           SELECT profile_id, SUM(source_score)::float AS score,
                  BOOL_OR(status_marker = 'closed') AS closed,
                  BOOL_OR(status_marker IN ('hiatus', 'uncertain')) AS paused
           FROM missa_pushcart_rankings WHERE edition_year = $1 GROUP BY profile_id
         ), ranked AS (
           SELECT *, ROW_NUMBER() OVER (ORDER BY score DESC) AS position FROM standing
         )
         SELECT COUNT(*)::int AS magazines,
                COALESCE(SUM(score), 0)::float AS total,
                COALESCE(SUM(score) FILTER (WHERE position <= 10), 0)::float AS top10,
                COALESCE(SUM(score) FILTER (WHERE position <= 50), 0)::float AS top50,
                COUNT(*) FILTER (WHERE score <= 1)::int AS single,
                COUNT(*) FILTER (WHERE closed)::int AS closed,
                COUNT(*) FILTER (WHERE paused AND NOT closed)::int AS paused
         FROM ranked`,
        [rankingYear],
      ),
      this.pool.query(
        `WITH selections AS (
           SELECT profile_id, COUNT(*)::int AS n FROM missa_literary_awards
           WHERE award_year BETWEEN $2 AND $1 GROUP BY profile_id
         )
         SELECT
           (SELECT COUNT(*)::int FROM selections) AS magazines,
           (SELECT COUNT(*)::int FROM selections s
              WHERE EXISTS (SELECT 1 FROM missa_pushcart_rankings p
                            WHERE p.profile_id = s.profile_id AND p.edition_year = $1)) AS also_pushcart,
           (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
              SELECT g.name, s.n AS selections FROM selections s JOIN gary_profiles g ON g.id = s.profile_id
              ORDER BY s.n DESC, g.name ASC LIMIT 10) t) AS leaders`,
        [rankingYear, firstEdition],
      ),
    ]);

    const rows = overall.rows;
    if (rows.length === 0) return null;
    const tierOrder = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"];
    const tiers = tierOrder.map((prefix) => ({
      tier: prefix,
      count: rows.filter((r) => String(r.prestige_tier).startsWith(prefix)).length,
    }));

    const groups = { top: rows.slice(0, 50), rest: rows.slice(50) };
    const count = (list: Record<string, unknown>[], classify: (r: Record<string, unknown>) => string | null) => {
      const out: CategoryCounts = {};
      for (const row of list) {
        const key = classify(row) ?? "notRecorded";
        out[key] = (out[key] ?? 0) + 1;
      }
      return out;
    };
    const feeClass = (r: Record<string, unknown>) =>
      r.regular_fee_cents === 0 || r.charges_reading_fee === false
        ? "free"
        : r.regular_fee_cents != null || r.charges_reading_fee === true
          ? "charges"
          : null;
    const payClass = (r: Record<string, unknown>) =>
      r.pay_kind === "cash" ? "cash" : r.pay_kind === "copies_only" ? "copies" : r.pay_kind === "unpaid" ? "unpaid" : null;
    const responseClass = (r: Record<string, unknown>) =>
      r.response_time_band === "under_3_months"
        ? "under3"
        : r.response_time_band === "3_to_6_months"
          ? "between3and6"
          : r.response_time_band === "over_6_months"
            ? "over6"
            : null;

    const fees = rows
      .map((r) => (r.regular_fee_cents == null ? null : Number(r.regular_fee_cents)))
      .filter((v): v is number => v != null && v > 0)
      .sort((a, b) => a - b);
    const h = honours.rows[0] ?? {};
    const total = Number(h.total ?? 0);
    const f = flash.rows[0] ?? {};
    const leaders = (typeof f.leaders === "string" ? JSON.parse(f.leaders) : f.leaders) as Array<{
      name: string;
      selections: number;
    }> | null;

    return {
      year: rankingYear,
      tiers,
      honours: {
        magazines: Number(h.magazines ?? 0),
        top10Share: total > 0 ? Number(h.top10) / total : 0,
        top50Share: total > 0 ? Number(h.top50) / total : 0,
        singleRecognition: Number(h.single ?? 0),
        closed: Number(h.closed ?? 0),
        paused: Number(h.paused ?? 0),
      },
      comparison: {
        fees: { top: count(groups.top, feeClass), rest: count(groups.rest, feeClass) },
        pay: { top: count(groups.top, payClass), rest: count(groups.rest, payClass) },
        response: { top: count(groups.top, responseClass), rest: count(groups.rest, responseClass) },
      },
      typicalFeeCents: fees.length ? fees[Math.floor(fees.length / 2)]! : null,
      flash: {
        firstEdition,
        magazines: Number(f.magazines ?? 0),
        alsoPushcart: Number(f.also_pushcart ?? 0),
        leaders: (leaders ?? []).map((l) => ({ name: String(l.name), selections: Number(l.selections) })),
      },
    };
  }

  /** Live magazine counts and per-pillar fact coverage for the methodology page. */
  async getIndexCoverage(year?: number): Promise<MagazineIndexCoverage | null> {
    const rankingYear = year ?? (await this.latestRankingYear());
    if (rankingYear == null) return null;

    const [counts, pillars, sources, editions, lastRun] = await Promise.all([
      this.pool.query(
        `WITH ${CANONICAL_RANKINGS_CTE}
         SELECT genre, COUNT(*)::int AS count, AVG(coverage) AS average_coverage, MAX(updated_at)::text AS updated
         FROM canonical_rankings
         WHERE ranking_year = $1
         GROUP BY genre`,
        [rankingYear],
      ),
      this.pool.query(
        `WITH ${CANONICAL_RANKINGS_CTE}
         SELECT status.key AS pillar, status.value AS status, COUNT(*)::int AS count
         FROM canonical_rankings r,
              LATERAL jsonb_each_text(r.pillar_status) AS status
         WHERE r.ranking_year = $1 AND r.genre = 'overall'
         GROUP BY status.key, status.value`,
        [rankingYear],
      ),
      this.pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM missa_pushcart_rankings WHERE edition_year = $1) AS pushcart_rows,
           (SELECT COUNT(*)::int FROM missa_literary_awards WHERE award_year BETWEEN $1 - 9 AND $1) AS anthology_citations,
           (SELECT COUNT(*)::int FROM missa_submission_telemetry) AS writer_reports`,
        [rankingYear],
      ),
      this.pool
        .query(
          `SELECT source, array_agg(DISTINCT edition_year ORDER BY edition_year) AS years
           FROM missa_ranking_source_snapshots
           WHERE status = 'accepted' AND edition_year <= $1
           GROUP BY source`,
          [rankingYear],
        )
        .catch(() => ({ rows: [] as Record<string, unknown>[] })),
      this.pool
        .query(
          `SELECT finished_at::text AS finished_at, status FROM missa_ranking_runs
           WHERE status IN ('published', 'dry_run') ORDER BY finished_at DESC NULLS LAST LIMIT 1`,
        )
        .catch(() => ({ rows: [] as Record<string, unknown>[] })),
    ]);

    const magazineCounts: Record<RankingGenre, number> = {
      overall: 0,
      fiction: 0,
      poetry: 0,
      nonfiction: 0,
    };
    let averageCoverage: number | null = null;
    let lastUpdated: string | null = null;
    for (const row of counts.rows) {
      const genre = row.genre as RankingGenre;
      magazineCounts[genre] = Number(row.count);
      if (genre === "overall" && row.average_coverage != null) {
        averageCoverage =
          Math.round(Number(row.average_coverage) * 1000) / 1000;
      }
      if (row.updated && (!lastUpdated || row.updated > lastUpdated))
        lastUpdated = String(row.updated);
    }

    const pillarCoverage = Object.fromEntries(
      PILLAR_KEYS.map((key) => [key, { recorded: 0, partial: 0, unknown: 0 }]),
    ) as MagazineIndexCoverage["pillars"];
    for (const row of pillars.rows) {
      const pillar = row.pillar as PillarKey;
      const status = row.status as FactStatus;
      if (pillarCoverage[pillar] && status in pillarCoverage[pillar]) {
        pillarCoverage[pillar][status] = Number(row.count);
      }
    }
    // Rows written before statuses existed have none: count them as unknown.
    for (const key of PILLAR_KEYS) {
      const counted = Object.values(pillarCoverage[key]).reduce(
        (sum, n) => sum + n,
        0,
      );
      pillarCoverage[key].unknown += Math.max(
        0,
        magazineCounts.overall - counted,
      );
    }

    const sourceRow = sources.rows[0] ?? {};
    return {
      year: rankingYear,
      magazineCounts,
      pillars: pillarCoverage,
      averageCoverage,
      pushcartRows: Number(sourceRow.pushcart_rows ?? 0),
      anthologyCitations: Number(sourceRow.anthology_citations ?? 0),
      writerReports: Number(sourceRow.writer_reports ?? 0),
      lastUpdated,
      sourceEditions: Object.fromEntries(
        editions.rows.map((row) => [
          String(row.source),
          (Array.isArray(row.years) ? row.years : []).map(Number),
        ]),
      ),
      lastRun: lastRun.rows[0]?.finished_at
        ? { finishedAt: String(lastRun.rows[0].finished_at), status: String(lastRun.rows[0].status) }
        : null,
    };
  }

  /**
   * Stores one writer report. Reports carry no account identifier. Once a
   * magazine has enough decided reports, their median becomes its recorded
   * response time: the turnaround pillar is rescored with the engine's own
   * function and the whole ranking year is re-ranked and re-tiered.
   */
  async recordSubmissionTelemetry(input: SubmissionTelemetryInput): Promise<{
    success: boolean;
    newMedianDays: number | null;
  }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const id = `telem_${randomUUID().replace(/-/g, "")}`;
      const responseDays = reportResponseDays(input);

      await client.query(
        `INSERT INTO missa_submission_telemetry (
          id, profile_id, genre, submitted_date, decision_date,
          response_days, outcome, rejection_type, fee_paid_cents
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          input.profileId,
          input.genre ?? null,
          input.submittedDate,
          input.decisionDate ?? null,
          responseDays,
          input.outcome ?? null,
          input.rejectionType ?? null,
          input.feePaidCents ?? 0,
        ],
      );

      const median = await refreshTurnaroundFromReports(
        client,
        input.profileId,
      );
      await client.query("COMMIT");
      return { success: true, newMedianDays: median };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error(
        "[PostgresMagazineRankingRepository] Error recording telemetry:",
        err,
      );
      return { success: false, newMedianDays: null };
    } finally {
      client.release();
    }
  }
}

export interface SubmissionTelemetryInput {
  profileId: string;
  genre?: string | null;
  submittedDate: string;
  decisionDate?: string | null;
  responseDays?: number | null;
  outcome?: "accepted" | "rejected" | "withdrawn" | "pending" | null;
  rejectionType?: "form" | "tiered_personal" | "editor_note" | null;
  feePaidCents?: number;
}

function reportResponseDays(input: SubmissionTelemetryInput): number | null {
  if (input.responseDays != null) return input.responseDays;
  if (!input.submittedDate || !input.decisionDate) return null;
  const sent = new Date(input.submittedDate).getTime();
  const decided = new Date(input.decisionDate).getTime();
  if (isNaN(sent) || isNaN(decided) || decided < sent) return null;
  return Math.round((decided - sent) / (1000 * 60 * 60 * 24));
}

type Queryable = Pick<Pool, "query">;

/**
 * Recomputes the report median for one magazine and, when it changes the
 * stored turnaround, rescores and re-ranks the latest ranking year.
 * Returns the recorded median, or null below the report threshold.
 */
export async function refreshTurnaroundFromReports(
  db: Queryable,
  profileId: string,
): Promise<number | null> {
  const stats = await db.query(
    `SELECT COUNT(*)::int AS reports,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY response_days) AS median_days
     FROM missa_submission_telemetry
     WHERE profile_id = $1 AND response_days > 0
       AND outcome IN ('accepted', 'rejected', 'withdrawn')`,
    [profileId],
  );
  const reports = Number(stats.rows[0]?.reports ?? 0);
  const median =
    reports >= MIN_REPORTS_FOR_MEDIAN && stats.rows[0]?.median_days != null
      ? Math.round(Number(stats.rows[0].median_days))
      : null;

  const yearRes = await db.query(
    `SELECT MAX(ranking_year) AS year FROM missa_magazine_rankings WHERE profile_id = $1`,
    [profileId],
  );
  const year = yearRes.rows[0]?.year;
  if (year == null) return median;

  const rows = await db.query(
    `SELECT genre, accolades_score, pay_score, fees_score, respect_score,
            format_ethics_score, response_time_band, pillar_status
     FROM missa_magazine_rankings
     WHERE profile_id = $1 AND ranking_year = $2`,
    [profileId, year],
  );

  const genres: string[] = [];
  for (const row of rows.rows) {
    const status = pillarStatusFrom(row.pillar_status);
    const pillar = (key: PillarKey, score: unknown) => ({
      score: Number(score),
      status: status[key],
    });
    const scored = combinePillars({
      accolades: pillar("accolades", row.accolades_score),
      pay: pillar("pay", row.pay_score),
      turnaround: computeTurnaroundScore({
        medianResponseDays: median,
        responseTimeBand: oneOf(row.response_time_band, RESPONSE_BANDS),
      }),
      fees: pillar("fees", row.fees_score),
      respect: pillar("respect", row.respect_score),
      formatEthics: pillar("formatEthics", row.format_ethics_score),
    });
    await db.query(
      `UPDATE missa_magazine_rankings
       SET median_response_days = $1,
           telemetry_reports = $2,
           turnaround_score = $3,
           total_score = $4,
           prestige_tier = $5,
           pillar_status = $6::jsonb,
           coverage = $7,
           updated_at = NOW()
       WHERE profile_id = $8 AND ranking_year = $9 AND genre = $10`,
      [
        median,
        reports,
        scored.turnaroundScore,
        scored.totalScore,
        scored.tier,
        JSON.stringify(scored.pillarStatus),
        scored.coverage,
        profileId,
        year,
        row.genre,
      ],
    );
    genres.push(String(row.genre));
  }

  for (const genre of genres) await rerankYearGenre(db, Number(year), genre);
  return median;
}

/** Re-assigns rank positions for one year and genre using the engine's order. */
export async function rerankYearGenre(
  db: Queryable,
  year: number,
  genre: string,
): Promise<void> {
  const res = await db.query(
    `SELECT r.profile_id, r.total_score, r.accolades_score, r.rank_position, p.name
     FROM missa_magazine_rankings r
     JOIN gary_profiles p ON p.id = r.profile_id
     WHERE r.ranking_year = $1 AND r.genre = $2`,
    [year, genre],
  );
  const ordered = res.rows
    .map((row) => ({
      profileId: String(row.profile_id),
      name: String(row.name),
      totalScore: Number(row.total_score),
      accoladesScore: Number(row.accolades_score),
      rankPosition: Number(row.rank_position),
    }))
    .sort(compareScored);
  const changedIds: string[] = [];
  const changedRanks: number[] = [];
  ordered.forEach((row, index) => {
    if (row.rankPosition !== index + 1) {
      changedIds.push(row.profileId);
      changedRanks.push(index + 1);
    }
  });
  if (changedIds.length === 0) return;
  await db.query(
    `UPDATE missa_magazine_rankings r
     SET rank_position = moved.rank_position, updated_at = NOW()
     FROM unnest($3::text[], $4::int[]) AS moved(profile_id, rank_position)
     WHERE r.profile_id = moved.profile_id AND r.ranking_year = $1 AND r.genre = $2`,
    [year, genre, changedIds, changedRanks],
  );
}
