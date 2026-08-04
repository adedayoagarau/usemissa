import {
  AdminPageFrame,
  DataAreaHeader,
  NumberGrid,
  Pipeline,
  ProvenanceNote,
  QueueCard,
  SectionHeading,
  SourceHealthTable,
  WarningList,
  WorkerStatus,
  WorkspaceSummary,
} from '@/components/platform-admin';
import { getPlatformAdminOverview } from '@/lib/platformAdmin';

export default async function PlatformAdminControlRoomPage() {
  const overview = await getPlatformAdminOverview();
  const { radar, operations, workspace } = overview;
  const controlRoomArea = { provenance: { maturity: 'derived' as const, source: 'Radar and Workspace compatibility stores plus optional durable probes', freshness: `generated at ${overview.generatedAt}` }, data: null, warnings: [] };
  return <AdminPageFrame><div className="space-y-10"><DataAreaHeader area={controlRoomArea} title="Control Room" description="A current operational view of Radar, Workspace, queues, source freshness, and system caveats. Counts are read-only and labelled by their runtime source." /><p className="-mt-6 font-mono text-xs text-muted-foreground">Generated at {overview.generatedAt}</p><WarningList warnings={overview.warnings} />
    <section aria-labelledby="actionable-queues"><SectionHeading eyebrow="Now" title="Actionable queues" description="Start with work that needs an operator, then inspect the source and freshness context behind it." /><h2 id="actionable-queues" className="sr-only">Actionable queues</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><QueueCard label="Verification" value={radar.data.queues.verification} detail="Open Radar verification tasks" href="/admin/radar?focus=verification" tone={radar.data.queues.verification > 0 ? 'warning' : 'neutral'} /><QueueCard label="Claim review" value={radar.data.queues.claims} detail="Pending organization claims" href="/admin/radar?focus=claims" tone={radar.data.queues.claims > 0 ? 'warning' : 'neutral'} /><QueueCard label="Stale sources" value={radar.data.queues.staleSources} detail="Sources past their check cadence" href="/admin/radar?focus=stale-sources" tone={radar.data.queues.staleSources > 0 ? 'warning' : 'neutral'} /><QueueCard label="Agent/review backlog" value={operations.data.compatibilityQueues.verification + (operations.data.durable.reviewJobs.counts.queued ?? 0)} detail="Compatibility verification plus durable review queue" href="/admin/operations?queue=review" tone={operations.data.compatibilityQueues.verification > 0 ? 'warning' : 'neutral'} /></div></section>
    <section aria-labelledby="worker-heading"><SectionHeading eyebrow="System versus throughput" title="Worker status and productive throughput" description="A heartbeat only says that a run exists. The throughput cards below use source and Workspace records separately." /><h2 id="worker-heading" className="sr-only">Worker status and productive throughput</h2><div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"><WorkerStatus worker={operations.data.worker} /><NumberGrid items={[{ label: 'Sources attempted', value: operations.data.throughput.sourcesAttempted, detail: 'Last checked cursor' }, { label: 'Successful fetches', value: operations.data.throughput.successfulFetches, detail: 'Usable page response' }, { label: 'Processed sources', value: operations.data.throughput.processedSources, detail: 'Extraction/canonicalization cursor' }, { label: 'Active opportunities', value: operations.data.throughput.activeOpportunities, detail: 'Compatibility active statuses', href: '/admin/radar' }]} /></div></section>
    <section aria-labelledby="pipeline-heading"><SectionHeading eyebrow="Pipeline" title="Due → check → fetch → process → review → publish" description="Each stage states the record and distinction it is derived from." /><h2 id="pipeline-heading" className="sr-only">Pipeline stages</h2><div className="mt-4"><Pipeline stages={operations.data.pipeline} /></div></section>
    <section aria-labelledby="radar-health-heading"><SectionHeading eyebrow="Radar" title="Source health" description="Attempted, fetched, and processed are intentionally separate signals." href="/admin/radar" linkLabel="Open Radar view →" /><h2 id="radar-health-heading" className="sr-only">Radar source health</h2><div className="mt-4"><ProvenanceNote area={radar} /><div className="mt-3"><SourceHealthTable rows={radar.data.sourceHealth.rows.slice(0, 12)} /></div></div></section>
    <section aria-labelledby="workspace-heading"><SectionHeading eyebrow="Workspace" title="Productive workflow" description="Organization, submission, decision, and delivery counts from the current Workspace compatibility store." href="/admin/operations?queue=workspace" linkLabel="Open Operations →" /><h2 id="workspace-heading" className="sr-only">Workspace throughput</h2><div className="mt-4"><ProvenanceNote area={workspace} /><div className="mt-3"><WorkspaceSummary data={workspace.data} /></div></div></section>
    <section className="border-t border-border pt-5"><p className="text-xs leading-5 text-muted-foreground">This Control Room does not expose passwords, cookies, database URLs, message bodies, file content, or private email content. See System for configuration readiness and Audit for the compatibility audit limitation.</p></section>
  </div></AdminPageFrame>;
}
