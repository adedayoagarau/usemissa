import PlatformAdminOperationsQueue from '@/components/platform-admin-queue';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminView } from '@/lib/platformAdmin';

export default async function PlatformAdminOperationsPage({ searchParams }: { searchParams: Promise<{ queue?: string; severity?: string; q?: string; item?: string }> }) {
  const area = await getPlatformAdminView('operations');
  const params = await searchParams;
  return <AdminPageFrame><PlatformAdminOperationsQueue area={area} initialQueue={params.queue} initialSeverity={params.severity} initialSearch={params.q} initialItem={params.item} /></AdminPageFrame>;
}
