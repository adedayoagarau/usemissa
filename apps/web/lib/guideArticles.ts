import { AFRICAN_COUNTRY_CODES } from '@missa/contracts';
import bundle from '@/content/guides/articles.generated.json';
import type { Tokens } from 'marked';
import { parseGuide, plainText, readingMinutes, type ParsedGuide } from '@/lib/guideMarkdown';

/**
 * Long-form guides. Each one is a Markdown body and a metadata file in
 * content/guides, bundled by scripts/build-guide-articles.mjs. They share the
 * /guides/<slug> route with the short discovery guides in discoveryGuides.ts.
 */

export const GUIDE_SECTIONS = [
  'Finding calls',
  'Fees and costs',
  'Magazines and writing',
  'Residencies and funding',
  'Staying safe',
] as const;
export type GuideSection = (typeof GUIDE_SECTIONS)[number];

/** Editorial cover palettes, reused from the discovery collections. */
export type GuideCoverPalette = 'fellowships' | 'grants' | 'poetry' | 'residencies' | 'jobs-for-creators';
export type GuideMotif = 'orbit' | 'burst' | 'steps' | 'frame';

export interface GuideArticleMeta {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  summary: string;
  section: GuideSection;
  primaryKeyword: string;
  secondaryKeywords: string[];
  answer: string;
  keyPoints: string[];
  illustrationAlt?: string;
  liveCalls?: string;
  cta: { label: string; href: string };
  related: string[];
  /** For a comparison or list article: which body table names the items, for ItemList schema. */
  itemList?: { name: string; table: number; column: number };
}

export interface GuideAuthor {
  name: string;
  role: string;
}

export interface GuideArticle extends GuideArticleMeta {
  publishedAt: string;
  updatedAt: string;
  researchCheckedAt: string;
  author: GuideAuthor;
  palette: GuideCoverPalette;
  motif: GuideMotif;
  readingMinutes: number;
}

export interface GuideArticleWithBody extends GuideArticle {
  parsed: ParsedGuide;
}

export const GUIDE_AUTHOR: GuideAuthor = { name: 'Adedayo Agarau', role: 'Founder, Missa' };

const SECTION_PALETTE: Record<GuideSection, GuideCoverPalette> = {
  'Finding calls': 'fellowships',
  'Fees and costs': 'grants',
  'Magazines and writing': 'poetry',
  'Residencies and funding': 'residencies',
  'Staying safe': 'jobs-for-creators',
};

/** Publishing order; the first is featured on /guides. */
const SCHEDULE: Array<{ slug: string; publishedAt: string; updatedAt?: string; researchCheckedAt: string; motif: GuideMotif }> = [
  { slug: 'where-to-find-open-calls', publishedAt: '2026-10-07', researchCheckedAt: '2026-10-07', motif: 'orbit' },
  { slug: 'entry-fees-hanging-fees-participation-fees', publishedAt: '2026-10-07', researchCheckedAt: '2026-10-07', motif: 'steps' },
  { slug: 'duotrope-alternatives', publishedAt: '2026-10-07', researchCheckedAt: '2026-10-07', motif: 'frame' },
  { slug: 'literary-magazine-acceptance-rates', publishedAt: '2026-10-07', researchCheckedAt: '2026-10-07', motif: 'burst' },
  { slug: 'how-to-apply-artist-residency', publishedAt: '2026-10-07', researchCheckedAt: '2026-10-07', motif: 'steps' },
  { slug: 'free-artist-residencies', publishedAt: '2026-10-07', researchCheckedAt: '2026-10-07', motif: 'frame' },
  { slug: 'fully-funded-opportunities-nigeria-africa', publishedAt: '2026-10-07', researchCheckedAt: '2026-10-07', motif: 'orbit' },
  { slug: 'best-literary-magazines-to-submit-to', publishedAt: '2026-10-07', researchCheckedAt: '2026-10-07', motif: 'orbit' },
  { slug: 'literary-magazine-submission-fees', publishedAt: '2026-10-07', researchCheckedAt: '2026-10-07', motif: 'burst' },
  { slug: 'open-call-scams-vanity-galleries', publishedAt: '2026-10-07', researchCheckedAt: '2026-10-07', motif: 'orbit' },
];

type BundledArticle = { meta: GuideArticleMeta; body: string };
const bundled = (bundle as unknown as { articles: Record<string, BundledArticle> }).articles;

function assertMeta(meta: GuideArticleMeta) {
  if (!GUIDE_SECTIONS.includes(meta.section)) throw new Error(`Guide ${meta.slug} has an unknown section "${meta.section}"`);
}

const parsedCache = new Map<string, ParsedGuide>();
function parsed(slug: string): ParsedGuide {
  let value = parsedCache.get(slug);
  if (!value) {
    value = parseGuide(bundled[slug]!.body);
    parsedCache.set(slug, value);
  }
  return value;
}

