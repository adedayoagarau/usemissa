import { Pool } from "pg";
import { extractProfileIntelligence } from "./profileIntelligenceExtractor.js";


export type ProfileKind =
  | "literary_magazine"
  | "small_press"
  | "visual_arts_organization"
  | "gallery"
  | "residency_center"
  | "grant_foundation"
  | "organization";

export interface ProfileBrowseQuery {
  kind?: ProfileKind;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface ProfileCard {
  id: string;
  kind: ProfileKind;
  name: string;
  websiteUrl: string | null;
  summary: string | null;
  genres: string[];
  formats: string[];
  readingPeriod: string | null;
  sourceUrl: string | null;
  mediaUrl: string | null;
  mediaAlt: string | null;
}

export interface ProfileOpportunity {
  id: string;
  title: string;
  organizer: string;
  deadline: string | null;
  detailUrl: string | null;
  officialWebsite: string | null;
  status: "open" | "closed" | "unknown";
}

export interface ProfileVisual {
  id: string;
  assetType: "logo" | "banner" | "issue_cover";
  imageUrl: string;
  label: string | null;
  issueYear: number | null;
  season: string | null;
}

export interface ProfilePrizeWinner {
  id: string;
  contestName: string;
  awardYear: number;
  winnerName: string;
  winningTitle: string | null;
  winningWorkUrl: string | null;
  judgeName: string | null;
}

export interface ProfileIntelligenceData {
  prestigeTier: string;
  foundingYear: number | null;
  honors: string[];
  editorialArchetype: string;
  sentimentTags: string[];
  responseDaysMin: number | null;
  responseDaysMax: number | null;
  responseLabel: string | null;
  queryPolicy: string | null;
}

export interface ProfileDetail extends ProfileCard {
  logoUrl: string | null;
  visuals: ProfileVisual[];
  prizeProvenance: ProfilePrizeWinner[];
  intelligence: ProfileIntelligenceData | null;
  socialLinks: Record<string, string | null>;
  submissionGuidelinesUrl: string | null;
  subgenres: string[];
  bookTypes: string[];
  representativeAuthors: string | null;
  responseTime: string | null;
  readingFee: string | null;
  unsolicitedSubmissions: string | null;
  simultaneousSubmissions: string | null;
  payment: string | null;
  editorialFocus: string | null;
  editorialTips: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactDetails: string | null;
  issuesPerYear: string | null;
  issuePrice: string | null;
  subscriptionPrice: string | null;
  circulation: string | null;
  titlesPerYear: string | null;
  publishesThroughContestsOnly: string | null;
  opportunities: ProfileOpportunity[];
}


export interface ProfileBrowsePage {
  items: ProfileCard[];
  total: number;
}

export interface ProfileMedia {
  payload: Buffer;
  contentType: string;
  byteSize: number;
}

export interface ProfileRepository {
  browse(query: ProfileBrowseQuery): Promise<ProfileBrowsePage>;
  getById(id: string): Promise<ProfileDetail | null>;
  getForOpportunity(opportunityId: string): Promise<ProfileCard | null>;
  getMediaByProfileId(id: string): Promise<ProfileMedia | null>;
}

function jsonArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function card(row: Record<string, unknown>): ProfileCard {
  return {
    id: String(row.id),
    kind: row.profile_kind as ProfileKind,
    name: String(row.name),
    websiteUrl: nullableText(row.website_url),
    summary: nullableText(row.source_summary),
    genres: jsonArray(row.genres_json),
    formats: jsonArray(row.formats_json),
    readingPeriod: nullableText(row.reading_period),
    sourceUrl: nullableText(row.source_detail_url),
    mediaUrl: nullableText(row.media_url),
    mediaAlt: nullableText(row.media_alt),
  };
}

export class PostgresProfileRepository implements ProfileRepository {
  constructor(private readonly pool: Pool) {}

