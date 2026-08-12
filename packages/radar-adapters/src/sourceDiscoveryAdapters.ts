import type { Source, SourceKind } from "@missa/radar-engine";

export interface DiscoveredSourceLink {
  url: string;
  title?: string;
  kind?: SourceKind;
  registryTier?: 0 | 1 | 2 | 3;
  followsOutboundLinks?: boolean;
  discoveryAdapterId?: string;
  discoveryRequestProfile?: Source['discoveryRequestProfile'];
  discoveredFromSourceId?: string;
  checkIntervalHours?: number;
  discoveryExternalId?: string;
  discoveryExternalStatus?: string;
  discoveryMachineRecord?: Source["discoveryMachineRecord"];
  registryOrganizationName?: string;
  registryTrust?: Source["registryTrust"];
}

interface HtmlLink {
  url: string;
  title?: string;
}

const CALL_WORDS =
  /(?:apply|application|submit|submission|open[- ]?call|opportunit|contest|prize|award|fellowship|grant|residen|fund|deadline|entry|call[- ]?for|reading[- ]?period|artist[- ]?program)/i;
const NON_CALL_HOSTS = [
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "linkedin.com",
  "threads.net",
  "bsky.app",
  "youtube.com",
  "substack.com",
  "npofficespace.com",
  "wa.me",
  "t.me",
  "pinterest.com",
  "tiktok.com",
  "siege.ai",
  "fluxer.gg",
  "discord.gg",
  "discord.com",
];

const APPLICATION_ONLY_HOSTS = [
  "docs.google.com",
  "forms.gle",
  "jotform.com",
  "slideroom.com",
  "grantplatform.com",
  "drive.google.com",
  "dropbox.com",
  "airtable.com",
  "typeform.com",
  "submittable.com",
];

const ARCHIVE_LINK_WORDS = /(?:first|previous|past)\s+(?:volume|issue)|\barchive\b|\bsample\s+(?:issue|work)\b/i;
const STRONG_CALL_WORDS =
  /(?:apply|application|submit|submission|open[- ]?call|call[- ]?for|deadline|entry|fellowship|grant|award|contest|prize)/i;
const CONTEXT_STOP_WORDS = new Set([
  "and", "are", "artist", "artists", "call", "for", "from", "http", "https",
  "open", "org", "the", "this", "with", "www", "writer", "writers",
]);

function decodeHtmlText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteHttpUrl(value: string, base: string): string | undefined {
  try {
    const decodedValue = value
      .replace(/&amp;/gi, "&")
      .replace(/&#0*39;|&apos;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/&#(\d+);/g, (_match, code: string) =>
        String.fromCodePoint(Number(code)),
      )
      .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
        String.fromCodePoint(Number.parseInt(code, 16)),
      );
    const url = new URL(decodedValue, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.hash = "";
    return url.href;
  } catch {
    return undefined;
  }
}

function htmlLinks(html: string, sourceUrl: string): HtmlLink[] {
  const links: HtmlLink[] = [];
  const byUrl = new Map<string, HtmlLink>();
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const attributes = match[1]!;
    const href = attributes.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const url = absoluteHttpUrl(href, sourceUrl);
    if (!url) continue;
    const accessibleLabel =
      attributes.match(/\baria-label=["']([^"']+)["']/i)?.[1] ??
      attributes.match(/\btitle=["']([^"']+)["']/i)?.[1];
    const title = decodeHtmlText(accessibleLabel ?? match[2]!);
    const existing = byUrl.get(url);
    if (existing) {
      if (!existing.title && title) existing.title = title.slice(0, 240);
      continue;
    }
    const link = { url, ...(title ? { title: title.slice(0, 240) } : {}) };
    byUrl.set(url, link);
    links.push(link);
  }
  return links;
}

