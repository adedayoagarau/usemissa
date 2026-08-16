import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminOperationButton } from './platform-admin-actions';
import type {
  AdminArea,
  AdminMaturity,
  PlatformAdminAuditData,
  PlatformAdminOperationsData,
  PlatformAdminSystemData,
  PlatformAdminWorkspaceData,
  SourceHealthRow,
} from '@/lib/platformAdmin';

const maturityLabels: Record<AdminMaturity, string> = {
  live: 'Live runtime',
  durable: 'Durable',
  derived: 'Derived',
  'latest-run-only': 'Latest-run only',
  'target-schema': 'Target schema',
  partial: 'Partial',
  unavailable: 'Unavailable',
};

const maturityStyles: Record<AdminMaturity, string> = {
  live: 'border-green-200 bg-green-50 text-green-700',
  durable: 'border-blue-200 bg-blue-50 text-blue-700',
  derived: 'border-border bg-muted text-muted-foreground',
  'latest-run-only': 'border-amber-200 bg-amber-50 text-amber-700',
  'target-schema': 'border-blue-200 bg-blue-50 text-blue-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  unavailable: 'border-border bg-white text-muted-foreground',
};

export function MaturityBadge({ maturity }: { maturity: AdminMaturity }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${maturityStyles[maturity]}`}>{maturityLabels[maturity]}</span>;
}

export function ProvenanceNote({ area }: { area: AdminArea<unknown> }) {
  return <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><MaturityBadge maturity={area.provenance.maturity} /><span>Data source: {area.provenance.source}</span><span>Freshness: {area.provenance.freshness}</span></div>;
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return <section aria-label="Admin data warnings" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"><p className="font-medium">Read-model caveats</p><ul className="mt-1 list-disc space-y-1 pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>;
}

export function MetricCard({ label, value, detail, href }: { label: string; value: ReactNode; detail?: string; href?: string }) {
  const card = <div className="rounded-xl border border-border bg-white p-4 shadow-sm"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 font-mono text-2xl tabular-nums text-foreground">{value}</p>{detail && <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>}</div>;
  return href ? <Link href={href} className="block rounded-xl transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{card}</Link> : card;
}

export function SectionHeading({ eyebrow, title, description, href, linkLabel }: { eyebrow?: string; title: string; description?: string; href?: string; linkLabel?: string }) {
  return <header className="flex flex-wrap items-end justify-between gap-3"><div>{eyebrow && <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>}<h2 className="mt-1 font-heading text-2xl font-medium tracking-tight text-foreground">{title}</h2>{description && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{href && linkLabel && <Link href={href} className="text-sm font-medium text-accent-deep underline decoration-accent-tint underline-offset-4 hover:text-primary">{linkLabel}</Link>}</header>;
}

export function QueueCard({ label, value, detail, href, tone = 'neutral' }: { label: string; value: number; detail: string; href: string; tone?: 'neutral' | 'warning' }) {
  return <Link href={href} className={`block rounded-xl border p-4 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${tone === 'warning' ? 'border-amber-200 bg-amber-50/40' : 'border-border bg-white'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-foreground">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div><span className="font-mono text-2xl tabular-nums text-foreground">{value}</span></div><span className="mt-3 inline-block text-xs font-medium text-accent-deep">Open queue →</span></Link>;
}

export function SourceHealthTable({ rows }: { rows: SourceHealthRow[] }) {
  if (rows.length === 0) return <EmptyState title="No source records in the current store" detail="This is an empty compatibility store, not a fabricated healthy state." />;
  return <div className="overflow-x-auto rounded-xl border border-border bg-white"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><caption className="sr-only">Source health with attempt, fetch, process, and freshness distinctions</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Source</th><th scope="col" className="px-4 py-3 font-medium">Attempted</th><th scope="col" className="px-4 py-3 font-medium">Successful fetch</th><th scope="col" className="px-4 py-3 font-medium">Processed</th><th scope="col" className="px-4 py-3 font-medium">Freshness</th><th scope="col" className="px-4 py-3 font-medium">Failures</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30"><th scope="row" className="max-w-[260px] px-4 py-3 font-medium text-foreground"><span className="block truncate">{row.name}</span><span className="mt-0.5 block truncate font-mono text-[11px] font-normal text-muted-foreground">{row.id}</span></th><td className="px-4 py-3"><StatusText value={row.attempted} /></td><td className="px-4 py-3"><StatusText value={row.successfulFetch} /></td><td className="px-4 py-3"><StatusText value={row.processed} /></td><td className={`px-4 py-3 font-mono text-xs ${row.stale ? 'text-amber-700' : 'text-muted-foreground'}`}>{row.stale ? 'stale · ' : ''}{row.freshness}</td><td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.consecutiveFailures}/{row.consecutiveProcessingFailures}</td></tr>)}</tbody></table></div>;
}

export function LifecycleTable({ counts, label = 'Lifecycle' }: { counts: Record<string, number>; label?: string }) {
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <EmptyState title={`No ${label.toLowerCase()} rows`} detail="The current data source has no records to summarize." />;
  return <div className="overflow-hidden rounded-xl border border-border bg-white"><table className="w-full text-left text-sm"><caption className="sr-only">{label} counts</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 text-right font-medium">Count</th></tr></thead><tbody>{entries.map(([status, count]) => <tr key={status} className="border-b border-border last:border-0"><th scope="row" className="px-4 py-3 font-medium text-foreground">{status.replaceAll('-', ' ')}</th><td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">{count}</td></tr>)}</tbody></table></div>;
}

