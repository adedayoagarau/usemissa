import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import type { OpportunityDetailProjection } from '@missa/radar-engine';
import type { ProfileCard } from '@missa/radar-adapters';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { getPublicOpportunityDetail } from '@/lib/publicOpportunityReads';
import {
  getPublicProfileById,
  getPublicProfileForOpportunity,
} from '@/lib/publicProfileReads';
import { taxonomyLabelFor } from '@/lib/opportunityTaxonomy';
import { MissaSiteHeader } from '@/components/missa-site-header';
import { OpportunityDetailView } from '@/components/opportunity-detail-view';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';
import {
  JsonLd,
  breadcrumbJsonLd,
  opportunityDescription,
  opportunityJsonLd,
  opportunityPageTitle,
  pageMetadata,
  repairGeneratedSummary,
} from '@/lib/seo';

export const dynamic = 'force-dynamic';

/** Statuses that are listed and indexed. */
const PUBLIC_STATUSES = new Set(['opening-soon', 'open', 'closing-soon', 'deadline-extended']);
/**
 * A closed call keeps its page, out of the index, so links to it still land
 * somewhere useful and the call can come back next cycle at the same URL.
 */
const VIEWABLE_STATUSES = new Set([...PUBLIC_STATUSES, 'closed']);

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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  let opportunity: OpportunityDetailProjection | null;
  try {
    opportunity = await getPublicOpportunityDetail(id);
  } catch {
    return pageMetadata({
      title: 'Creative opportunity',
      description: 'Review a creative opportunity on Missa.',
      path: `/opportunities/${id}`,
      noIndex: true,
    });
  }
  if (!opportunity || !VIEWABLE_STATUSES.has(opportunity.status)) {
    // A signed-in member may still be able to open their own private call.
    const cookieStore = await cookies();
    if (!cookieStore.get(SESSION_COOKIE)?.value) notFound();
    return pageMetadata({
      title: 'Call not found',
      description: 'This call isn’t listed on Missa anymore.',
      path: `/opportunities/${id}`,
      noIndex: true,
    });
  }
  return pageMetadata({
    title: opportunityPageTitle(opportunity),
    description: opportunityDescription({ ...opportunity, content: { summary: summaryFor(opportunity) } }),
    path: `/opportunities/${opportunity.slug}`,
    noIndex: !PUBLIC_STATUSES.has(opportunity.status),
  });
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [cookieStore, { id }] = await Promise.all([cookies(), params]);
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const opportunity = session?.account.id
    ? await getOpportunityRepository().getById(id, { accountId: session.account.id })
    : await getPublicOpportunityDetail(id);
  if (!opportunity || (!session && !VIEWABLE_STATUSES.has(opportunity.status))) notFound();
  // One URL per call: an id, an old slug or a different case lands on the slug.
  if (opportunity.slug && id !== opportunity.slug) {
    permanentRedirect(`/opportunities/${encodeURIComponent(opportunity.slug)}`);
  }

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
  const headerSession = session
    ? { email: session.account.email, hasOrganization: session.memberships.length > 0 }
    : null;

  return (
    <div className="min-h-screen bg-card">
      <MissaSiteHeader session={headerSession} />
      <PublicDiscoveryEvent eventName="public.opportunity_view" properties={{ opportunityId: opportunity.id, slug: opportunity.slug }} />
      <JsonLd data={opportunityJsonLd(opportunity, { path, description: summary })} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: 'Opportunities', path: '/opportunities' }, { name: opportunity.title }])} />
      <OpportunityDetailView
        opportunity={opportunity}
        signedIn={Boolean(session)}
        userId={session?.account.userId}
        summary={summary}
        practiceLabels={practiceLabels}
        relatedProfile={profileMatch ?? undefined}
      />
    </div>
  );
}
