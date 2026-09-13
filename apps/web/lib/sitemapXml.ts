import { siteUrl } from "@/lib/siteUrl";
import type { SitemapEntry } from "@/lib/sitemapData";

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => XML_ESCAPES[character]);
}

export function sitemapUrlset(entries: SitemapEntry[]): string {
  const base = siteUrl().replace(/\/$/u, "");
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const entry of entries) {
    if (!entry.path || seen.has(entry.path)) continue;
    seen.add(entry.path);
    const location = escapeXml(`${base}${entry.path}`);
    urls.push(
      entry.lastModified
        ? `  <url><loc>${location}</loc><lastmod>${escapeXml(entry.lastModified)}</lastmod></url>`
        : `  <url><loc>${location}</loc></url>`,
    );
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

export function sitemapIndex(childPaths: string[]): string {
  const base = siteUrl().replace(/\/$/u, "");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...childPaths.map(
      (path) => `  <sitemap><loc>${escapeXml(`${base}${path}`)}</loc></sitemap>`,
    ),
    "</sitemapindex>",
    "",
  ].join("\n");
}

export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
