import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type { ProfileKind } from "./profileRepository.js";

export type MediaGroup =
  | "identity"
  | "issues"
  | "books"
  | "photos"
  | "exhibitions"
  | "projects";

export interface DiscoveredMediaItem {
  mediaGroup: MediaGroup;
  mediaType: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  aspectRatio?: number | null;
  format?: string | null;
  /** Concise display title (max 120 chars) - NEVER long alt text */
  title: string;
  /** Subtitle such as author name, issue number, artist name, program name */
  subtitle?: string | null;
  /** Descriptive accessibility text */
  altText?: string | null;
  /** Factual caption */
  caption?: string | null;
  /** Photographer, artist, or designer credit */
  creatorCredit?: string | null;
  rightsStatement?: string | null;
  officialUrl?: string | null;
  readingUrl?: string | null;
  purchaseUrl?: string | null;
  sourcePageUrl: string;
  publicationDateRaw?: string | null;
  publicationYear?: number | null;
  relatedIdentifiers?: Record<string, unknown>;
  isLead?: boolean;
  displayOrder?: number;
}

export interface OrganizationMediaRecord extends DiscoveredMediaItem {
  id: string;
  profileId: string;
  reviewStatus: "verified" | "pending_review" | "rejected";
  lastVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMediaBundle {
  identity: { items: OrganizationMediaRecord[]; total: number };
  issues: { items: OrganizationMediaRecord[]; total: number };
  books: { items: OrganizationMediaRecord[]; total: number };
  photos: { items: OrganizationMediaRecord[]; total: number };
  exhibitions: { items: OrganizationMediaRecord[]; total: number };
  projects: { items: OrganizationMediaRecord[]; total: number };
  leadPhoto: OrganizationMediaRecord | null;
  refreshStatus: "discovered" | "empty" | "error" | "unvisited";
  lastRefreshedAt: string | null;
}

export interface MediaDiscoveryResult {
  profileId: string;
  status: "discovered" | "empty" | "error";
  totalDiscovered: number;
  groupCounts: Record<MediaGroup, number>;
  sourcePagesChecked: string[];
  lastError?: string | null;
  proposedItems?: DiscoveredMediaItem[];
}

function cleanUrl(raw: string | null | undefined, baseUrl: string): string | null {
  if (!raw) return null;
  try {
    const resolved = new URL(raw.trim(), baseUrl);
    resolved.searchParams.delete("utm_source");
    resolved.searchParams.delete("utm_medium");
    resolved.searchParams.delete("utm_campaign");
    resolved.searchParams.delete("ref");
    return resolved.href;
  } catch {
    return null;
  }
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateTitle(text: string, maxLength = 90): string {
  const cleaned = stripHtml(text);
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength - 1).trim() + "…";
}

/**
 * Generates a stable deterministic ID for an organization media record.
 */
export function orgMediaDeterministicId(profileId: string, item: DiscoveredMediaItem): string {
  const normImg = item.imageUrl.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const normKey = `${item.mediaGroup}:${item.mediaType}:${item.officialUrl ?? ""}:${item.title}`;
  return createHash("sha256")
    .update(`${profileId}:${normImg}:${normKey}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * 1. IDENTITY DISCOVERY (All Organization Types)
 * Collects official logo, alternate logo, and representative hero/banner image.
 * Strictly keeps logos separate from photography.
 */
export function extractIdentityMedia(
  html: string,
  pageUrl: string,
  organizationName: string,
): DiscoveredMediaItem[] {
  const items: DiscoveredMediaItem[] = [];
  const seenUrls = new Set<string>();

  // A. Logo extraction
  // 1. Check Apple Touch Icon (high-res PNG)
  const appleTouchMatch = html.match(/<link\s+[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i) ||
                          html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i);
  if (appleTouchMatch && appleTouchMatch[1]) {
    const url = cleanUrl(appleTouchMatch[1], pageUrl);
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      items.push({
        mediaGroup: "identity",
        mediaType: "logo",
        imageUrl: url,
        title: `${organizationName} Logo`,
        altText: `Official logo of ${organizationName}`,
        sourcePageUrl: pageUrl,
        displayOrder: 1,
      });
    }
  }

  // 2. High-res SVG or PNG logo in header/navigation
  const logoImgMatch = html.match(/<img\s+[^>]*(?:class|id)=["'][^"']*(?:logo|brand|site-logo)[^"']*["'][^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']|<img\s+[^>]*src=["']([^"']+)["'][^>]*(?:class|id)=["'][^"']*(?:logo|brand|site-logo)[^"']*["']/i);
  if (logoImgMatch) {
    const rawSrc = logoImgMatch[1] || logoImgMatch[3];
    const alt = logoImgMatch[2] || "";
    const url = cleanUrl(rawSrc, pageUrl);
    if (url && !seenUrls.has(url) && !url.endsWith(".ico")) {
      seenUrls.add(url);
      items.push({
        mediaGroup: "identity",
        mediaType: items.some(i => i.mediaType === "logo") ? "alternate_logo" : "logo",
        imageUrl: url,
        title: `${organizationName} Logo`,
        altText: alt.trim() || `Official logo of ${organizationName}`,
        sourcePageUrl: pageUrl,
        displayOrder: items.length + 1,
      });
    }
  }

  // B. Representative Photography / Hero image (Strictly separate from logo)
  const ogImgMatch = html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                     html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogImgMatch && ogImgMatch[1]) {
    const ogUrl = cleanUrl(ogImgMatch[1], pageUrl);
    if (ogUrl && !seenUrls.has(ogUrl) && !ogUrl.endsWith(".ico") && !/favicon|spacer|badge|1x1/i.test(ogUrl)) {
      seenUrls.add(ogUrl);
      items.push({
        mediaGroup: "identity",
        mediaType: "representative_image",
        imageUrl: ogUrl,
        title: `${organizationName} Overview`,
        altText: `Representative overview image of ${organizationName}`,
        sourcePageUrl: pageUrl,
        isLead: true,
        displayOrder: 10,
      });
    }
  }

  return items;
}

/**
 * 2. INDEPENDENT PRESSES: Book Catalogue Discovery
 * Extracts published book covers, titles, authors, ISBN, publication dates, and purchase/reading links.
 */
export function extractPressBooks(
  html: string,
  pageUrl: string,
): DiscoveredMediaItem[] {
  const books: DiscoveredMediaItem[] = [];
  const seenUrls = new Set<string>();

  // Extract from book item blocks, cards, or catalogue articles
  const bookBlockRegex = /<(?:article|div|li)[^>]*class=["'][^"']*(?:book|title|product|catalogue-item|publication)[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|div|li)>/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = bookBlockRegex.exec(html)) !== null && books.length < 30) {
    const blockHtml = blockMatch[1];

    // Image
    const imgMatch = blockHtml.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']|<img\s+[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["']|<img\s+[^>]*src=["']([^"']+)["']/i);
    if (!imgMatch) continue;

    const rawSrc = imgMatch[1] || imgMatch[4] || imgMatch[5];
    const alt = imgMatch[2] || imgMatch[3] || "";
    const imageUrl = cleanUrl(rawSrc, pageUrl);
    if (!imageUrl || seenUrls.has(imageUrl) || /logo|icon|avatar|spacer|button/i.test(imageUrl)) continue;

    // Title
    const headingMatch = blockHtml.match(/<h[2-5][^>]*>([\s\S]*?)<\/h[2-5]>/i) ||
                         blockHtml.match(/<a[^>]*class=["'][^"']*(?:book-title|title|product-title)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    const rawTitle = headingMatch ? stripHtml(headingMatch[1]) : (alt ? stripHtml(alt) : "");
    if (!rawTitle || rawTitle.length < 2) continue;
    const title = truncateTitle(rawTitle);

    // Official detail link
    const linkMatch = blockHtml.match(/<a\s+[^>]*href=["']([^"']+)["']/i);
    const officialUrl = linkMatch ? cleanUrl(linkMatch[1], pageUrl) : null;

    // Author / contributor
    let author: string | null = null;
    const authorMatch = blockHtml.match(/(?:by|author[:\s])\s*<[^>]+>([^<]+)<\/[^>]+>|(?:by|author[:\s])\s*([A-Z][a-zA-Z\s.'-]+?)(?=[,<(\n]|$)/i) ||
                        blockHtml.match(/<span[^>]*class=["'][^"']*(?:author|writer|byline)[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    if (authorMatch) {
      author = stripHtml(authorMatch[1] || authorMatch[2] || "").replace(/^by\s+/i, "").trim() || null;
    }

    // Publication Year
    let pubYear: number | null = null;
    let pubDateRaw: string | null = null;
    const dateMatch = blockHtml.match(/\b((?:January|February|March|April|May|June|July|August|September|October|November|December|Spring|Fall|Autumn|Winter)?\s*(?:19|20)\d{2})\b/i);
    if (dateMatch) {
      pubDateRaw = dateMatch[1].trim();
      const yr = pubDateRaw.match(/\b((?:19|20)\d{2})\b/);
      if (yr) pubYear = parseInt(yr[1], 10);
    }

    // ISBN
    let isbn: string | null = null;
    const isbnMatch = blockHtml.match(/ISBN(?:-1[03])?:\s*([0-9xX\-]+)/i);
    if (isbnMatch) isbn = isbnMatch[1].replace(/[^0-9xX]/g, "");

    // Purchase link
    let purchaseUrl: string | null = null;
    const purchaseMatch = blockHtml.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(?:[^<]*(?:buy|order|purchase|shop|cart|store)[^<]*)<\/a>/i);
    if (purchaseMatch) {
      purchaseUrl = cleanUrl(purchaseMatch[1], pageUrl);
    } else if (officialUrl && /\/(?:product|shop|cart)\//i.test(officialUrl)) {
      purchaseUrl = officialUrl;
    }

    // Reading / excerpt link
    let readingUrl: string | null = null;
    const readMatch = blockHtml.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(?:[^<]*(?:read|sample|excerpt|pdf)[^<]*)<\/a>/i);
    if (readMatch) {
      readingUrl = cleanUrl(readMatch[1], pageUrl);
    }

    seenUrls.add(imageUrl);
    books.push({
      mediaGroup: "books",
      mediaType: "book_cover",
      imageUrl,
      title,
      subtitle: author ? `by ${author}` : null,
      altText: alt.trim() || `Book cover of ${title}${author ? ` by ${author}` : ""}`,
      creatorCredit: author,
      officialUrl,
      readingUrl,
      purchaseUrl,
      sourcePageUrl: pageUrl,
      publicationDateRaw: pubDateRaw,
      publicationYear: pubYear,
      relatedIdentifiers: isbn ? { isbn } : {},
      displayOrder: books.length + 1,
    });
  }

  return books;
}

/**
 * 3. RESIDENCIES: Facility, Studio, and Setting Discovery
 * Discovers exterior, workspace, accommodation, and working artist photos.
 */
export function extractResidencyPhotos(
  html: string,
  pageUrl: string,
  residencyName: string,
): DiscoveredMediaItem[] {
  const photos: DiscoveredMediaItem[] = [];
  const seenUrls = new Set<string>();

  const imgRegex = /<figure[^>]*>([\s\S]*?)<\/figure>|<div[^>]*class=["'][^"']*(?:gallery-item|facility|studio|workspace|photo|image-block)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null && photos.length < 20) {
    const block = match[1] || match[2];
    const imgMatch = block.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']|<img\s+[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["']|<img\s+[^>]*src=["']([^"']+)["']/i);
    if (!imgMatch) continue;

    const rawSrc = imgMatch[1] || imgMatch[4] || imgMatch[5];
    const alt = imgMatch[2] || imgMatch[3] || "";
    const imageUrl = cleanUrl(rawSrc, pageUrl);
    if (!imageUrl || seenUrls.has(imageUrl) || /logo|icon|avatar|map|spacer/i.test(imageUrl)) continue;

    // Caption and Photographer credit
    const captionMatch = block.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i) ||
                         block.match(/<p[^>]*class=["'][^"']*(?:caption|credit)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    const caption = captionMatch ? stripHtml(captionMatch[1]) : null;

    let photographerCredit: string | null = null;
    const creditMatch = (caption || alt).match(/(?:photo(?:graph(?:y|er)?)?|credit|image courtesy of)[:\s]+([A-Z][a-zA-Z\s.'-]+)/i);
    if (creditMatch) photographerCredit = creditMatch[1].trim();

    // Determine specific facility mediaType
    const combinedDesc = `${alt} ${caption ?? ""}`.toLowerCase();
    let mediaType = "workspace";
    let title = `${residencyName} Studio & Workspace`;

    if (/exterior|grounds|campus|landscape|building|view|setting/i.test(combinedDesc)) {
      mediaType = "exterior";
      title = `${residencyName} Grounds & Setting`;
    } else if (/bedroom|room|cabin|cottage|living|house|accommodat/i.test(combinedDesc)) {
      mediaType = "accommodation";
      title = `${residencyName} Living Accommodations`;
    } else if (/library|kitchen|dining|woodshop|printshop|darkroom|facility|facilities/i.test(combinedDesc)) {
      mediaType = "facility";
      title = `${residencyName} Facilities`;
    } else if (/working|resident|fellow|artist in/i.test(combinedDesc)) {
      mediaType = "activity";
      title = `Artists in Residence at ${residencyName}`;
    }

    if (alt && alt.length >= 5 && alt.length <= 80 && !/image|photo|img_\d+/i.test(alt)) {
      title = truncateTitle(alt);
    }

    seenUrls.add(imageUrl);
    photos.push({
      mediaGroup: "photos",
      mediaType,
      imageUrl,
      title,
      subtitle: photographerCredit ? `Photo: ${photographerCredit}` : null,
      altText: alt.trim() || caption || `${title} at ${residencyName}`,
      caption,
      creatorCredit: photographerCredit,
      sourcePageUrl: pageUrl,
      displayOrder: photos.length + 1,
    });
  }

  return photos;
}

/**
 * 4. ART GALLERIES & VISUAL ARTS NONPROFITS: Exhibition & Installation Views
 * Discovers exhibition views, posters, artworks, dates, and artist credits.
 */
export function extractGalleryExhibitions(
  html: string,
  pageUrl: string,
  galleryName: string,
): DiscoveredMediaItem[] {
  const exhibitions: DiscoveredMediaItem[] = [];
  const seenUrls = new Set<string>();

  const itemRegex = /<(?:article|div|li)[^>]*class=["'][^"']*(?:exhibition|show|project|installation|artwork|event)[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|div|li)>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(html)) !== null && exhibitions.length < 20) {
    const block = match[1];
    const imgMatch = block.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']|<img\s+[^>]*src=["']([^"']+)["']/i);
    if (!imgMatch) continue;

    const rawSrc = imgMatch[1] || imgMatch[3];
    const alt = imgMatch[2] || "";
    const imageUrl = cleanUrl(rawSrc, pageUrl);
    if (!imageUrl || seenUrls.has(imageUrl) || /logo|icon|avatar|spacer/i.test(imageUrl)) continue;

    // Heading / title
    const headingMatch = block.match(/<h[2-5][^>]*>([\s\S]*?)<\/h[2-5]>/i);
    const rawTitle = headingMatch ? stripHtml(headingMatch[1]) : (alt ? stripHtml(alt) : "");
    if (!rawTitle || rawTitle.length < 2) continue;
    const title = truncateTitle(rawTitle);

    // Link
    const linkMatch = block.match(/<a\s+[^>]*href=["']([^"']+)["']/i);
    const officialUrl = linkMatch ? cleanUrl(linkMatch[1], pageUrl) : null;

    // Dates / Year
    let pubYear: number | null = null;
    let datesRaw: string | null = null;
    const dateMatch = block.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2}(?:\s*[-–—]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*)?\d{1,2})?,?\s*(?:19|20)\d{2})\b/i);
    if (dateMatch) {
      datesRaw = dateMatch[1].trim();
      const yr = datesRaw.match(/\b((?:19|20)\d{2})\b/);
      if (yr) pubYear = parseInt(yr[1], 10);
    }

    // Artist name
    let artistName: string | null = null;
    const artistMatch = block.match(/<span[^>]*class=["'][^"']*(?:artist|creator)[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
                        block.match(/(?:featuring|by|artist[:\s])\s*([A-Z][a-zA-Z\s.'-]+?)(?=[,<(\n]|$)/i);
    if (artistMatch) {
      const rawArtist = stripHtml(artistMatch[1]);
      artistName = rawArtist.replace(/^(?:featuring|by|artist[:\s])\s+/i, "").trim() || null;
    }

    // Photographer credit
    let photoCredit: string | null = null;
    const creditMatch = block.match(/(?:photo(?:graph(?:er)?)?|credit)[:\s]+([A-Z][a-zA-Z\s.'-]+)/i);
    if (creditMatch) photoCredit = creditMatch[1].trim();

    const isPoster = /poster|flyer/i.test(`${alt} ${imageUrl}`);
    const mediaType = isPoster ? "exhibition_poster" : (/installation/i.test(`${alt} ${block}`) ? "exhibition_view" : "artwork");

    seenUrls.add(imageUrl);
    exhibitions.push({
      mediaGroup: "exhibitions",
      mediaType,
      imageUrl,
      title,
      subtitle: artistName ? `Artist: ${artistName}` : (datesRaw ?? null),
      altText: alt.trim() || `Installation view of ${title} at ${galleryName}`,
      creatorCredit: photoCredit || artistName,
      officialUrl,
      sourcePageUrl: pageUrl,
      publicationDateRaw: datesRaw,
      publicationYear: pubYear,
      relatedIdentifiers: {
        ...(artistName ? { artistName } : {}),
        ...(datesRaw ? { exhibitionDates: datesRaw } : {}),
      },
      displayOrder: exhibitions.length + 1,
    });
  }

  return exhibitions;
}

/**
 * 5. FOUNDATIONS & GRANTMAKERS: Supported Projects and Award Events
 * Captures funded artworks and program activities without falsely attributing ownership.
 */
export function extractFoundationProjects(
  html: string,
  pageUrl: string,
  foundationName: string,
): DiscoveredMediaItem[] {
  const projects: DiscoveredMediaItem[] = [];
  const seenUrls = new Set<string>();

  const itemRegex = /<(?:article|div|li)[^>]*class=["'][^"']*(?:grantee|recipient|fellow|project|awardee|story)[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|div|li)>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(html)) !== null && projects.length < 20) {
    const block = match[1];
    const imgMatch = block.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']|<img\s+[^>]*src=["']([^"']+)["']/i);
    if (!imgMatch) continue;

    const rawSrc = imgMatch[1] || imgMatch[3];
    const alt = imgMatch[2] || "";
    const imageUrl = cleanUrl(rawSrc, pageUrl);
    if (!imageUrl || seenUrls.has(imageUrl) || /logo|icon|avatar|spacer/i.test(imageUrl)) continue;

    const headingMatch = block.match(/<h[2-5][^>]*>([\s\S]*?)<\/h[2-5]>/i);
    const rawTitle = headingMatch ? stripHtml(headingMatch[1]) : (alt ? stripHtml(alt) : "");
    if (!rawTitle || rawTitle.length < 2) continue;
    const title = truncateTitle(rawTitle);

    const linkMatch = block.match(/<a\s+[^>]*href=["']([^"']+)["']/i);
    const officialUrl = linkMatch ? cleanUrl(linkMatch[1], pageUrl) : null;

    // Recipient & Year
    let year: number | null = null;
    const yrMatch = block.match(/\b((?:19|20)\d{2})\b/);
    if (yrMatch) year = parseInt(yrMatch[1], 10);

    let recipient: string | null = null;
    const recipMatch = block.match(/(?:grantee|recipient|fellow|artist)[:\s]+([A-Z][a-zA-Z\s.'-]+)/i);
    if (recipMatch) recipient = recipMatch[1].trim();

    seenUrls.add(imageUrl);
    projects.push({
      mediaGroup: "projects",
      mediaType: "grant_activity",
      imageUrl,
      title,
      subtitle: recipient ? `Supported Artist: ${recipient}` : (year ? `Funded Project (${year})` : null),
      altText: alt.trim() || `Supported project: ${title} supported by ${foundationName}`,
      creatorCredit: recipient,
      officialUrl,
      sourcePageUrl: pageUrl,
      publicationYear: year,
      publicationDateRaw: year ? String(year) : null,
      relatedIdentifiers: recipient ? { recipient } : {},
      displayOrder: projects.length + 1,
    });
  }

  return projects;
}

/**
 * Finds category, catalogue, and archive URLs on an organization website.
 */
export function findNavigationTargetUrls(
  html: string,
  baseUrl: string,
  kind: ProfileKind,
): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  let keywords: RegExp;
  switch (kind) {
    case "small_press":
      keywords = /(?:books|catalogue|catalog|titles|publications|store|shop)/i;
      break;
    case "literary_magazine":
      keywords = /(?:archive|issues|past-issues|back-issues|store)/i;
      break;
    case "residency_center":
      keywords = /(?:studios|facilities|campus|accommodations|grounds|photos|about)/i;
      break;
    case "gallery":
    case "visual_arts_organization":
      keywords = /(?:exhibitions|shows|artists|gallery|past-exhibitions|archive)/i;
      break;
    case "grant_foundation":
      keywords = /(?:grants|grantees|fellows|recipients|projects|stories)/i;
      break;
    default:
      keywords = /(?:about|spaces|facilities|programs)/i;
      break;
  }

  while ((match = linkRegex.exec(html)) !== null && found.length < 5) {
    const href = match[1];
    const text = stripHtml(match[2]);
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) continue;

    if (keywords.test(text) || keywords.test(href)) {
      const resolved = cleanUrl(href, baseUrl);
      if (resolved && !seen.has(resolved) && resolved !== baseUrl) {
        seen.add(resolved);
        found.push(resolved);
      }
    }
  }

  return found;
}

/**
 * Main discovery orchestrator for an organization profile.
 */
export async function discoverOrganizationMedia(
  pool: Pool,
  profileId: string,
  options: { maxPages?: number; dryRun?: boolean } = {},
): Promise<MediaDiscoveryResult> {
  const maxPages = options.maxPages ?? 4;
  const sourcePagesChecked: string[] = [];
  const discoveredItems: DiscoveredMediaItem[] = [];

  const profileRes = await pool.query<{
    id: string;
    name: string;
    profile_kind: ProfileKind;
    website_url: string | null;
  }>(
    `SELECT id, name, profile_kind, website_url FROM gary_profiles WHERE id = $1`,
    [profileId]
  );

  if (!profileRes.rows.length || !profileRes.rows[0].website_url) {
    return {
      profileId,
      status: "empty",
      totalDiscovered: 0,
      groupCounts: { identity: 0, issues: 0, books: 0, photos: 0, exhibitions: 0, projects: 0 },
      sourcePagesChecked: [],
      lastError: "Profile not found or missing website_url",
    };
  }

  const profile = profileRes.rows[0];
  const rawUrl = profile.website_url;
  if (!rawUrl) {
    return {
      profileId,
      status: "empty",
      totalDiscovered: 0,
      groupCounts: { identity: 0, issues: 0, books: 0, photos: 0, exhibitions: 0, projects: 0 },
      sourcePagesChecked: [],
      lastError: "Missing website_url",
    };
  }
  const homeUrl = rawUrl.replace(/\/$/, "");

  try {
    // 1. Fetch homepage
    sourcePagesChecked.push(homeUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const homeRes = await fetch(homeUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "MissaRadarBot/1.0 (+https://usemissa.com/bot)" },
    });
    clearTimeout(timeout);

    if (!homeRes.ok) {
      throw new Error(`HTTP ${homeRes.status} on ${homeUrl}`);
    }

    const homeHtml = await homeRes.text();

    // Collect identity media
    discoveredItems.push(...extractIdentityMedia(homeHtml, homeUrl, profile.name));

    // Find linked catalogue / archive pages
    const candidateUrls = findNavigationTargetUrls(homeHtml, homeUrl, profile.profile_kind);
    const pagesToFetch = candidateUrls.slice(0, maxPages - 1);

    // Collect type-specific media
    const allHtmls: Array<{ url: string; html: string }> = [{ url: homeUrl, html: homeHtml }];

    for (const url of pagesToFetch) {
      sourcePagesChecked.push(url);
      try {
        const pageCtrl = new AbortController();
        const pageTimer = setTimeout(() => pageCtrl.abort(), 8000);
        const pageRes = await fetch(url, {
          signal: pageCtrl.signal,
          headers: { "User-Agent": "MissaRadarBot/1.0 (+https://usemissa.com/bot)" },
        });
        clearTimeout(pageTimer);
        if (pageRes.ok) {
          const text = await pageRes.text();
          allHtmls.push({ url, html: text });
        }
      } catch {
        // Skip failed subpages non-destructively
      }
    }

    // Parse according to organization kind
    for (const page of allHtmls) {
      switch (profile.profile_kind) {
        case "small_press":
          discoveredItems.push(...extractPressBooks(page.html, page.url));
          break;
        case "residency_center":
          discoveredItems.push(...extractResidencyPhotos(page.html, page.url, profile.name));
          break;
        case "gallery":
        case "visual_arts_organization":
          discoveredItems.push(...extractGalleryExhibitions(page.html, page.url, profile.name));
          break;
        case "grant_foundation":
          discoveredItems.push(...extractFoundationProjects(page.html, page.url, profile.name));
          break;
        case "literary_magazine":
          // Issue records are also linked from gary_profile_issues table
          break;
        default:
          break;
      }
    }

    // If literary magazine, also map any verified issues from gary_profile_issues
    if (profile.profile_kind === "literary_magazine") {
      const issuesRes = await pool.query<{
        id: string;
        title: string;
        volume: string | null;
        issue_number: string | null;
        publication_date_raw: string | null;
        publication_year: number | null;
        cover_image_url: string | null;
        cover_image_alt: string | null;
        official_url: string;
        reading_url: string | null;
        purchase_url: string | null;
        source_page_url: string;
      }>(
        `SELECT id, title, volume, issue_number, publication_date_raw, publication_year,
                cover_image_url, cover_image_alt, official_url, reading_url, purchase_url, source_page_url
         FROM gary_profile_issues WHERE profile_id = $1`,
        [profileId]
      );

      for (const iss of issuesRes.rows) {
        if (iss.cover_image_url) {
          discoveredItems.push({
            mediaGroup: "issues",
            mediaType: "issue_cover",
            imageUrl: iss.cover_image_url,
            title: truncateTitle(iss.title),
            subtitle: [iss.volume ? `Vol. ${iss.volume}` : null, iss.issue_number ? `No. ${iss.issue_number}` : null, iss.publication_date_raw].filter(Boolean).join(" · ") || null,
            altText: iss.cover_image_alt || `Cover art of ${iss.title}`,
            officialUrl: iss.official_url,
            readingUrl: iss.reading_url,
            purchaseUrl: iss.purchase_url,
            sourcePageUrl: iss.source_page_url,
            publicationDateRaw: iss.publication_date_raw,
            publicationYear: iss.publication_year,
            relatedIdentifiers: {
              volume: iss.volume,
              issueNumber: iss.issue_number,
            },
          });
        }
      }
    }

    const groupCounts: Record<MediaGroup, number> = {
      identity: 0,
      issues: 0,
      books: 0,
      photos: 0,
      exhibitions: 0,
      projects: 0,
    };

    for (const item of discoveredItems) {
      groupCounts[item.mediaGroup] = (groupCounts[item.mediaGroup] || 0) + 1;
    }

    const totalDiscovered = discoveredItems.length;
    const status = totalDiscovered > 0 ? "discovered" : "empty";

    // If dry run, do not write to DB
    if (options.dryRun) {
      return {
        profileId,
        status,
        totalDiscovered,
        groupCounts,
        sourcePagesChecked,
        proposedItems: discoveredItems,
      };
    }

    // Upsert into database
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const item of discoveredItems) {
        const id = orgMediaDeterministicId(profileId, item);
        await client.query(
          `INSERT INTO gary_organization_media
             (id, profile_id, media_group, media_type, image_url, thumbnail_url,
              title, subtitle, alt_text, caption, creator_credit, rights_statement,
              official_url, reading_url, purchase_url, source_page_url,
              publication_date_raw, publication_year, related_identifiers, is_lead, display_order,
              review_status, last_verified_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'verified', now(), now())
           ON CONFLICT (id) DO UPDATE SET
             title = excluded.title,
             subtitle = coalesce(excluded.subtitle, gary_organization_media.subtitle),
             alt_text = coalesce(excluded.alt_text, gary_organization_media.alt_text),
             caption = coalesce(excluded.caption, gary_organization_media.caption),
             creator_credit = coalesce(excluded.creator_credit, gary_organization_media.creator_credit),
             official_url = coalesce(excluded.official_url, gary_organization_media.official_url),
             reading_url = coalesce(excluded.reading_url, gary_organization_media.reading_url),
             purchase_url = coalesce(excluded.purchase_url, gary_organization_media.purchase_url),
             source_page_url = excluded.source_page_url,
             publication_date_raw = coalesce(excluded.publication_date_raw, gary_organization_media.publication_date_raw),
             publication_year = coalesce(excluded.publication_year, gary_organization_media.publication_year),
             is_lead = excluded.is_lead,
             display_order = excluded.display_order,
             last_verified_at = now(),
             updated_at = now()`,
          [
            id,
            profileId,
            item.mediaGroup,
            item.mediaType,
            item.imageUrl,
            item.thumbnailUrl ?? null,
            item.title,
            item.subtitle ?? null,
            item.altText ?? null,
            item.caption ?? null,
            item.creatorCredit ?? null,
            item.rightsStatement ?? null,
            item.officialUrl ?? null,
            item.readingUrl ?? null,
            item.purchaseUrl ?? null,
            item.sourcePageUrl,
            item.publicationDateRaw ?? null,
            item.publicationYear ?? null,
            JSON.stringify(item.relatedIdentifiers ?? {}),
            item.isLead ?? false,
            item.displayOrder ?? 0,
          ]
        );
      }

      await client.query(
        `INSERT INTO gary_organization_media_refresh_status (profile_id, status, media_count, group_counts, last_error, last_refreshed_at, updated_at)
         VALUES ($1, $2, $3, $4, null, now(), now())
         ON CONFLICT (profile_id) DO UPDATE SET status = $2, media_count = $3, group_counts = $4, last_error = null, last_refreshed_at = now(), updated_at = now()`,
        [profileId, status, totalDiscovered, JSON.stringify(groupCounts)]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }

    return {
      profileId,
      status,
      totalDiscovered,
      groupCounts,
      sourcePagesChecked,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // On failure, preserve existing records; update status table to 'error'
    await pool.query(
      `INSERT INTO gary_organization_media_refresh_status (profile_id, status, media_count, group_counts, last_error, last_refreshed_at, updated_at)
       VALUES ($1, 'error', 0, '{}'::jsonb, $2, now(), now())
       ON CONFLICT (profile_id) DO UPDATE SET status = 'error', last_error = $2, updated_at = now()`,
      [profileId, errMsg]
    ).catch(() => {});

    return {
      profileId,
      status: "error",
      totalDiscovered: 0,
      groupCounts: { identity: 0, issues: 0, books: 0, photos: 0, exhibitions: 0, projects: 0 },
      sourcePagesChecked,
      lastError: errMsg,
    };
  }
}

/**
 * Returns grouped, paginated media for an organization profile according to the frontend contract.
 */
export async function getOrganizationMediaBundle(
  pool: Pool,
  profileId: string,
  options: { limitPerGroup?: number } = {},
): Promise<OrganizationMediaBundle> {
  const limit = Math.max(1, Math.min(50, options.limitPerGroup ?? 20));

  const [mediaRes, statusRes] = await Promise.all([
    pool.query<OrganizationMediaRecord>(
      `SELECT
         id, profile_id as "profileId", media_group as "mediaGroup", media_type as "mediaType",
         image_url as "imageUrl", thumbnail_url as "thumbnailUrl", width, height, aspect_ratio as "aspectRatio", format,
         title, subtitle, alt_text as "altText", caption, creator_credit as "creatorCredit", rights_statement as "rightsStatement",
         official_url as "officialUrl", reading_url as "readingUrl", purchase_url as "purchaseUrl",
         source_page_url as "sourcePageUrl", publication_date_raw as "publicationDateRaw", publication_year as "publicationYear",
         related_identifiers as "relatedIdentifiers", is_lead as "isLead", display_order as "displayOrder",
         review_status as "reviewStatus", last_verified_at as "lastVerifiedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM gary_organization_media
       WHERE profile_id = $1 AND review_status != 'rejected'
       ORDER BY media_group, is_lead DESC, publication_year DESC NULLS LAST, display_order ASC, created_at DESC`,
      [profileId]
    ),
    pool.query<{ status: "discovered" | "empty" | "error"; last_refreshed_at: Date | null }>(
      `SELECT status, last_refreshed_at FROM gary_organization_media_refresh_status WHERE profile_id = $1`,
      [profileId]
    ),
  ]);

  const bundle: OrganizationMediaBundle = {
    identity: { items: [], total: 0 },
    issues: { items: [], total: 0 },
    books: { items: [], total: 0 },
    photos: { items: [], total: 0 },
    exhibitions: { items: [], total: 0 },
    projects: { items: [], total: 0 },
    leadPhoto: null,
    refreshStatus: statusRes.rows[0]?.status ?? "unvisited",
    lastRefreshedAt: statusRes.rows[0]?.last_refreshed_at ? statusRes.rows[0].last_refreshed_at.toISOString() : null,
  };

  for (const row of mediaRes.rows) {
    const group = row.mediaGroup;
    if (bundle[group]) {
      bundle[group].total += 1;
      if (bundle[group].items.length < limit) {
        bundle[group].items.push(row);
      }
    }
    if (row.isLead && !bundle.leadPhoto && (row.mediaGroup === "photos" || row.mediaGroup === "identity")) {
      bundle.leadPhoto = row;
    }
  }

  // If no explicitly marked lead photo, fallback to first photo or representative identity
  if (!bundle.leadPhoto) {
    bundle.leadPhoto = bundle.photos.items[0] ??
      bundle.identity.items.find(i => i.mediaType === "representative_image") ?? null;
  }

  return bundle;
}
