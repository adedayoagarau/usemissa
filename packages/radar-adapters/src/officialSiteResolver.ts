import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { Pool } from "pg";
import { INTERMEDIARY_PLATFORMS } from "@missa/radar-engine";
import { organizationLinkSql } from "./canonicalOpportunityProjection.js";

export const OFFICIAL_SITE_RESOLVER_VERSION = "official-site-v1";

/**
 * Listing sites carry many organizations' calls, so their domain cannot vouch
 * for any one organization. A call found only on one of these needs its
 * organization's own site before the host can be confirmed.
 */
export const LISTING_SITE_HOSTS = new Set([
  "artconnect.com", "on-the-move.org", "resartis.org", "opencallradar.com", "newpages.com",
  "pw.org", "curatorspace.com", "artdeadline.com", "musicinafrica.net", "submittable.com",
  "filmfreeway.com", "callforentry.org", "entrythingy.com", "chillsubs.com", "duotrope.com",
  "transartists.org", "artrabbit.com", "e-flux.com", "artandeducation.net", "zapplication.org",
  "nyfa.org", "artsjobs.org", "creativecapital.org", "artist-communities.org", "allianceartistcommunities.org",
  "opportunity-list.com", "artopportunitiesmonthly.com", "artshub.com.au", "artquest.org.uk",
  "a-n.co.uk", "curatorsintl.org", "residencyunlimited.org", "theresidencyproject.org",
  // Every platform Missa never shows publicly (radar-engine intermediaries.ts):
  // a listing known only from one stays hidden until this resolver finds the
  // organization's own page.
  ...INTERMEDIARY_PLATFORMS.flatMap((platform) => platform.hosts),
]);

/** Links that never lead to an organization's own site. */
const NON_OFFICIAL_HOSTS = [
  "facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com", "linkedin.com", "youtube.com",
  "youtu.be", "tiktok.com", "pinterest.com", "whatsapp.com", "wa.me", "t.me", "telegram.me",
  "google.com", "goo.gl", "maps.app.goo.gl", "apple.com", "spotify.com", "vimeo.com", "flickr.com",
  "bit.ly", "tinyurl.com", "linktr.ee", "eventbrite.com", "mailchimp.com", "list-manage.com",
  "paypal.com", "patreon.com", "medium.com", "wikipedia.org", "creativecommons.org", "w3.org",
  "wordpress.org", "wordpress.com", "wix.com", "squarespace.com", "cloudflare.com", "addtoany.com",
  "sharethis.com", "issuu.com", "dropbox.com", "drive.google.com", "docs.google.com", "forms.gle",
];

const OFFICIAL_ANCHOR = /\b(?:official|website|web\s*site|homepage|home\s*page|visit|more\s+info(?:rmation)?|learn\s+more|apply|application|guidelines|details|read\s+more|open\s+call|call\s+for)\b/i;
const ASSET_PATH = /\.(?:jpe?g|png|gif|webp|svg|ico|css|js|pdf|docx?|xlsx?|zip|mp[34]|mov)(?:$|[?#])/i;
const STOP_WORDS = new Set([
  "a", "an", "and", "the", "of", "for", "in", "on", "at", "to", "by", "with", "from", "or",
  "call", "open", "calls", "2024", "2025", "2026", "2027", "2028", "program", "programme",
]);

export function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}

function hostMatches(host: string, domains: Iterable<string>): boolean {
  for (const domain of domains) if (host === domain || host.endsWith(`.${domain}`)) return true;
  return false;
}

export function isListingSiteHost(host: string | null): boolean {
  return Boolean(host && hostMatches(host, LISTING_SITE_HOSTS));
}

function words(value: string): string[] {
  return value
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;/gi, " ");
}

