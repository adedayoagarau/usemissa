import PlatformAdminDashboard from '@/components/platform-admin-dashboard';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminDashboard } from '@/lib/platformAdminDashboard';

export default async function PlatformAdminDashboardPage() {
  const data = await getPlatformAdminDashboard();
  return <AdminPageFrame><PlatformAdminDashboard data={data} /></AdminPageFrame>;
}
