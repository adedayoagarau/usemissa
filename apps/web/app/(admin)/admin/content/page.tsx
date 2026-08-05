import PlatformAdminContent from '@/components/platform-admin-content';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminContent } from '@/lib/platformAdminViews';

export default async function PlatformAdminContentPage() {
  const area = await getPlatformAdminContent();
  return <AdminPageFrame><PlatformAdminContent area={area} /></AdminPageFrame>;
}
