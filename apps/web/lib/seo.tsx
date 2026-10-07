import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { siteUrl } from '@/lib/siteUrl';
import { cleanCrawledNarrative, cleanTitleOrLabel } from '@/lib/textUtils';

export const SITE_NAME = 'Missa';
export const DEFAULT_DESCRIPTION =
  'Missa is a free site where artists and writers find open calls, grants, residencies, magazines and prizes, see the fee, who can apply and the official page for each, and get reminded before they close.';

export function absoluteUrl(path = '/'): string {
  return new URL(path, `${siteUrl()}/`).toString();
}

/** "October 2026": keeps listing titles current for date-led searches. */
export function currentMonthYear(now = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(now);
}

export function currentYear(now = new Date()): number {
  return now.getUTCFullYear();
}

/** Appends the brand to a page title unless it already names Missa. */
export function brandedTitle(title: string): string {
  return /\bMissa\b/u.test(title) ? title : `${title} | ${SITE_NAME}`;
}

export function pageMetadata(input: { title: string; description: string; path: string; noIndex?: boolean }): Metadata {
  const url = absoluteUrl(input.path);
  const cleanTitle = cleanTitleOrLabel(input.title);
  const cleanDesc = cleanCrawledNarrative(input.description);
  const socialImage = {
    url: absoluteUrl('/brand/missa-social-share.png'),
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: 'Missa. Find the call. Make the deadline.',
  };
  return {
    // Callers pass a complete, human title. The brand is added here, once,
    // unless the title already names Missa.
    title: { absolute: brandedTitle(cleanTitle) },
    description: cleanDesc,
    // A noindexed variant (a filtered listing, a closed call) carries no
    // canonical: Google advises against pairing noindex with a canonical that
    // points elsewhere.
    ...(input.noIndex ? {} : { alternates: { canonical: url } }),
    robots: input.noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: cleanTitle,
      description: cleanDesc,
      url,
      siteName: SITE_NAME,
      type: 'website',
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: cleanTitle,
      description: cleanDesc,
      images: [socialImage.url],
    },
  };
}

type ListingSearchParams = Record<string, string | string[] | undefined>;

const PAGINATION_KEYS: readonly string[] = ['page', 'cursor'];

/**
 * True when a listing query narrows the results (search, filters, sort,
 * alternate views). Pagination alone does not count.
 */
export function hasListingFilters(params: ListingSearchParams | undefined): boolean {
  if (!params) return false;
  return Object.entries(params).some(
    ([key, value]) =>
      !PAGINATION_KEYS.includes(key) &&
      (Array.isArray(value) ? value.some((item) => item.trim() !== '') : Boolean(value?.trim())),
  );
}

/**
 * Metadata for a public listing page. Like /opportunities, every variant
 * canonicalizes to the clean path, and filtered views stay out of the index.
 */
export async function listingMetadata(
  input: { title: string; description: string; path: string },
  searchParams?: Promise<ListingSearchParams>,
): Promise<Metadata> {
  const params = searchParams ? await searchParams : undefined;
  return pageMetadata({ ...input, noIndex: hasListingFilters(params) });
}

export function JsonLd({ data }: { data: Record<string, unknown> }): ReactNode {
  const serialized = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialized }} />;
}

/**
 * The opportunity's identity image for structured data. When the image is the
 * organizer's own share image, its credit ("Image: <organizer>") goes here as
 * `creditText` and `creator`: Missa records the credit for search engines
 * and anyone inspecting the page, without printing it on the card.
 */
