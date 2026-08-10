import { permanentRedirect } from 'next/navigation';

export default async function LegacyOpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  permanentRedirect(`/opportunities/${encodeURIComponent(id)}`);
}
