import type { Source, SourceKind } from "@missa/radar-engine";

export interface DiscoveredSourceLink {
  url: string;
  title?: string;
  kind?: SourceKind;
  registryTier?: 0 | 1 | 2 | 3;
  followsOutboundLinks?: boolean;
  discoveryAdapterId?: string;
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

const ARCHIVE_LINK_WORDS = /(?:first|previous|past)\s+(?:volume|issue)|\barchive\b|\bsample\s+(?:issue|work)\b/i;

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
    const url = new URL(value, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.hash = "";
    return url.href;
  } catch {
    return undefined;
  }
}

function htmlLinks(html: string, sourceUrl: string): HtmlLink[] {
  const links: HtmlLink[] = [];
  const seen = new Set<string>();
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const attributes = match[1]!;
    const href = attributes.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const url = absoluteHttpUrl(href, sourceUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const accessibleLabel =
      attributes.match(/\baria-label=["']([^"']+)["']/i)?.[1] ??
      attributes.match(/\btitle=["']([^"']+)["']/i)?.[1];
    const title = decodeHtmlText(accessibleLabel ?? match[2]!);
    links.push({ url, ...(title ? { title: title.slice(0, 240) } : {}) });
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
  const pathSegments = url.pathname.split("/").filter(Boolean).length;
  const callSignal = CALL_WORDS.test(`${link.url} ${link.title ?? ""}`) ? 10 : 0;
  return callSignal + Math.min(pathSegments, 6);
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
  return [...byHost.values()].map((value) => value.candidate).slice(0, 3);
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
    return inArticleExternalLinks(source, html, finalUrl);
  return [];
}
