'use client';

import Link from 'next/link';
import { ArrowUpRight, FileText, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AdminArea } from '@/lib/platformAdmin';
import type { PlatformAdminContentData } from '@/lib/platformAdminViews';
import { MaturityBadge, WarningList } from './platform-admin';

function humanize(value: string): string {
  return value.replaceAll('-', ' ').replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatObserved(value?: string): string {
  if (!value) return 'Not observed';
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(time));
}

export default function PlatformAdminContent({ area }: { area: AdminArea<PlatformAdminContentData> }) {
  const { data } = area;
  const searchParams = useSearchParams();
  const organizationId = searchParams.get('organizationId');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | PlatformAdminContentData['rows'][number]['type']>('all');
  const [status, setStatus] = useState('all');
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return data.rows.filter((row) => {
      if (organizationId && row.organizationId !== organizationId) return false;
      if (type !== 'all' && row.type !== type) return false;
      if (status !== 'all' && row.status !== status) return false;
      if (!normalized) return true;
      return [row.id, row.type, row.title, row.organization, row.status, row.source].filter(Boolean).join(' ').toLowerCase().includes(normalized);
    });
  }, [data.rows, organizationId, query, status, type]);
  const statuses = [...new Set(data.rows.map((row) => row.status))].sort();

  return <div className="space-y-8">
    <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Platform Admin · Product</p><h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-foreground">Content</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">One registry for the content Missa observes and the content organizations run. These are different systems of record, kept distinct on purpose.</p><div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><MaturityBadge maturity={area.provenance.maturity} /><span>Data source: {area.provenance.source}</span><span>Freshness: {area.provenance.freshness}</span></div></div>
    <WarningList warnings={area.warnings} />

    <section aria-labelledby="content-summary"><h2 id="content-summary" className="sr-only">Content summary</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[{ label: 'Canonical Radar', value: data.summary.canonicalRadar, detail: 'Non-duplicate opportunity rows' }, { label: 'Radar duplicates', value: data.summary.duplicateRadar, detail: 'Kept visible, not merged' }, { label: 'Workspace open calls', value: data.summary.workspaceOpenCalls, detail: 'Customer-owned content' }, { label: 'Published', value: data.summary.publishedOpenCalls, detail: 'Workspace open calls' }, { label: 'Drafts', value: data.summary.drafts, detail: 'Not publicly live' }].map((item) => <div key={item.label} className="border border-border bg-white p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 font-mono text-2xl tabular-nums text-foreground">{item.value}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.detail}</p></div>)}</div></section>

    <section className="border border-border bg-white" aria-labelledby="content-registry-title">
      <div className="border-b border-border px-4 py-4 sm:px-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="content-registry-title" className="text-lg font-semibold tracking-tight text-foreground">Content registry</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Search and filter current backend records. Actions remain on the owning surface.</p></div><span className="font-mono text-xs text-muted-foreground">{rows.length} / {data.rows.length}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_180px]"><label className="relative block"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search content registry" placeholder="Search title, ID, organization…" className="h-10 w-full border border-border bg-white pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><label className="sr-only" htmlFor="content-type">Content type</label><select id="content-type" value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-10 border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="all">All content types</option><option value="Radar opportunity">Radar opportunity</option><option value="Workspace open call">Workspace open call</option></select><label className="sr-only" htmlFor="content-status">Content status</label><select id="content-status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="all">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><caption className="sr-only">Radar and Workspace content registry</caption><thead className="border-b border-border bg-muted/30 text-[11px] text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Content</th><th scope="col" className="px-4 py-3 font-medium">Organization</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium">Source</th><th scope="col" className="px-4 py-3 font-medium">Observed</th><th scope="col" className="px-4 py-3 font-medium">Open</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20"><th scope="row" className="max-w-[330px] px-4 py-3 font-medium text-foreground"><span className="flex items-start gap-2"><FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0"><span className="block truncate">{row.title}</span><span className="mt-0.5 block truncate font-mono text-[11px] font-normal text-muted-foreground">{row.type} · {row.id}</span></span></span></th><td className="px-4 py-3 text-sm text-muted-foreground">{row.organization ?? 'Unassigned / not observed'}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-xs text-foreground"><span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />{humanize(row.status)}</span></td><td className="max-w-[220px] truncate px-4 py-3 text-xs text-muted-foreground">{row.source}</td><td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">{formatObserved(row.lastObservedAt)}</td><td className="px-4 py-3"><Link href={row.href} className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Open <ArrowUpRight className="size-3.5" aria-hidden="true" /></Link></td></tr>)}</tbody></table></div>
      {rows.length === 0 && <div className="px-4 py-12 text-center"><p className="text-sm font-medium text-foreground">No matching content</p><p className="mt-1 text-xs text-muted-foreground">Adjust the search or filters. The registry is backed by current Radar and Workspace records.</p></div>}
    </section>

    <section className="border border-dashed border-border bg-white p-4" aria-labelledby="planned-cms-title"><h2 id="planned-cms-title" className="text-sm font-semibold text-foreground">CMS capabilities not persisted yet</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">The registry deliberately does not render fake editorial controls. These capabilities need durable models, permissions, revisions, and audit contracts.</p><ul className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">{data.planned.map((item) => <li key={item} className="border-l-2 border-border pl-3">{item}</li>)}</ul></section>
  </div>;
}
