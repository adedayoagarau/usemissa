import PlatformAdminAnalytics from '@/components/platform-admin-analytics';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminAnalytics } from '@/lib/platformAdminViews';

export default async function PlatformAdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const requestedDays = (await searchParams).days;
  const days = requestedDays === '7' ? 7 : requestedDays === '90' ? 90 : 30;
  const area = await getPlatformAdminAnalytics({ days });
  return <AdminPageFrame><PlatformAdminAnalytics area={area} /></AdminPageFrame>;
}
