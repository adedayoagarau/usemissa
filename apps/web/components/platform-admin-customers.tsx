'use client';

import Link from 'next/link';
import { Building2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AdminArea, PlatformAdminCustomerActivityState, PlatformAdminCustomersData } from '@/lib/platformAdmin';
import { MaturityBadge, WarningList } from './platform-admin';

function humanize(value: string): string {
  return value.replaceAll('-', ' ').replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function count(value: number | null): string {
  return value === null ? '—' : String(value);
}

function activityStyle(value: PlatformAdminCustomerActivityState): string {
  if (value === 'attention') return 'text-amber-700';
  if (value === 'active') return 'text-green-700';
  return 'text-muted-foreground';
}

function observedAt(value?: string): string {
  if (!value) return 'Not observed';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(timestamp));
}

export default function PlatformAdminCustomers({ area }: { area: AdminArea<PlatformAdminCustomersData> }) {
  const { data } = area;
  const [query, setQuery] = useState('');
  const [billing, setBilling] = useState('all');
  const [activity, setActivity] = useState<'all' | PlatformAdminCustomerActivityState>('all');
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return data.rows.filter((row) => {
      if (billing !== 'all' && row.billingStatus !== billing) return false;
      if (activity !== 'all' && row.activityState !== activity) return false;
      if (!normalized) return true;
      return [row.organizationId, row.organizationName, row.billingTier, row.billingStatus, row.activityState].join(' ').toLowerCase().includes(normalized);
    });
  }, [activity, billing, data.rows, query]);
  const billingStates = [...new Set(data.rows.map((row) => row.billingStatus))].sort();

  return <div className="space-y-8">
    <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Platform Admin · Product</p><h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-foreground">Customers</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">A current customer directory for organizations, seats, observed workflow activity, and billing state. This is CRM-lite read-only until a durable People model exists.</p><div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><MaturityBadge maturity={area.provenance.maturity} /><span>Data source: {area.provenance.source}</span><span>Freshness: {area.provenance.freshness}</span></div></div>
    <WarningList warnings={area.warnings} />
    <section aria-labelledby="customers-summary-title"><h2 id="customers-summary-title" className="sr-only">Customer summary</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: 'Organizations', value: count(data.organizationCount), detail: data.availability === 'empty' ? 'No organizations in current store' : 'Observed platform organizations' }, { label: 'Active', value: data.rows.filter((row) => row.activityState === 'active').length, detail: 'Activity observed in the last 30 days' }, { label: 'Attention', value: data.rows.filter((row) => row.activityState === 'attention').length, detail: 'Pending delivery or operator attention' }, { label: 'Billing unknown', value: data.rows.filter((row) => row.billingStatus === 'unknown').length, detail: 'Not stored; not inferred as free' }].map((item) => <div key={item.label} className="border border-border bg-white p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 font-mono text-2xl tabular-nums text-foreground">{item.value}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.detail}</p></div>)}</div></section>
    <section className="border border-border bg-white" aria-labelledby="customers-directory-title"><div className="border-b border-border px-4 py-4 sm:px-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="customers-directory-title" className="text-lg font-semibold tracking-tight text-foreground">Organization directory</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Counts are derived from current identity and Workspace records; private content is excluded.</p></div><span className="font-mono text-xs text-muted-foreground">{rows.length} / {data.rows.length}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_160px]"><label className="relative block"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search customers" placeholder="Search organization or ID…" className="h-10 w-full border border-border bg-white pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><label className="sr-only" htmlFor="customer-billing">Billing status</label><select id="customer-billing" value={billing} onChange={(event) => setBilling(event.target.value)} className="h-10 border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="all">All billing states</option>{billingStates.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select><label className="sr-only" htmlFor="customer-activity">Activity state</label><select id="customer-activity" value={activity} onChange={(event) => setActivity(event.target.value as typeof activity)} className="h-10 border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="all">All activity</option><option value="attention">Attention</option><option value="active">Active</option><option value="quiet">Quiet</option><option value="unknown">Unknown</option></select></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1160px] text-left text-sm"><caption className="sr-only">Organization customer directory</caption><thead className="border-b border-border bg-muted/30 text-[11px] text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Organization</th><th scope="col" className="px-4 py-3 font-medium">Activity</th><th scope="col" className="px-4 py-3 font-medium">People / seats</th><th scope="col" className="px-4 py-3 font-medium">Workspace flow</th><th scope="col" className="px-4 py-3 font-medium">Billing</th><th scope="col" className="px-4 py-3 font-medium">Latest observed</th><th scope="col" className="px-4 py-3 font-medium">Open</th></tr></thead><tbody>{rows.map((row) => <tr key={row.organizationId} className="border-b border-border last:border-0 hover:bg-muted/20"><th scope="row" className="max-w-[260px] px-4 py-3 font-medium text-foreground"><span className="flex items-start gap-2"><Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0"><span className="block truncate">{row.organizationName}</span><span className="mt-0.5 block truncate font-mono text-[11px] font-normal text-muted-foreground">{row.organizationId}{row.verified ? ' · verified' : ''}</span></span></span></th><td className={`px-4 py-3 text-xs font-medium ${activityStyle(row.activityState)}`}>{humanize(row.activityState)}</td><td className="px-4 py-3 text-xs text-muted-foreground"><span className="font-mono text-foreground">{count(row.distinctAccountCount)}</span> accounts · <span className="font-mono text-foreground">{count(row.memberCount)}</span> memberships</td><td className="px-4 py-3 text-xs text-muted-foreground"><span className="font-mono text-foreground">{count(row.openCallCount)}</span> calls · <span className="font-mono text-foreground">{count(row.submissionCount)}</span> submissions · <span className="font-mono text-foreground">{count(row.decisionCount)}</span> decisions</td><td className="px-4 py-3 text-xs text-muted-foreground"><span className="block capitalize text-foreground">{humanize(row.billingTier)}</span><span className="mt-0.5 block">{humanize(row.billingStatus)}</span><span className="mt-0.5 block">Connect: {humanize(row.stripeConnectStatus)}</span></td><td className="px-4 py-3 text-xs text-muted-foreground"><span className="block">{observedAt(row.latestObservedActivity?.at)}</span>{row.latestObservedActivity && <span className="mt-0.5 block truncate text-[11px]">{row.latestObservedActivity.source} · {row.latestObservedActivity.freshness}</span>}</td><td className="px-4 py-3"><Link href={`/admin/content?organizationId=${encodeURIComponent(row.organizationId)}`} className="inline-flex min-h-9 items-center text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Content</Link></td></tr>)}</tbody></table></div>
      {rows.length === 0 && <div className="px-4 py-12 text-center"><p className="text-sm font-medium text-foreground">No matching organizations</p><p className="mt-1 text-xs text-muted-foreground">Adjust the search or filters. Empty and unavailable states are kept distinct.</p></div>}
    </section>
    <section className="border border-dashed border-border bg-white p-4" aria-labelledby="planned-crm-title"><h2 id="planned-crm-title" className="text-sm font-semibold text-foreground">CRM fields not persisted yet</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">These capabilities need a durable People/CRM model, retention and consent rules, and governed write actions before they appear as editable controls.</p><ul className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">{data.plannedCrmFields.map((item) => <li key={item} className="border-l-2 border-border pl-3">{item}</li>)}</ul></section>
  </div>;
}