export function htmlToText(html: string): string {
  return decodeEntities(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export type OfficialLinkCandidate = { url: string; host: string; anchorText: string; score: number };

/**
 * Outbound links on a listing page that could be the organization's own site,
 * best first. A link scores for official-sounding anchor text and for sharing
 * words with the call's title or organizer.
 */
export function extractOfficialLinks(
  html: string,
  pageUrl: string,
  context: { title: string; organizationName?: string | null },
): OfficialLinkCandidate[] {
  const pageHost = hostOf(pageUrl);
  const contextWords = new Set(words(`${context.title} ${context.organizationName ?? ""}`));
  const best = new Map<string, OfficialLinkCandidate>();
  const anchor = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchor)) {
    const rawHref = decodeEntities((match[1] ?? match[2] ?? match[3] ?? "").trim());
    if (!rawHref || rawHref.startsWith("#") || /^(?:mailto|tel|javascript|data):/i.test(rawHref)) continue;
    let url: URL;
    try {
      url = new URL(rawHref, pageUrl);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    if (ASSET_PATH.test(url.pathname)) continue;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host === pageHost || (pageHost && (host.endsWith(`.${pageHost}`) || pageHost.endsWith(`.${host}`)))) continue;
    if (isListingSiteHost(host) || hostMatches(host, NON_OFFICIAL_HOSTS)) continue;
    const anchorText = htmlToText(match[4] ?? "").slice(0, 160);
    let score = 0;
    if (OFFICIAL_ANCHOR.test(anchorText)) score += 2;
    const hostWords = host.split(/[.-]/).filter((part) => part.length > 2);
    if (hostWords.some((part) => contextWords.has(part) || [...contextWords].some((word) => word.length > 3 && part.includes(word)))) score += 3;
    const anchorWords = words(anchorText);
    if (anchorWords.some((word) => contextWords.has(word))) score += 1;
    url.hash = "";
    for (const name of [...url.searchParams.keys()]) if (/^(?:utm_|fbclid$|gclid$|mc_[ce]id$|ref$)/i.test(name)) url.searchParams.delete(name);
    const key = url.toString();
    const current = best.get(key);
    if (!current || score > current.score) best.set(key, { url: key, host, anchorText, score });
  }
  return [...best.values()].sort((left, right) => right.score - left.score || left.url.length - right.url.length);
}

/**
 * True when the organization's own page names the call: most of the title's
 * distinctive words (at least two) appear on it. A page that only shares a
 * word or two with a long title does not count.
 */
/** The words that name a call: no bracketed asides, tagline after a dash, prize amounts or bare numbers. */
export function callNameWords(title: string): string[] {
  const named = title
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .split(/\s[—–-]\s/)[0] ?? title;
  return [...new Set(words(named).filter((word) => !/^\d+$/.test(word) && !["cash", "prize", "prizes", "usd", "eur", "gbp"].includes(word)))];
}

export function pageCorroboratesCall(pageText: string, title: string): boolean {
  const named = callNameWords(title);
  const titleWords = named.length >= 2 ? named : [...new Set(words(title))];
  if (titleWords.length < 2) return false;
  const pageWords = new Set(words(pageText));
  const found = titleWords.filter((word) => pageWords.has(word)).length;
  return found >= 2 && found / titleWords.length >= 0.7;
}

const PRIVATE_V4 = [/^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^0\./];

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) return PRIVATE_V4.some((pattern) => pattern.test(address));
  const lower = address.toLowerCase();
  return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80") || lower.startsWith("::ffff:127.") || lower.startsWith("::ffff:10.") || lower.startsWith("::ffff:192.168.");
}

/** Links on third-party pages are untrusted: never fetch a private or internal address. */
export async function isPublicHttpUrl(value: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host === "metadata.google.internal") return false;
  if (isIP(host)) return !isPrivateAddress(host);
  try {
    const addresses = await lookup(host, { all: true });
    return addresses.length > 0 && addresses.every((entry) => !isPrivateAddress(entry.address));
  } catch {
    return false;
  }
}

export type PageFetchResult = { status: "ok"; html: string; finalUrl: string } | { status: "error"; error: string };
export type PageFetcher = (url: string) => Promise<PageFetchResult>;

const USER_AGENT = "MissaRadar/0.1 (+https://usemissa.com/radar)";
const MAX_PAGE_BYTES = 2_000_000;

