'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  CircleAlert,
  CircleDashed,
  CircleDot,
  Clock3,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import { AdminOperationButton } from './platform-admin-actions';
import type {
  AdminArea,
  AdminMaturity,
  PlatformAdminOperationsData,
  PlatformAdminQueueAction,
  PlatformAdminQueueName,
  PlatformAdminQueueRow,
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

const queueLabels: Record<PlatformAdminQueueName, string> = {
  'source-health': 'Source health',
  verification: 'Verification',
  claims: 'Claims',
  review: 'Review jobs',
  enrichment: 'Enrichment',
  agents: 'Agents',
  outbox: 'Outbox',
  workspace: 'Workspace',
};

const queueOrder: PlatformAdminQueueName[] = ['source-health', 'verification', 'claims', 'review', 'enrichment', 'agents', 'outbox', 'workspace'];
type QueueFilter = 'all' | PlatformAdminQueueName;
type SeverityFilter = 'all' | PlatformAdminQueueRow['severity'];

function normalizeQueueFilter(value?: string): QueueFilter {
  if (value === 'workspace' || value === 'agents' || value === 'outbox') return value;
  if (queueOrder.includes(value as PlatformAdminQueueName)) return value as PlatformAdminQueueName;
  return 'all';
}

function normalizeSeverityFilter(value?: string): SeverityFilter {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'all';
}

function formatUtc(value?: string): string {
  if (!value) return 'Not observed';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(timestamp))} UTC`;
}

function humanize(value: string): string {
  return value.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function MaturityTag({ maturity }: { maturity: AdminMaturity }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${maturityStyles[maturity]}`}>{maturityLabels[maturity]}</span>;
}

function SeverityMark({ row }: { row: PlatformAdminQueueRow }) {
  const Icon = row.severity === 'high' ? CircleAlert : row.severity === 'medium' ? TriangleAlert : row.status === 'completed' ? CheckCircle2 : CircleDot;
  const color = row.severity === 'high' ? 'text-red-600' : row.severity === 'medium' ? 'text-amber-600' : 'text-blue-600';
  return <span className="flex shrink-0 items-center gap-1.5" title={`${humanize(row.severity)} severity`}><Icon className={`size-4 ${color}`} aria-hidden="true" /><span className="sr-only">{humanize(row.severity)} severity</span></span>;
}

function QueueAction({ action }: { action?: PlatformAdminQueueAction }) {
  if (!action) return <span className="text-xs text-muted-foreground">Inspect</span>;
  if (action.type === 'link') {
    const external = action.href.startsWith('http');
    return <Link href={action.href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{action.label}<ArrowRight className="size-3.5" aria-hidden="true" /></Link>;
  }
  return <span onClick={(event) => event.stopPropagation()}><AdminOperationButton action={action.action} queue={action.queue} id={action.id} label={action.label} /></span>;
}

function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return <section aria-label="Admin data warnings" className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><p className="font-medium">Read-model caveats</p><ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>;
}

function DetailValue({ value, href }: { value: string; href?: string }) {
  if (!href) return <span className="break-words text-right font-mono text-[11px] text-foreground">{value}</span>;
  const external = href.startsWith('http');
  return <Link href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className="break-all text-right font-mono text-[11px] text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{value}<ExternalLink className="ml-1 inline size-3" aria-hidden="true" /></Link>;
}

