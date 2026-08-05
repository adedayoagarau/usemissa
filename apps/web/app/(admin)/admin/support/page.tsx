import PlatformAdminSupport from '@/components/platform-admin-support';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminSupport } from '@/lib/platformAdminSupport';

export default async function PlatformAdminSupportPage() {
  const area = await getPlatformAdminSupport();
  return <AdminPageFrame><PlatformAdminSupport area={area} /></AdminPageFrame>;
}
