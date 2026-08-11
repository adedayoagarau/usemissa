import { AdminPageFrame } from '@/components/platform-admin';
import PlatformAdminGary from '@/components/platform-admin-gary';
import { getPlatformAdminGary } from '@/lib/platformAdminGary';

export default async function PlatformAdminGaryPage() {
  return <AdminPageFrame><PlatformAdminGary area={await getPlatformAdminGary()} /></AdminPageFrame>;
}
