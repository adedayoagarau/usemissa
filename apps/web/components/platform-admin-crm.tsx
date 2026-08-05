'use client';

import { useMemo, useState } from 'react';
import { DataAreaHeader, MaturityBadge, MetricCard, WarningList } from '@/components/platform-admin';
import type { AdminArea } from '@/lib/platformAdmin';
import type { PlatformAdminCrmData } from '@/lib/platformAdminFoundations';

function dateLabel(value?: string): string {
  if (!value) return 'Not observed';
  return new Date(value).toLocaleString();
}

export default function PlatformAdminCrm({ area }: { area: AdminArea<PlatformAdminCrmData> }) {
  const [search, setSearch] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return area.data.rows;
    return area.data.rows.filter((row) => [row.subjectId, row.subjectLabel, row.accountEmail, row.eventType, row.source, row.title, row.body].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [area.data.rows, search]);

  async function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setSaving(true);
    try {
      const response = await fetch('/api/admin/crm', { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ organizationId, title, body }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'Unable to save note');
      setMessage('Internal note recorded. Refresh to see it in the timeline.');
      setTitle('');
      setBody('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save note');
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-8">
    <DataAreaHeader area={area} title="CRM timeline" description="Organization-level relationship notes and redacted system activity. Internal notes are append-only, tenant-aware, idempotent, audited, and never published to customer-facing surfaces." />
    <WarningList warnings={area.warnings} />
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="CRM summary">
      <MetricCard label="Timeline events" value={area.data.summary.timelineEvents} detail="Durable notes plus redacted activity" />
      <MetricCard label="Internal notes" value={area.data.summary.notes} detail="Operator-authored CRM notes" />
      <MetricCard label="Organizations" value={area.data.summary.organizationsWithActivity} detail="Organizations with observed activity" href="/admin/organizations" />
      <MetricCard label="Accounts" value={area.data.summary.accountsWithActivity} detail="Account-level activity references" href="/admin/customers" />
    </section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 border border-border bg-white">
        <div className="border-b border-border px-4 py-4 sm:px-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight text-foreground">Relationship timeline</h2><p className="mt-1 text-xs text-muted-foreground">{rows.length} events shown · system rows contain metadata only, not private messages or submissions.</p></div><MaturityBadge maturity={area.provenance.maturity} /></div><label className="mt-4 block"><span className="sr-only">Search CRM timeline</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search organization, event, or note…" className="h-10 w-full border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" /></label></div>
        {rows.length === 0 ? <p className="px-5 py-12 text-center text-sm text-muted-foreground">No CRM timeline events match the current filter.</p> : <div className="divide-y divide-border">{rows.map((row) => <article key={`${row.source}:${row.id}`} className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-foreground">{row.title}</p><p className="mt-1 text-xs text-muted-foreground">{row.subjectLabel ?? row.subjectId} · {row.subjectType} · {row.eventType} · {row.source}</p></div><time className="whitespace-nowrap font-mono text-[11px] text-muted-foreground" dateTime={row.createdAt}>{dateLabel(row.createdAt)}</time></div>{row.body && <p className="mt-3 border-l-2 border-border pl-3 text-sm leading-6 text-muted-foreground">{row.body}</p>}{row.accountEmail && <p className="mt-3 text-[11px] text-muted-foreground">Account reference: {row.accountEmail}</p>}</article>)}</div>}
      </div>
      <aside className="border border-border bg-white p-5 xl:sticky xl:top-6 xl:self-start"><h2 className="text-lg font-semibold tracking-tight text-foreground">Add internal note</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Notes belong to an organization. They are not customer-visible and do not change membership, billing, or workflow state.</p><form onSubmit={addNote} className="mt-5 space-y-4"><label className="block"><span className="text-xs font-medium text-foreground">Organization ID</span><input required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} placeholder="org_…" className="mt-1 h-10 w-full border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><label className="block"><span className="text-xs font-medium text-foreground">Title</span><input required maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Onboarding follow-up" className="mt-1 h-10 w-full border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><label className="block"><span className="text-xs font-medium text-foreground">Note</span><textarea required maxLength={4000} value={body} onChange={(event) => setBody(event.target.value)} rows={6} placeholder="What should the next operator know?" className="mt-1 w-full resize-y border border-border px-3 py-2 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><button type="submit" disabled={saving || !area.data.available} className="min-h-10 w-full bg-foreground px-4 text-sm font-medium text-white hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : 'Record internal note'}</button>{message && <p role="status" className="text-xs leading-5 text-muted-foreground">{message}</p>}</form></aside>
    </section>
    <p className="text-xs leading-5 text-muted-foreground">CRM scope is deliberately organization-first. A Radar account or support report is not automatically assigned to a customer organization; operators must use an explicit organization ID.</p>
  </div>;
}
