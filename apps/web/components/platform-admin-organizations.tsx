'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DataAreaHeader, MaturityBadge, MetricCard, WarningList } from '@/components/platform-admin';
import type { AdminArea } from '@/lib/platformAdmin';
import type { PlatformAdminOrganizationsData } from '@/lib/platformAdminContinuation';

function value(value: number | null): string {
  return value === null ? '—' : String(value);
}

export default function PlatformAdminOrganizations({ area }: { area: AdminArea<PlatformAdminOrganizationsData> }) {
  const [search, setSearch] = useState('');
  const [billingStatus, setBillingStatus] = useState('all');
  const rows = useMemo(() => area.data.rows.filter((row) => {
    const haystack = `${row.name} ${row.id} ${row.domains.join(' ')}`.toLowerCase();
    return (!search.trim() || haystack.includes(search.trim().toLowerCase())) && (billingStatus === 'all' || row.billingStatus === billingStatus);
  }), [area.data.rows, billingStatus, search]);

  return <div className="space-y-8">
    <DataAreaHeader area={area} title="Organizations" description="Cross-tenant workflow snapshots for platform operators. This surface observes organization configuration and product activity without impersonating members or exposing private submission content." />
    <WarningList warnings={area.warnings} />
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Organization summary">
      <MetricCard label="Organizations" value={value(area.data.summary.organizationCount)} detail="Observed Radar organization records" />
      <MetricCard label="Active" value={value(area.data.summary.activeOrganizationCount)} detail="At least one active membership" />
      <MetricCard label="Published calls" value={value(area.data.summary.publishedOpenCallCount)} detail="Workspace published open calls" />
      <MetricCard label="Pending delivery" value={value(area.data.summary.pendingDeliveryCount)} detail="Accepted Work tasks still pending" href="/admin/operations?queue=workspace" />
      <MetricCard label="Past due" value={value(area.data.summary.pastDueCount)} detail="Observed billing status only" />
    </section>
    <section className="border border-border bg-white" aria-labelledby="organizations-list-title">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="organizations-list-title" className="text-lg font-semibold tracking-tight text-foreground">Organization workflow snapshot</h2><p className="mt-1 text-xs text-muted-foreground">{rows.length} of {area.data.rows.length} organizations shown · no member emails, answers, files, or provider IDs.</p></div><MaturityBadge maturity={area.provenance.maturity} /></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]"><label className="sr-only" htmlFor="organization-search">Search organizations</label><input id="organization-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, or domain…" className="h-10 border border-border bg-white px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" /><label className="sr-only" htmlFor="organization-billing-status">Billing status</label><select id="organization-billing-status" value={billingStatus} onChange={(event) => setBillingStatus(event.target.value)} className="h-10 border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="all">All billing states</option><option value="unknown">Unknown</option><option value="inactive">Inactive</option><option value="trialing">Trialing</option><option value="active">Active</option><option value="past_due">Past due</option><option value="canceled">Canceled</option></select></div>
      </div>
      {rows.length === 0 ? <p className="px-5 py-12 text-center text-sm text-muted-foreground">No organizations match the current filters.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1180px] border-collapse text-left text-sm"><caption className="sr-only">Platform organization workflow snapshot</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Organization</th><th scope="col" className="px-4 py-3 font-medium">People / seats</th><th scope="col" className="px-4 py-3 font-medium">Workspace</th><th scope="col" className="px-4 py-3 font-medium">Submissions</th><th scope="col" className="px-4 py-3 font-medium">Decisions</th><th scope="col" className="px-4 py-3 font-medium">Delivery</th><th scope="col" className="px-4 py-3 font-medium">Billing</th><th scope="col" className="px-4 py-3 font-medium">Observed</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border align-top last:border-0 hover:bg-muted/20"><th scope="row" className="max-w-[250px] px-4 py-3 font-medium text-foreground"><span className="block truncate">{row.name}</span><span className="mt-1 block truncate font-mono text-[11px] font-normal text-muted-foreground">{row.id}</span>{row.verified && <span className="mt-1 inline-block text-[11px] font-normal text-green-700">Verified</span>}{row.domains.length > 0 && <span className="mt-1 block truncate text-[11px] font-normal text-muted-foreground">{row.domains.join(', ')}</span>}<Link href={`/admin/content?organizationId=${encodeURIComponent(row.id)}`} className="mt-2 inline-block text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4">Inspect content</Link></th><td className="px-4 py-3 text-xs text-muted-foreground"><span className="font-mono text-foreground">{value(row.memberCount)} / {value(row.seatLimit)}</span><span className="mt-1 block">{value(row.activeMemberCount)} active</span></td><td className="px-4 py-3 text-xs text-muted-foreground"><span className="font-mono text-foreground">{value(row.openCallCount)} calls</span><span className="mt-1 block">{value(row.publishedOpenCallCount)} published</span></td><td className="px-4 py-3 text-xs text-muted-foreground"><span className="font-mono text-foreground">{value(row.submissionCount)}</span><span className="mt-1 block">{value(row.inReviewCount)} in review</span></td><td className="px-4 py-3 text-xs text-muted-foreground"><span className="font-mono text-foreground">{value(row.decisionCount)}</span><span className="mt-1 block">{value(row.acceptedWorkCount)} accepted</span></td><td className="px-4 py-3 text-xs text-muted-foreground"><span className={`font-mono ${row.pendingDeliveryCount ? 'text-amber-700' : 'text-foreground'}`}>{value(row.pendingDeliveryCount)} pending</span><span className="mt-1 block">{row.pendingDeliveryCount ? 'Needs attention' : 'No pending tasks'}</span></td><td className="px-4 py-3 text-xs text-muted-foreground"><span className="block capitalize text-foreground">{row.billingTier}</span><span className="mt-1 block">{row.billingStatus.replaceAll('_', ' ')}</span><span className="mt-1 block">Connect: {row.stripeConnectStatus.replaceAll('-', ' ')}</span></td><td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">{row.latestObservedAt ?? 'Not observed'}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="border-t border-border pt-6"><h2 className="text-lg font-semibold tracking-tight text-foreground">Planned CRM boundary</h2><p className="mt-1 text-sm text-muted-foreground">The current page is an observed read model. These capabilities need durable models, action-level authorization, idempotency, and audit contracts before becoming controls.</p><ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{area.data.planned.map((item) => <li key={item} className="border border-border bg-white px-3 py-2">{item}</li>)}</ul></section>
  </div>;
}
