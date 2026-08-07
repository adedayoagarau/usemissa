import PlatformAdminCrm from '@/components/platform-admin-crm';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminCrm } from '@/lib/platformAdminFoundations';

export default async function PlatformAdminCrmPage() {
  return <AdminPageFrame><PlatformAdminCrm area={await getPlatformAdminCrm()} /></AdminPageFrame>;
}