export async function fetchHtmlPage(url: string): Promise<PageFetchResult> {
  if (!(await isPublicHttpUrl(url))) return { status: "error", error: "non-public-url" };
  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return { status: "error", error: `http-${response.status}` };
    if (!(await isPublicHttpUrl(response.url))) return { status: "error", error: "redirected-to-non-public-url" };
    const type = response.headers.get("content-type") ?? "";
    if (!/(?:text\/html|application\/xhtml\+xml)/i.test(type)) return { status: "error", error: "unsupported-content-type" };
    const html = await response.text();
    if (html.length > MAX_PAGE_BYTES) return { status: "ok", html: html.slice(0, MAX_PAGE_BYTES), finalUrl: response.url };
    return { status: "ok", html, finalUrl: response.url };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.name : "network" };
  }
}

export type OfficialSiteCandidate = {
  opportunityId: string;
  title: string;
  organizationName: string | null;
  sourceId: string;
  listingUrl: string;
};

export type OfficialSiteResolution =
  | { status: "confirmed"; officialUrl: string; listingUrl: string; anchorText: string }
  | { status: "not-found"; reason: string };

/** Follows a listing page's outbound links until one leads to a page on the organization's site that names the call. */
export async function resolveOfficialSite(
  candidate: OfficialSiteCandidate,
  fetchPage: PageFetcher = fetchHtmlPage,
  maxLinks = 3,
): Promise<OfficialSiteResolution> {
  const listing = await fetchPage(candidate.listingUrl);
  if (listing.status !== "ok") return { status: "not-found", reason: `listing-page-${listing.error}` };
  const links = extractOfficialLinks(listing.html, listing.finalUrl, candidate).filter((link) => link.score > 0).slice(0, maxLinks);
  if (links.length === 0) return { status: "not-found", reason: "no-outbound-official-link" };
  for (const link of links) {
    const page = await fetchPage(link.url);
    if (page.status !== "ok") continue;
    if (isListingSiteHost(hostOf(page.finalUrl))) continue;
    if (pageCorroboratesCall(htmlToText(page.html), candidate.title)) {
      return { status: "confirmed", officialUrl: page.finalUrl, listingUrl: listing.finalUrl, anchorText: link.anchorText };
    }
  }
  return { status: "not-found", reason: "official-site-does-not-name-the-call" };
}

export const officialSiteChecksSchema = `
create table if not exists opportunity_official_site_checks (
  opportunity_id text primary key references opportunities(id) on delete cascade,
  resolver_version text not null,
  status text not null check (status in ('confirmed', 'not-found')),
  listing_url text,
  official_url text,
  reason text,
  checked_at timestamptz not null default now(),
  next_check_at timestamptz not null
);
create index if not exists opportunity_official_site_checks_due_idx on opportunity_official_site_checks (next_check_at);
`;

export async function ensureOfficialSiteChecksSchema(pool: Pool): Promise<void> {
  await pool.query(officialSiteChecksSchema);
}

/** Postgres regex matching a URL whose host is (a subdomain of) a listing site. */
export function listingSiteUrlPattern(hosts: Iterable<string> = LISTING_SITE_HOSTS): string {
  const alternatives = [...hosts].map((host) => host.replace(/[.]/g, "\\.")).join("|");
  return `^https?://([^/?#@]*\\.)?(${alternatives})(:[0-9]+)?([/?#]|$)`;
}

async function claimCandidates(pool: Pool, limit: number): Promise<OfficialSiteCandidate[]> {
  const result = await pool.query<OfficialSiteCandidate>(
    `select o.id as "opportunityId", o.title, o.source_id as "sourceId",
       coalesce(nullif(btrim(org.data->>'name'), ''), nullif(btrim(evidence.destination_reconciliation->>'organizerName'), '')) as "organizationName",
       coalesce(
         case when o.guidelines_url ~* $2 then o.guidelines_url end,
         case when s.url ~* $2 then s.url end,
         case when o.submission_url ~* $2 then o.submission_url end
       ) as "listingUrl"
     from opportunities o
     join opportunity_sources s on s.id = o.source_id
     left join radar_organizations org on org.id = o.organization_id
     left join lateral (
       select organization_confirmed, destination_reconciliation from opportunity_source_evidence
       where opportunity_id = o.id order by checked_at desc limit 1
     ) evidence on true
     left join opportunity_official_site_checks checks on checks.opportunity_id = o.id
     where o.publication_state in ('reviewable', 'published')
       and o.id not like 'opp_v2_%'
       and (
         (not coalesce(evidence.organization_confirmed, false)
           and not exists (
             select 1 from opportunity_profile_links link
             where link.opportunity_id = o.id and link.status = 'confirmed' and link.verified_until > now()
           ))
         -- A confirmed host still needs its own page when every known link is
         -- an intermediary's: such a listing stays off public pages until then.
         or not ${organizationLinkSql("o")}
       )
       and (o.guidelines_url ~* $2 or s.url ~* $2 or o.submission_url ~* $2)
       and (checks.opportunity_id is null or checks.resolver_version <> $3 or checks.next_check_at <= now())
     order by checks.next_check_at asc nulls first, o.publication_state desc, o.updated_at desc
     limit $1`,
    [limit, listingSiteUrlPattern(), OFFICIAL_SITE_RESOLVER_VERSION],
  );
  return result.rows.filter((row) => row.listingUrl);
}

