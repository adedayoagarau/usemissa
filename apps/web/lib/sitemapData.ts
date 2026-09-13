import { Pool } from "pg";
import { canonicalPublicOpportunityPredicate } from "@missa/radar-adapters";
import { catalogueReadDatabaseUrl } from "./catalogueDatabase";

/**
 * Statuses that render a public Opportunity detail page. Mirrors the detail
 * route's own gate so the sitemap never advertises a page that 404s.
 */
const PUBLIC_OPPORTUNITY_STATUSES = [
  "opening-soon",
  "open",
  "closing-soon",
  "deadline-extended",
];

const PUBLIC_PROFILE_KINDS = [
  "literary_magazine",
  "small_press",
  "residency_center",
  "grant_foundation",
  "visual_arts_organization",
  "gallery",
  "organization",
];

export interface SitemapEntry {
  path: string;
  lastModified?: string;
}

let pool: Pool | undefined;

function getPool(): Pool | null {
  if (pool) return pool;
  const url = catalogueReadDatabaseUrl();
  if (!url) return null;
  pool = new Pool({
    connectionString: url,
    max: 2,
    ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  return pool;
}

/**
 * Every published Opportunity, addressed by its canonical slug.
 *
 * The public predicate is imported from the Opportunity repository rather than
 * re-written here, so a change to the publication gate cannot silently widen
 * what the sitemap advertises.
 */
export async function listOpportunitySitemapEntries(): Promise<SitemapEntry[]> {
  const client = getPool();
  if (!client) return [];
  const result = await client.query<{ path: string; updated_at: Date | null }>({
    text: `
      select distinct on (coalesce(nullif(btrim(o.slug), ''), o.id))
             '/opportunities/' || coalesce(nullif(btrim(o.slug), ''), o.id) as path,
             coalesce(o.updated_at, o.created_at) as updated_at
      from opportunities o
      where ${canonicalPublicOpportunityPredicate("o")}
        and o.status = any($1::text[])
      order by coalesce(nullif(btrim(o.slug), ''), o.id), coalesce(o.updated_at, o.created_at) desc`,
    values: [PUBLIC_OPPORTUNITY_STATUSES],
  });
  return result.rows.map((row) => ({
    path: row.path,
    lastModified: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : undefined,
  }));
}

/**
 * Every canonical public profile, using the same de-duplication and slug rule
 * as ProfileRepository.browse/card so the sitemap emits exactly the URLs the
 * directory links to.
 */
export async function listProfileSitemapEntries(): Promise<SitemapEntry[]> {
  const client = getPool();
  if (!client) return [];
  const result = await client.query<{ path: string; updated_at: Date | null }>({
    text: `
      with ranked as (
        select p.id, p.profile_kind, p.name, p.name_key, p.canonical_key, p.created_at,
          row_number() over (
            partition by p.profile_kind,
              case
                when nullif(btrim(coalesce(p.website_url, p.normalized_website_url)), '') is not null
                  then lower(regexp_replace(regexp_replace(btrim(coalesce(p.website_url, p.normalized_website_url)), '^https?://(www\\.)?', ''), '/$', ''))
                else 'name:' || lower(regexp_replace(btrim(p.name), '[^a-z0-9]+', '-', 'g'))
              end
            order by p.created_at asc nulls last, p.id asc
          ) as profile_rank
        from gary_profiles p
        where p.profile_kind = any($1::text[])
      ), stripped as (
        select profile_kind, created_at, id,
          trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) as name_slug,
          trim(both '-' from regexp_replace(lower(regexp_replace(coalesce(name_key, canonical_key, id), '^(res|aca|otm|artconn|prof_org|org_resartis|org_artconn|org_aca|org_otm|profile):?_?', '', 'i')), '[^a-z0-9]+', '-', 'g')) as key_slug
        from ranked
        where profile_rank = 1
      ), slugs as (
        select profile_kind, created_at,
          case
            when length(name_slug) >= 3 then name_slug
            when length(key_slug) > 0 then key_slug
            else id
          end as slug
        from stripped
      )
      select distinct
        case profile_kind
          when 'literary_magazine' then '/journal/'
          when 'small_press' then '/press/'
          when 'residency_center' then '/residency/'
          when 'grant_foundation' then '/grant/'
          else '/org/'
        end || slug as path,
        created_at as updated_at
      from slugs
      where slug is not null and slug <> ''
      order by path asc`,
    values: [PUBLIC_PROFILE_KINDS],
  });
  return result.rows.map((row) => ({
    path: row.path,
    lastModified: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : undefined,
  }));
}
