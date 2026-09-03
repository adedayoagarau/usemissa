import { createHash } from "node:crypto";
import type {
  CandidateKind,
  CandidateStatus,
  DiscoveredMediaCandidate,
  ExtractionContext,
  ExtractionMethod,
  InheritanceLevel,
  MediaConfidence,
  RightsStatus,
  SourceRole,
} from "./mediaExtractionContracts.js";

export const MEDIA_PARSER_VERSION = "missa-media-enrichment-v1";
const DEFAULT_MIN_WIDTH = 200;
const DEFAULT_MIN_HEIGHT = 200;

export function inferSourceRole(
  sourceUrl: string,
  context?: {
    sourceAuthorityKind?: string;
    sourceKind?: string;
    organizationId?: string;
  },
): SourceRole {
  if (context?.sourceAuthorityKind === "directory") return "discovery-directory";
  if (
    context?.sourceAuthorityKind === "platform" ||
    /submittable\.com|slideroom\.com|callforentry\.org|typeform\.com|forms\.gle|airtable\.com/i.test(sourceUrl)
  ) {
    return "application-portal";
  }
  if (/\.(?:pdf|docx?|zip)(?:[?#]|$)/i.test(sourceUrl)) {
    return "attachment";
  }
  if (
    context?.sourceKind === "organization" ||
    (context?.organizationId && sourceUrl.includes(context.organizationId))
  ) {
    return "organization-page";
  }
  return "official-opportunity-page";
}

export function normalizeMediaUrl(url: string, baseUrl: string): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:")) {
    return undefined;
  }
  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") {
      return undefined;
    }
    // Strip common tracking and cache-busting query params for consistent deduplication
    const trackingKeys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "_ga",
      "_gl",
      "ref",
      "source",
    ];
    for (const key of trackingKeys) {
      resolved.searchParams.delete(key);
    }
    resolved.hash = "";
    return resolved.href;
  } catch {
    return undefined;
  }
}

function cleanText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 500) : undefined;
}

interface RawCandidate {
  rawUrl: string;
  extractionMethod: ExtractionMethod;
  candidateKind: CandidateKind;
  alt?: string;
  caption?: string;
  title?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
  attributionText?: string;
  inheritanceLevel: InheritanceLevel;
  confidence: MediaConfidence;
  metadata?: Record<string, unknown>;
}

