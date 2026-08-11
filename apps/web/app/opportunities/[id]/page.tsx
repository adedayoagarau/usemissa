import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { getProfileRepository } from '@/lib/profileRepository';
import { taxonomyLabelFor } from '@/lib/opportunityTaxonomy';
import { MissaSiteHeader } from '@/components/missa-site-header';
import { OpportunityDetailView } from '@/components/opportunity-detail-view';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, opportunityDescription, pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const PUBLIC_STATUSES = new Set(['opening-soon', 'open', 'closing-soon', 'deadline-extended']);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const opportunity = await getOpportunityRepository().getById(id);
    if (!opportunity || !PUBLIC_STATUSES.has(opportunity.status)) {
      return pageMetadata({
        title: 'Opportunity not found',
        description: 'This Missa opportunity is no longer publicly available.',
        path: `/opportunities/${id}`,
        noIndex: true,
      });
    }
    return pageMetadata({
      title: opportunity.title,
      description: opportunityDescription(opportunity),
      path: `/opportunities/${opportunity.slug}`,
    });
  } catch {
    return pageMetadata({
      title: 'Creative opportunity',
      description: 'Review a creative opportunity on Missa.',
      path: `/opportunities/${id}`,
      noIndex: true,
    });
  }
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const { id } = await params;
  const opportunity = await getOpportunityRepository().getById(
    id,
    session?.account.id ? { accountId: session.account.id } : undefined,
  );
  if (!opportunity || (!session && !PUBLIC_STATUSES.has(opportunity.status))) notFound();

  const path = `/opportunities/${opportunity.slug}`;
  const summary = opportunity.content?.summary ?? opportunityDescription(opportunity);
  const taxonomyLabels = (opportunity.taxonomy?.termIds ?? []).map(taxonomyLabelFor);
  const profileRepository = getProfileRepository();
  const profileMatch = opportunity.organizationName && profileRepository
    ? (await profileRepository.browse({ query: opportunity.organizationName, limit: 1 })).items[0]
    : undefined;
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
    <div className="min-h-screen bg-white">
      <MissaSiteHeader session={headerSession} />
      <PublicDiscoveryEvent eventName="public.opportunity_view" properties={{ opportunityId: opportunity.id, slug: opportunity.slug }} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: opportunity.title,
          headline: opportunity.title,
          description: summary,
          url: absoluteUrl(path),
          isPartOf: { '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/') },
          about: {
            '@type': 'Thing',
            name: opportunity.organizationName
              ? `${opportunity.title} from ${opportunity.organizationName}`
              : opportunity.title,
          },
        }}
      />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: 'Opportunities', path: '/opportunities' }, { name: opportunity.title }])} />
      <OpportunityDetailView
        opportunity={opportunity}
        signedIn={Boolean(session)}
        summary={summary}
        practiceLabels={practiceLabels}
        relatedProfile={profileMatch}
      />
    </div>
  );
}
