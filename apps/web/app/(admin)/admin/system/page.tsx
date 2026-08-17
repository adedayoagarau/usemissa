import { AdminPageFrame, DataAreaHeader, DurableTableList, NumberGrid, SectionHeading, WarningList } from '@/components/platform-admin';
import { getPlatformAdminView } from '@/lib/platformAdmin';

export default async function PlatformAdminSystemPage() {
  const area = await getPlatformAdminView('system');
  const data = area.data;
  return <AdminPageFrame><div className="space-y-10"><DataAreaHeader area={area} title="System" description="Persistence mode, configuration readiness, schema probes, freshness, and worker caveats. Secret values are never rendered." /><WarningList warnings={area.warnings} />
    <section><SectionHeading eyebrow="Readiness" title="Runtime configuration" /><div className="mt-4"><NumberGrid items={[{ label: 'Persistence', value: data.persistenceMode === 'postgres-compatibility' ? 'Postgres' : 'Demo', detail: data.persistenceMode === 'postgres-compatibility' ? 'Compatibility stores backed by DATABASE_URL' : 'In-memory compatibility stores' }, { label: 'Database config', value: data.databaseConfigured ? 'Present' : 'Missing', detail: 'Value is intentionally not exposed' }, { label: 'Session signing', value: data.sessionSecretConfigured ? 'Present' : 'Missing', detail: 'Required to resolve signed sessions' }, { label: 'Cron config', value: data.cronSecretConfigured ? 'Present' : 'Missing', detail: 'Used by the bounded cron route' }]}/></div></section>
    <section><SectionHeading eyebrow="Runtime truth" title="What this surface trusts" description={data.runtimeTruth} /><div className="mt-4 rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground"><p>{data.workerCaveat}</p><p className="mt-2">Generated at <span className="font-mono text-xs text-foreground">{area.provenance.freshness.replace('read at ', '')}</span>.</p></div></section>
    <section><SectionHeading eyebrow="Schema availability" title="Profile and durable tables" description="Missing Profile tables block release. Optional queues remain unavailable until their tables are deployed; neither state changes the compatibility store read model." /><div className="mt-4"><DurableTableList data={data} /></div></section>
    <section><SectionHeading eyebrow="Warnings" title="System caveats" /><div className="mt-4"><WarningList warnings={data.warnings} /></div></section>
  </div></AdminPageFrame>;
}
