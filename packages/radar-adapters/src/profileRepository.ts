import { Pool } from "pg";
import { extractProfileIntelligence } from "./profileIntelligenceExtractor.js";
import { cleanCrawledText, cleanTitleOrLabel } from "./cleanText.js";
import type { OrganizationEditorialProfile } from "./editorialWriter.js";
import {
  getProfileIssuesFromDb,
  type ProfileIssueRecord,
  type ProfileIssuesResponse,
  type IssueRefreshState,
} from "./profileIssueDiscovery.js";
import {
  getOrganizationMediaBundle,
  type OrganizationMediaBundle,
  type OrganizationMediaRecord,
  type MediaGroup,
} from "./organizationMediaDiscovery.js";
import {
  resolveMagazineSchedule,
  type MagazineScheduleResult,
  type MagazineScheduleState,
  type MagazineScheduleTone,
} from "@missa/radar-engine";

export type {
  ProfileIssueRecord,
  ProfileIssuesResponse,
  IssueRefreshState,
  OrganizationMediaBundle,
  OrganizationMediaRecord,
  MediaGroup,
  MagazineScheduleResult,
  MagazineScheduleState,
  MagazineScheduleTone,
};
export { resolveMagazineSchedule };


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
  nameOnly?: boolean;
  scheduleState?: "open" | "always_open" | "closing_soon" | "opening_soon" | "closed" | "all";
  sortBy?: "name_asc" | "opening_soonest" | "closing_soonest" | "recently_updated";
  limit?: number;
  offset?: number;
}

export interface ProfileCard {
  id: string;
  slug: string;
  kind: ProfileKind;
  name: string;
  websiteUrl: string | null;
  summary: string | null;
  genres: string[];
  formats: string[];
  readingPeriod: string | null;
  schedule?: MagazineScheduleResult | null;
  sourceUrl: string | null;
  mediaUrl: string | null;
  mediaAlt: string | null;
  mediaBundle?: OrganizationMediaBundle | null;
}

