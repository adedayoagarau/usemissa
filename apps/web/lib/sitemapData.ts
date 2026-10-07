import { Pool } from "pg";
import { canonicalListedOpportunityPredicate } from "@missa/radar-adapters";
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
  let result;
  try {
    result = await queryOpportunitySitemap(client, true);
  } catch (error) {
    // The quality filter must never cost the whole opportunity sitemap.
    console.warn("Opportunity sitemap quality filter failed; listing every call.", error);
    result = await queryOpportunitySitemap(client, false);
  }
  return result.rows.map((row) => ({
    path: row.path,
    lastModified: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : undefined,
  }));
}

/**
 * Roundup posts ("12 open calls to apply for in spring") and FAQ pages that
 * were ingested as calls. Mirrors `isRoundupTitle` in lib/seo.tsx.
 */
export const ROUNDUP_TITLE_SQL_PATTERN =
  "^\\s*[0-9]{1,3}\\s+(open calls|calls|opportunities|grants|residencies|fellowships|contests|competitions|writing contests|art contests|literary magazines|magazines|places)\\M|frequently asked|\\mfaqs?\\M|tips for applying|applicant faq";

function queryOpportunitySitemap(client: Pool, filtered: boolean) {
  // Filtered: drop roundups and calls whose exact deadline has passed, and
  // keep one URL per call when the same title from the same organizer was
  // ingested more than once (the most recently updated copy wins).
  const quality = filtered
    ? `and o.title !~* $2
        and not (o.deadline_kind = 'exact' and o.deadline_date is not null and o.deadline_date < current_date)`
    : "";
  const groupKey = filtered
    ? `lower(regexp_replace(o.title, '[^[:alnum:]]+', '', 'g')) || '|' || coalesce(o.organization_id, lower(coalesce(o.guidelines_url, o.submission_url, o.id)))`
    : `coalesce(nullif(btrim(o.slug), ''), o.id)`;
  return client.query<{ path: string; updated_at: Date | null }>({
    text: `
      select path, updated_at from (
        select distinct on (${groupKey})
               '/opportunities/' || coalesce(nullif(btrim(o.slug), ''), o.id) as path,
               coalesce(o.updated_at, o.created_at) as updated_at
        from opportunities o
        where ${canonicalListedOpportunityPredicate("o")}
          and o.status = any($1::text[])
          ${quality}
        order by ${groupKey}, coalesce(o.updated_at, o.created_at) desc
      ) calls
      order by path`,
    values: filtered ? [PUBLIC_OPPORTUNITY_STATUSES, ROUNDUP_TITLE_SQL_PATTERN] : [PUBLIC_OPPORTUNITY_STATUSES],
  });
}

/**
 * Every canonical public profile, using the same de-duplication and slug rule
 * as ProfileRepository.browse/card so the sitemap emits exactly the URLs the
 * directory links to.
 */
export async function listProfileSitemapEntries(): Promise<SitemapEntry[]> {
  const client = getPool();
  if (!client) return [];
  let result;
  try {
    result = await queryProfileSitemap(client, USEFUL_PROFILE_SQL);
  } catch (error) {
    // The content filter must never cost the whole profile sitemap.
    console.warn("Profile sitemap content filter failed; listing every profile.", error);
    result = await queryProfileSitemap(client, "true");
  }
  return result.rows.map((row) => ({
    path: row.path,
    lastModified: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : undefined,
  }));
}

/**
 * A profile worth indexing: it has an open published call, a reading period,
 * submission guidelines, or a real description. Mirrors `isThinProfile` in
 * lib/profileSeo.tsx, which noindexes the rest on the page itself.
 */
const USEFUL_PROFILE_SQL = `
  exists (
    select 1 from gary_profile_observations ob
    where ob.profile_id = s.id
      and (
        length(btrim(coalesce(ob.source_summary, ''))) >= 160
        or nullif(btrim(coalesce(ob.reading_period, '')), '') is not null
        or nullif(btrim(coalesce(ob.submission_guidelines_url, '')), '') is not null
      )
  )
  or exists (
    select 1 from opportunities o
    where o.organization_id = s.id
      and o.publication_state = 'published'
      and o.status = any(array['opening-soon', 'open', 'closing-soon', 'deadline-extended'])
  )
  or exists (
    select 1 from opportunity_profile_links l
    join opportunities o on o.id = l.opportunity_id
    where l.profile_id = s.id
      and l.status = 'confirmed'
      and l.verified_until > now()
      and o.publication_state = 'published'
      and o.status = any(array['opening-soon', 'open', 'closing-soon', 'deadline-extended'])
  )
  or exists (
    select 1 from gary_profile_links gl
    join gary_call_observations oco on oco.opportunity_id = gl.opportunity_id
    where gl.profile_id = s.id
      and gl.status = 'confirmed'
      and oco.deadline >= current_date
  )`;

function queryProfileSitemap(client: Pool, usefulSql: string) {
  return client.query<{ path: string; updated_at: Date | null }>({
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
        select id, profile_kind, created_at,
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
      from slugs s
      where slug is not null and slug <> ''
        and (${usefulSql})
      order by path asc`,
    values: [PUBLIC_PROFILE_KINDS],
  });
}