export function Pipeline({ stages }: { stages: PlatformAdminOperationsData['pipeline'] }) {
  return <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{stages.map((stage) => <li key={stage.stage} className="rounded-lg border border-border bg-white p-3"><p className="text-xs font-medium capitalize text-muted-foreground">{stage.stage}</p><p className="mt-1 font-mono text-xl tabular-nums text-foreground">{stage.count}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{stage.source}</p></li>)}</ol>;
}

export function WorkerStatus({ worker }: { worker: PlatformAdminOperationsData['worker'] }) {
  const statusLabel = worker.status === 'unknown' ? 'Unknown' : worker.status[0].toUpperCase() + worker.status.slice(1);
  const statusStyle = worker.status === 'failed' ? 'border-red-200 bg-red-50 text-red-700' : worker.status === 'stale' ? 'border-amber-200 bg-amber-50 text-amber-700' : worker.status === 'unknown' ? 'border-border bg-muted text-muted-foreground' : worker.status === 'running' ? 'border-green-200 bg-green-50 text-green-700' : 'border-border bg-white text-muted-foreground';
  return <div className="rounded-xl border border-border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-medium text-foreground">Worker/system status</p><p className="mt-1 text-xs text-muted-foreground">{worker.caveat}</p></div><span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyle}`}>{statusLabel}</span></div><dl className="mt-4 grid grid-cols-3 gap-3 text-xs"><div><dt className="text-muted-foreground">Running lanes</dt><dd className="mt-1 font-mono text-base">{worker.running}</dd></div><div><dt className="text-muted-foreground">Failed lanes</dt><dd className="mt-1 font-mono text-base">{worker.failed}</dd></div><div><dt className="text-muted-foreground">Completed runs</dt><dd className="mt-1 font-mono text-base">{worker.completed}</dd></div></dl>{worker.latestAt && <p className="mt-3 font-mono text-[11px] text-muted-foreground">Latest {worker.latestKind ?? 'run'} · {worker.latestStatus ?? 'unknown'} · {worker.latestAt}</p>}</div>;
}

export function WorkerLaneTable({ lanes }: { lanes: PlatformAdminOperationsData['worker']['lanes'] }) {
  if (lanes.length === 0) return <EmptyState title="No durable worker lanes observed" detail="Start the Railway/container worker with the telemetry-enabled build to publish heartbeat records." />;
  return <div className="overflow-x-auto rounded-xl border border-border bg-white"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Durable worker lane heartbeat status</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Lane</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium">Last heartbeat</th><th scope="col" className="px-4 py-3 font-medium">Started</th><th scope="col" className="px-4 py-3 font-medium">Error</th></tr></thead><tbody>{lanes.map((lane) => <tr key={lane.workerKind} className="border-b border-border last:border-0"><th scope="row" className="px-4 py-3 font-medium text-foreground">{lane.workerKind}</th><td className={`px-4 py-3 text-xs font-medium ${lane.status === 'running' ? 'text-green-700' : lane.status === 'stale' || lane.status === 'failed' ? 'text-amber-700' : 'text-muted-foreground'}`}>{lane.status}</td><td className="px-4 py-3 font-mono text-xs text-muted-foreground">{lane.lastHeartbeatAt ?? 'not observed'}</td><td className="px-4 py-3 font-mono text-xs text-muted-foreground">{lane.startedAt ?? 'not observed'}</td><td className="max-w-[280px] truncate px-4 py-3 text-xs text-red-700">{lane.error ?? '—'}</td></tr>)}</tbody></table></div>;
}

export function DurableJobTable({ queue, rows }: { queue: 'review' | 'enrichment'; rows: PlatformAdminOperationsData['durable']['reviewJobRows'] }) {
  if (rows.length === 0) return <EmptyState title={`No ${queue} jobs in the durable table`} detail="This may be an empty queue or an unavailable target schema; check the provenance and warnings above." />;
  return <div className="overflow-x-auto rounded-xl border border-border bg-white"><table className="w-full min-w-[940px] text-left text-sm"><caption className="sr-only">{queue} durable jobs and recovery actions</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Job</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium">Attempts</th><th scope="col" className="px-4 py-3 font-medium">Next attempt</th><th scope="col" className="px-4 py-3 font-medium">Last error</th><th scope="col" className="px-4 py-3 font-medium">Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border last:border-0"><th scope="row" className="max-w-[220px] truncate px-4 py-3 font-mono text-xs font-normal text-foreground">{row.id}<span className="mt-1 block truncate text-[11px] text-muted-foreground">{row.opportunityId ?? row.kind ?? '—'}</span></th><td className="px-4 py-3 text-xs font-medium">{row.status}</td><td className="px-4 py-3 font-mono text-xs">{row.attempts}</td><td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.nextAttemptAt ?? '—'}</td><td className="max-w-[260px] truncate px-4 py-3 text-xs text-red-700">{row.lastError ?? '—'}</td><td className="px-4 py-3">{(row.status === 'failed' || row.status === 'blocked') && <AdminOperationButton action="retry" queue={queue} id={row.id} label="Retry" />}</td></tr>)}</tbody></table></div>;
}

export function OutboxTable({ rows }: { rows: PlatformAdminOperationsData['durable']['outboxRows'] }) {
  if (rows.length === 0) return <EmptyState title="No outbox events in the durable table" detail="There is no event backlog to operate on, or the target schema is unavailable." />;
  return <div className="overflow-x-auto rounded-xl border border-border bg-white"><table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">Outbox events and recovery actions</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Event</th><th scope="col" className="px-4 py-3 font-medium">Topic</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium">Attempts</th><th scope="col" className="px-4 py-3 font-medium">Last error</th><th scope="col" className="px-4 py-3 font-medium">Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border last:border-0"><th scope="row" className="max-w-[220px] truncate px-4 py-3 font-mono text-xs font-normal text-foreground">{row.id}<span className="mt-1 block truncate text-[11px] text-muted-foreground">{row.aggregateType}:{row.aggregateId}</span></th><td className="px-4 py-3 text-xs">{row.topic}</td><td className="px-4 py-3 text-xs font-medium">{row.status}</td><td className="px-4 py-3 font-mono text-xs">{row.attempts}</td><td className="max-w-[260px] truncate px-4 py-3 text-xs text-red-700">{row.lastError ?? '—'}</td><td className="px-4 py-3">{row.status === 'failed' && <AdminOperationButton action="retry" queue="outbox" id={row.id} label="Retry" />}</td></tr>)}</tbody></table></div>;
}

export function HandoffTable({ rows }: { rows: PlatformAdminOperationsData['durable']['agentHandoffRows'] }) {
  if (rows.length === 0) return <EmptyState title="No agent handoffs in the durable table" detail="The agent loop has not recorded a handoff yet, or the target schema is unavailable." />;
  return <div className="overflow-x-auto rounded-xl border border-border bg-white"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Recent durable agent handoffs</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">From</th><th scope="col" className="px-4 py-3 font-medium">To</th><th scope="col" className="px-4 py-3 font-medium">Kind</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium">Created</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border last:border-0"><th scope="row" className="px-4 py-3 font-mono text-xs font-normal text-foreground">{row.fromAgent}</th><td className="px-4 py-3 font-mono text-xs text-foreground">{row.toAgent}</td><td className="px-4 py-3 text-xs">{row.kind}</td><td className="px-4 py-3 text-xs font-medium">{row.status}</td><td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.createdAt ?? '—'}</td></tr>)}</tbody></table></div>;
}

export function AgentGraphTable({ graph }: { graph: PlatformAdminOperationsData['agentGraph'] }) {
  return <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]"><div className="overflow-x-auto rounded-xl border border-border bg-white"><table className="w-full min-w-[560px] text-left text-sm"><caption className="sr-only">Agent lane responsibilities</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Lane</th><th scope="col" className="px-4 py-3 font-medium">Responsibility</th></tr></thead><tbody>{graph.nodes.map((node) => <tr key={node.id} className="border-b border-border last:border-0"><th scope="row" className="px-4 py-3 font-medium text-foreground">{node.label}<span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground">{node.id}</span></th><td className="px-4 py-3 text-sm leading-5 text-muted-foreground">{node.responsibility}</td></tr>)}</tbody></table></div><div className="rounded-xl border border-border bg-white p-4"><h3 className="text-sm font-medium text-foreground">Handoff contract · v{graph.version}</h3><ol className="mt-3 space-y-2 text-xs text-muted-foreground">{graph.edges.map((edge) => <li key={`${edge.from}-${edge.to}-${edge.kind}`}><span className="font-mono text-foreground">{edge.from} → {edge.to}</span><span className="ml-2">{edge.kind}</span></li>)}</ol></div></div>;
}

export function DurableTableList({ data }: { data: PlatformAdminSystemData }) {
  if (data.durableTables.length === 0) return <EmptyState title="No durable table probe" detail="The runtime did not return Profile or queue schema readiness." />;
  return <ul className="divide-y divide-border rounded-xl border border-border bg-white text-sm">{data.durableTables.map((table) => <li key={table.name} className="flex items-center justify-between gap-3 px-4 py-3"><span className="font-mono text-xs text-foreground">{table.name}</span><MaturityBadge maturity={table.status === 'deployed' ? 'target-schema' : 'unavailable'} /></li>)}</ul>;
}

export function AuditTable({ data }: { data: PlatformAdminAuditData }) {
  if (data.recent.length === 0) return <EmptyState title="No compatibility audit entries" detail="No actor or target history is present in the current stores." />;
  return <div className="overflow-x-auto rounded-xl border border-border bg-white"><table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Recent compatibility audit entries</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Time</th><th scope="col" className="px-4 py-3 font-medium">Actor</th><th scope="col" className="px-4 py-3 font-medium">Action</th><th scope="col" className="px-4 py-3 font-medium">Target</th><th scope="col" className="px-4 py-3 font-medium">Domain</th></tr></thead><tbody>{data.recent.map((entry) => <tr key={`${entry.domain}:${entry.id}`} className="border-b border-border last:border-0 hover:bg-muted/30"><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{entry.at}</td><td className="max-w-[150px] truncate px-4 py-3 font-mono text-xs text-foreground">{entry.actorAccountId ?? 'system'}</td><td className="px-4 py-3 text-foreground">{entry.action}</td><td className="px-4 py-3"><span className="text-foreground">{entry.targetType}</span><span className="ml-2 font-mono text-xs text-muted-foreground">{entry.targetId}</span></td><td className="px-4 py-3 text-xs capitalize text-muted-foreground">{entry.domain}</td></tr>)}</tbody></table></div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-white p-6"><p className="text-sm font-medium text-foreground">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p></div>;
}

function StatusText({ value }: { value: boolean }) {
  return <span className={value ? 'text-green-700' : 'text-muted-foreground'}>{value ? 'Yes' : 'No'}</span>;
}

export function AdminPageFrame({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10">{children}</main>;
}

export function NumberGrid({ items }: { items: Array<{ label: string; value: ReactNode; detail?: string; href?: string }> }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map((item) => <MetricCard key={item.label} {...item} />)}</div>;
}

export function DataAreaHeader({ area, title, description }: { area: AdminArea<unknown>; title: string; description: string }) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Platform scope</p><h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-foreground">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p></div><ProvenanceNote area={area} /></div>;
}

export function WorkspaceSummary({ data }: { data: PlatformAdminWorkspaceData }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Organizations" value={data.organizations} detail={`${data.accounts.total} accounts · ${data.members} memberships`} /><MetricCard label="Open calls" value={Object.values(data.openCalls).reduce((sum, value) => sum + value, 0)} detail={`${data.openCalls.published ?? 0} published`} /><MetricCard label="Submissions" value={Object.values(data.submissions).reduce((sum, value) => sum + value, 0)} detail={`${data.submissions['in-review'] ?? 0} in review`} /><MetricCard label="Decisions" value={Object.values(data.decisions).reduce((sum, value) => sum + value, 0)} detail={`${data.decisions.accepted ?? 0} accepted`} /></div>;
}
