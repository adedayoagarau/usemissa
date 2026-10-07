import type { Metadata } from 'next';
import Link from 'next/link';
import type { OpportunityDetailProjection } from '@missa/radar-engine';
import type { ProfileCard } from '@missa/radar-adapters';
import {
  getPublicProfileById,
  getPublicProfileForOpportunity,
} from '@/lib/publicProfileReads';
import { taxonomyLabelFor } from '@/lib/opportunityTaxonomy';
import { MissaSiteHeader, type HeaderSession } from '@/components/missa-site-header';
import { OpportunityDetailView } from '@/components/opportunity-detail-view';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';
import {
  JsonLd,
  breadcrumbJsonLd,
  hasPassedExactDeadline,
  isRoundupTitle,
  opportunityDescription,
  opportunityJsonLd,
  opportunityPageTitle,
  pageMetadata,
  repairGeneratedSummary,
} from '@/lib/seo';

/**
 * Shared by the public call page (served from the CDN) and its signed-in
 * twin under ./member, which next.config.ts rewrites to when a session cookie is
 * present.
 */

/** The discover hub for each call type that has one. */
const TYPE_HUBS: Record<string, { slug: string; label: string }> = {
  contest: { slug: 'contests', label: 'More contests' },
  award: { slug: 'contests', label: 'More contests and prizes' },
  magazine: { slug: 'magazines', label: 'More magazines open for submissions' },
  grant: { slug: 'grants', label: 'More grants for artists and writers' },
  residency: { slug: 'residencies', label: 'More residencies' },
  fellowship: { slug: 'fellowships', label: 'More fellowships' },
};

/** Statuses that are listed and indexed. */
export const PUBLIC_STATUSES = new Set(['opening-soon', 'open', 'closing-soon', 'deadline-extended']);
/**
 * A closed call keeps its page, out of the index, so links to it still land
 * somewhere useful and the call can come back next cycle at the same URL.
 */
export const VIEWABLE_STATUSES = new Set([...PUBLIC_STATUSES, 'closed']);

async function getRelatedProfile(
  opportunity: OpportunityDetailProjection,
): Promise<ProfileCard | null> {
  try {
    return opportunity.organizationId
      ? await getPublicProfileById(opportunity.organizationId)
      : await getPublicProfileForOpportunity(opportunity.id);
  } catch (error) {
    console.warn('Related organization profile is unavailable; rendering the opportunity without it.', error);
    return null;
  }
}

function summaryFor(opportunity: OpportunityDetailProjection): string {
  return opportunity.content?.summary
    ? repairGeneratedSummary(opportunity.content.summary, opportunity.deadline)
    : opportunityDescription(opportunity);
}

/** Search metadata for a viewable call. */
export function opportunityMetadata(opportunity: OpportunityDetailProjection): Metadata {
  return pageMetadata({
    title: opportunityPageTitle(opportunity),
    description: opportunityDescription({ ...opportunity, content: { summary: summaryFor(opportunity) } }),
    path: `/opportunities/${opportunity.slug}`,
    // Closed calls, roundup posts and calls past an exact deadline stay
    // viewable but out of the index.
    noIndex:
      !PUBLIC_STATUSES.has(opportunity.status) ||
      isRoundupTitle(opportunity.title) ||
      hasPassedExactDeadline(opportunity.deadline),
  });
}

export async function OpportunityDetailPageBody({
  opportunity,
  headerSession,
  signedIn,
  userId,
}: {
  opportunity: OpportunityDetailProjection;
  /** Undefined lets the header load the session in the browser. */
  headerSession?: HeaderSession;
  signedIn: boolean;
  userId?: string;
}) {
  const path = `/opportunities/${opportunity.slug}`;
  const summary = summaryFor(opportunity);
  const taxonomyLabels = (opportunity.taxonomy?.termIds ?? []).map(taxonomyLabelFor);
  const profileMatch = await getRelatedProfile(opportunity);
  const practiceLabels = Array.from(
    [...taxonomyLabels, ...opportunity.genres].reduce((labels, label) => {
      const normalized = label.trim().toLocaleLowerCase('en');
      if (normalized && !labels.has(normalized)) labels.set(normalized, label);
      return labels;
    }, new Map<string, string>()).values(),
  ).slice(0, 8);
  const hub = TYPE_HUBS[opportunity.type];

  return (
    <div className="min-h-screen bg-card">
      <MissaSiteHeader session={headerSession} />
      <PublicDiscoveryEvent eventName="public.opportunity_view" properties={{ opportunityId: opportunity.id, slug: opportunity.slug }} />
      <JsonLd data={opportunityJsonLd(opportunity, { path, description: summary })} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: 'Opportunities', path: '/opportunities' }, { name: opportunity.title }])} />
      <OpportunityDetailView
        opportunity={opportunity}
        signedIn={signedIn}
        userId={userId}
        summary={summary}
        practiceLabels={practiceLabels}
        relatedProfile={profileMatch ?? undefined}
      />
      <nav aria-label="Keep browsing" className="mx-auto flex w-[min(100%-40px,1120px)] flex-wrap gap-x-6 gap-y-2 pb-12 text-sm">
        {hub ? (
          <Link href={`/discover/${hub.slug}`} className="text-primary underline underline-offset-4">
            {hub.label}
          </Link>
        ) : null}
        <Link href="/opportunities" className="text-primary underline underline-offset-4">All open calls</Link>
        <Link href="/countries" className="text-primary underline underline-offset-4">Calls by country</Link>
      </nav>
    </div>
  );
}
