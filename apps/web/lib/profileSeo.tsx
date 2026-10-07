import type { Metadata } from 'next';
import { getSemanticUrlForProfile, type ProfileDetail, type ProfileKind } from '@missa/radar-adapters';
import { absoluteUrl, breadcrumbJsonLd, JsonLd, pageMetadata } from '@/lib/seo';

type ProfileForSeo = Pick<
  ProfileDetail,
  | 'kind'
  | 'slug'
  | 'name'
  | 'summary'
  | 'websiteUrl'
  | 'city'
  | 'country'
  | 'countryCode'
  | 'readingPeriod'
  | 'submissionGuidelinesUrl'
  | 'genres'
  | 'socialLinks'
  | 'logoUrl'
  | 'opportunities'
>;

const KIND_COPY: Record<ProfileKind, { title: (name: string) => string; description: (name: string) => string; crumb: string; crumbPath: string }> = {
  literary_magazine: {
    title: (name) => `${name} submissions: guidelines, reading period and fees`,
    description: (name) => `When ${name} reads submissions, what it publishes, any reading fee, and its open calls, with a link to its own guidelines.`,
    crumb: 'Literary magazines',
    crumbPath: '/journals',
  },
  small_press: {
    title: (name) => `${name}: manuscript submissions and open calls`,
    description: (name) => `What ${name} publishes, whether it reads unsolicited manuscripts, and its open calls, with a link to its own guidelines.`,
    crumb: 'Presses',
    crumbPath: '/presses',
  },
  residency_center: {
    title: (name) => `${name} residency: open calls and how to apply`,
    description: (name) => `Open calls and application details for the ${name} residency, with a link to the organizer's page.`,
    crumb: 'Residencies',
    crumbPath: '/residencies',
  },
  grant_foundation: {
    title: (name) => `${name}: grants and fellowships for artists and writers`,
    description: (name) => `Grants, fellowships and awards from ${name}, with deadlines and a link to the funder's page.`,
    crumb: 'Grants',
    crumbPath: '/grants',
  },
  visual_arts_organization: {
    title: (name) => `${name}: open calls for artists`,
    description: (name) => `Open calls and exhibitions from ${name}, with deadlines, fees and a link to the organizer's page.`,
    crumb: 'Directory',
    crumbPath: '/directory',
  },
  gallery: {
    title: (name) => `${name}: open calls for artists`,
    description: (name) => `Open calls and exhibitions from ${name}, with deadlines, fees and a link to the gallery's page.`,
    crumb: 'Directory',
    crumbPath: '/directory',
  },
  organization: {
    title: (name) => `${name}: open calls for artists and writers`,
    description: (name) => `Open calls from ${name}, with deadlines, fees and a link to the organizer's page.`,
    crumb: 'Directory',
    crumbPath: '/directory',
  },
};

function copyFor(kind: ProfileKind) {
  return KIND_COPY[kind] ?? KIND_COPY.organization;
}

/**
 * A profile with nothing a searcher could use: no open call, no reading
 * period or guidelines, and at most a sentence of description. These stay
 * reachable from the directory but out of the index until they fill in.
 */
export function isThinProfile(profile: Pick<ProfileForSeo, 'summary' | 'readingPeriod' | 'submissionGuidelinesUrl' | 'opportunities'>): boolean {
  const openCalls = profile.opportunities.filter((item) => item.status === 'open').length;
  const summaryLength = profile.summary?.trim().length ?? 0;
  return openCalls === 0 && !profile.readingPeriod && !profile.submissionGuidelinesUrl && summaryLength < 160;
}

export function profilePath(profile: Pick<ProfileForSeo, 'kind' | 'slug'>): string {
  return getSemanticUrlForProfile(profile.kind, encodeURIComponent(profile.slug));
}

export function profileMetadata(profile: ProfileForSeo): Metadata {
  const copy = copyFor(profile.kind);
  return pageMetadata({
    title: copy.title(profile.name),
    description: profile.summary?.trim() || copy.description(profile.name),
    path: profilePath(profile),
    noIndex: isThinProfile(profile),
  });
}

/** Metadata for a profile slug that resolves to nothing. */
export function missingProfileMetadata(): Metadata {
  return { title: 'Not found', robots: { index: false, follow: true } };
}