// 1. JSON-LD Discovery
function extractJsonLdCandidates(html: string, sourceUrl: string): RawCandidate[] {
  const candidates: RawCandidate[] = [];
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(scriptRegex)) {
    try {
      const data = JSON.parse(match[1]);
      const objects = Array.isArray(data)
        ? data
        : Array.isArray((data as { "@graph"?: unknown[] })["@graph"])
          ? (data as { "@graph": unknown[] })["@graph"]
          : [data];

      for (const obj of objects) {
        if (!obj || typeof obj !== "object") continue;
        const item = obj as Record<string, unknown>;

        // Check image property
        const imageProp = item.image;
        if (imageProp) {
          if (typeof imageProp === "string") {
            candidates.push({
              rawUrl: imageProp,
              extractionMethod: "json-ld",
              candidateKind: "opportunity-artwork",
              inheritanceLevel: "opportunity",
              confidence: "confirmed",
            });
          } else if (Array.isArray(imageProp)) {
            for (const img of imageProp) {
              if (typeof img === "string") {
                candidates.push({
                  rawUrl: img,
                  extractionMethod: "json-ld",
                  candidateKind: "opportunity-artwork",
                  inheritanceLevel: "opportunity",
                  confidence: "confirmed",
                });
              } else if (img && typeof img === "object") {
                const imgObj = img as Record<string, unknown>;
                const url = (imgObj.url ?? imgObj.contentUrl) as string | undefined;
                if (url) {
                  candidates.push({
                    rawUrl: url,
                    extractionMethod: "json-ld",
                    candidateKind: "opportunity-artwork",
                    alt: cleanText(imgObj.caption as string ?? imgObj.name as string ?? imgObj.description as string),
                    width: typeof imgObj.width === "number" ? imgObj.width : undefined,
                    height: typeof imgObj.height === "number" ? imgObj.height : undefined,
                    inheritanceLevel: "opportunity",
                    confidence: "confirmed",
                  });
                }
              }
            }
          } else if (typeof imageProp === "object") {
            const imgObj = imageProp as Record<string, unknown>;
            const url = (imgObj.url ?? imgObj.contentUrl) as string | undefined;
            if (url) {
              candidates.push({
                rawUrl: url,
                extractionMethod: "json-ld",
                candidateKind: "opportunity-artwork",
                alt: cleanText(imgObj.caption as string ?? imgObj.name as string ?? imgObj.description as string),
                width: typeof imgObj.width === "number" ? imgObj.width : undefined,
                height: typeof imgObj.height === "number" ? imgObj.height : undefined,
                inheritanceLevel: "opportunity",
                confidence: "confirmed",
              });
            }
          }
        }

        // Check primaryImageOfPage
        const primaryImage = item.primaryImageOfPage;
        if (typeof primaryImage === "string") {
          candidates.push({
            rawUrl: primaryImage,
            extractionMethod: "json-ld",
            candidateKind: "opportunity-artwork",
            inheritanceLevel: "opportunity",
            confidence: "confirmed",
          });
        } else if (primaryImage && typeof primaryImage === "object") {
          const imgObj = primaryImage as Record<string, unknown>;
          const url = (imgObj.url ?? imgObj.contentUrl) as string | undefined;
          if (url) {
            candidates.push({
              rawUrl: url,
              extractionMethod: "json-ld",
              candidateKind: "opportunity-artwork",
              alt: cleanText(imgObj.caption as string ?? imgObj.name as string),
              width: typeof imgObj.width === "number" ? imgObj.width : undefined,
              height: typeof imgObj.height === "number" ? imgObj.height : undefined,
              inheritanceLevel: "opportunity",
              confidence: "confirmed",
            });
          }
        }

        // Check associatedMedia
        const associated = item.associatedMedia;
        if (associated) {
          const assocList = Array.isArray(associated) ? associated : [associated];
          for (const a of assocList) {
            if (a && typeof a === "object") {
              const aObj = a as Record<string, unknown>;
              const url = (aObj.url ?? aObj.contentUrl) as string | undefined;
              if (url) {
                candidates.push({
                  rawUrl: url,
                  extractionMethod: "json-ld",
                  candidateKind: "opportunity-artwork",
                  alt: cleanText(aObj.caption as string ?? aObj.name as string),
                  width: typeof aObj.width === "number" ? aObj.width : undefined,
                  height: typeof aObj.height === "number" ? aObj.height : undefined,
                  inheritanceLevel: "opportunity",
                  confidence: "confirmed",
                });
              }
            }
          }
        }

        // Check logo (organization-level mark)
        const logo = item.logo;
        if (typeof logo === "string") {
          candidates.push({
            rawUrl: logo,
            extractionMethod: "json-ld",
            candidateKind: "organization-logo",
            inheritanceLevel: "organization",
            confidence: "probable",
          });
        } else if (logo && typeof logo === "object") {
          const logoObj = logo as Record<string, unknown>;
          const url = (logoObj.url ?? logoObj.contentUrl) as string | undefined;
          if (url) {
            candidates.push({
              rawUrl: url,
              extractionMethod: "json-ld",
              candidateKind: "organization-logo",
              alt: cleanText(logoObj.caption as string ?? logoObj.name as string),
              width: typeof logoObj.width === "number" ? logoObj.width : undefined,
              height: typeof logoObj.height === "number" ? logoObj.height : undefined,
              inheritanceLevel: "organization",
              confidence: "probable",
            });
          }
        }
      }
    } catch {
      // Invalid JSON-LD is ignored
    }
  }

  return candidates;
}

// 2. Open Graph Discovery
function extractMeta(html: string, property: string): string | undefined {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>` +
      `|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1] ?? match?.[2];
}

function extractOpenGraphCandidates(html: string): RawCandidate[] {
  const candidates: RawCandidate[] = [];
  const ogImage =
    extractMeta(html, "og:image:secure_url") ??
    extractMeta(html, "og:image:url") ??
    extractMeta(html, "og:image");

  if (ogImage) {
    const widthStr = extractMeta(html, "og:image:width");
    const heightStr = extractMeta(html, "og:image:height");
    const alt = extractMeta(html, "og:image:alt");
    const mimeType = extractMeta(html, "og:image:type");
    const width = widthStr && !Number.isNaN(Number(widthStr)) ? Number(widthStr) : undefined;
    const height = heightStr && !Number.isNaN(Number(heightStr)) ? Number(heightStr) : undefined;

    candidates.push({
      rawUrl: ogImage,
      extractionMethod: "open-graph",
      candidateKind: "opportunity-artwork",
      alt: cleanText(alt),
      width,
      height,
      mimeType: mimeType || undefined,
      inheritanceLevel: "opportunity",
      confidence: "probable",
    });
  }

  return candidates;
}