export function getSemanticUrlForProfile(kind: ProfileKind, slug: string): string {
  switch (kind) {
    case "residency_center":
      return `/residency/${slug}`;
    case "literary_magazine":
      return `/journal/${slug}`;
    case "small_press":
      return `/press/${slug}`;
    case "grant_foundation":
      return `/grant/${slug}`;
    default:
      return `/org/${slug}`;
  }
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
  /** Wide editorial/banner art for the profile hero — not the logo mark. */
  bannerUrl: string | null;
  bannerAlt: string | null;
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
  editorialProfile?: OrganizationEditorialProfile | null;
  opportunities: ProfileOpportunity[];
  mediaBundle?: OrganizationMediaBundle | null;
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
  getProfileIssues(
    profileId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ProfileIssuesResponse>;
  getOrganizationMedia(
    profileId: string,
    options?: { limitPerGroup?: number },
  ): Promise<OrganizationMediaBundle>;
}

function jsonArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function card(row: Record<string, unknown>, extra?: { opportunities?: ProfileOpportunity[] }): ProfileCard {
  const nameSlug = String(row.name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  const rawKey = String(row.name_key || row.canonical_key || row.id);
  const keySlug = rawKey
    .replace(/^(res|aca|otm|artconn|prof_org|org_resartis|org_artconn|org_aca|org_otm|profile):?_?/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");

  const cleanSlug = nameSlug.length >= 3 ? nameSlug : (keySlug || String(row.id));
  const readingPeriod = nullableText(row.reading_period);
  const isPublication = row.profile_kind === "literary_magazine" || row.profile_kind === "small_press";
  const schedule = isPublication
    ? resolveMagazineSchedule({
        readingPeriod,
        opportunities: extra?.opportunities,
      })
    : null;

  return {
    id: String(row.id),
    slug: cleanSlug,
    kind: row.profile_kind as ProfileKind,
    name: cleanTitleOrLabel(String(row.name)),
    websiteUrl: nullableText(row.website_url),
    summary: row.source_summary ? cleanCrawledText(String(row.source_summary)) : null,
    genres: jsonArray(row.genres_json),
    formats: jsonArray(row.formats_json),
    readingPeriod,
    schedule,
    sourceUrl: nullableText(row.source_detail_url),
    mediaUrl: nullableText(row.media_url),
    mediaAlt: row.media_alt ? cleanTitleOrLabel(String(row.media_alt)) : null,
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
        query.nameOnly ? `p.name ILIKE $${values.length}` : `(p.name ILIKE $${values.length} OR o.source_summary ILIKE $${values.length} OR o.editorial_focus ILIKE $${values.length} OR (ro.data->>'biography') ILIKE $${values.length})`,
      );
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const scheduleFilter = query.scheduleState && query.scheduleState !== "all" ? query.scheduleState : null;
    const isScheduleSort = query.sortBy === "opening_soonest" || query.sortBy === "closing_soonest";

    if (scheduleFilter || isScheduleSort) {
      const result = await this.pool.query({
        text: `
        WITH latest AS (
          SELECT DISTINCT ON (profile_id) * FROM gary_profile_observations
          ORDER BY profile_id, observed_at DESC
        ), media AS (
          SELECT DISTINCT ON (profile_page_id) profile_page_id, COALESCE(final_url, original_url) AS media_url, NULLIF(BTRIM(alt_text), '') AS media_alt
          FROM gary_profile_media_assets WHERE kind = 'image' AND error IS NULL
          ORDER BY profile_page_id, created_at
        ), visuals AS (
          SELECT DISTINCT ON (profile_id) profile_id, image_url AS visual_url, label AS visual_alt
          FROM gary_profile_visuals
          WHERE asset_type = 'logo'
          ORDER BY profile_id, created_at DESC
        ), intel AS (
          SELECT profile_id, sentiment_tags FROM gary_profile_intelligence
        )
        SELECT p.id, p.profile_kind, p.name, p.website_url,
          COALESCE(o.source_summary, (ro.data->>'biography')) as source_summary,
          COALESCE(o.genres_json, intel.sentiment_tags, '[]'::jsonb) as genres_json,
          o.formats_json, o.reading_period,
          o.source_detail_url,
          COALESCE(org_media.lead_url, visuals.visual_url, m.media_url) as media_url,
          COALESCE(org_media.lead_alt, visuals.visual_alt, m.media_alt, p.name) as media_alt
        FROM gary_profiles p
        LEFT JOIN radar_organizations ro ON ro.id = p.id
        LEFT JOIN latest o ON o.profile_id = p.id
        LEFT JOIN gary_profile_pages pg ON pg.profile_observation_id = o.id AND pg.role = 'profile'
        LEFT JOIN media m ON m.profile_page_id = pg.id
        LEFT JOIN visuals ON visuals.profile_id = p.id
        LEFT JOIN intel ON intel.profile_id = p.id
        LEFT JOIN LATERAL (
          SELECT image_url AS lead_url, COALESCE(NULLIF(BTRIM(alt_text), ''), NULLIF(BTRIM(title), ''), p.name) AS lead_alt
          FROM gary_organization_media
          WHERE profile_id = p.id AND review_status = 'verified'
          ORDER BY is_lead DESC, (media_group = 'identity') DESC, display_order ASC, created_at DESC
          LIMIT 1
        ) org_media ON true
        ${where} ORDER BY p.name ASC`,
        values,
      });

      const cards = result.rows.map((row) => card(row));
      let filtered = cards;

      if (scheduleFilter) {
        filtered = cards.filter((item) => {
          if (!item.schedule) return false;
          if (scheduleFilter === "open") {
            return item.schedule.state === "open" || item.schedule.state === "always_open";
          }
          return item.schedule.state === scheduleFilter;
        });
      }

      if (query.sortBy === "opening_soonest") {
        filtered.sort((a, b) => {
          const aOpening = a.schedule?.state === "opening_soon";
          const bOpening = b.schedule?.state === "opening_soon";
          if (aOpening && !bOpening) return -1;
          if (!aOpening && bOpening) return 1;
          if (aOpening && bOpening && a.schedule?.nextDate && b.schedule?.nextDate) {
            const cmp = a.schedule.nextDate.localeCompare(b.schedule.nextDate);
            if (cmp !== 0) return cmp;
          }
          const aOpen = a.schedule?.state === "open" || a.schedule?.state === "always_open";
          const bOpen = b.schedule?.state === "open" || b.schedule?.state === "always_open";
          if (aOpen && !bOpen) return -1;
          if (!aOpen && bOpen) return 1;
          return a.name.localeCompare(b.name);
        });
      } else if (query.sortBy === "closing_soonest") {
        filtered.sort((a, b) => {
          const aClosing = a.schedule?.state === "closing_soon";
          const bClosing = b.schedule?.state === "closing_soon";
          if (aClosing && !bClosing) return -1;
          if (!aClosing && bClosing) return 1;
          if (aClosing && bClosing && a.schedule?.nextDate && b.schedule?.nextDate) {
            const cmp = a.schedule.nextDate.localeCompare(b.schedule.nextDate);
            if (cmp !== 0) return cmp;
          }
          const aOpen = a.schedule?.state === "open";
          const bOpen = b.schedule?.state === "open";
          if (aOpen && !bOpen) return -1;
          if (!aOpen && bOpen) return 1;
          if (aOpen && bOpen && a.schedule?.nextDate && b.schedule?.nextDate) {
            const cmp = a.schedule.nextDate.localeCompare(b.schedule.nextDate);
            if (cmp !== 0) return cmp;
          }
          const aAlways = a.schedule?.state === "always_open";
          const bAlways = b.schedule?.state === "always_open";
          if (aAlways && !bAlways) return -1;
          if (!aAlways && bAlways) return 1;
          return a.name.localeCompare(b.name);
        });
      }

      const limit = Math.min(Math.max(query.limit ?? 24, 1), 100);
      const offset = Math.max(query.offset ?? 0, 0);
      return {
        items: filtered.slice(offset, offset + limit),
        total: filtered.length,
      };
    }

    const orderClause =
      query.sortBy === "recently_updated"
        ? "ORDER BY o.observed_at DESC NULLS LAST, p.name ASC"
        : "ORDER BY p.name ASC";

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
      ), visuals AS (
        SELECT DISTINCT ON (profile_id) profile_id, image_url AS visual_url, label AS visual_alt
        FROM gary_profile_visuals
        WHERE asset_type = 'logo'
        ORDER BY profile_id, created_at DESC
      ), intel AS (
        SELECT profile_id, sentiment_tags FROM gary_profile_intelligence
      )
      SELECT p.id, p.profile_kind, p.name, p.website_url,
        COALESCE(o.source_summary, (ro.data->>'biography')) as source_summary,
        COALESCE(o.genres_json, intel.sentiment_tags, '[]'::jsonb) as genres_json,
        o.formats_json, o.reading_period,
        o.source_detail_url,
        COALESCE(org_media.lead_url, visuals.visual_url, m.media_url) as media_url,
        COALESCE(org_media.lead_alt, visuals.visual_alt, m.media_alt, p.name) as media_alt,
        count(*) OVER() AS total_count
      FROM gary_profiles p
      LEFT JOIN radar_organizations ro ON ro.id = p.id
      LEFT JOIN latest o ON o.profile_id = p.id
      LEFT JOIN gary_profile_pages pg ON pg.profile_observation_id = o.id AND pg.role = 'profile'
      LEFT JOIN media m ON m.profile_page_id = pg.id
      LEFT JOIN visuals ON visuals.profile_id = p.id
      LEFT JOIN intel ON intel.profile_id = p.id
      LEFT JOIN LATERAL (
        SELECT image_url AS lead_url, COALESCE(NULLIF(BTRIM(alt_text), ''), NULLIF(BTRIM(title), ''), p.name) AS lead_alt
        FROM gary_organization_media
        WHERE profile_id = p.id AND review_status = 'verified'
        ORDER BY is_lead DESC, (media_group = 'identity') DESC, display_order ASC, created_at DESC
        LIMIT 1
      ) org_media ON true
      ${where} ${orderClause} LIMIT $${limit} OFFSET $${offset}`,
      values,
    });
    return {
      items: result.rows.map((row) => card(row)),
      total: Number(result.rows[0]?.total_count ?? 0),
    };
  }

  async getById(idOrSlug: string): Promise<ProfileDetail | null> {
    const result = await this.pool.query({
      text: `
      WITH latest AS (
        SELECT DISTINCT ON (profile_id) * FROM gary_profile_observations
        ORDER BY profile_id, observed_at DESC
      ), media AS (
        SELECT DISTINCT ON (profile_page_id) profile_page_id, COALESCE(final_url, original_url) AS media_url, NULLIF(BTRIM(alt_text), '') AS media_alt
        FROM gary_profile_media_assets WHERE kind='image' AND error IS NULL
        ORDER BY profile_page_id, created_at
      ), visuals AS (
        SELECT DISTINCT ON (profile_id) profile_id, image_url AS visual_url, label AS visual_alt
        FROM gary_profile_visuals
        WHERE asset_type = 'logo'
        ORDER BY profile_id, created_at DESC
      ), intel AS (
        SELECT profile_id, sentiment_tags FROM gary_profile_intelligence
      )
      SELECT p.id, p.profile_kind, p.name, p.website_url, p.name_key, p.canonical_key,
        COALESCE(o.source_summary, (ro.data->>'biography')) as source_summary,
        COALESCE(o.genres_json, intel.sentiment_tags, '[]'::jsonb) as genres_json,
        o.formats_json, o.reading_period, o.source_detail_url,
        COALESCE(org_media.lead_url, visuals.visual_url, m.media_url) as media_url,
        COALESCE(org_media.lead_alt, visuals.visual_alt, m.media_alt, p.name) as media_alt,
        o.submission_guidelines_url, o.subgenres_json, o.book_types_json,
        o.representative_authors, o.response_time, o.reading_fee,
        o.unsolicited_submissions, o.simultaneous_submissions, o.payment,
        o.editorial_focus, o.editorial_tips, o.contact_name,
        COALESCE(o.contact_email, (ro.data->>'contact_email')) as contact_email,
        o.contact_details, o.issues_per_year, o.issue_price, o.subscription_price,
        o.circulation, o.titles_per_year, o.publishes_through_contests_only,
        ro.data->'editorialProfile' as editorial_profile
      FROM gary_profiles p
      LEFT JOIN radar_organizations ro ON ro.id = p.id
      LEFT JOIN latest o ON o.profile_id = p.id
      LEFT JOIN gary_profile_pages pg ON pg.profile_observation_id = o.id AND pg.role = 'profile'
      LEFT JOIN media m ON m.profile_page_id = pg.id
      LEFT JOIN visuals ON visuals.profile_id = p.id
      LEFT JOIN intel ON intel.profile_id = p.id
      LEFT JOIN LATERAL (
        SELECT image_url AS lead_url, COALESCE(NULLIF(BTRIM(alt_text), ''), NULLIF(BTRIM(title), ''), p.name) AS lead_alt
        FROM gary_organization_media
        WHERE profile_id = p.id AND review_status = 'verified'
        ORDER BY is_lead DESC, (media_group = 'identity') DESC, display_order ASC, created_at DESC
        LIMIT 1
      ) org_media ON true
      WHERE p.id = $1 
         OR p.id = (SELECT target_profile_id FROM gary_profile_redirects WHERE source_id_or_slug = $1 LIMIT 1)
         OR p.name_key = $1
         OR p.name_key = replace($1, '-', ' ')
         OR p.name_key = replace($1, '-', '_')
         OR p.canonical_key = $1
         OR p.canonical_key = 'res:' || replace($1, '-', '_')
         OR p.canonical_key = 'aca:' || replace($1, '-', '_')
         OR p.canonical_key = 'otm:' || replace($1, '-', '_')
         OR p.canonical_key = 'artconn:' || replace($1, '-', '_')
         OR p.canonical_key = 'rivet:' || replace($1, '-', '_')
         OR p.canonical_key = 'trans:' || replace($1, '-', '_')
         OR regexp_replace(lower(p.name), '[^a-z0-9]+', '-', 'g') = $1
      LIMIT 1;`,
      values: [idOrSlug],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const actualId = String(row.id);
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
          COALESCE(o.submission_url, o.guidelines_url) AS official_website,
          o.deadline_date AS deadline, o.guidelines_url AS source_detail_url,
          CASE WHEN o.status IN ('open', 'opening-soon', 'closing-soon', 'deadline-extended') THEN 'open'
               WHEN o.status IN ('closed', 'archived') THEN 'closed' ELSE 'unknown' END AS status
        FROM opportunities o
        JOIN gary_profiles p ON p.id = o.organization_id
        WHERE o.organization_id = $1 AND o.publication_state = 'published'
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
      ) linked ORDER BY deadline NULLS LAST, title`, values: [actualId] });

    let visuals: ProfileVisual[] = [];
    try {
      const visRes = await this.pool.query({
        text: `SELECT id, asset_type, image_url, label, issue_year, season FROM gary_profile_visuals WHERE profile_id=$1 ORDER BY created_at DESC`,
        values: [actualId],
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
        values: [actualId],
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
        values: [actualId],
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

    let mediaBundle: OrganizationMediaBundle | null = null;
    try {
      mediaBundle = await getOrganizationMediaBundle(this.pool, actualId, { limitPerGroup: 12 });
    } catch {
      // Non-fatal if table not present
    }

    const logoVisual = visuals.find((v) => v.assetType === "logo");
    const bannerVisual =
      visuals.find((v) => v.assetType === "banner") ??
      visuals.find((v) => v.assetType === "issue_cover");
    
    // Prefer discovered mediaBundle identity if present
    const discoveredLogo = mediaBundle?.identity.items.find((i) => i.mediaType === "logo")?.imageUrl;
    const discoveredLead = mediaBundle?.leadPhoto?.imageUrl;
    const logoUrl = discoveredLogo ?? logoVisual?.imageUrl ?? null;
    const bannerUrl = discoveredLead ?? bannerVisual?.imageUrl ?? null;
    const bannerAlt = mediaBundle?.leadPhoto?.altText ?? bannerVisual?.label ?? base.mediaAlt;

      const opportunities: ProfileOpportunity[] = links.rows.map((item) => ({
        id: String(item.id),
        title: String(item.title),
        organizer: String(item.organizer),
        deadline: item.deadline
          ? (item.deadline instanceof Date
              ? item.deadline.toISOString().slice(0, 10)
              : String(item.deadline).slice(0, 10))
          : null,
        detailUrl: nullableText(item.source_detail_url),
        officialWebsite: nullableText(item.official_website),
        status: item.status,
      }));
      const isPublication =
        row.profile_kind === "literary_magazine" ||
        row.profile_kind === "small_press";
      const schedule = isPublication
        ? resolveMagazineSchedule({
            readingPeriod: nullableText(row.reading_period),
            opportunities,
          })
        : base.schedule;

      return {
        ...base,
        schedule,
        // Directory/cards use logo marks; never substitute a banner into the logo slot.
        logoUrl,
        bannerUrl,
        bannerAlt,
        visuals,
        mediaBundle,
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
        editorialFocus: row.editorial_focus ? cleanCrawledText(String(row.editorial_focus)) : null,
        editorialTips: row.editorial_tips ? cleanCrawledText(String(row.editorial_tips)) : null,
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
        editorialProfile: (row.editorial_profile as OrganizationEditorialProfile | undefined) ?? null,
        opportunities,
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
        o.last_updated, o.source_detail_url, o.observed_at,
        COALESCE(org_media.lead_url, m.media_url) as media_url,
        COALESCE(org_media.lead_alt, p.name) as media_alt
      FROM opportunity_profile_links l
      JOIN gary_profiles p ON p.id=l.profile_id
      JOIN latest o ON o.profile_id=p.id
      LEFT JOIN gary_profile_pages pg ON pg.profile_observation_id=o.id AND pg.role='profile'
      LEFT JOIN media m ON m.profile_page_id=pg.id
      LEFT JOIN LATERAL (
        SELECT image_url AS lead_url, COALESCE(NULLIF(BTRIM(alt_text), ''), NULLIF(BTRIM(title), ''), p.name) AS lead_alt
        FROM gary_organization_media
        WHERE profile_id = p.id AND review_status = 'verified'
        ORDER BY is_lead DESC, (media_group = 'identity') DESC, display_order ASC, created_at DESC
        LIMIT 1
      ) org_media ON true
      WHERE l.opportunity_id=$1 AND l.status='confirmed' AND l.verified_until > now()
      ORDER BY l.confidence DESC, p.name ASC LIMIT 1`, values: [opportunityId] });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const baseCard = card(row);
    try {
      baseCard.mediaBundle = await getOrganizationMediaBundle(this.pool, baseCard.id, { limitPerGroup: 4 });
    } catch {
      // Non-fatal if media table is empty
    }
    return baseCard;
  }

  async getProfileIssues(
    profileId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<ProfileIssuesResponse> {
    return getProfileIssuesFromDb(this.pool, profileId, options);
  }

  async getOrganizationMedia(
    profileId: string,
    options: { limitPerGroup?: number } = {},
  ): Promise<OrganizationMediaBundle> {
    return getOrganizationMediaBundle(this.pool, profileId, options);
  }
}

export function createPostgresProfileRepositoryFromUrl(
  connectionString: string,
): ProfileRepository {
  return new PostgresProfileRepository(new Pool({ connectionString, max: 4 }));
}