function profileEntity(profile: ProfileForSeo): Record<string, unknown> {
  const sameAs = [
    profile.websiteUrl,
    ...Object.values(profile.socialLinks ?? {}),
  ].filter((value): value is string => typeof value === 'string' && /^https?:\/\//iu.test(value));
  const address = profile.city || profile.country
    ? {
        address: {
          '@type': 'PostalAddress',
          ...(profile.city ? { addressLocality: profile.city } : {}),
          ...(profile.countryCode && profile.countryCode !== 'GLOBAL' ? { addressCountry: profile.countryCode } : profile.country ? { addressCountry: profile.country } : {}),
        },
      }
    : {};
  const common = {
    name: profile.name,
    ...(profile.websiteUrl ? { url: profile.websiteUrl } : {}),
    ...(profile.summary ? { description: profile.summary } : {}),
    ...(sameAs.length ? { sameAs: [...new Set(sameAs)] } : {}),
    ...(profile.logoUrl ? { logo: profile.logoUrl } : {}),
  };
  if (profile.kind === 'literary_magazine') {
    return {
      '@type': 'Periodical',
      ...common,
      ...(profile.genres.length ? { genre: profile.genres.slice(0, 8) } : {}),
    };
  }
  return {
    '@type': 'Organization',
    ...common,
    ...address,
  };
}

/** WebPage → Periodical or Organization, plus breadcrumbs, for a directory profile. */
export function ProfileJsonLd({ profile }: { profile: ProfileForSeo }) {
  const copy = copyFor(profile.kind);
  const path = profilePath(profile);
  const openCalls = profile.opportunities.filter((item) => item.status === 'open');
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          name: copy.title(profile.name),
          url: absoluteUrl(path),
          isPartOf: { '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/') },
          mainEntity: profileEntity(profile),
          ...(openCalls.length
            ? {
                hasPart: {
                  '@type': 'ItemList',
                  name: `Open calls from ${profile.name}`,
                  numberOfItems: openCalls.length,
                  itemListElement: openCalls.slice(0, 20).map((call, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    name: call.title,
                    url: absoluteUrl(`/opportunities/${encodeURIComponent(call.id)}`),
                  })),
                },
              }
            : {}),
        }}
      />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: copy.crumb, path: copy.crumbPath }, { name: profile.name }])} />
    </>
  );
}

/* ---------- A creator's work page: /@handle/<slug> ---------- */

export type CreativeWorkInput = {
  /** The page's own path, such as /@riley/atlas. */
  path: string;
  /** The creator's profile path, such as /@riley. */
  profilePath: string;
  title: string;
  description: string;
  creator: string;
  /** What the work is called on the page: "Poem sequence". */
  kind?: string;
  year?: string;
  /** The preview image's path or address. Gated media is not offered to crawlers. */
  image?: string;
  /** Where it was published, from the track record. */
  publisher?: string;
  /** The creator's own rights line; absent when the page shows the default. */
  rights?: string;
  credits?: Array<{ role: string; name: string }>;
  parts?: Array<{ kind: 'text' | 'image' | 'audio'; heading: string }>;
};

const PART_TYPES = { text: 'CreativeWork', image: 'ImageObject', audio: 'AudioObject' } as const;

/**
 * schema.org CreativeWork for one work. It says only what the page says: the
 * creator, the year, the credits the creator listed and the parts by name. It
 * never carries decision ids or unpublished content.
 */
export function creativeWorkJsonLd(input: CreativeWorkInput): Record<string, unknown> {
  const year = input.year?.trim();
  const credits = (input.credits ?? []).filter((credit) => credit.name.trim());
  const parts = (input.parts ?? []).slice(0, 60);
  const author = { '@type': 'Person', name: input.creator, url: absoluteUrl(input.profilePath) };
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: input.title,
    url: absoluteUrl(input.path),
    mainEntityOfPage: absoluteUrl(input.path),
    description: input.description,
    author,
    creator: author,
    ...(input.kind?.trim() ? { genre: input.kind.trim() } : {}),
    ...(year ? { dateCreated: year } : {}),
    ...(input.image ? { image: absoluteUrl(input.image) } : {}),
    ...(input.publisher?.trim() ? { publisher: { '@type': 'Organization', name: input.publisher.trim() } } : {}),
    ...(input.rights?.trim() ? { copyrightNotice: input.rights.trim() } : {}),
    ...(credits.length
      ? {
          contributor: credits.map((credit) => ({
            '@type': 'Role',
            roleName: credit.role.trim() || undefined,
            contributor: { '@type': 'Person', name: credit.name.trim() },
          })),
        }
      : {}),
    ...(parts.length
      ? {
          hasPart: parts.map((part, index) => ({
            '@type': PART_TYPES[part.kind],
            name: part.heading,
            position: index + 1,
          })),
        }
      : {}),
    isPartOf: { '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/') },
  };
}

/** The work page's structured data: the work itself, then where it sits on the profile. */
export function WorkPageJsonLd({ work }: { work: CreativeWorkInput }) {
  return (
    <>
      <JsonLd data={creativeWorkJsonLd(work)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Missa', path: '/' },
          { name: work.creator, path: work.profilePath },
          { name: 'Work', path: `${work.profilePath}#profile-work` },
          { name: work.title },
        ])}
      />
    </>
  );
}