export const guideArticles: GuideArticle[] = SCHEDULE.filter((entry) => bundled[entry.slug]).map((entry) => {
  const { meta } = bundled[entry.slug]!;
  assertMeta(meta);
  return {
    ...meta,
    publishedAt: entry.publishedAt,
    updatedAt: entry.updatedAt ?? entry.publishedAt,
    researchCheckedAt: entry.researchCheckedAt,
    author: GUIDE_AUTHOR,
    palette: SECTION_PALETTE[meta.section],
    motif: entry.motif,
    readingMinutes: readingMinutes(parsed(entry.slug).wordCount),
  };
});

export function guideArticle(slug: string): GuideArticleWithBody | undefined {
  const article = guideArticles.find((candidate) => candidate.slug === slug);
  return article ? { ...article, parsed: parsed(slug) } : undefined;
}

export function relatedGuideArticles(article: GuideArticle): GuideArticle[] {
  const named = article.related.map((slug) => guideArticles.find((candidate) => candidate.slug === slug)).filter((item): item is GuideArticle => Boolean(item));
  const sameSection = guideArticles.filter((candidate) => candidate.section === article.section && candidate.slug !== article.slug && !named.includes(candidate));
  const others = guideArticles.filter((candidate) => candidate.slug !== article.slug && !named.includes(candidate) && !sameSection.includes(candidate));
  return [...named, ...sameSection, ...others].slice(0, 3);
}

const WHERE = 'where-to-find-open-calls';
const ENTRY_FEES = 'entry-fees-hanging-fees-participation-fees';
const TRACKERS = 'duotrope-alternatives';
const ACCEPTANCE = 'literary-magazine-acceptance-rates';
const APPLY_RESIDENCY = 'how-to-apply-artist-residency';
const FREE_RESIDENCIES = 'free-artist-residencies';
const AFRICA = 'fully-funded-opportunities-nigeria-africa';
const BEST_MAGAZINES = 'best-literary-magazines-to-submit-to';
const SUBMISSION_FEES = 'literary-magazine-submission-fees';
const SCAMS = 'open-call-scams-vanity-galleries';

const AFRICAN_HUBS = new Set(AFRICAN_COUNTRY_CODES.map((code) => `/countries/${code.toLowerCase()}`));

/**
 * Where each guide is linked from outside /guides: the pages people already
 * reach from search that ask the question a guide answers. This is the inverse
 * of the internal-link lists in docs/seo/blog-content-plan.md. The first rule
 * that matches a path wins, and its guides are listed most relevant first.
 */