export function identityImageJsonLd(item: {
  identityAssetUrl?: string;
  identityAssetAlt?: string;
  identityAssetCredit?: string;
  organizationName?: string;
  organizationWebsiteUrl?: string;
}): Record<string, unknown> {
  const credit = item.identityAssetCredit?.replace(/^image:\s*/iu, '').trim();
  return {
    '@type': 'ImageObject',
    contentUrl: item.identityAssetUrl,
    ...(item.identityAssetAlt ? { caption: cleanTitleOrLabel(item.identityAssetAlt) } : {}),
    ...(credit
      ? {
          creditText: credit,
          creator: {
            '@type': 'Organization',
            name: credit,
            ...(item.organizationWebsiteUrl && credit === item.organizationName ? { url: item.organizationWebsiteUrl } : {}),
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path?: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: cleanTitleOrLabel(item.name),
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export function opportunityDescription(item: { title: string; organizationName?: string; type: string; deadline: { date?: string; raw?: string; kind: string }; fee: { status: string; amountCents?: number; currency?: string }; location?: string; content?: { summary?: string } }): string {
  if (item.content?.summary) return cleanCrawledNarrative(item.content.summary);
  const title = cleanTitleOrLabel(item.title);
  const organization = item.organizationName ? ` from ${cleanTitleOrLabel(item.organizationName)}` : '';
  const type = item.type.replaceAll('-', ' ');
  const article = /^[aeiou]/i.test(type) ? 'an' : 'a';
  const deadline = item.deadline.date ? `Deadline: ${new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(`${item.deadline.date}T12:00:00`))}.` : item.deadline.raw ? `Deadline: ${cleanTitleOrLabel(item.deadline.raw)}.` : item.deadline.kind === 'rolling' ? 'Rolling deadline.' : item.deadline.kind === 'until-filled' ? 'Open until filled.' : 'Deadline needs confirmation.';
  const fee = item.fee.status === 'no-fee' ? 'No application fee.' : item.fee.status === 'paid' ? 'An application fee is listed.' : 'Fee unclear.';
  const location = item.location ? ` Location: ${cleanTitleOrLabel(item.location)}.` : '';
  return `${title}${organization} is listed as ${article} ${type}. ${deadline} ${fee}${location} Confirm the official source before applying.`.slice(0, 300);
}

/**
 * Profiles that describe Missa elsewhere (Wikidata, LinkedIn, social). Add
 * each one here as it is created so search and answer engines can connect
 * them to this site.
 */
export const BRAND_SAME_AS: readonly string[] = [
  'https://www.linkedin.com/company/143965433',
  'https://www.crunchbase.com/organization/missa-cbec',
];

/** Organization + WebSite entity for the homepage. */
export function siteEntityJsonLd(): Record<string, unknown> {
  const home = absoluteUrl('/');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${home}#organization`,
        name: SITE_NAME,
        alternateName: ['usemissa', 'Missa (usemissa.com)'],
        url: home,
        logo: absoluteUrl('/icon.png'),
        description: DEFAULT_DESCRIPTION,
        ...(BRAND_SAME_AS.length ? { sameAs: [...BRAND_SAME_AS] } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${home}#website`,
        name: SITE_NAME,
        alternateName: 'usemissa',
        url: home,
        inLanguage: 'en',
        publisher: { '@id': `${home}#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${absoluteUrl('/opportunities')}?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

const OPPORTUNITY_TYPE_LABELS: Record<string, string> = {
  'open-call': 'Open call',
  magazine: 'Magazine submissions',
  grant: 'Grant',
  award: 'Award',
  fellowship: 'Fellowship',
  residency: 'Residency',
  festival: 'Festival',
  scholarship: 'Scholarship',
  conference: 'Conference',
  rfp: 'Request for proposals',
  contest: 'Contest',
  pitch: 'Pitch',
  exhibition: 'Exhibition',
  commission: 'Commission',
  job: 'Job',
  other: 'Call',
};

export function opportunityTypeLabel(type: string): string {
  return OPPORTUNITY_TYPE_LABELS[type] ?? 'Call';
}

type OpportunityDeadlineInput = { date?: string; raw?: string; kind: string };

function formatDeadlineDate(date: string): string | null {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed);
}

/**
 * Search title for a call: what it is, who runs it, and when it closes, the
 * three things people type. The brand is appended by `pageMetadata`.
 */
export function opportunityPageTitle(item: { title: string; organizationName?: string; deadline: OpportunityDeadlineInput; status?: string }): string {
  const title = cleanTitleOrLabel(item.title);
  const organization = item.organizationName ? cleanTitleOrLabel(item.organizationName) : '';
  const byline = organization && !title.toLocaleLowerCase('en').includes(organization.toLocaleLowerCase('en')) ? ` — ${organization}` : '';
  const formatted = item.deadline.date ? formatDeadlineDate(item.deadline.date) : null;
  const closed = item.status === 'closed' || item.status === 'archived';
  const deadline = closed
    ? ' (closed)'
    : formatted
      ? `, deadline ${formatted}`
      : item.deadline.kind === 'rolling' || item.deadline.kind === 'year-round'
        ? ', rolling deadline'
        : '';
  return `${title}${byline}${deadline}`;
}

/**
 * Older generated summaries read "The official deadline is deadline not
 * confirmed." Rewrite that sentence from the structured deadline so stored
 * text reads cleanly until it is regenerated.
 */
export function repairGeneratedSummary(summary: string, deadline: OpportunityDeadlineInput): string {
  return summary.replace(/The official deadline is [^.]*\.(?=\s|$)/u, () => deadlineSentence(deadline));
}

function deadlineSentence(deadline: OpportunityDeadlineInput): string {
  const formatted = deadline.date ? formatDeadlineDate(deadline.date) : null;
  if (formatted) return `The deadline is ${formatted}.`;
  if (deadline.raw) return `The listed deadline: ${cleanTitleOrLabel(deadline.raw).replace(/[.\s]+$/u, '')}.`;
  if (deadline.kind === 'rolling' || deadline.kind === 'year-round') return 'Submissions are read on a rolling basis.';
  if (deadline.kind === 'until-filled') return 'It stays open until filled.';
  return 'The deadline isn’t confirmed yet; check the official page.';
}

const MONETARY_TYPES = new Set(['grant', 'award', 'fellowship', 'scholarship']);
const EVENT_TYPES = new Set(['festival', 'exhibition', 'conference']);

/**
 * Structured data for a call. Only facts the page shows are marked up, and a
 * submission deadline is never presented as an event date: grants, awards,
 * fellowships and scholarships are `MonetaryGrant`; everything else is a
 * `CreativeWork` that `expires` at the deadline, with the entry fee as an
 * `Offer`.
 */
export function opportunityJsonLd(item: {
  title: string;
  type: string;
  organizationName?: string;
  organizationWebsiteUrl?: string;
  guidelinesUrl?: string;
  submissionUrl?: string;
  location?: string;
  deadline: { date?: string; time?: string; kind: string };
  fee: { status: string; amountCents?: number; currency?: string };
  source?: { checkedAt?: string };
  identityAssetUrl?: string;
  identityAssetAlt?: string;
  identityAssetCredit?: string;
}, page: { path: string; description: string }): Record<string, unknown> {
  const url = absoluteUrl(page.path);
  const name = cleanTitleOrLabel(item.title);
  const officialUrl = item.guidelinesUrl ?? item.submissionUrl;
  const organizer = item.organizationName
    ? {
        '@type': 'Organization',
        name: cleanTitleOrLabel(item.organizationName),
        ...(item.organizationWebsiteUrl ? { url: item.organizationWebsiteUrl } : {}),
      }
    : undefined;
  const deadlineIso = item.deadline.date && /^\d{4}-\d{2}-\d{2}$/u.test(item.deadline.date)
    ? `${item.deadline.date}T${item.deadline.time && /^\d{2}:\d{2}/u.test(item.deadline.time) ? item.deadline.time.slice(0, 5) : '23:59'}:00`
    : undefined;
  const offer = item.fee.status === 'no-fee'
    ? { '@type': 'Offer', price: 0, ...(item.fee.currency ? { priceCurrency: item.fee.currency } : {}) }
    : item.fee.status === 'paid' && typeof item.fee.amountCents === 'number' && item.fee.currency
      ? { '@type': 'Offer', price: Number((item.fee.amountCents / 100).toFixed(2)), priceCurrency: item.fee.currency }
      : undefined;
  const offers = offer
    ? {
        ...offer,
        name: 'Entry fee',
        ...(deadlineIso ? { availabilityEnds: deadlineIso } : {}),
        ...(officialUrl ? { url: officialUrl } : {}),
      }
    : undefined;
  // Properties every Thing accepts.
  const thing = {
    name,
    description: page.description,
    url,
    ...(officialUrl ? { sameAs: officialUrl, potentialAction: { '@type': 'ApplyAction', target: officialUrl } } : {}),
    ...(item.identityAssetUrl ? { image: identityImageJsonLd(item) } : {}),
  };
  const mainEntity = MONETARY_TYPES.has(item.type)
    ? { '@type': 'MonetaryGrant', ...thing, ...(organizer ? { funder: organizer } : {}) }
    : {
        '@type': 'CreativeWork',
        ...(EVENT_TYPES.has(item.type) ? { additionalType: 'https://schema.org/Event' } : {}),
        genre: opportunityTypeLabel(item.type),
        ...thing,
        ...(organizer ? { provider: organizer } : {}),
        ...(item.location ? { spatialCoverage: cleanTitleOrLabel(item.location) } : {}),
        ...(offers ? { offers } : {}),
        ...(deadlineIso ? { expires: deadlineIso } : {}),
      };
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    url,
    description: page.description,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
    ...(item.source?.checkedAt ? { dateModified: item.source.checkedAt } : {}),
    mainEntity,
  };
}

const ROUNDUP_TITLE = /^\s*\d{1,3}\s+(open calls|calls|opportunities|grants|residencies|fellowships|contests|competitions|writing contests|art contests|literary magazines|magazines|places)\b|frequently asked|\bfaqs?\b|tips for applying|applicant faq/iu;

/**
 * A roundup post or FAQ page that was ingested as a call. It stays viewable
 * but out of the index and the sitemap. Mirrors ROUNDUP_TITLE_SQL_PATTERN in
 * lib/sitemapData.ts.
 */
export function isRoundupTitle(title: string): boolean {
  return ROUNDUP_TITLE.test(title);
}

/** An exact deadline that is already behind us, whatever the status says. */
export function hasPassedExactDeadline(deadline: { kind: string; date?: string }, now = new Date()): boolean {
  if (deadline.kind !== 'exact' || !deadline.date || !/^\d{4}-\d{2}-\d{2}$/u.test(deadline.date)) return false;
  return deadline.date < now.toISOString().slice(0, 10);
}