function newPagesIndex(
  source: Source,
  html: string,
  finalUrl: string,
): DiscoveredSourceLink[] {
  return htmlLinks(html, finalUrl)
    .filter((link) => {
      const path = new URL(link.url).pathname;
      return (
        path.startsWith("/guide-submission-opportunities/") &&
        path !== "/guide-submission-opportunities/big-list-of-writing-contests/"
      );
    })
    .map((link) => ({
      ...link,
      kind: "directory" as const,
      registryTier: 2 as const,
      followsOutboundLinks: true,
      discoveryAdapterId: "newpages-detail",
      discoveredFromSourceId: source.id,
    }));
}

function detailIndex(
  source: Source,
  html: string,
  finalUrl: string,
  accepts: (url: URL) => boolean,
  detailAdapterId: string,
): DiscoveredSourceLink[] {
  return htmlLinks(html, finalUrl)
    .filter((link) => accepts(new URL(link.url)))
    .map((link) => ({
      ...link,
      kind: "directory" as const,
      registryTier: 2 as const,
      followsOutboundLinks: true,
      discoveryAdapterId: detailAdapterId,
      discoveredFromSourceId: source.id,
    }));
}

const ON_THE_MOVE_NON_CALL_PATHS = new Set([
  "/news/countries",
  "/news/deadlines",
]);

const FILM_INDEPENDENT_PROGRAM_PATHS = new Set([
  "/programs/applications/",
  "/programs/artist-development/",
  "/programs/grants-and-awards/",
  "/programs/project-involve/",
  "/programs/residencies-programs/",
  "/programs/works-in-progress-series/",
]);

function filmIndependentIndex(
  source: Source,
  html: string,
  finalUrl: string,
): DiscoveredSourceLink[] {
  return htmlLinks(html, finalUrl)
    .filter((link) => {
      const url = new URL(link.url);
      return (
        normalizedHost(url.href) === "filmindependent.org" &&
        FILM_INDEPENDENT_PROGRAM_PATHS.has(url.pathname)
      );
    })
    .map((link) => ({
      ...link,
      kind: "directory" as const,
      registryTier: 2 as const,
      followsOutboundLinks: true,
      discoveryAdapterId: "film-independent-detail",
      discoveredFromSourceId: source.id,
    }));
}

function filmIndependentDetail(
  source: Source,
  html: string,
  finalUrl: string,
): DiscoveredSourceLink[] {
  return htmlLinks(html, finalUrl)
    .filter((link) => {
      const url = new URL(link.url);
      return (
        normalizedHost(url.href) === "filmindependent.org" &&
        /^\/programs\/(?:artist-development|grants-and-awards)\/[^/]+\/$/.test(url.pathname)
      );
    })
    .map((link) => ({
      ...link,
      kind: "organization-website" as const,
      registryTier: 0 as const,
      followsOutboundLinks: false,
      discoveredFromSourceId: source.id,
    }));
}

function onTheMoveIndex(
  source: Source,
  html: string,
  finalUrl: string,
): DiscoveredSourceLink[] {
  return detailIndex(
    source,
    html,
    finalUrl,
    (url) =>
      normalizedHost(url.href) === "on-the-move.org" &&
      url.pathname.startsWith("/news/") &&
      url.pathname !== "/news/" &&
      url.search === "" &&
      !ON_THE_MOVE_NON_CALL_PATHS.has(url.pathname.replace(/\/$/, "")),
    "on-the-move-detail",
  )
    .map((link) => ({
      ...link,
      title: link.title?.replace(/\.?\s*Deadline:\s*[\s\S]*$/i, "").trim(),
      checkIntervalHours: 24,
    }))
    .filter((link) => !/\bsurvey\b/i.test(link.title ?? ""));
}

