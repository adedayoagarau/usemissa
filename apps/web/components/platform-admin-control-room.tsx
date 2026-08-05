import Link from 'next/link';
import { ArrowRight, CircleAlert, RefreshCw } from 'lucide-react';
import type { PlatformAdminOverview, PlatformAdminQueueRow } from '@/lib/platformAdmin';
import {
  DataAreaHeader,
  MaturityBadge,
  MetricCard,
  ProvenanceNote,
  SectionHeading,
  WarningList,
} from './platform-admin';

function total(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

function attentionRows(rows: PlatformAdminQueueRow[]): PlatformAdminQueueRow[] {
  return rows.filter((row) => row.severity === 'high' || row.severity === 'medium').slice(0, 5);
}

function attentionTone(row: PlatformAdminQueueRow): string {
  if (row.severity === 'high') return 'text-red-700';
  if (row.severity === 'medium') return 'text-amber-700';
  return 'text-foreground';
}

export default function PlatformAdminControlRoom({ overview }: { overview: PlatformAdminOverview }) {
  const operations = overview.operations.data;
  const workspace = overview.workspace.data;
  const attention = attentionRows(operations.queue.rows);
  const submissionCount = total(workspace.submissions);
  const decisionCount = total(workspace.decisions);
  const openCallCount = total(workspace.openCalls);

  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <DataAreaHeader area={overview.operations} title="Control Room" description="A platform-level read of customers, content, product flow, and operational work. Start with attention; open the specialist surface when you need detail." />
      <Link href="/admin" className="inline-flex min-h-9 items-center gap-2 border border-border bg-white px-3 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><RefreshCw className="size-3.5" aria-hidden="true" />Refresh read</Link>
    </div>

    <WarningList warnings={overview.warnings} />

    <section aria-labelledby="control-room-metrics">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">At a glance</p><h2 id="control-room-metrics" className="mt-1 font-heading text-2xl font-medium tracking-tight text-foreground">What is moving</h2></div>
        <ProvenanceNote area={overview.workspace} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Needs attention" value={operations.queue.summary.attention} detail="High-severity queue rows" href="/admin/operations?severity=high" />
        <MetricCard label="Organizations" value={workspace.organizations} detail={`${workspace.accounts.active} active accounts · ${workspace.members} memberships`} href="/admin/customers" />
        <MetricCard label="Open calls" value={openCallCount} detail={`${workspace.openCalls.published ?? 0} published in Workspace`} href="/admin/content" />
        <MetricCard label="Submissions" value={submissionCount} detail={`${decisionCount} decisions recorded`} href="/admin/analytics" />
      </div>
    </section>

    <section aria-labelledby="control-room-attention">
      <div className="flex flex-wrap items-end justify-between gap-3"><SectionHeading eyebrow="Operator queue" title="Needs attention" description="A small, prioritized slice of the same backend-backed queue used by Operations." href="/admin/operations" linkLabel="Open full queue" /></div>
      <h2 id="control-room-attention" className="sr-only">Needs attention</h2>
      <div className="mt-4 overflow-hidden border border-border bg-white">
        {attention.length === 0 ? <div className="px-4 py-10 text-center"><p className="text-sm font-medium text-foreground">Nothing is currently flagged</p><p className="mt-1 text-xs leading-5 text-muted-foreground">The read model has no high- or medium-severity queue rows. This is not a claim that every worker is healthy; check the worker caveat below.</p></div> : <div className="divide-y divide-border">{attention.map((row) => <Link key={row.id} href={row.action?.type === 'link' ? row.action.href : '/admin/operations'} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"><CircleAlert className={`size-4 shrink-0 ${attentionTone(row)}`} aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{row.title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{row.reason}</span></span><span className="hidden items-center gap-2 sm:flex"><MaturityBadge maturity={row.maturity} /><span className="font-mono text-xs text-muted-foreground">{row.age}</span></span><ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>)}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[11px] text-muted-foreground"><span>{operations.queue.summary.open} open queue items total</span><span>Rows are capped per lane; detail lives in Operations.</span></div>
      </div>
    </section>

    <section aria-labelledby="control-room-domains">
      <SectionHeading eyebrow="Admin domains" title="Go where the work lives" description="Each destination has a different responsibility and data contract." />
      <h2 id="control-room-domains" className="sr-only">Admin domains</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[{ href: '/admin/customers', label: 'Customers', detail: 'Organizations, seats, billing state, and observed activity.' }, { href: '/admin/content', label: 'Content', detail: 'Radar opportunities and Workspace open calls with source boundaries.' }, { href: '/admin/analytics', label: 'Analytics', detail: 'Funnel, freshness, delivery, and queue metrics with definitions.' }, { href: '/admin/operations', label: 'Operations', detail: 'Queues, agents, outbox, and safe recovery actions.' }, { href: '/admin/support', label: 'Support', detail: 'Durable issue reports, audited status, and worker-readable events.' }].map((item) => <Link key={item.href} href={item.href} className="group border border-border bg-white p-4 transition-colors hover:border-primary/50 hover:bg-muted/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium text-foreground">{item.label}</h3><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p></Link>)}
      </div>
    </section>

    <section className="grid gap-5 lg:grid-cols-2" aria-label="System and data caveats">
      <div className="border border-border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Worker signal</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{operations.worker.status === 'unknown' ? 'Unknown' : `Observed ${operations.worker.status}`}</h2></div><Link href="/admin/operations?queue=agents" className="text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4">Inspect agents</Link></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{operations.worker.caveat}</p></div>
      <div className="border border-border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Radar freshness</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{overview.radar.data.sourceHealth.summary.stale} stale sources</h2></div><Link href="/admin/radar?focus=stale-sources" className="text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4">Inspect Radar</Link></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{overview.radar.data.sourceHealth.summary.processed} processed of {overview.radar.data.sourceHealth.summary.active} active sources in the current compatibility read.</p></div>
    </section>
  </div>;
}