function QueueDetail({ row, onClose }: { row?: PlatformAdminQueueRow; onClose: () => void }) {
  if (!row) {
    return <aside className="border border-border bg-white p-5 xl:sticky xl:top-6 xl:self-start" aria-label="Queue item detail"><div className="flex min-h-64 flex-col items-center justify-center text-center"><CircleDashed className="size-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Select a queue item</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Choose a row to inspect its evidence, provenance, and safe next action.</p></div></aside>;
  }
  return <aside className="border border-border bg-white p-5 xl:sticky xl:top-6 xl:self-start" aria-label={`Details for ${row.title}`}>
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><SeverityMark row={row} /><span className="text-xs font-medium capitalize text-muted-foreground">{humanize(row.status)}</span></div>
        <h2 className="mt-3 break-words text-lg font-semibold tracking-tight text-foreground">{row.title}</h2>
        {row.subtitle && <p className="mt-1 break-words text-sm text-muted-foreground">{row.subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Close queue item detail" className="flex size-9 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><X className="size-4" aria-hidden="true" /></button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><MaturityTag maturity={row.maturity} /><span className="text-[11px] text-muted-foreground">{row.source}</span></div>

    <section className="mt-6 border-t border-border pt-4"><h3 className="text-xs font-semibold text-foreground">Why this is here</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{row.detail.why}</p></section>

    <section className="mt-5 border-t border-border pt-4"><h3 className="text-xs font-semibold text-foreground">Evidence</h3><dl className="mt-3 space-y-2.5">{row.detail.evidence.map((item) => <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-3 text-xs"><dt className="text-muted-foreground">{item.label}</dt><dd className="text-right font-mono text-[11px] text-foreground">{item.value.includes('T') ? formatUtc(item.value) : item.value}</dd></div>)}</dl></section>

    <section className="mt-5 border-t border-border pt-4"><h3 className="text-xs font-semibold text-foreground">Related IDs</h3><dl className="mt-3 space-y-2.5">{row.detail.related.map((item) => <div key={`${item.label}:${item.value}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-3 text-xs"><dt className="text-muted-foreground">{item.label}</dt><dd><DetailValue value={item.value} href={item.href} /></dd></div>)}</dl></section>

    {row.detail.recovery && <section className="mt-5 border-t border-border pt-4"><div className="flex gap-2"><Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div><h3 className="text-xs font-semibold text-foreground">Safe recovery guidance</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{row.detail.recovery}</p></div></div></section>}
    {row.action && <div className="mt-6 border-t border-border pt-4"><QueueAction action={row.action} /></div>}
  </aside>;
}

function QueueTable({ rows, selectedId, onSelect }: { rows: PlatformAdminQueueRow[]; selectedId?: string; onSelect: (id: string) => void }) {
  return <>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[820px] table-fixed text-left text-sm"><caption className="sr-only">Platform operations queue</caption><thead className="border-b border-border bg-muted/30 text-[11px] text-muted-foreground"><tr><th scope="col" className="w-[29%] px-4 py-3 font-medium">Item</th><th scope="col" className="w-[24%] px-4 py-3 font-medium">Reason</th><th scope="col" className="w-[16%] px-4 py-3 font-medium">Queue / lane</th><th scope="col" className="w-[11%] px-4 py-3 font-medium">Age</th><th scope="col" className="w-[12%] px-4 py-3 font-medium">Provenance</th><th scope="col" className="w-[8%] px-4 py-3 font-medium">Action</th></tr></thead><tbody>{rows.map((row) => {
        const selected = row.id === selectedId;
        return <tr key={row.id} className={`border-b border-border last:border-0 ${selected ? 'bg-accent-tint/45' : 'hover:bg-muted/30'}`}>
          <td className="border-l-2 border-transparent px-4 py-3 align-top data-[selected=true]:border-primary" data-selected={selected}><button type="button" onClick={() => onSelect(row.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(row.id); } }} className="flex w-full min-w-0 items-start gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><SeverityMark row={row} /><span className="min-w-0"><span className="block truncate font-medium text-foreground">{row.title}</span>{row.subtitle && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{row.subtitle}</span>}</span></button></td>
          <td className="px-4 py-3 align-top"><button type="button" onClick={() => onSelect(row.id)} className="block max-w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span className="block truncate text-foreground">{row.reason}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{row.owner ?? 'Unassigned'}</span></button></td>
          <td className="px-4 py-3 align-top"><span className="block truncate text-foreground">{row.lane}</span><span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">{humanize(row.status)}</span></td>
          <td className="px-4 py-3 align-top"><button type="button" onClick={() => onSelect(row.id)} className="text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span className={`block whitespace-nowrap font-mono text-xs font-medium ${row.severity === 'high' ? 'text-red-700' : row.severity === 'medium' ? 'text-amber-700' : 'text-foreground'}`}>{row.age}</span>{row.ageAt && <span className="mt-0.5 block whitespace-nowrap font-mono text-[10px] text-muted-foreground">{formatUtc(row.ageAt)}</span>}</button></td>
          <td className="px-4 py-3 align-top"><MaturityTag maturity={row.maturity} /></td>
          <td className="px-4 py-3 align-top"><QueueAction action={row.action} /></td>
        </tr>;
      })}</tbody></table>
    </div>
    <div className="divide-y divide-border md:hidden">{rows.map((row) => {
      const selected = row.id === selectedId;
      return <div key={row.id} className={selected ? 'bg-accent-tint/45' : undefined}>
        <button type="button" onClick={() => onSelect(row.id)} className="flex min-h-24 w-full items-start gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"><SeverityMark row={row} /><span className="min-w-0 flex-1"><span className="block font-medium text-foreground">{row.title}</span>{row.subtitle && <span className="mt-1 block truncate text-xs text-muted-foreground">{row.subtitle}</span>}<span className="mt-2 block text-xs text-foreground">{row.reason}</span><span className="mt-1 block font-mono text-[11px] text-muted-foreground">{row.lane} · {row.age}</span></span><ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></button>
        <div className="flex items-center justify-between gap-3 px-4 pb-4 pl-11"><MaturityTag maturity={row.maturity} /><QueueAction action={row.action} /></div>
      </div>;
    })}</div>
  </>;
}

function LaneHealth({ rows }: { rows: PlatformAdminQueueRow[] }) {
  const counts = queueOrder.map((queue) => ({ queue, count: rows.filter((row) => row.queue === queue).length })).filter((item) => item.count > 0);
  if (counts.length === 0) return null;
  return <section className="border border-border bg-white px-4 py-4" aria-labelledby="lane-health-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="lane-health-title" className="text-sm font-semibold text-foreground">Loaded lane health</h2><p className="mt-1 text-xs text-muted-foreground">Counts reflect the queue rows loaded for this read.</p></div><Link href="/admin/operations" className="text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4 hover:text-primary">View all operations <ArrowRight className="ml-1 inline size-3.5" aria-hidden="true" /></Link></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">{counts.map(({ queue, count }) => <div key={queue} className="border-l border-border pl-3"><p className="text-xs font-medium text-foreground">{queueLabels[queue]}</p><p className="mt-1 font-mono text-lg tabular-nums text-foreground">{count}</p></div>)}</div></section>;
}

export default function PlatformAdminOperationsQueue({ area, initialQueue, initialSeverity }: { area: AdminArea<PlatformAdminOperationsData>; initialQueue?: string; initialSeverity?: string }) {
  const { data } = area;
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>(normalizeQueueFilter(initialQueue));
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(normalizeSeverityFilter(initialSeverity));
  const [selectedId, setSelectedId] = useState<string | undefined>(data.queue.rows[0]?.id);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.queue.rows.filter((row) => {
      if (queueFilter !== 'all' && row.queue !== queueFilter) return false;
      if (severityFilter !== 'all' && row.severity !== severityFilter) return false;
      if (!query) return true;
      return [row.id, row.title, row.subtitle, row.reason, row.lane, row.owner, row.status, row.source].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [data.queue.rows, queueFilter, search, severityFilter]);

  const selectedRow = filteredRows.find((row) => row.id === selectedId);
  const activeFilterCount = [search.trim(), queueFilter !== 'all' ? queueFilter : '', severityFilter !== 'all' ? severityFilter : ''].filter(Boolean).length;
  const workerStatus = data.worker.status === 'unknown' ? 'Unknown' : humanize(data.worker.status);
  const workerHealthy = data.worker.status === 'running' || data.worker.status === 'healthy';

  function clearFilters() {
    setSearch('');
    setQueueFilter('all');
    setSeverityFilter('all');
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Platform operations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Operations queue</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className={`size-2 rounded-full ${workerHealthy ? 'bg-green-600' : data.worker.status === 'failed' ? 'bg-red-600' : 'bg-amber-500'}`} aria-hidden="true" />Worker {workerStatus}</span><span aria-hidden="true">·</span><span>{maturityLabels[area.provenance.maturity]}</span><span aria-hidden="true">·</span><span>{area.provenance.freshness.replace('read at ', 'Read at ')}</span></div>
      </div>
      <div className="flex items-center gap-2"><button type="button" onClick={() => window.location.reload()} className="flex min-h-9 items-center gap-2 border border-border bg-white px-3 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><RefreshCw className="size-3.5" aria-hidden="true" />Refresh</button><AdminOperationButton action="run-radar-tick" label="Run bounded tick" tone="primary" /></div>
    </div>

    <WarningList warnings={[...area.warnings, ...data.durable.warnings.filter((warning) => !area.warnings.includes(warning))]} />

    <section className="grid border-y border-border sm:grid-cols-4" aria-label="Operations queue summary">
      <div className="border-b border-border px-3 py-4 sm:border-b-0 sm:border-r"><p className="text-xs text-muted-foreground">Open</p><p className="mt-1 font-mono text-2xl tabular-nums text-foreground">{data.queue.summary.open}</p><p className="mt-1 text-[11px] text-muted-foreground">queue items</p></div>
      <div className="border-b border-border px-3 py-4 sm:border-b-0 sm:border-r"><p className="text-xs text-muted-foreground">Needs attention</p><p className="mt-1 font-mono text-2xl tabular-nums text-red-700">{data.queue.summary.attention}</p><p className="mt-1 text-[11px] text-muted-foreground">failed or high priority</p></div>
      <div className="border-b border-border px-3 py-4 sm:border-b-0 sm:border-r"><p className="text-xs text-muted-foreground">In progress</p><p className="mt-1 font-mono text-2xl tabular-nums text-blue-700">{data.queue.summary.inProgress}</p><p className="mt-1 text-[11px] text-muted-foreground">worker-owned rows</p></div>
      <div className="px-3 py-4"><p className="text-xs text-muted-foreground">Oldest</p><p className="mt-1 font-mono text-2xl tabular-nums text-foreground">{data.queue.summary.oldest?.age ?? '—'}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{data.queue.summary.oldest?.title ?? 'No timestamped work'}</p></div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 border border-border bg-white" aria-labelledby="needs-attention-title">
        <div className="border-b border-border px-4 py-4 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h2 id="needs-attention-title" className="text-lg font-semibold tracking-tight text-foreground">Needs attention</h2><span className="font-mono text-xs text-red-700">{filteredRows.length}{filteredRows.length !== data.queue.summary.open ? ` / ${data.queue.summary.open}` : ''} items</span></div><p className="mt-1 text-xs text-muted-foreground">Select a row to inspect evidence and the safest next action.</p></div><div className="flex items-center gap-2 text-xs"><Filter className="size-3.5 text-muted-foreground" aria-hidden="true" /><span className="text-muted-foreground">{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active</span>{activeFilterCount > 0 && <button type="button" onClick={clearFilters} className="font-medium text-accent-deep underline decoration-accent-tint underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Clear</button>}</div></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_150px]"><label className="relative block"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by ID, item, reason, owner…" aria-label="Search operations queue" className="h-10 w-full border border-border bg-white pl-9 pr-12 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" /><span className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 font-mono text-[10px] text-muted-foreground sm:inline">⌘K</span></label><label className="sr-only" htmlFor="queue-filter">Queue filter</label><select id="queue-filter" value={queueFilter} onChange={(event) => setQueueFilter(event.target.value as QueueFilter)} className="h-10 border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="all">All queues</option>{queueOrder.map((queue) => <option key={queue} value={queue}>{queueLabels[queue]}</option>)}</select><label className="sr-only" htmlFor="severity-filter">Severity filter</label><select id="severity-filter" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)} className="h-10 border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="all">All severity</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
        </div>
        {filteredRows.length > 0 ? <QueueTable rows={filteredRows} selectedId={selectedRow?.id} onSelect={setSelectedId} /> : <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center"><ClipboardList className="size-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">{data.queue.summary.open === 0 ? 'No actionable queue items' : 'No matching queue items'}</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{data.queue.summary.open === 0 ? 'The current read model has no open verification, source, worker, durable, or Workspace work to act on.' : 'Adjust the search or filters. The queue is read from the current backend snapshot, not mock data.'}</p>{data.queue.summary.open > 0 && <button type="button" onClick={clearFilters} className="mt-4 text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Clear filters</button>}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[11px] text-muted-foreground sm:px-5"><span>Showing {filteredRows.length} of {data.queue.summary.open} queue items{data.queue.summary.open > data.queue.rows.length ? ' · each lane capped at 100' : ''}</span><span className="font-mono">Read model · no private payloads</span></div>
      </section>
      <QueueDetail row={selectedRow} onClose={() => setSelectedId(undefined)} />
    </div>

    <LaneHealth rows={data.queue.rows} />
  </div>;
}
