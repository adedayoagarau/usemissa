import PlatformAdminData from '@/components/platform-admin-data';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminDataPage } from '@/lib/platformAdminData';

export default async function PlatformAdminDataPage({ searchParams }: { searchParams: Promise<{ table?: string }> }) {
  const [{ table }, page] = await Promise.all([searchParams, getPlatformAdminDataPage()]);
  return <AdminPageFrame><PlatformAdminData page={page} initialKey={table} /></AdminPageFrame>;
}
