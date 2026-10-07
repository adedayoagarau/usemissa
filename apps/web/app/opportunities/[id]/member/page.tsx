import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { getPublicOpportunityDetail } from '@/lib/publicOpportunityReads';
import { pageMetadata } from '@/lib/seo';
import { OpportunityDetailPageBody, VIEWABLE_STATUSES } from '../opportunity-detail-page';

/**
 * The signed-in view of a call. a cookie rewrite in next.config.ts routes /opportunities/{id} here
 * when a session cookie is present, so the public page can stay cached. It
 * is never indexed; the public page is canonical.
 */
export const dynamic = 'force-dynamic';

async function sessionFromCookies() {
  const cookieStore = await cookies();
  return getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const session = await sessionFromCookies();
  const opportunity = session?.account.id
    ? await getOpportunityRepository().getById(id, { accountId: session.account.id }).catch(() => null)
    : await getPublicOpportunityDetail(id).catch(() => null);
  return pageMetadata({
    title: opportunity?.title ?? 'Call',
    description: 'A call on Missa.',
    path: `/opportunities/${opportunity?.slug ?? id}`,
    noIndex: true,
  });
}

export default async function MemberOpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await sessionFromCookies();
  if (!session?.account.id) {
    // A stale cookie still routes here; render the public view rather than
    // redirecting, which the rewrite would only send back to this route.
    const opportunity = await getPublicOpportunityDetail(id);
    if (!opportunity || !VIEWABLE_STATUSES.has(opportunity.status)) notFound();
    if (opportunity.slug && id !== opportunity.slug) {
      permanentRedirect(`/opportunities/${encodeURIComponent(opportunity.slug)}`);
    }
    return <OpportunityDetailPageBody opportunity={opportunity} headerSession={null} signedIn={false} />;
  }
  const opportunity = await getOpportunityRepository().getById(id, { accountId: session.account.id });
  if (!opportunity) notFound();
  if (opportunity.slug && id !== opportunity.slug) {
    permanentRedirect(`/opportunities/${encodeURIComponent(opportunity.slug)}`);
  }
  return (
    <OpportunityDetailPageBody
      opportunity={opportunity}
      headerSession={{ email: session.account.email, hasOrganization: session.memberships.length > 0 }}
      signedIn
      userId={session.account.userId}
    />
  );
}
