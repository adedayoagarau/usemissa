import PlatformAdminBilling from '@/components/platform-admin-billing';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminBilling } from '@/lib/platformAdminFoundations';

export default async function PlatformAdminBillingPage() {
  return <AdminPageFrame><PlatformAdminBilling area={await getPlatformAdminBilling()} /></AdminPageFrame>;
}
