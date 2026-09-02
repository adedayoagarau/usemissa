import { URL } from "node:url";

export interface ExtractedSocialLinks {
  twitter: string | null;
  instagram: string | null;
  bluesky: string | null;
  substack: string | null;
  threads: string | null;
  facebook: string | null;
  youtube: string | null;
}

export interface ExtractedVisual {
  assetType: "logo" | "banner" | "issue_cover";
  imageUrl: string;
  label?: string | null;
  issueYear?: number | null;
  season?: string | null;
}

export interface ExtractedPrizeWinner {
  contestName: string;
  awardYear: number;
  winnerName: string;
  winningTitle?: string | null;
  winningWorkUrl?: string | null;
  judgeName?: string | null;
}

export interface SinglePassExtractionResult {
  logoUrl: string | null;
  socialLinks: ExtractedSocialLinks;
  gallery: ExtractedVisual[];
  prizeWinners: ExtractedPrizeWinner[];
}

function cleanUrl(raw: string, baseUrl: string): string | null {
  try {
    const resolved = new URL(raw, baseUrl);
    resolved.searchParams.delete("utm_source");
    resolved.searchParams.delete("utm_medium");
    resolved.searchParams.delete("utm_campaign");
    resolved.searchParams.delete("ref");
    return resolved.href;
  } catch {
    return null;
  }
}

/**
 * Extracts verified social media profile links from an HTML document.
 * Filters out share buttons, intent dialogs, and tracking params.
 */
export function extractSocialLinks(html: string, baseUrl: string): ExtractedSocialLinks {
  const result: ExtractedSocialLinks = {
    twitter: null,
    instagram: null,
    bluesky: null,
    substack: null,
    threads: null,
    facebook: null,
    youtube: null,
  };

  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    const rawHref = match[1];
    const absolute = cleanUrl(rawHref, baseUrl);
    if (!absolute) continue;

    const lower = absolute.toLowerCase();

    // Twitter / X
    if ((lower.includes("twitter.com/") || lower.includes("x.com/")) && !result.twitter) {
      if (!lower.includes("/intent/") && !lower.includes("/share") && !lower.includes("/hashtag/")) {
        result.twitter = absolute;
      }
    }

    // Instagram
    else if (lower.includes("instagram.com/") && !result.instagram) {
      if (!lower.includes("/p/") && !lower.includes("/reel/") && !lower.includes("/explore/")) {
        result.instagram = absolute;
      }
    }

    // Bluesky
    else if (lower.includes("bsky.app/profile/") && !result.bluesky) {
      result.bluesky = absolute;
    }

    // Substack
    else if (lower.includes(".substack.com") && !result.substack) {
      if (!lower.includes("/p/") && !lower.includes("/archive")) {
        result.substack = absolute;
      }
    }

    // Threads
    else if (lower.includes("threads.net/@") && !result.threads) {
      result.threads = absolute;
    }

    // Facebook
    else if (lower.includes("facebook.com/") && !result.facebook) {
      if (!lower.includes("/sharer") && !lower.includes("/share.php") && !lower.includes("/groups/")) {
        result.facebook = absolute;
      }
    }

    // YouTube
    else if ((lower.includes("youtube.com/@") || lower.includes("youtube.com/c/") || lower.includes("youtube.com/channel/")) && !result.youtube) {
      if (!lower.includes("/watch") && !lower.includes("/embed")) {
        result.youtube = absolute;
      }
    }
  }

  return result;
}

/**
 * Extracts high-res brand logos and avatars from HTML metadata and header elements.
 */
