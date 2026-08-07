import PlatformAdminOrganizations from '@/components/platform-admin-organizations';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminOrganizations } from '@/lib/platformAdminContinuation';

export default async function PlatformAdminOrganizationsPage() {
  const area = await getPlatformAdminOrganizations();
  return <AdminPageFrame><PlatformAdminOrganizations area={area} /></AdminPageFrame>;
}
