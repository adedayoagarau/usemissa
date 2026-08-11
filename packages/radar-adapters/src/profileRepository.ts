import { Pool } from "pg";

export type ProfileKind = "literary_magazine" | "small_press";

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
  lastUpdated: string | null;
  sourceUrl: string | null;
  mediaUrl: string | null;
  profileCheckedAt: string | null;
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

export interface ProfileDetail extends ProfileCard {
  submissionGuidelinesUrl: string | null;
  subgenres: string[];
  bookTypes: string[];
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
  opportunities: ProfileOpportunity[];
}

export interface ProfileBrowsePage {
  items: ProfileCard[];
  total: number;
}

export interface ProfileRepository {
  browse(query: ProfileBrowseQuery): Promise<ProfileBrowsePage>;
  getById(id: string): Promise<ProfileDetail | null>;
}

function jsonArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function card(row: Record<string, unknown>): ProfileCard {
  return {
    id: String(row.id), kind: row.profile_kind as ProfileKind, name: String(row.name),
    websiteUrl: (row.website_url as string | null) ?? null,
    summary: (row.source_summary as string | null) ?? null,
    genres: jsonArray(row.genres_json), formats: jsonArray(row.formats_json),
    readingPeriod: (row.reading_period as string | null) ?? null,
    lastUpdated: (row.last_updated as string | null) ?? null,
    sourceUrl: (row.source_detail_url as string | null) ?? null,
    mediaUrl: (row.media_url as string | null) ?? null,
    profileCheckedAt: row.observed_at ? new Date(String(row.observed_at)).toISOString() : null,
  };
}

export class PostgresProfileRepository implements ProfileRepository {
  constructor(private readonly pool: Pool) {}

  async browse(query: ProfileBrowseQuery): Promise<ProfileBrowsePage> {
    const values: unknown[] = [];
    const filters: string[] = [];
    if (query.kind) { values.push(query.kind); filters.push(`p.profile_kind = $${values.length}`); }
    if (query.query?.trim()) {
      values.push(`%${query.query.trim()}%`);
      filters.push(`(p.name ILIKE $${values.length} OR o.source_summary ILIKE $${values.length} OR o.editorial_focus ILIKE $${values.length})`);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    values.push(Math.min(Math.max(query.limit ?? 24, 1), 100));
    const limit = values.length;
    values.push(Math.max(query.offset ?? 0, 0));
    const offset = values.length;
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
        o.last_updated, o.source_detail_url, o.observed_at, m.media_url, count(*) OVER() AS total_count
      FROM gary_profiles p JOIN latest o ON o.profile_id = p.id
      LEFT JOIN gary_profile_pages pg ON pg.profile_observation_id = o.id AND pg.role = 'profile'
      LEFT JOIN media m ON m.profile_page_id = pg.id
      ${where} ORDER BY p.name ASC LIMIT $${limit} OFFSET $${offset}`,
      values,
    });
    return { items: result.rows.map(card), total: Number(result.rows[0]?.total_count ?? 0) };
  }

  async getById(id: string): Promise<ProfileDetail | null> {
    const result = await this.pool.query({ text: `
      WITH latest AS (SELECT DISTINCT ON (profile_id) * FROM gary_profile_observations ORDER BY profile_id, observed_at DESC),
      media AS (SELECT DISTINCT ON (profile_page_id) profile_page_id, COALESCE(final_url, original_url) AS media_url FROM gary_profile_media_assets WHERE kind='image' AND error IS NULL ORDER BY profile_page_id, created_at)
      SELECT p.id, p.profile_kind, p.name, p.website_url, o.*, m.media_url
      FROM gary_profiles p JOIN latest o ON o.profile_id=p.id
      LEFT JOIN gary_profile_pages pg ON pg.profile_observation_id=o.id AND pg.role='profile'
      LEFT JOIN media m ON m.profile_page_id=pg.id WHERE p.id=$1`, values: [id] });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const base = card(row);
    const links = await this.pool.query({ text: `
      SELECT o.id, o.title, o.organizer, o.official_website, oco.deadline, oco.source_detail_url,
        CASE WHEN oco.deadline IS NULL THEN 'unknown' WHEN oco.deadline >= CURRENT_DATE THEN 'open' ELSE 'closed' END AS status
      FROM gary_profile_links l JOIN gary_opportunities o ON o.id=l.opportunity_id
      LEFT JOIN LATERAL (SELECT * FROM gary_call_observations WHERE opportunity_id=o.id ORDER BY observed_at DESC LIMIT 1) oco ON TRUE
      WHERE l.profile_id=$1 AND l.status='confirmed' ORDER BY oco.deadline NULLS LAST, o.title`, values: [id] });
    return {
      ...base, submissionGuidelinesUrl: (row.submission_guidelines_url as string | null) ?? null,
      subgenres: jsonArray(row.subgenres_json), bookTypes: jsonArray(row.book_types_json),
      responseTime: (row.response_time as string | null) ?? null, readingFee: (row.reading_fee as string | null) ?? null,
      unsolicitedSubmissions: (row.unsolicited_submissions as string | null) ?? null,
      simultaneousSubmissions: (row.simultaneous_submissions as string | null) ?? null,
      payment: (row.payment as string | null) ?? null, editorialFocus: (row.editorial_focus as string | null) ?? null,
      editorialTips: (row.editorial_tips as string | null) ?? null, contactName: (row.contact_name as string | null) ?? null,
      contactEmail: (row.contact_email as string | null) ?? null, contactDetails: (row.contact_details as string | null) ?? null,
      opportunities: links.rows.map((item) => ({ id: item.id, title: item.title, organizer: item.organizer, deadline: item.deadline, detailUrl: item.source_detail_url, officialWebsite: item.official_website, status: item.status })),
    };
  }
}

export function createPostgresProfileRepositoryFromUrl(connectionString: string): ProfileRepository {
  return new PostgresProfileRepository(new Pool({ connectionString, max: 4 }));
}