export function extractLogo(html: string, baseUrl: string): string | null {
  // 1. Check OpenGraph image
  const ogMatch = html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                  html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogMatch && ogMatch[1]) {
    const resolved = cleanUrl(ogMatch[1], baseUrl);
    if (resolved && !resolved.endsWith(".ico")) return resolved;
  }

  // 2. Check Apple Touch Icon (typically high-res 180x180 PNG)
  const appleTouchMatch = html.match(/<link\s+[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i) ||
                          html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i);
  if (appleTouchMatch && appleTouchMatch[1]) {
    const resolved = cleanUrl(appleTouchMatch[1], baseUrl);
    if (resolved) return resolved;
  }

  // 3. Check high-res SVG or PNG icon link
  const svgIconMatch = html.match(/<link\s+[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["']([^"']+\.(?:svg|png|webp))["']/i) ||
                       html.match(/<link\s+[^>]*href=["']([^"']+\.(?:svg|png|webp))["'][^>]*rel=["'](?:shortcut\s+)?icon["']/i);
  if (svgIconMatch && svgIconMatch[1]) {
    const resolved = cleanUrl(svgIconMatch[1], baseUrl);
    if (resolved) return resolved;
  }

  // 4. Fallback to any header or logo class image
  const logoImgMatch = html.match(/<img\s+[^>]*(?:class|id)=["'][^"']*(?:logo|brand|header-img)[^"']*["'][^>]*src=["']([^"']+)["']/i);
  if (logoImgMatch && logoImgMatch[1]) {
    const resolved = cleanUrl(logoImgMatch[1], baseUrl);
    if (resolved) return resolved;
  }

  return null;
}

/**
 * Extracts issue covers and gallery items from cover galleries or archive spreads.
 */
export function extractGalleryCovers(html: string, baseUrl: string): ExtractedVisual[] {
  const visuals: ExtractedVisual[] = [];
  const seenUrls = new Set<string>();

  // Look for images with issue or cover in alt / src
  const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']|<img\s+[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null && visuals.length < 6) {
    const src = match[1] || match[4];
    const alt = match[2] || match[3] || "";

    const combined = `${src} ${alt}`.toLowerCase();
    if (!combined.includes("issue") && !combined.includes("cover") && !combined.includes("volume") && !combined.includes("spring") && !combined.includes("fall")) {
      continue;
    }

    const resolved = cleanUrl(src, baseUrl);
    if (!resolved || seenUrls.has(resolved) || resolved.endsWith(".ico") || resolved.endsWith(".svg")) continue;

    seenUrls.add(resolved);

    // Extract year & season
    let issueYear: number | null = null;
    const yearMatch = alt.match(/\b(20[0-2]\d|19\d{2})\b/);
    if (yearMatch) issueYear = parseInt(yearMatch[1], 10);

    let season: string | null = null;
    const seasonMatch = alt.match(/\b(Spring|Summer|Fall|Autumn|Winter)\b/i);
    if (seasonMatch) season = seasonMatch[1].charAt(0).toUpperCase() + seasonMatch[1].slice(1).toLowerCase();

    visuals.push({
      assetType: "issue_cover",
      imageUrl: resolved,
      label: alt.trim() || (issueYear ? `Issue (${issueYear})` : "Past Issue"),
      issueYear,
      season,
    });
  }

  return visuals;
}

/**
 * Extracts prize winners, award year, and winning work from contest announcement or archive markup.
 */
export function extractPrizeWinners(html: string, baseUrl: string, contestFallbackName: string): ExtractedPrizeWinner[] {
  const winners: ExtractedPrizeWinner[] = [];

  // Match patterns like:
  // "2025 Winner: Elena Vance for 'The Salt Garden', selected by George Saunders"
  // or "Winner (2024): John Doe, 'Poem Title'"
  const winnerRegex = /(?:(\d{4})\s*(?:winner|award|contest winner)|(?:winner|first place)\s*(?:\((\d{4})\)|:\s*(\d{4}))?)\s*[:–-]\s*([A-Z][a-zA-Z\s.-]+?)(?:,\s*['"“]([^'"”]+)['"”]|for\s+['"“]([^'"”]+)['"”])?(?:[,\s]+selected by\s+([A-Z][a-zA-Z\s.-]+))?(?=[<\n]|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = winnerRegex.exec(html)) !== null && winners.length < 5) {
    const yearStr = match[1] || match[2] || match[3];
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear() - 1;
    const authorName = match[4]?.trim();
    const title = match[5]?.trim() || match[6]?.trim() || null;
    const judge = match[7]?.trim() || null;


    if (authorName && authorName.length > 2 && authorName.length < 60) {
      winners.push({
        contestName: contestFallbackName,
        awardYear: year,
        winnerName: authorName,
        winningTitle: title,
        judgeName: judge,
      });
    }
  }

  return winners;
}

/**
 * Single-pass extraction orchestrator.
 * Parses HTML once and returns all visual identity, social media links, and archive assets.
 */
export function extractProfileEnrichment(
  html: string,
  baseUrl: string,
  options?: { contestName?: string },
): SinglePassExtractionResult {
  return {
    logoUrl: extractLogo(html, baseUrl),
    socialLinks: extractSocialLinks(html, baseUrl),
    gallery: extractGalleryCovers(html, baseUrl),
    prizeWinners: extractPrizeWinners(html, baseUrl, options?.contestName ?? "Annual Contest"),
  };
}