function normalizedHost(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

function isNonCallHost(host: string): boolean {
  return NON_CALL_HOSTS.some(
    (blocked) => host === blocked || host.endsWith(`.${blocked}`),
  );
}

function mainContent(html: string): string {
  return (
    html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ??
    html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ??
    html
  );
}

function linkSpecificity(link: HtmlLink): number {
  const url = new URL(link.url);
  const host = normalizedHost(link.url);
  const pathSegments = url.pathname.split("/").filter(Boolean).length;
  const callSignal = CALL_WORDS.test(`${link.url} ${link.title ?? ""}`) ? 10 : 0;
  const applicationOnly = APPLICATION_ONLY_HOSTS.some(
    (blocked) => host === blocked || host.endsWith(`.${blocked}`),
  ) ? 30 : 0;
  const attachment = /\.(?:pdf|docx?|xlsx?)(?:$|[?#])/i.test(link.url) ? 25 : 0;
  const redirectHost = /^(?:url|click|links?)\./i.test(new URL(link.url).hostname) ? 20 : 0;
  const insecure = url.protocol === "http:" ? 5 : 0;
  return callSignal + Math.min(pathSegments, 6) - applicationOnly - attachment - redirectHost - insecure;
}

function contextTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) =>
        token.length >= 3 &&
        !/^\d+$/.test(token) &&
        !CONTEXT_STOP_WORDS.has(token)
      ),
  );
}

/** Confirm the proposed host by inspecting the host page itself. */
export function canonicalPageMatchesDirectoryCall(
  sourceTitle: string,
  sourceHtml: string,
  targetHtml: string,
  targetUrl: string,
): boolean {
  const sourceContext = `${sourceTitle} ${decodeHtmlText(mainContent(sourceHtml))}`;
  const targetMain = decodeHtmlText(mainContent(targetHtml));
  if (!CALL_WORDS.test(targetMain) || !STRONG_CALL_WORDS.test(targetMain)) return false;

  const sourceYears = new Set(sourceContext.match(/\b20(?:2\d|3\d)\b/g) ?? []);
  const targetYears = new Set(targetMain.match(/\b20(?:2\d|3\d)\b/g) ?? []);
  if (sourceYears.size && targetYears.size && ![...sourceYears].some((year) => targetYears.has(year))) {
    return false;
  }

  const targetHeading = decodeHtmlText(
    mainContent(targetHtml).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
      targetHtml.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
      "",
  );
  const url = new URL(targetUrl);
  const sourceTokens = contextTokens(sourceTitle);
  const targetTokens = contextTokens(`${targetHeading} ${url.hostname} ${url.pathname}`);
  let overlap = 0;
  for (const token of targetTokens) {
    if (sourceTokens.has(token) && ++overlap >= 2) return true;
  }
  const hostTokens = contextTokens(url.hostname);
  return [...hostTokens].some((token) => sourceTokens.has(token));
}