// 3. Twitter Card Discovery
function extractTwitterCandidates(html: string): RawCandidate[] {
  const candidates: RawCandidate[] = [];
  const twitterImage =
    extractMeta(html, "twitter:image") ??
    extractMeta(html, "twitter:image:src");

  if (twitterImage) {
    const alt = extractMeta(html, "twitter:image:alt");
    candidates.push({
      rawUrl: twitterImage,
      extractionMethod: "twitter",
      candidateKind: "opportunity-artwork",
      alt: cleanText(alt),
      inheritanceLevel: "opportunity",
      confidence: "probable",
    });
  }

  return candidates;
}

// 4. Explicit Hero / Poster / Cover / Artwork in DOM
function extractDomHeroCandidates(html: string): RawCandidate[] {
  const candidates: RawCandidate[] = [];

  // Match tags that signify visual call/program artwork:
  // e.g. <figure class="hero...">, <img class="call-artwork"...>, <div class="poster"><img...>
  const elementPattern =
    /<(?:figure|div|header|section)[^>]+(?:class|id)=["'][^"']*(?:hero|poster|cover|featured|artwork|call-artwork|exhibition|residency|prize|program|banner)[^"']*["'][^>]*>([\s\S]*?)<\/(?:figure|div|header|section)>/gi;

  for (const blockMatch of html.matchAll(elementPattern)) {
    const blockHtml = blockMatch[0];
    const blockClass = (blockMatch[0].match(/(?:class|id)=["']([^"']+)["']/i)?.[1] ?? "").toLowerCase();

    // Skip navigation chrome, headers, footers, sidebars, advertisements
    if (
      /nav|navbar|menu|sidebar|footer|ad-|advertisement|cookie|sponsor/i.test(blockClass)
    ) {
      continue;
    }

    let candidateKind: CandidateKind = "opportunity-artwork";
    if (/prize|award/i.test(blockClass)) candidateKind = "opportunity-artwork";
    else if (/program/i.test(blockClass)) candidateKind = "program-artwork";
    else if (/residency|venue|gallery|place/i.test(blockClass)) candidateKind = "venue/place";
    else if (/cover|poster|hero/i.test(blockClass)) candidateKind = "opportunity-artwork";

    const captionMatch =
      blockHtml.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] ??
      blockHtml.match(/<(?:p|span)[^>]+class=["'][^"']*(?:caption|credit|attribution|copyright)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|span)>/i)?.[1];

    // Check if a <picture> with <source srcset> is inside this block
    const picMatch = blockHtml.match(/<picture[^>]*>([\s\S]*?)<\/picture>/i);
    if (picMatch) {
      const srcsets: Array<{ url: string; width?: number }> = [];
      for (const s of picMatch[1].matchAll(/<source[^>]+srcset=["']([^"']+)["'][^>]*>/gi)) {
        srcsets.push(...parseSrcset(s[1]));
      }
      if (srcsets.length > 0) {
        srcsets.sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
        const best = srcsets[0];
        const alt = picMatch[1].match(/<img[^>]+alt=["']([^"']*)["']/i)?.[1];
        candidates.push({
          rawUrl: best.url,
          extractionMethod: "srcset",
          candidateKind,
          alt: cleanText(alt),
          caption: cleanText(captionMatch),
          attributionText: cleanText(captionMatch),
          width: best.width,
          inheritanceLevel: candidateKind === "program-artwork" ? "program" : "opportunity",
          confidence: "probable",
        });
        continue;
      }
    }

    // Extract img tags inside this artwork block
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    for (const imgMatch of blockHtml.matchAll(imgRegex)) {
      const tag = imgMatch[0];
      const src = imgMatch[1];
      const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1];
      const title = tag.match(/title=["']([^"']*)["']/i)?.[1];
      const widthMatch = tag.match(/width=["']?(\d+)["']?/i)?.[1];
      const heightMatch = tag.match(/height=["']?(\d+)["']?/i)?.[1];

      // Nearby attribution / caption
      const captionMatch = blockHtml.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] ??
        blockHtml.match(/<(?:p|span)[^>]+class=["'][^"']*(?:caption|credit|attribution|copyright)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|span)>/i)?.[1];

      let candidateKind: CandidateKind = "opportunity-artwork";
      if (/prize|award/i.test(blockClass)) candidateKind = "opportunity-artwork";
      else if (/program/i.test(blockClass)) candidateKind = "program-artwork";
      else if (/residency|venue|gallery|place/i.test(blockClass)) candidateKind = "venue/place";
      else if (/cover|poster|hero/i.test(blockClass)) candidateKind = "opportunity-artwork";

      candidates.push({
        rawUrl: src,
        extractionMethod: "dom-hero",
        candidateKind,
        alt: cleanText(alt),
        title: cleanText(title),
        caption: cleanText(captionMatch),
        attributionText: cleanText(captionMatch),
        width: widthMatch ? Number(widthMatch) : undefined,
        height: heightMatch ? Number(heightMatch) : undefined,
        inheritanceLevel: candidateKind === "program-artwork" ? "program" : "opportunity",
        confidence: "probable",
      });
    }
  }

  // Also match individual <img> tags with explicit artwork classes/roles
  const standaloneImgPattern =
    /<img[^>]+(?:class|id|data-role)=["'][^"']*(?:hero|poster|cover|artwork|call-artwork|exhibition|residency|prize)[^"']*["'][^>]*>/gi;

  for (const match of html.matchAll(standaloneImgPattern)) {
    const tag = match[0];
    const src = tag.match(/src=["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    const tagClass = (tag.match(/(?:class|id)=["']([^"']+)["']/i)?.[1] ?? "").toLowerCase();
    if (/nav|menu|sidebar|footer|ad-|advertisement|cookie/i.test(tagClass)) continue;

    const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1];
    const title = tag.match(/title=["']([^"']*)["']/i)?.[1];
    const widthMatch = tag.match(/width=["']?(\d+)["']?/i)?.[1];
    const heightMatch = tag.match(/height=["']?(\d+)["']?/i)?.[1];

    candidates.push({
      rawUrl: src,
      extractionMethod: "dom-hero",
      candidateKind: "opportunity-artwork",
      alt: cleanText(alt),
      title: cleanText(title),
      width: widthMatch ? Number(widthMatch) : undefined,
      height: heightMatch ? Number(heightMatch) : undefined,
      inheritanceLevel: "opportunity",
      confidence: "probable",
    });
  }

  return candidates;
}

// 5. Responsive srcset / <picture> candidates
export function parseSrcset(srcset: string): Array<{ url: string; width?: number; density?: number }> {
  const results: Array<{ url: string; width?: number; density?: number }> = [];
  const entries = srcset.split(",");
  for (const raw of entries) {
    const parts = raw.trim().split(/\s+/);
    if (!parts[0]) continue;
    const url = parts[0];
    const descriptor = parts[1];
    let width: number | undefined;
    let density: number | undefined;
    if (descriptor) {
      if (descriptor.endsWith("w")) {
        const w = Number(descriptor.slice(0, -1));
        if (!Number.isNaN(w)) width = w;
      } else if (descriptor.endsWith("x")) {
        const d = Number(descriptor.slice(0, -1));
        if (!Number.isNaN(d)) density = d;
      }
    }
    results.push({ url, width, density });
  }
  return results;
}

function extractSrcsetCandidates(html: string): RawCandidate[] {
  const candidates: RawCandidate[] = [];

  // Parse <picture> elements
  const pictureRegex = /<picture[^>]*>([\s\S]*?)<\/picture>/gi;
  for (const picMatch of html.matchAll(pictureRegex)) {
    const picContent = picMatch[1];
    const imgMatch = picContent.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    const alt = picContent.match(/alt=["']([^"']*)["']/i)?.[1];

    // Find sources
    const sourceRegex = /<source[^>]+srcset=["']([^"']+)["'][^>]*>/gi;
    const srcsets: Array<{ url: string; width?: number }> = [];
    for (const srcMatch of picContent.matchAll(sourceRegex)) {
      srcsets.push(...parseSrcset(srcMatch[1]));
    }

    if (srcsets.length > 0) {
      // Pick the best resolution (highest width without being absurd)
      srcsets.sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
      const best = srcsets[0];
      candidates.push({
        rawUrl: best.url,
        extractionMethod: "srcset",
        candidateKind: "opportunity-artwork",
        alt: cleanText(alt),
        width: best.width,
        inheritanceLevel: "opportunity",
        confidence: "probable",
      });
    } else if (imgMatch) {
      candidates.push({
        rawUrl: imgMatch[1],
        extractionMethod: "srcset",
        candidateKind: "opportunity-artwork",
        alt: cleanText(alt),
        inheritanceLevel: "opportunity",
        confidence: "probable",
      });
    }
  }

  // Parse standalone <img> with srcset
  const standaloneSrcset = /<img[^>]+srcset=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(standaloneSrcset)) {
    const tag = match[0];
    const parsed = parseSrcset(match[1]);
    if (parsed.length === 0) continue;
    parsed.sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    const best = parsed[0];
    const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1];
    candidates.push({
      rawUrl: best.url,
      extractionMethod: "srcset",
      candidateKind: "opportunity-artwork",
      alt: cleanText(alt),
      width: best.width,
      inheritanceLevel: "opportunity",
      confidence: "probable",
    });
  }

  return candidates;
}

// 6. Rejection Evaluation
export function evaluateRejection(
  candidate: {
    resolvedUrl: string;
    candidateKind: CandidateKind;
    sourceRole: SourceRole;
    alt?: string;
    width?: number;
    height?: number;
    mimeType?: string;
    fileSize?: number;
    inheritanceLevel: InheritanceLevel;
  },
  context: ExtractionContext,
): string[] {
  const reasons: string[] = [];
  const urlLower = candidate.resolvedUrl.toLowerCase();
  const altLower = (candidate.alt ?? "").toLowerCase();

  // 1. Tracking pixel
  if (
    (candidate.width !== undefined && candidate.width <= 10) ||
    (candidate.height !== undefined && candidate.height <= 10) ||
    /pixel|tracking|beacon|\/tr\?|analytics|stats\.wp\.com|bat\.bing\.com|facebook\.com\/tr/i.test(urlLower)
  ) {
    reasons.push("tracking-pixel");
  }

  // 2. Favicons and generic icons
  if (
    /\.ico(?:[?#]|$)|favicon|apple-touch-icon|\/icons?\/|social-icon|icon-/i.test(urlLower) ||
    /^favicon/i.test(altLower)
  ) {
    reasons.push("favicon-or-icon");
  }

  // 3. Social icons
  if (
    /facebook\.(?:svg|png|jpg)|twitter\.(?:svg|png|jpg)|instagram\.(?:svg|png|jpg)|linkedin\.(?:svg|png|jpg)|youtube\.(?:svg|png|jpg)|pinterest|tiktok|share-on-|social-share/i.test(
      urlLower,
    ) ||
    /facebook|twitter|instagram|linkedin|follow us|share on/i.test(altLower)
  ) {
    reasons.push("social-icon");
  }

  // 4. Avatars unrelated to the call
  if (
    /gravatar\.com|author-avatar|user-avatar|comment-avatar|profile-pic|default-avatar/i.test(urlLower) ||
    /user avatar|author photo|gravatar/i.test(altLower)
  ) {
    reasons.push("avatar");
  }

  // 5. Navigation chrome, cookie graphics, advertisements
  if (
    /navbar-logo|header-logo|footer-logo|site-logo|cookie-banner|ad-banner|sponsor-ad|doubleclick|googleads|adsystem/i.test(
      urlLower,
    ) ||
    /cookie|advertisement|sponsored/i.test(altLower)
  ) {
    reasons.push("navigation-or-advertisement");
  }

  // 6. Generic stock photography
  if (
    /unsplash\.com|shutterstock\.com|gettyimages\.com|stock\.adobe\.com|istockphoto\.com|pexels\.com|pixabay\.com/i.test(
      urlLower,
    )
  ) {
    reasons.push("generic-stock-photography");
  }

  // 7. Application-platform branding & submission portal buttons
  if (
    /submittable|slideroom|cafe.*logo|typeform|airtable|entrythingy|duotrope|duosuma|submit[-_]?button|wpcom|wordpress[-_]?logo|automattic|wix.*(?:badge|banner)|squarespace.*logo/i.test(
      urlLower,
    ) ||
    /submittable|slideroom|callforentry|typeform|powered by|submit button|wordpress|automattic/i.test(altLower)
  ) {
    reasons.push("application-platform-branding");
  }

  // 8. Discovery directory branding
  if (
    context.sourceRole === "discovery-directory" &&
    (/pw\.org|poets.*writers|artstation|entrythingy|callfor/i.test(urlLower) ||
      /directory logo|poets & writers/i.test(altLower))
  ) {
    reasons.push("directory-branding");
  }

  // 9. Below useful size
  // Opportunity covers and artwork require at least 400x300 for crisp directory cards; logos require 200x200
  const isLogo = candidate.candidateKind === "organization-logo";
  const defaultMinW = isLogo ? 200 : 400;
  const defaultMinH = isLogo ? 200 : 300;
  const minWidth = context.minWidth ?? defaultMinW;
  const minHeight = context.minHeight ?? defaultMinH;
  if (
    candidate.width !== undefined &&
    candidate.height !== undefined &&
    (candidate.width < minWidth || candidate.height < minHeight)
  ) {
    reasons.push(`below-useful-size: ${candidate.width}x${candidate.height} < ${minWidth}x${minHeight}`);
  }

  // 10. Unsupported MIME types / extensions
  if (candidate.mimeType) {
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
    if (!validMimes.includes(candidate.mimeType.toLowerCase())) {
      reasons.push(`unsupported-mime: ${candidate.mimeType}`);
    }
  } else if (/\.(?:svg|pdf|html|exe|js|css)(?:[?#]|$)/i.test(urlLower)) {
    reasons.push("unsupported-file-extension");
  }

  // 11. Oversized file
  const maxBytes = context.maxFileSize ?? 10_000_000;
  if (candidate.fileSize !== undefined && candidate.fileSize > maxBytes) {
    reasons.push(`oversized-file: ${candidate.fileSize} > ${maxBytes}`);
  }

  // 12. Unconfirmed inheritance
  if (
    candidate.inheritanceLevel === "organization" &&
    !context.organizationConfirmed
  ) {
    reasons.push("unconfirmed-organization-inheritance");
  }
  if (
    candidate.inheritanceLevel === "program" &&
    !context.programConfirmed
  ) {
    reasons.push("unconfirmed-program-inheritance");
  }

  // 13. Unlabelled body image (do not default blindly to the first <img>)
  if (candidate.candidateKind === "unknown" && reasons.length === 0) {
    reasons.push("unmarked-body-image");
  }

  return reasons;
}

export interface ExtractionResult {
  candidates: DiscoveredMediaCandidate[];
  rejectionCounts: Record<string, number>;
  totalDiscovered: number;
}

/**
 * Extracts candidate media in strict discovery order:
 * 1. JSON-LD
 * 2. Open Graph
 * 3. Twitter
 * 4. Explicit DOM artwork
 * 5. Responsive srcset
 * 6. Organization/Program labelled fallback
 *
 * Enforces rejection heuristics and deduplication by normalized URL.
 * All candidates start with rights_status='unknown'.
 */
export function extractMediaCandidates(
  html: string,
  context: ExtractionContext,
  redirectChain: string[] = [],
  httpStatus = 200,
): ExtractionResult {
  const rawList: RawCandidate[] = [];

  // Strict Discovery Order:
  // 1. JSON-LD
  rawList.push(...extractJsonLdCandidates(html, context.pageUrl));

  // 2. Open Graph
  rawList.push(...extractOpenGraphCandidates(html));

  // 3. Twitter
  rawList.push(...extractTwitterCandidates(html));

  // 4. Explicit DOM artwork
  rawList.push(...extractDomHeroCandidates(html));

  // 5. Responsive srcset
  rawList.push(...extractSrcsetCandidates(html));

  // 5b. Document-level images inspection (for rejection audit & preventing blind first-img defaulting)
  const allImgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(allImgPattern)) {
    const tag = match[0];
    const src = match[1];
    if (!src) continue;
    const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1];
    const widthMatch = tag.match(/width=["']?(\d+)["']?/i)?.[1];
    const heightMatch = tag.match(/height=["']?(\d+)["']?/i)?.[1];
    rawList.push({
      rawUrl: src,
      extractionMethod: "dom-hero",
      candidateKind: "unknown",
      alt: cleanText(alt),
      width: widthMatch ? Number(widthMatch) : undefined,
      height: heightMatch ? Number(heightMatch) : undefined,
      inheritanceLevel: "opportunity",
      confidence: "unknown",
    });
  }

  const totalDiscovered = rawList.length;
  const candidates: DiscoveredMediaCandidate[] = [];
  const rejectionCounts: Record<string, number> = {};
  const seenUrls = new Set<string>();

  for (const raw of rawList) {
    const resolvedUrl = normalizeMediaUrl(raw.rawUrl, context.pageUrl);
    if (!resolvedUrl) continue;
    if (seenUrls.has(resolvedUrl)) continue;
    seenUrls.add(resolvedUrl);

    const rejections = evaluateRejection(
      {
        resolvedUrl,
        candidateKind: raw.candidateKind,
        sourceRole: context.sourceRole,
        alt: raw.alt,
        width: raw.width,
        height: raw.height,
        mimeType: raw.mimeType,
        fileSize: raw.fileSize,
        inheritanceLevel: raw.inheritanceLevel,
      },
      context,
    );

    for (const r of rejections) {
      rejectionCounts[r] = (rejectionCounts[r] ?? 0) + 1;
    }

    const isRejected = rejections.length > 0;
    const status: CandidateStatus = isRejected ? "rejected" : "reviewable";
    const rightsStatus: RightsStatus = "unknown";

    // Deduplication content hash of URL if not yet fetched
    const contentHash = createHash("sha256").update(resolvedUrl).digest("hex");

    candidates.push({
      originalUrl: raw.rawUrl,
      resolvedUrl,
      pageUrl: context.pageUrl,
      sourceRole: context.sourceRole,
      candidateKind: raw.candidateKind,
      alt: raw.alt,
      caption: raw.caption,
      title: raw.title,
      width: raw.width,
      height: raw.height,
      mimeType: raw.mimeType,
      fileSize: raw.fileSize,
      httpStatus,
      redirectChain,
      contentHash,
      attributionText: raw.attributionText,
      inheritanceLevel: raw.inheritanceLevel,
      linkedOrganizationId: context.organizationId,
      linkedProgramId: context.programId,
      extractionMethod: raw.extractionMethod,
      parserVersion: MEDIA_PARSER_VERSION,
      confidence: raw.confidence,
      rejectionReasons: rejections,
      status,
      rightsStatus,
      metadata: raw.metadata ?? {},
    });
  }

  // 6. Labelled Organization Fallback:
  // If no reviewable opportunity-level candidate was discovered, but an organization is confirmed
  const hasReviewable = candidates.some((c) => c.status === "reviewable" && c.inheritanceLevel === "opportunity");
  if (!hasReviewable && context.organizationConfirmed && context.organizationId) {
    // Check if any organization logo or candidate was found in JSON-LD or meta
    const orgCandidate = candidates.find(
      (c) => c.inheritanceLevel === "organization" && c.status === "reviewable",
    );
    if (!orgCandidate) {
      // Look for a fallback organization logo/mark from JSON-LD if present
      const jsonLdLogos = rawList.filter((r) => r.candidateKind === "organization-logo");
      for (const logo of jsonLdLogos) {
        const resolvedUrl = normalizeMediaUrl(logo.rawUrl, context.pageUrl);
        if (resolvedUrl && !seenUrls.has(resolvedUrl)) {
          seenUrls.add(resolvedUrl);
          candidates.push({
            originalUrl: logo.rawUrl,
            resolvedUrl,
            pageUrl: context.pageUrl,
            sourceRole: context.sourceRole,
            candidateKind: "organization-logo",
            alt: logo.alt ?? `${context.title} host logo`,
            inheritanceLevel: "organization",
            linkedOrganizationId: context.organizationId,
            extractionMethod: "organization-fallback",
            parserVersion: MEDIA_PARSER_VERSION,
            confidence: "probable",
            rejectionReasons: [],
            status: "reviewable",
            rightsStatus: "unknown",
            httpStatus,
            redirectChain,
            contentHash: createHash("sha256").update(resolvedUrl).digest("hex"),
            metadata: { fallback: true },
          });
          break;
        }
      }
    }
  }

  return {
    candidates,
    rejectionCounts,
    totalDiscovered,
  };
}
