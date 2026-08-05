import PlatformAdminGovernance from '@/components/platform-admin-governance';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminGovernance } from '@/lib/platformAdminContinuation';

export default async function PlatformAdminGovernancePage() {
  const area = await getPlatformAdminGovernance();
  return <AdminPageFrame><PlatformAdminGovernance area={area} /></AdminPageFrame>;
}
