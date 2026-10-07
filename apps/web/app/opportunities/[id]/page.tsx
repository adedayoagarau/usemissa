import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import type { OpportunityDetailProjection } from '@missa/radar-engine';
import { getPublicOpportunityDetail } from '@/lib/publicOpportunityReads';
import { pageMetadata } from '@/lib/seo';
import {
  OpportunityDetailPageBody,
  VIEWABLE_STATUSES,
  opportunityMetadata,
} from './opportunity-detail-page';

/**
 * The public call page reads no cookies, so it is served from the CDN and
 * regenerated at most every five minutes. Signed-in visitors never reach it:
 * a cookie rewrite in next.config.ts sends them to ./member, which shows their saved state and the
 * private calls they can see.
 */
export const revalidate = 300;

export function generateStaticParams() {
  return [];
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
  if (!opportunity || !VIEWABLE_STATUSES.has(opportunity.status)) notFound();
  return opportunityMetadata(opportunity);
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await getPublicOpportunityDetail(id);
  if (!opportunity || !VIEWABLE_STATUSES.has(opportunity.status)) notFound();
  // One URL per call: an id, an old slug or a different case lands on the slug.
  if (opportunity.slug && id !== opportunity.slug) {
    permanentRedirect(`/opportunities/${encodeURIComponent(opportunity.slug)}`);
  }
  return <OpportunityDetailPageBody opportunity={opportunity} signedIn={false} />;
}
