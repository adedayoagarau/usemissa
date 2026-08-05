import PlatformAdminAnalytics from '@/components/platform-admin-analytics';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminAnalytics } from '@/lib/platformAdminViews';

export default async function PlatformAdminAnalyticsPage() {
  const area = await getPlatformAdminAnalytics();
  return <AdminPageFrame><PlatformAdminAnalytics area={area} /></AdminPageFrame>;
}