const GUIDE_PLACEMENTS: Array<{ match: (path: string) => boolean; slugs: string[] }> = [
  ...(
    [
      ['/discover/no-fee-calls', [ENTRY_FEES, SUBMISSION_FEES, SCAMS]],
      ['/discover/free-contests', [ENTRY_FEES, SUBMISSION_FEES, SCAMS]],
      ['/discover/contests', [ENTRY_FEES, SCAMS, SUBMISSION_FEES]],
      ['/discover/chapbook-contests', [SUBMISSION_FEES, ENTRY_FEES, BEST_MAGAZINES]],
      ['/discover/closing-this-week', [WHERE, ENTRY_FEES, SCAMS]],
      ['/discover/residencies', [APPLY_RESIDENCY, FREE_RESIDENCIES, AFRICA]],
      ['/discover/residencies-no-fee', [FREE_RESIDENCIES, APPLY_RESIDENCY, AFRICA]],
      ['/discover/fellowships', [FREE_RESIDENCIES, APPLY_RESIDENCY, AFRICA]],
      ['/discover/grants', [AFRICA, ENTRY_FEES, SCAMS]],
      ['/discover/magazines', [ACCEPTANCE, SUBMISSION_FEES, BEST_MAGAZINES]],
      ['/discover/poetry', [BEST_MAGAZINES, SUBMISSION_FEES, ACCEPTANCE]],
      ['/discover/fiction', [BEST_MAGAZINES, SUBMISSION_FEES, ACCEPTANCE]],
      ['/discover/flash-fiction', [BEST_MAGAZINES, SUBMISSION_FEES, ACCEPTANCE]],
      ['/discover/creative-nonfiction', [BEST_MAGAZINES, SUBMISSION_FEES, ACCEPTANCE]],
      ['/discover/visual-arts', [ENTRY_FEES, SCAMS, WHERE]],
      ['/discover/painting', [ENTRY_FEES, SCAMS, WHERE]],
      ['/discover/sculpture', [ENTRY_FEES, SCAMS, WHERE]],
      ['/discover/photography', [ENTRY_FEES, SCAMS, WHERE]],
      ['/discover/exhibitions-and-festivals', [ENTRY_FEES, SCAMS, WHERE]],
      ['/rankings/magazines', [BEST_MAGAZINES, ACCEPTANCE, TRACKERS]],
      ['/rankings/methodology', [BEST_MAGAZINES, ACCEPTANCE]],
      ['/rankings/residencies', [APPLY_RESIDENCY, FREE_RESIDENCIES]],
      ['/residencies', [APPLY_RESIDENCY, FREE_RESIDENCIES, AFRICA]],
      ['/journals', [BEST_MAGAZINES, ACCEPTANCE, SUBMISSION_FEES]],
      ['/countries', [WHERE, AFRICA]],
      ['/methodology', [SCAMS, ENTRY_FEES]],
      ['/guides/verify-an-opportunity-before-applying', [SCAMS, ENTRY_FEES]],
      ['/guides/no-fee-submission-opportunities', [ENTRY_FEES, SUBMISSION_FEES, SCAMS]],
      ['/guides/magazine-submissions', [SUBMISSION_FEES, ACCEPTANCE, BEST_MAGAZINES]],
      ['/guides/residencies-and-fellowships', [APPLY_RESIDENCY, FREE_RESIDENCIES, AFRICA]],
      ['/guides/grants-for-creators', [AFRICA, ENTRY_FEES]],
      ['/guides/find-submission-opportunities', [WHERE, TRACKERS]],
      ['/guides/jobs-for-creators', [WHERE, SCAMS]],
    ] as const
  ).map(([page, slugs]) => ({ match: (path: string) => path === page, slugs: [...slugs] })),
  { match: (path) => path.startsWith('/residency/'), slugs: [APPLY_RESIDENCY, FREE_RESIDENCIES] },
  { match: (path) => path.startsWith('/journal/'), slugs: [ACCEPTANCE, SUBMISSION_FEES, BEST_MAGAZINES] },
  { match: (path) => AFRICAN_HUBS.has(path), slugs: [AFRICA, WHERE] },
  { match: (path) => path.startsWith('/countries/'), slugs: [WHERE, ENTRY_FEES] },
  { match: (path) => path.startsWith('/discover/'), slugs: [WHERE, ENTRY_FEES, SCAMS] },
];

function bySlugs(slugs: readonly string[]): GuideArticle[] {
  return slugs
    .map((slug) => guideArticles.find((article) => article.slug === slug))
    .filter((article): article is GuideArticle => Boolean(article));
}

/** The guides to link from a page outside /guides, at most three. */
export function guideArticlesFor(path: string): GuideArticle[] {
  const rule = GUIDE_PLACEMENTS.find((candidate) => candidate.match(path));
  return rule ? bySlugs(rule.slugs).slice(0, 3) : [];
}

/** The guides that help with one call: by its type, then by its fee. */
export function guideArticlesForOpportunity(opportunity: { type: string; feePaid: boolean }): GuideArticle[] {
  const byType: Record<string, string[]> = {
    residency: [APPLY_RESIDENCY, FREE_RESIDENCIES],
    fellowship: [FREE_RESIDENCIES, APPLY_RESIDENCY],
    magazine: [SUBMISSION_FEES, ACCEPTANCE],
  };
  const slugs = byType[opportunity.type] ?? (opportunity.feePaid ? [ENTRY_FEES, SCAMS] : [WHERE, SCAMS]);
  return bySlugs(slugs).slice(0, 2);
}

export interface GuideListItem {
  name: string;
  /** The item's own page, when the table links to one. */
  url?: string;
}

function firstLink(tokens: readonly Tokens.Generic[] | undefined): string | undefined {
  for (const token of tokens ?? []) {
    if (token.type === 'link') return (token as Tokens.Link).href;
    const nested = firstLink(token.tokens as Tokens.Generic[] | undefined);
    if (nested) return nested;
  }
  return undefined;
}

/** The items a list article compares, read from the table its metadata names. */
export function guideListItems(article: GuideArticleWithBody): GuideListItem[] {
  if (!article.itemList) return [];
  const { table: tableIndex, column } = article.itemList;
  const table = article.parsed.blocks.filter((block): block is Tokens.Table => block.type === 'table')[tableIndex];
  if (!table) return [];
  return table.rows
    .map((row) => row[column])
    .filter((cell): cell is Tokens.TableCell => Boolean(cell))
    .map((cell) => ({ name: plainText(cell.tokens), url: firstLink(cell.tokens) }))
    .filter((item) => item.name);
}

/** The newest change across the articles, for sitemap lastmod. */
export function guideArticleLastModified(article: Pick<GuideArticle, 'updatedAt'>): Date {
  return new Date(`${article.updatedAt}T00:00:00.000Z`);
}