  async browse(query: ProfileBrowseQuery): Promise<ProfileBrowsePage> {
    const values: unknown[] = [];
    const filters: string[] = [];
    if (query.kind) {
      values.push(query.kind);
      filters.push(`p.profile_kind = $${values.length}`);
    }
    if (query.query?.trim()) {
      values.push(`%${query.query.trim()}%`);
      filters.push(
        `(p.name ILIKE $${values.length} OR o.source_summary ILIKE $${values.length} OR o.editorial_focus ILIKE $${values.length})`,
      );
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    values.push(Math.min(Math.max(query.limit ?? 24, 1), 100));
    const limit = values.length;
    values.push(Math.max(query.offset ?? 0, 0));
    const offset = values.length;
    const result = await this.pool.query({
      text: `
      WITH latest AS (
        SELECT DISTINCT ON (profile_id) * FROM gary_profile_observations
        ORDER BY profile_id, observed_at DESC
      ), media AS (
        SELECT DISTINCT ON (profile_page_id) profile_page_id, COALESCE(final_url, original_url) AS media_url, NULLIF(BTRIM(alt_text), '') AS media_alt
        FROM gary_profile_media_assets WHERE kind = 'image' AND error IS NULL
        ORDER BY profile_page_id, created_at
      )
      SELECT p.id, p.profile_kind, p.name, p.website_url,
        o.source_summary, o.genres_json, o.formats_json, o.reading_period,
        o.source_detail_url, m.media_url, m.media_alt, count(*) OVER() AS total_count
      FROM gary_profiles p JOIN latest o ON o.profile_id = p.id
      LEFT JOIN gary_profile_pages pg ON pg.profile_observation_id = o.id AND pg.role = 'profile'
      LEFT JOIN media m ON m.profile_page_id = pg.id
      ${where} ORDER BY p.name ASC LIMIT $${limit} OFFSET $${offset}`,
      values,
    });
    return {
      items: result.rows.map(card),
      total: Number(result.rows[0]?.total_count ?? 0),
    };
  }

  async getById(id: string): Promise<ProfileDetail | null> {
    const result = await this.pool.query({
      text: `
      WITH latest AS (SELECT DISTINCT ON (profile_id) * FROM gary_profile_observations ORDER BY profile_id, observed_at DESC),
      media AS (SELECT DISTINCT ON (profile_page_id) profile_page_id, COALESCE(final_url, original_url) AS media_url, NULLIF(BTRIM(alt_text), '') AS media_alt FROM gary_profile_media_assets WHERE kind='image' AND error IS NULL ORDER BY profile_page_id, created_at)
      SELECT p.id, p.profile_kind, p.name, p.website_url, o.*, m.media_url, m.media_alt
      FROM gary_profiles p JOIN latest o ON o.profile_id=p.id
      LEFT JOIN gary_profile_pages pg ON pg.profile_observation_id=o.id AND pg.role='profile'
      LEFT JOIN media m ON m.profile_page_id=pg.id WHERE p.id=$1`,
      values: [id],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const base = card(row);
    const links = await this.pool.query({ text: `
      SELECT * FROM (
        SELECT o.id, o.title, o.organizer, o.official_website, oco.deadline, oco.source_detail_url,
          CASE WHEN oco.deadline IS NULL THEN 'unknown' WHEN oco.deadline >= CURRENT_DATE THEN 'open' ELSE 'closed' END AS status
        FROM gary_profile_links l JOIN gary_opportunities o ON o.id=l.opportunity_id
        LEFT JOIN LATERAL (SELECT * FROM gary_call_observations WHERE opportunity_id=o.id ORDER BY observed_at DESC LIMIT 1) oco ON TRUE
        WHERE l.profile_id=$1 AND l.status='confirmed'
        UNION ALL
        SELECT o.id, o.title, p.name AS organizer,
          COALESCE(o.guidelines_url, s.url) AS official_website,
          o.deadline_date AS deadline, s.url AS source_detail_url,
          CASE WHEN o.status IN ('open', 'opening-soon', 'closing-soon', 'deadline-extended') THEN 'open'
               WHEN o.status IN ('closed', 'archived') THEN 'closed' ELSE 'unknown' END AS status
        FROM opportunity_profile_links l
        JOIN opportunities o ON o.id=l.opportunity_id
        JOIN opportunity_sources s ON s.id=o.source_id
        JOIN gary_profiles p ON p.id=l.profile_id
        WHERE l.profile_id=$1 AND l.status='confirmed' AND l.verified_until > now()
          AND o.publication_state='published'
      ) linked ORDER BY deadline NULLS LAST, title`, values: [id] });

    let visuals: ProfileVisual[] = [];
    try {
      const visRes = await this.pool.query({
        text: `SELECT id, asset_type, image_url, label, issue_year, season FROM gary_profile_visuals WHERE profile_id=$1 ORDER BY created_at DESC`,
        values: [id],
      });
      visuals = visRes.rows.map((r) => ({
        id: String(r.id),
        assetType: r.asset_type as "logo" | "banner" | "issue_cover",
        imageUrl: String(r.image_url),
        label: nullableText(r.label),
        issueYear: r.issue_year != null ? Number(r.issue_year) : null,
        season: nullableText(r.season),
      }));
    } catch {
      // Table may not exist yet or empty
    }

    let prizeProvenance: ProfilePrizeWinner[] = [];
    try {
      const prizeRes = await this.pool.query({
        text: `SELECT id, contest_name, award_year, winner_name, winning_title, winning_work_url, judge_name FROM gary_prize_provenance WHERE profile_id=$1 ORDER BY award_year DESC`,
        values: [id],
      });
      prizeProvenance = prizeRes.rows.map((r) => ({
        id: String(r.id),
        contestName: String(r.contest_name),
        awardYear: Number(r.award_year),
        winnerName: String(r.winner_name),
        winningTitle: nullableText(r.winning_title),
        winningWorkUrl: nullableText(r.winning_work_url),
        judgeName: nullableText(r.judge_name),
      }));
    } catch {
      // Table may not exist yet or empty
    }

    let intelligence: ProfileIntelligenceData | null = null;
    let socialLinks: Record<string, string | null> = {};
    try {
      const intelRes = await this.pool.query({
        text: `SELECT * FROM gary_profile_intelligence WHERE profile_id=$1`,
        values: [id],
      });
      if (intelRes.rows.length > 0) {
        const ir = intelRes.rows[0];
        intelligence = {
          prestigeTier: String(ir.prestige_tier || "Tier 3 (Emerging & Community)"),
          foundingYear: ir.founding_year != null ? Number(ir.founding_year) : null,
          honors: jsonArray(ir.honors),
          editorialArchetype: String(ir.editorial_archetype || "Eclectic & Open"),
          sentimentTags: jsonArray(ir.sentiment_tags),
          responseDaysMin: ir.response_days_min != null ? Number(ir.response_days_min) : null,
          responseDaysMax: ir.response_days_max != null ? Number(ir.response_days_max) : null,
          responseLabel: nullableText(ir.response_label),
          queryPolicy: nullableText(ir.query_policy),
        };
        socialLinks = (typeof ir.social_links === "object" && ir.social_links !== null ? ir.social_links : {}) as Record<string, string | null>;
      }
    } catch {
      // Table may not exist yet or empty
    }

    // Dynamic fallback if not backfilled in DB yet
    if (!intelligence) {
      const computed = extractProfileIntelligence({
        responseTime: nullableText(row.response_time),
        editorialFocus: nullableText(row.editorial_focus),
        editorialTips: nullableText(row.editorial_tips),
        representativeAuthors: nullableText(row.representative_authors),
        circulation: nullableText(row.circulation),
        fullText: nullableText(row.full_text),
      });
      intelligence = {
        prestigeTier: computed.prestige.prestigeTier,
        foundingYear: computed.prestige.foundingYear,
        honors: computed.prestige.honors,
        editorialArchetype: computed.demeanor.archetype,
        sentimentTags: computed.demeanor.sentimentTags,
        responseDaysMin: computed.responseTime.minDays,
        responseDaysMax: computed.responseTime.maxDays,
        responseLabel: computed.responseTime.label,
        queryPolicy: computed.responseTime.queryAllowedAfterDays ? `Queries allowed after ${computed.responseTime.queryAllowedAfterDays} days` : null,
      };
    }

    const logoUrl = visuals.find((v) => v.assetType === "logo")?.imageUrl || base.mediaUrl;

    return {
      ...base,
      logoUrl,
      visuals,
      prizeProvenance,
      intelligence,
      socialLinks,
      submissionGuidelinesUrl: nullableText(row.submission_guidelines_url),
      subgenres: jsonArray(row.subgenres_json),
      bookTypes: jsonArray(row.book_types_json),
      representativeAuthors: nullableText(row.representative_authors),
      responseTime: nullableText(row.response_time),
      readingFee: nullableText(row.reading_fee),
      unsolicitedSubmissions: nullableText(row.unsolicited_submissions),
      simultaneousSubmissions: nullableText(row.simultaneous_submissions),
      payment: nullableText(row.payment),
      editorialFocus: nullableText(row.editorial_focus),
      editorialTips: nullableText(row.editorial_tips),
      contactName: nullableText(row.contact_name),
      contactEmail: nullableText(row.contact_email),
      contactDetails: nullableText(row.contact_details),
      issuesPerYear: nullableText(row.issues_per_year),
      issuePrice: nullableText(row.issue_price),
      subscriptionPrice: nullableText(row.subscription_price),
      circulation: nullableText(row.circulation),
      titlesPerYear: nullableText(row.titles_per_year),
      publishesThroughContestsOnly: nullableText(
        row.publishes_through_contests_only,
      ),
      opportunities: links.rows.map((item) => ({
        id: item.id,
        title: item.title,
        organizer: item.organizer,
        deadline: item.deadline,
        detailUrl: item.source_detail_url,
        officialWebsite: item.official_website,
        status: item.status,
      })),
    };
  }


  async getMediaByProfileId(id: string): Promise<ProfileMedia | null> {
    const result = await this.pool.query({
      text: `
      WITH latest AS (
        SELECT id
        FROM gary_profile_observations
        WHERE profile_id = $1
        ORDER BY observed_at DESC
        LIMIT 1
      ), profile_media AS (
        SELECT a.blob_id, a.content_type
        FROM latest o
        JOIN gary_profile_pages pg ON pg.profile_observation_id = o.id AND pg.role = 'profile'
        JOIN gary_profile_media_assets a ON a.profile_page_id = pg.id
        WHERE a.kind = 'image' AND a.error IS NULL AND a.blob_id IS NOT NULL
        ORDER BY a.created_at DESC
        LIMIT 1
      )
      SELECT b.payload,
        COALESCE(NULLIF(pm.content_type, ''), b.content_type, 'application/octet-stream') AS content_type,
        COALESCE(b.byte_size, OCTET_LENGTH(b.payload)) AS byte_size
      FROM profile_media pm
      JOIN gary_media_blobs b ON b.id = pm.blob_id
      WHERE b.payload IS NOT NULL`,
      values: [id],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    const payload = row?.payload as Buffer | undefined;
    if (!payload?.length) return null;
    return {
      payload,
      contentType: String(row?.content_type ?? "application/octet-stream"),
      byteSize: Number(row?.byte_size ?? payload.length),
    };
  }

  async getForOpportunity(opportunityId: string): Promise<ProfileCard | null> {
    const result = await this.pool.query({ text: `
      WITH latest AS (
        SELECT DISTINCT ON (profile_id) * FROM gary_profile_observations
        ORDER BY profile_id, observed_at DESC
      ), media AS (
        SELECT DISTINCT ON (profile_page_id) profile_page_id, COALESCE(final_url, original_url) AS media_url
        FROM gary_profile_media_assets WHERE kind = 'image' AND error IS NULL
        ORDER BY profile_page_id, created_at
      )
      SELECT p.id, p.profile_kind, p.name, p.website_url,
        o.source_summary, o.genres_json, o.formats_json, o.reading_period,
        o.last_updated, o.source_detail_url, o.observed_at, m.media_url
      FROM opportunity_profile_links l
      JOIN gary_profiles p ON p.id=l.profile_id
      JOIN latest o ON o.profile_id=p.id
      LEFT JOIN gary_profile_pages pg ON pg.profile_observation_id=o.id AND pg.role='profile'
      LEFT JOIN media m ON m.profile_page_id=pg.id
      WHERE l.opportunity_id=$1 AND l.status='confirmed' AND l.verified_until > now()
      ORDER BY l.confidence DESC, p.name ASC LIMIT 1`, values: [opportunityId] });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? card(row) : null;
  }
}

export function createPostgresProfileRepositoryFromUrl(
  connectionString: string,
): ProfileRepository {
  return new PostgresProfileRepository(new Pool({ connectionString, max: 4 }));
}
