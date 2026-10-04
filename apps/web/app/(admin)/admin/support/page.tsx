import PlatformAdminSupport from '@/components/platform-admin-support';
import { AdminOpportunityDeadlineFactsPanel } from '@/components/admin-opportunity-deadline-facts-panel';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminSupport } from '@/lib/platformAdminSupport';

export default async function PlatformAdminSupportPage() {
  const area = await getPlatformAdminSupport();
  return (
    <AdminPageFrame>
      <PlatformAdminSupport area={area} />
      <div className="mt-8">
        <AdminOpportunityDeadlineFactsPanel />
      </div>
    </AdminPageFrame>
  );
}