async function recordResolution(pool: Pool, candidate: OfficialSiteCandidate, resolution: OfficialSiteResolution): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (resolution.status === "confirmed") {
      // The organization's own page names the call: first-party evidence of
      // both the host and the destination.
      await client.query(
        `insert into opportunity_source_evidence
           (id, opportunity_id, source_id, kind, name, url, checked_at, processing_succeeded_at,
            organization_confirmed, destination_reconciled, destination_reconciliation, verified_until)
         values ($1, $2, $3, 'official-site', $4, $5, now(), now(), true, true, $6::jsonb, now() + interval '90 days')
         on conflict (id) do update set url = excluded.url, name = excluded.name, checked_at = now(),
           processing_succeeded_at = now(), organization_confirmed = true, destination_reconciled = true,
           destination_reconciliation = excluded.destination_reconciliation, verified_until = excluded.verified_until`,
        [
          `${candidate.opportunityId}:evidence:official-site`, candidate.opportunityId, candidate.sourceId,
          hostOf(resolution.officialUrl), resolution.officialUrl,
          JSON.stringify({
            source: OFFICIAL_SITE_RESOLVER_VERSION,
            listingUrl: resolution.listingUrl,
            officialUrl: resolution.officialUrl,
            anchorText: resolution.anchorText,
            ...(candidate.organizationName ? { organizerName: candidate.organizationName } : {}),
          }),
        ],
      );
    }
    await client.query(
      `insert into opportunity_official_site_checks
         (opportunity_id, resolver_version, status, listing_url, official_url, reason, checked_at, next_check_at)
       values ($1, $2, $3, $4, $5, $6, now(), now() + $7::interval)
       on conflict (opportunity_id) do update set resolver_version = excluded.resolver_version, status = excluded.status,
         listing_url = excluded.listing_url, official_url = excluded.official_url, reason = excluded.reason,
         checked_at = now(), next_check_at = excluded.next_check_at`,
      [
        candidate.opportunityId, OFFICIAL_SITE_RESOLVER_VERSION, resolution.status, candidate.listingUrl,
        resolution.status === "confirmed" ? resolution.officialUrl : null,
        resolution.status === "confirmed" ? null : resolution.reason,
        resolution.status === "confirmed" ? "60 days" : "14 days",
      ],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function runOfficialSiteResolverBatch(
  pool: Pool,
  options: { limit?: number; fetchPage?: PageFetcher; logger?: Pick<Console, "info"> } = {},
): Promise<{ checked: number; confirmed: number; notFound: number }> {
  await ensureOfficialSiteChecksSchema(pool);
  const candidates = await claimCandidates(pool, Math.max(1, Math.min(options.limit ?? 10, 50)));
  const totals = { checked: candidates.length, confirmed: 0, notFound: 0 };
  for (const candidate of candidates) {
    const resolution = await resolveOfficialSite(candidate, options.fetchPage);
    await recordResolution(pool, candidate, resolution);
    totals[resolution.status === "confirmed" ? "confirmed" : "notFound"] += 1;
  }
  options.logger?.info(`[missa-official-site-resolver] ${JSON.stringify(totals)}`);
  return totals;
}
