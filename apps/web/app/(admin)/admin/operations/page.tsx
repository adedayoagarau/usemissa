import {
  AdminPageFrame,
  DataAreaHeader,
  LifecycleTable,
  MetricCard,
  NumberGrid,
  Pipeline,
  SectionHeading,
  WarningList,
  WorkerStatus,
} from '@/components/platform-admin';
import { getPlatformAdminView } from '@/lib/platformAdmin';

export default async function PlatformAdminOperationsPage({ searchParams }: { searchParams: Promise<{ queue?: string }> }) {
  const area = await getPlatformAdminView('operations');
  const queue = (await searchParams).queue;
  const data = area.data;
  return <AdminPageFrame><div className="space-y-10"><DataAreaHeader area={area} title="Operations" description="Worker/run status is shown independently from productive throughput. Durable agent, review, and enrichment queues are optional and never replace the compatibility runtime view." />{queue && <p className="rounded-lg border border-primary/30 bg-accent-tint px-4 py-3 text-sm text-accent-deep">Focused queue: <span className="font-medium">{queue.replaceAll('-', ' ')}</span>.</p>}<WarningList warnings={area.warnings} />
    <section><SectionHeading eyebrow="Worker" title="System status" description="A durable heartbeat is the only worker signal presented as health." /><div className="mt-4"><WorkerStatus worker={data.worker} /></div></section>
    <section><SectionHeading eyebrow="Throughput" title="Productive records" description="These counts come from current source and Workspace records, not from worker heartbeats." /><div className="mt-4"><NumberGrid items={[{ label: 'Sources attempted', value: data.throughput.sourcesAttempted }, { label: 'Successful fetches', value: data.throughput.successfulFetches }, { label: 'Processed sources', value: data.throughput.processedSources }, { label: 'Active opportunities', value: data.throughput.activeOpportunities }, { label: 'Submissions', value: data.throughput.submissions }, { label: 'Decisions', value: data.throughput.decisions }, { label: 'Completed delivery', value: data.throughput.completedDelivery }]}/></div></section>
    <section><SectionHeading eyebrow="Pipeline" title="Pipeline stage counts" /><div className="mt-4"><Pipeline stages={data.pipeline} /></div></section>
    <section><SectionHeading eyebrow="Compatibility queues" title="Current runtime queues" description="These queues are useful for operator triage while target relational queues are being rolled out." /><div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="grid gap-3 sm:grid-cols-2"><MetricCard label="Verification" value={data.compatibilityQueues.verification} detail="Open Radar tasks" href="/admin/radar?focus=verification" /><MetricCard label="Claim review" value={data.compatibilityQueues.claims} detail="Pending claims" href="/admin/radar?focus=claims" /><MetricCard label="Email review" value={data.compatibilityQueues.emailReview} detail="Pending or needs-review candidates" /><MetricCard label="Delivery" value={Object.values(data.compatibilityQueues.delivery).reduce((sum, value) => sum + value, 0)} detail="Workspace compatibility delivery tasks" /></div><div className="grid gap-4 sm:grid-cols-2"><div><h3 className="text-sm font-medium text-foreground">Gmail sync jobs</h3><div className="mt-2"><LifecycleTable label="Gmail sync jobs" counts={data.compatibilityQueues.gmailJobs} /></div></div><div><h3 className="text-sm font-medium text-foreground">Delivery tasks</h3><div className="mt-2"><LifecycleTable label="Delivery tasks" counts={data.compatibilityQueues.delivery} /></div></div></div></div></section>
    <section><SectionHeading eyebrow="Durable queues" title="Optional target-schema summaries" description="Read-only probes; a missing table is reported instead of causing a page failure." /><div className="mt-4 grid gap-4 lg:grid-cols-3"><div><h3 className="text-sm font-medium text-foreground">Agent runs</h3><div className="mt-2"><LifecycleTable label="Agent runs" counts={data.durable.agentRuns.counts} /></div></div><div><h3 className="text-sm font-medium text-foreground">Agent handoffs</h3><div className="mt-2"><LifecycleTable label="Agent handoffs" counts={data.durable.agentHandoffs.counts} /></div></div><div><h3 className="text-sm font-medium text-foreground">Review jobs</h3><div className="mt-2"><LifecycleTable label="Review jobs" counts={data.durable.reviewJobs.counts} /></div></div><div><h3 className="text-sm font-medium text-foreground">Review decisions</h3><div className="mt-2"><LifecycleTable label="Review decisions" counts={data.durable.reviewDecisions.counts} /></div></div><div><h3 className="text-sm font-medium text-foreground">Enrichment jobs</h3><div className="mt-2"><LifecycleTable label="Enrichment jobs" counts={data.durable.enrichmentJobs.counts} /></div></div><div><h3 className="text-sm font-medium text-foreground">Outbox events</h3><div className="mt-2"><LifecycleTable label="Outbox events" counts={data.durable.outbox.counts} /></div></div></div></section>
  </div></AdminPageFrame>;
}
