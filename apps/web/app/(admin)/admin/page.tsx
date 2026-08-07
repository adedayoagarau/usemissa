import PlatformAdminControlRoom from '@/components/platform-admin-control-room';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminOverview } from '@/lib/platformAdmin';

export default async function PlatformAdminControlRoomPage() {
  const overview = await getPlatformAdminOverview();
  return <AdminPageFrame><PlatformAdminControlRoom overview={overview} /></AdminPageFrame>;
}
