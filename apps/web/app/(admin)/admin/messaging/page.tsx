import PlatformAdminMessaging from '@/components/platform-admin-messaging';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminMessaging } from '@/lib/platformAdminContinuation';

export default async function PlatformAdminMessagingPage() {
  const area = await getPlatformAdminMessaging();
  return <AdminPageFrame><PlatformAdminMessaging area={area} /></AdminPageFrame>;
}
