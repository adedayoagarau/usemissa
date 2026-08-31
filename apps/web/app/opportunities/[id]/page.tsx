import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Check, Flag } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository, OpportunityRepositoryUnavailableError } from '@/lib/opportunityRepository';
import { getProfileRepository } from '@/lib/profileRepository';
import { taxonomyLabelFor } from '@/lib/opportunityTaxonomy';
import { MissaSiteHeader } from '@/components/missa-site-header';
import { OpportunityDetailView } from '@/components/opportunity-detail-view';
import { OpportunityDetail } from '@/components/opportunity-disclosure/opportunity-disclosure';
import { SaveToTrackerButton } from '@/components/save-to-tracker-button';
import { FollowButton } from '@/components/follow-button';
import { PrepareChecklist } from '@/components/prepare-checklist';
import { OpportunityIssueReport } from '@/components/opportunity-issue-report';
import { Button } from '@/components/ui/button';
import { OpportunityCatalogueUnavailable } from '@/components/opportunity-catalogue-unavailable';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, opportunityDescription, pageMetadata } from '@/lib/seo';
import { resolveOpportunityPresentation } from '@/lib/opportunityPresentation';

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
  let opportunity;
  try {
    opportunity = await getOpportunityRepository().getById(
      id,
      session?.account.id ? { accountId: session.account.id } : undefined,
    );
  } catch (error) {
    if (error instanceof OpportunityRepositoryUnavailableError) {
      const unavailableSession = session ? { email: session.account.email, hasOrganization: session.memberships.length > 0 } : null;
      return <OpportunityCatalogueUnavailable session={unavailableSession} />;
    }
    throw error;
  }
  if (!opportunity || (!session && !PUBLIC_STATUSES.has(opportunity.status))) notFound();

  const path = `/opportunities/${opportunity.slug}`;
  const summary = opportunity.content?.summary ?? opportunityDescription(opportunity);
  const taxonomyLabels = (opportunity.taxonomy?.termIds ?? []).map(taxonomyLabelFor);
  const profileRepository = getProfileRepository();
  const profileMatch = profileRepository
    ? await profileRepository.getForOpportunity(opportunity.id)
    : null;
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
  const presentation = resolveOpportunityPresentation();
  const tracked = Boolean(opportunity.personal?.tracked);
  const saveAction = tracked ? (
    <Button nativeButton={false} render={<Link href="/tracker" />} variant="secondary">
      <Check aria-hidden="true" /> In Tracker
    </Button>
  ) : (
    <SaveToTrackerButton
      opportunityId={opportunity.id}
      signedIn={Boolean(session)}
      returnTo={path}
      opportunityTitle={opportunity.title}
    />
  );
  const followAction = session?.account.userId && opportunity.organizationId && !opportunity.personal?.followingOrganization ? (
    <FollowButton
      userId={session.account.userId}
      organizationId={opportunity.organizationId}
      organizationName={opportunity.organizationName}
    />
  ) : opportunity.personal?.followingOrganization ? (
    <span className="text-xs text-muted-foreground">Following</span>
  ) : null;

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
      {presentation === 'disclosure-v2' ? (
        <main id="main-content" className="mx-auto min-h-screen w-full max-w-[1240px] px-4 py-8 md:px-6 md:py-12">
          <OpportunityDetail
            opportunity={opportunity}
            backHref="/opportunities"
            saveAction={saveAction}
            followAction={followAction}
            preparationAction={<PrepareChecklist opportunityId={opportunity.id} enabled={Boolean(session) && tracked} />}
            reportAction={session ? <OpportunityIssueReport opportunityId={opportunity.id} /> : <Link href={`/login?next=${encodeURIComponent(path)}`} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"><Flag aria-hidden="true" className="size-4" />Sign in to report an issue</Link>}
            relatedProfile={profileMatch ? <p className="mt-3 text-sm text-muted-foreground">Journal / press profile: <Link href={`/journals/${encodeURIComponent(profileMatch.id)}`} className="font-semibold text-primary underline underline-offset-4">{profileMatch.name}</Link></p> : undefined}
            practiceLabels={practiceLabels}
            summary={summary}
          />
        </main>
      ) : (
        <OpportunityDetailView
          opportunity={opportunity}
          signedIn={Boolean(session)}
          userId={session?.account.userId}
          summary={summary}
          practiceLabels={practiceLabels}
          relatedProfile={profileMatch ?? undefined}
        />
      )}
    </div>
  );
}
