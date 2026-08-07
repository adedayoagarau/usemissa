import PlatformAdminCustomers from '@/components/platform-admin-customers';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminView } from '@/lib/platformAdmin';

export default async function PlatformAdminCustomersPage() {
  const area = await getPlatformAdminView('customers');
  return <AdminPageFrame><PlatformAdminCustomers area={area} /></AdminPageFrame>;
}