function sourceContextTitle(source: Source, html: string): string {
  const host = normalizedHost(source.url);
  const normalizedName = source.name.toLowerCase().replace(/^www\./, "").trim();
  if (normalizedName && normalizedName !== host && normalizedName !== `${host}/`) {
    return decodeHtmlText(source.name).slice(0, 240);
  }
  const heading = mainContent(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const pageTitle = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return decodeHtmlText(heading ?? pageTitle ?? source.name).slice(0, 240);
}

function inArticleExternalLinks(
  source: Source,
  html: string,
  finalUrl: string,
  limit = 3,
  requirePositiveScore = false,
): DiscoveredSourceLink[] {
  const sourceHost = normalizedHost(finalUrl);
  const contextTitle = sourceContextTitle(source, html);
  const byHost = new Map<string, { candidate: DiscoveredSourceLink; score: number }>();
  for (const link of htmlLinks(mainContent(html), finalUrl)) {
    const host = normalizedHost(link.url);
    if (host === sourceHost || isNonCallHost(host)) continue;
    const isArchiveLink = ARCHIVE_LINK_WORDS.test(link.title ?? "");
    const candidateUrl = isArchiveLink ? `${new URL(link.url).origin}/` : link.url;
    const candidate: DiscoveredSourceLink = {
      url: candidateUrl,
      title: contextTitle,
      kind: isArchiveLink ? "directory" : "organization-website",
      registryTier: isArchiveLink ? 1 : 0,
      followsOutboundLinks: isArchiveLink,
      discoveredFromSourceId: source.id,
    };
    const score = linkSpecificity(link) - (isArchiveLink ? 20 : 0);
    const existing = byHost.get(host);
    if (!existing || score > existing.score) {
      byHost.set(host, { candidate, score });
    }
  }
  return [...byHost.values()]
    .filter((value) => !requirePositiveScore || value.score > 0)
    .sort((left, right) => right.score - left.score || left.candidate.url.localeCompare(right.candidate.url))
    .map((value) => value.candidate)
    .slice(0, limit);
}

/** Convert a source page into canonical follow-up sources using its explicit site schema. */
export function discoverSourceLinks(
  source: Source,
  html: string,
  finalUrl: string,
): DiscoveredSourceLink[] {
  if (source.discoveryAdapterId === "newpages-index")
    return newPagesIndex(source, html, finalUrl);
  if (source.discoveryAdapterId === "newpages-detail")
    return inArticleExternalLinks(source, html, finalUrl);
  if (source.discoveryAdapterId === "commonwealth-index") {
    return detailIndex(
      source,
      html,
      finalUrl,
      (url) => url.pathname.startsWith("/opportunity/"),
      "commonwealth-detail",
    );
  }
  if (source.discoveryAdapterId === "commonwealth-detail")
    return inArticleExternalLinks(source, html, finalUrl);
  if (source.discoveryAdapterId === "music-in-africa-index") {
    return htmlLinks(html, finalUrl).flatMap((link): DiscoveredSourceLink[] => {
      const path = new URL(link.url).pathname;
      if (path === "/tag/opportunities/") {
        return [
          {
            ...link,
            kind: "directory",
            registryTier: 2,
            followsOutboundLinks: true,
            discoveryAdapterId: "music-in-africa-index",
            discoveredFromSourceId: source.id,
          },
        ];
      }
      if (
        path.startsWith("/magazine/") &&
        /^(?:open call|apply now|call for)/i.test(link.title ?? "")
      ) {
        return [
          {
            ...link,
            kind: "directory",
            registryTier: 2,
            followsOutboundLinks: true,
            discoveryAdapterId: "music-in-africa-detail",
            discoveredFromSourceId: source.id,
          },
        ];
      }
      return [];
    });
  }
  if (source.discoveryAdapterId === "music-in-africa-detail")
    return inArticleExternalLinks(source, html, finalUrl);
  if (source.discoveryAdapterId === "african-culture-fund-index") {
    return htmlLinks(html, finalUrl)
      .filter((link) => {
        const path = new URL(link.url).pathname;
        return (
          /\/call-for-(?:applications?|projects?)-/i.test(path) &&
          !/\/results?-of-/i.test(path)
        );
      })
      .map((link) => ({
        ...link,
        kind: "organization-website" as const,
        registryTier: 0 as const,
        followsOutboundLinks: false,
        discoveredFromSourceId: source.id,
      }));
  }
  if (source.discoveryAdapterId === "transartists-index") {
    return detailIndex(
      source,
      html,
      finalUrl,
      (url) => normalizedHost(url.href) === "transartists.org" && url.pathname.startsWith("/en/news/"),
      "transartists-detail",
    );
  }
  if (source.discoveryAdapterId === "transartists-detail")
    return inArticleExternalLinks(source, html, finalUrl, 1, true);
  if (source.discoveryAdapterId === "resartis-index") {
    return detailIndex(
      source,
      html,
      finalUrl,
      (url) => normalizedHost(url.href) === "resartis.org" && url.pathname.startsWith("/open-call/"),
      "resartis-detail",
    ).map((link) => ({
      ...link,
      discoveryRequestProfile: "browser-compatible" as const,
    }));
  }
  if (source.discoveryAdapterId === "resartis-detail")
    return inArticleExternalLinks(source, html, finalUrl, 1, true);
  if (source.discoveryAdapterId === "on-the-move-index")
    return onTheMoveIndex(source, html, finalUrl);
  if (source.discoveryAdapterId === "on-the-move-detail")
    return inArticleExternalLinks(source, html, finalUrl, 1, true);
  if (source.discoveryAdapterId === "film-independent-index")
    return filmIndependentIndex(source, html, finalUrl);
  if (source.discoveryAdapterId === "film-independent-detail")
    return filmIndependentDetail(source, html, finalUrl);
  return [];
}
