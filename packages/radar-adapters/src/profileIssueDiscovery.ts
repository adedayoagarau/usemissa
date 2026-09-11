import { createHash } from "node:crypto";
import type { Pool } from "pg";

export interface ExtractedIssue {
  title: string;
  volume?: string | null;
  issueNumber?: string | null;
  publicationDateRaw?: string | null;
  publicationYear?: number | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  officialUrl: string;
  readingUrl?: string | null;
  purchaseUrl?: string | null;
  sourcePageUrl: string;
}

export interface ProfileIssueRecord extends ExtractedIssue {
  id: string;
  profileId: string;
  lastCheckedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type IssueRefreshState = "discovered" | "empty" | "error" | "unvisited";

export interface IssueRefreshResult {
  profileId: string;
  status: "discovered" | "empty" | "error";
  discoveredCount: number;
  existingCount: number;
  archiveUrlsChecked: string[];
  lastError?: string | null;
}

export interface ProfileIssuesResponse {
  issues: ProfileIssueRecord[];
  total: number;
  refreshStatus: IssueRefreshState;
  lastRefreshedAt: string | null;
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

/**
 * Extracts volume and issue number if present.
 */
export function extractVolumeAndNumber(text: string): { volume: string | null; issueNumber: string | null } {
  let volume: string | null = null;
  let issueNumber: string | null = null;

  const volMatch = text.match(/\b(?:vol(?:\.|ume)?|v\.)\s*([0-9ivxlcdm]+)\b/i);
  if (volMatch) volume = volMatch[1].trim();

  // Match: "Issue 2", "No. 3", "Number 1", "#78", "n. 4"
  const numMatch = text.match(/(?:\b(?:issue|number|no(?:\.|umber)?|n\.)\s*([0-9ivxlcdm]+)\b|#\s*([0-9ivxlcdm]+)\b)/i);
  if (numMatch) issueNumber = (numMatch[1] || numMatch[2]).trim();

  return { volume, issueNumber };
}

/**
 * Extracts raw publication date string and numeric year without inferring missing values.
 */
export function extractPublicationDate(text: string): { publicationDateRaw: string | null; publicationYear: number | null } {
  // Common publication date patterns:
  // "Spring 2024", "Summer/Fall 2023", "October 2022", "Fall 2021", "January 15, 2024", "2020"
  const seasonalMatch = text.match(/\b((?:Spring|Summer|Fall|Autumn|Winter)(?:\s*(?:[\/-]|and)\s*(?:Spring|Summer|Fall|Autumn|Winter))?\s+(?:19|20)\d{2})\b/i);
  if (seasonalMatch) {
    const raw = seasonalMatch[1].trim();
    const yearMatch = raw.match(/\b((?:19|20)\d{2})\b/);
    return {
      publicationDateRaw: raw,
      publicationYear: yearMatch ? parseInt(yearMatch[1], 10) : null,
    };
  }

  const monthYearMatch = text.match(/\b((?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{1,2},?)?\s+(?:19|20)\d{2})\b/i);
  if (monthYearMatch) {
    const raw = monthYearMatch[1].trim();
    const yearMatch = raw.match(/\b((?:19|20)\d{2})\b/);
    return {
      publicationDateRaw: raw,
      publicationYear: yearMatch ? parseInt(yearMatch[1], 10) : null,
    };
  }

  const standaloneYearMatch = text.match(/\b((?:19|20)\d{2})\b/);
  if (standaloneYearMatch) {
    const yr = parseInt(standaloneYearMatch[1], 10);
    // Discard unreasonable years
    if (yr >= 1800 && yr <= 2030) {
      return {
        publicationDateRaw: standaloneYearMatch[1],
        publicationYear: yr,
      };
    }
  }

  return { publicationDateRaw: null, publicationYear: null };
}

/**
 * Discovers potential archive subpages from a publication's homepage HTML.
 */
export function findIssueArchiveUrls(html: string, baseUrl: string): string[] {
  const archiveUrls = new Set<string>();
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = stripHtml(match[2]).toLowerCase();

    const isArchivePattern =
      /\b(archives?|past issues?|back issues?|all issues?|issues?|magazine archive|journal archive|read issues?|buy issues?)\b/i.test(text) ||
      /\/(?:archive|issues|back-issues|past-issues|all-issues|magazine\/issues)\b/i.test(href);

    if (isArchivePattern) {
      const resolved = cleanUrl(href, baseUrl);
      if (resolved && resolved !== baseUrl && !resolved.includes("#") && !resolved.endsWith(".pdf")) {
        // Must belong to same hostname
        try {
          const baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");
          const targetHost = new URL(resolved).hostname.replace(/^www\./, "");
          if (baseHost === targetHost) {
            archiveUrls.add(resolved);
          }
        } catch {
          // Ignore
        }
      }
    }
  }

  return [...archiveUrls].slice(0, 5);
}

/**
 * Deterministically parses issues from HTML supporting card grids, text lists, shop archives, and reader links.
 */
export function extractIssuesFromHtml(
  html: string,
  pageUrl: string,
  knownCovers?: Map<string, string>,
): ExtractedIssue[] {
  const issues: ExtractedIssue[] = [];
  const seenOfficialUrls = new Set<string>();

  // 1. FORMAT A: Block / Card / Article containers (Grid layouts)
  const cardRegex = /<(?:article|div|li)[^>]*(?:class|id)=["'][^"']*(?:issue|volume|magazine|product|post|archive-item|publication)[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|div|li)>/gi;
  let cardMatch: RegExpExecArray | null;

  while ((cardMatch = cardRegex.exec(html)) !== null && issues.length < 100) {
    const block = cardMatch[1];

    // Find main link in the block
    const aMatch = block.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!aMatch) continue;

    const href = aMatch[1];
    const anchorText = stripHtml(aMatch[2]);
    const resolvedOfficialUrl = cleanUrl(href, pageUrl);
    if (!resolvedOfficialUrl || seenOfficialUrls.has(resolvedOfficialUrl)) continue;

    // Check if the block mentions "issue", "volume", or seasonal date
    const blockText = stripHtml(block);
    const hasIssueMarker = /\b(?:issue|volume|vol\.|no\.|spring|summer|fall|autumn|winter|published)\b/i.test(blockText);
    if (!hasIssueMarker && !/\b(?:issue|vol)\b/i.test(resolvedOfficialUrl)) continue;

    // Extract title: either heading (h1-h4), or anchor text, or first line
    const headingMatch = block.match(/<h[1-5][^>]*>([\s\S]*?)<\/h[1-5]>/i);
    let title = headingMatch ? stripHtml(headingMatch[1]) : anchorText;
    if (!title || title.length < 2 || title.toLowerCase() === "read more" || title.toLowerCase() === "buy now") {
      title = anchorText;
    }
    if (!title || title.length < 2) continue;

    // Volume & Number
    const { volume, issueNumber } = extractVolumeAndNumber(`${title} ${blockText}`);

    // Publication Date & Year
    const { publicationDateRaw, publicationYear } = extractPublicationDate(`${title} ${blockText}`);

    // Cover image
    let coverImageUrl: string | null = null;
    let coverImageAlt: string | null = null;
    const imgMatch = block.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']|<img\s+[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["']|<img\s+[^>]*src=["']([^"']+)["']/i);
    if (imgMatch) {
      const rawSrc = imgMatch[1] || imgMatch[4] || imgMatch[5];
      const alt = imgMatch[2] || imgMatch[3] || "";
      const resolvedImg = cleanUrl(rawSrc, pageUrl);
      if (resolvedImg && !resolvedImg.endsWith(".svg") && !resolvedImg.endsWith(".ico") && !/logo|icon|avatar|spacer/i.test(resolvedImg)) {
        coverImageUrl = resolvedImg;
        coverImageAlt = alt.trim() || title;
      }
    }

    // Reuse known covers from gary_profile_visuals if missing
    if (!coverImageUrl && knownCovers) {
      if (publicationYear && knownCovers.has(String(publicationYear))) {
        coverImageUrl = knownCovers.get(String(publicationYear)) ?? null;
      } else if (title && knownCovers.has(title.toLowerCase())) {
        coverImageUrl = knownCovers.get(title.toLowerCase()) ?? null;
      }
    }

    // Optional Purchase URL (Format C)
    let purchaseUrl: string | null = null;
    const purchaseMatch = block.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(?:[^<]*(?:buy|order|purchase|shop|cart)[^<]*)<\/a>/i);
    if (purchaseMatch) {
      purchaseUrl = cleanUrl(purchaseMatch[1], pageUrl);
    } else if (/\/(?:product|shop|cart)\//i.test(resolvedOfficialUrl)) {
      purchaseUrl = resolvedOfficialUrl;
    }

