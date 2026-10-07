import bundle from '@/content/guides/articles.generated.json';
import { parseGuide, readingMinutes, type ParsedGuide } from '@/lib/guideMarkdown';

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

/** The newest change across the articles, for sitemap lastmod. */
export function guideArticleLastModified(article: Pick<GuideArticle, 'updatedAt'>): Date {
  return new Date(`${article.updatedAt}T00:00:00.000Z`);
}
