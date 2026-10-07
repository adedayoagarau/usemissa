import { creatorPoolFor } from "@missa/radar-adapters";
import {
  portfolioSchema,
  publicPortfolioProjection,
  type PortfolioData,
} from "./creator-portfolio-schema";
import { isThinWorkPage, workSlugs } from "./creator-work-page";
import type { SitemapEntry } from "./sitemapData";

/** A sitemap file holds at most 50,000 addresses; the directory uses the rest. */
const MAX_WORK_ENTRIES = 20000;
const MAX_PROFILES = 5000;

/**
 * The addresses of one profile's work pages: every work visitors can open and
 * that has something to read, see or hear. A page with only a title is left
 * out because the route marks it noindex.
 */
export function workPageSitemapEntries(
  handleKey: string,
  portfolio: PortfolioData,
  lastModified?: string,
): SitemapEntry[] {
  const works = publicPortfolioProjection(portfolio).works;
  const slugs = workSlugs(works);
  return works.flatMap((work, index) =>
    isThinWorkPage(work)
      ? []
      : [{ path: `/@${handleKey}/${slugs[index]}`, lastModified }],
  );
}

type PublishedRow = {
  handle_key: string;
  published_at: Date | string | null;
  portfolio: unknown;
};

/**
 * Work pages of every published profile. Only the fields that decide a page's
 * address and whether it has anything on it are read, so a long profile costs
 * a row, not its whole draft.
 */
export async function listCreatorWorkSitemapEntries(): Promise<SitemapEntry[]> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return [];
  const result = await creatorPoolFor(url).query<PublishedRow>(
    `select h.handle_key, p.published_at,
            jsonb_build_object(
              'modules', coalesce(p.published_data->'modules', '[]'::jsonb),
              'works', coalesce(p.published_data->'works', '[]'::jsonb)
            ) as portfolio
       from creator_portfolio_drafts p
       join radar_accounts a on a.id = p.account_id
       join handles h on h.subject_id = a.data->>'userId'
        and h.subject_type = 'user' and h.state = 'claimed'
      where p.published_at is not null
        and coalesce(a.data->>'active', 'true') <> 'false'
      order by p.published_at desc
      limit $1`,
    [MAX_PROFILES],
  );
  const entries: SitemapEntry[] = [];
  for (const row of result.rows) {
    const parsed = portfolioSchema.safeParse(row.portfolio);
    if (!parsed.success) continue;
    const modified = row.published_at
      ? new Date(row.published_at).toISOString()
      : undefined;
    entries.push(
      ...workPageSitemapEntries(row.handle_key, parsed.data, modified),
    );
    if (entries.length >= MAX_WORK_ENTRIES) break;
  }
  return entries.slice(0, MAX_WORK_ENTRIES);
}
