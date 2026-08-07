import { AdminPageFrame, AuditTable, DataAreaHeader, MetricCard, SectionHeading, WarningList } from '@/components/platform-admin';
import { getPlatformAdminView } from '@/lib/platformAdmin';

export default async function PlatformAdminAuditPage() {
  const area = await getPlatformAdminView('audit');
  const data = area.data;
  return <AdminPageFrame><div className="space-y-10"><DataAreaHeader area={area} title="Audit" description="Recent actor, action, target, and time entries from the Radar and Workspace compatibility audit logs." /><WarningList warnings={area.warnings} /><section><SectionHeading eyebrow="Compatibility audit" title="Recent entries" description={data.limitation} /><div className="mt-4"><MetricCard label="Entries retained in current stores" value={data.count} detail="Recent display is capped at 50 rows; private detail payloads are omitted." /></div><div className="mt-4"><AuditTable data={data} /></div></section></div></AdminPageFrame>;
}