    // Optional Reading URL (Format D)
    let readingUrl: string | null = null;
    const readMatch = block.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(?:[^<]*(?:read|view|pdf|download)[^<]*)<\/a>/i);
    if (readMatch) {
      const cand = cleanUrl(readMatch[1], pageUrl);
      if (cand && (cand.endsWith(".pdf") || /\/read\//i.test(cand))) readingUrl = cand;
    }

    seenOfficialUrls.add(resolvedOfficialUrl);
    issues.push({
      title,
      volume,
      issueNumber,
      publicationDateRaw,
      publicationYear,
      coverImageUrl,
      coverImageAlt,
      officialUrl: resolvedOfficialUrl,
      readingUrl,
      purchaseUrl,
      sourcePageUrl: pageUrl,
    });
  }

  // 2. FORMAT B: Chronological text links (when grid didn't capture or for simple archive lists)
  const linkListRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let linkMatch: RegExpExecArray | null;

  while ((linkMatch = linkListRegex.exec(html)) !== null && issues.length < 100) {
    const href = linkMatch[1];
    const text = stripHtml(linkMatch[2]);
    const resolvedUrl = cleanUrl(href, pageUrl);

    if (!resolvedUrl || seenOfficialUrls.has(resolvedUrl) || resolvedUrl === pageUrl) continue;

    // Check if the link text itself represents an issue: e.g. "Issue 45", "Vol. 12 No. 2", "Winter 2024"
    const isIssueLink =
      /^(?:issue\s+\d+|volume\s+\d+|vol\.\s*\d+|no\.\s*\d+|#(?:[0-9]+)|(?:Spring|Summer|Fall|Autumn|Winter)\s+(?:19|20)\d{2})/i.test(text);

    if (isIssueLink && text.length >= 4 && text.length <= 120) {
      seenOfficialUrls.add(resolvedUrl);
      const { volume, issueNumber } = extractVolumeAndNumber(text);
      const { publicationDateRaw, publicationYear } = extractPublicationDate(text);

      let coverImageUrl: string | null = null;
      if (knownCovers) {
        if (publicationYear && knownCovers.has(String(publicationYear))) {
          coverImageUrl = knownCovers.get(String(publicationYear)) ?? null;
        }
      }

      issues.push({
        title: text,
        volume,
        issueNumber,
        publicationDateRaw,
        publicationYear,
        coverImageUrl,
        coverImageAlt: coverImageUrl ? text : null,
        officialUrl: resolvedUrl,
        readingUrl: resolvedUrl.endsWith(".pdf") ? resolvedUrl : null,
        purchaseUrl: null,
        sourcePageUrl: pageUrl,
      });
    }
  }

  return issues;
}

/**
 * Generates a stable deterministic ID for an issue record.
 */
export function issueDeterministicId(profileId: string, issue: ExtractedIssue): string {
  const normUrl = issue.officialUrl.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const normKey = `${issue.volume ?? ""}:${issue.issueNumber ?? ""}:${issue.publicationDateRaw ?? issue.title}`;
  return createHash("sha256")
    .update(`${profileId}:${normUrl}:${normKey}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Discovers and stores past issues for a profile.
 * - Reuses existing issue-cover assets from gary_profile_visuals where applicable.
 * - Deduplicates repeat discoveries.
 * - Updates refresh status to distinguish between zero issues found and fetch errors.
 * - Never deletes or overwrites existing issues on a failed refresh.
 */
export async function discoverAndStoreProfileIssues(
  pool: Pool,
  profileId: string,
  options: { maxArchives?: number } = {},
): Promise<IssueRefreshResult> {
  const client = await pool.connect();
  const archiveUrlsChecked: string[] = [];

  try {
    // 1. Retrieve profile details
    const profileRes = await client.query<{ id: string; name: string; website_url: string | null }>(
      `SELECT id, name, website_url FROM gary_profiles WHERE id = $1`,
      [profileId]
    );

    if (!profileRes.rows.length || !profileRes.rows[0].website_url) {
      await client.query(
        `INSERT INTO gary_profile_issue_refresh_status (profile_id, status, issue_count, last_error, updated_at)
         VALUES ($1, 'error', 0, 'Profile has no website_url', now())
         ON CONFLICT (profile_id) DO UPDATE SET status = 'error', last_error = excluded.last_error, updated_at = now()`,
        [profileId]
      );
      return { profileId, status: "error", discoveredCount: 0, existingCount: 0, archiveUrlsChecked: [], lastError: "No website_url" };
    }

    const { website_url: websiteUrl } = profileRes.rows[0];

    // 2. Query existing visuals for issue covers to reuse
    const visualsRes = await client.query<{ image_url: string; label: string | null; issue_year: number | null; season: string | null }>(
      `SELECT image_url, label, issue_year, season FROM gary_profile_visuals WHERE profile_id = $1 AND asset_type = 'issue_cover'`,
      [profileId]
    );

    const knownCovers = new Map<string, string>();
    for (const v of visualsRes.rows) {
      if (v.issue_year) knownCovers.set(String(v.issue_year), v.image_url);
      if (v.label) knownCovers.set(v.label.toLowerCase(), v.image_url);
    }

    // 3. Fetch homepage HTML
    let homepageHtml = "";
    try {
      archiveUrlsChecked.push(websiteUrl);
      const res = await fetch(websiteUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        homepageHtml = await res.text();
      }
    } catch (fetchErr) {
      const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      await client.query(
        `INSERT INTO gary_profile_issue_refresh_status (profile_id, status, issue_count, last_error, updated_at)
         VALUES ($1, 'error', (SELECT COUNT(*) FROM gary_profile_issues WHERE profile_id = $1)::int, $2, now())
         ON CONFLICT (profile_id) DO UPDATE SET status = 'error', last_error = excluded.last_error, updated_at = now()`,
        [profileId, `Failed to fetch website: ${errMsg}`]
      );
      const existingCount = (await client.query<{ count: string }>(`SELECT COUNT(*) FROM gary_profile_issues WHERE profile_id = $1`, [profileId])).rows[0]?.count ?? "0";
      return { profileId, status: "error", discoveredCount: 0, existingCount: parseInt(existingCount, 10), archiveUrlsChecked, lastError: errMsg };
    }

    // 4. Find linked archive URLs
    const subArchiveUrls = findIssueArchiveUrls(homepageHtml, websiteUrl);
    const maxArchives = options.maxArchives ?? 3;
    const pagesToParse = [
      { url: websiteUrl, html: homepageHtml },
    ];

    for (const archiveUrl of subArchiveUrls.slice(0, maxArchives)) {
      try {
        archiveUrlsChecked.push(archiveUrl);
        const aRes = await fetch(archiveUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(5000),
        });
        if (aRes.ok) {
          const aHtml = await aRes.text();
          pagesToParse.push({ url: archiveUrl, html: aHtml });
        }
      } catch {
        // Individual sub-archive timeout is non-fatal; proceed with other pages
      }
    }

    // 5. Extract issues across pages
    const discoveredIssues: ExtractedIssue[] = [];
    const seenIds = new Set<string>();

    for (const page of pagesToParse) {
      const extracted = extractIssuesFromHtml(page.html, page.url, knownCovers);
      for (const issue of extracted) {
        const id = issueDeterministicId(profileId, issue);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          discoveredIssues.push(issue);
        }
      }
    }

    // 6. Upsert discovered issues into database
    if (discoveredIssues.length > 0) {
      await client.query("BEGIN");
      for (const issue of discoveredIssues) {
        const id = issueDeterministicId(profileId, issue);
        await client.query(
          `INSERT INTO gary_profile_issues
             (id, profile_id, title, volume, issue_number, publication_date_raw, publication_year,
              cover_image_url, cover_image_alt, official_url, reading_url, purchase_url,
              source_page_url, last_checked_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), now())
           ON CONFLICT (id) DO UPDATE SET
             title = excluded.title,
             volume = coalesce(excluded.volume, gary_profile_issues.volume),
             issue_number = coalesce(excluded.issue_number, gary_profile_issues.issue_number),
             publication_date_raw = coalesce(excluded.publication_date_raw, gary_profile_issues.publication_date_raw),
             publication_year = coalesce(excluded.publication_year, gary_profile_issues.publication_year),
             cover_image_url = coalesce(excluded.cover_image_url, gary_profile_issues.cover_image_url),
             cover_image_alt = coalesce(excluded.cover_image_alt, gary_profile_issues.cover_image_alt),
             official_url = excluded.official_url,
             reading_url = coalesce(excluded.reading_url, gary_profile_issues.reading_url),
             purchase_url = coalesce(excluded.purchase_url, gary_profile_issues.purchase_url),
             source_page_url = excluded.source_page_url,
             last_checked_at = now(),
             updated_at = now()`,
          [
            id, profileId, issue.title, issue.volume ?? null, issue.issueNumber ?? null,
            issue.publicationDateRaw ?? null, issue.publicationYear ?? null,
            issue.coverImageUrl ?? null, issue.coverImageAlt ?? null,
            issue.officialUrl, issue.readingUrl ?? null, issue.purchaseUrl ?? null,
            issue.sourcePageUrl,
          ]
        );
      }

      // Record successful refresh with discovered count
      await client.query(
        `INSERT INTO gary_profile_issue_refresh_status (profile_id, status, issue_count, last_error, last_refreshed_at, updated_at)
         VALUES ($1, 'discovered', $2, null, now(), now())
         ON CONFLICT (profile_id) DO UPDATE SET status = 'discovered', issue_count = $2, last_error = null, last_refreshed_at = now(), updated_at = now()`,
        [profileId, discoveredIssues.length]
      );
      await client.query("COMMIT");

      return {
        profileId,
        status: "discovered",
        discoveredCount: discoveredIssues.length,
        existingCount: discoveredIssues.length,
        archiveUrlsChecked,
        lastError: null,
      };
    } else {
      // No issues found on page: mark as 'empty' (successful refresh, 0 issues found)
      const existing = await client.query<{ count: string }>(
        `SELECT COUNT(*) FROM gary_profile_issues WHERE profile_id = $1`,
        [profileId]
      );
      const existingCount = parseInt(existing.rows[0]?.count ?? "0", 10);
      const status: IssueRefreshResult["status"] = existingCount > 0 ? "discovered" : "empty";

      await client.query(
        `INSERT INTO gary_profile_issue_refresh_status (profile_id, status, issue_count, last_error, last_refreshed_at, updated_at)
         VALUES ($1, $2, $3, null, now(), now())
         ON CONFLICT (profile_id) DO UPDATE SET status = $2, issue_count = $3, last_error = null, last_refreshed_at = now(), updated_at = now()`,
        [profileId, status, existingCount]
      );

      return {
        profileId,
        status,
        discoveredCount: 0,
        existingCount,
        archiveUrlsChecked,
        lastError: null,
      };
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      profileId,
      status: "error",
      discoveredCount: 0,
      existingCount: 0,
      archiveUrlsChecked,
      lastError: errMsg,
    };
  } finally {
    client.release();
  }
}

/**
 * Returns newest-first paginated issues and refresh state for a profile.
 */
export async function getProfileIssuesFromDb(
  pool: Pool,
  profileId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<ProfileIssuesResponse> {
  const limit = Math.max(1, Math.min(100, options.limit ?? 20));
  const offset = Math.max(0, options.offset ?? 0);

  const [issuesRes, countRes, statusRes] = await Promise.all([
    pool.query<ProfileIssueRecord>(
      `SELECT
         id, profile_id as "profileId", title, volume, issue_number as "issueNumber",
         publication_date_raw as "publicationDateRaw", publication_year as "publicationYear",
         cover_image_url as "coverImageUrl", cover_image_alt as "coverImageAlt",
         official_url as "officialUrl", reading_url as "readingUrl", purchase_url as "purchaseUrl",
         source_page_url as "sourcePageUrl", last_checked_at as "lastCheckedAt",
         created_at as "createdAt", updated_at as "updatedAt"
       FROM gary_profile_issues
       WHERE profile_id = $1
       ORDER BY publication_year DESC NULLS LAST, created_at DESC
       LIMIT $2 OFFSET $3`,
      [profileId, limit, offset]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM gary_profile_issues WHERE profile_id = $1`,
      [profileId]
    ),
    pool.query<{ status: IssueRefreshState; last_refreshed_at: Date | null }>(
      `SELECT status, last_refreshed_at FROM gary_profile_issue_refresh_status WHERE profile_id = $1`,
      [profileId]
    ),
  ]);

  const total = parseInt(countRes.rows[0]?.count ?? "0", 10);
  const statusRow = statusRes.rows[0];

  return {
    issues: issuesRes.rows,
    total,
    refreshStatus: statusRow?.status ?? "unvisited",
    lastRefreshedAt: statusRow?.last_refreshed_at ? statusRow.last_refreshed_at.toISOString() : null,
  };
}
