'use client';

import { useState } from 'react';
import { DataAreaHeader, MaturityBadge, MetricCard, SectionHeading, WarningList } from '@/components/platform-admin';
import type { AdminArea } from '@/lib/platformAdmin';
import type { PlatformAdminSupportData } from '@/lib/platformAdminSupport';

const PLATFORM_SUPPORT_STATUSES = ['open', 'in-progress', 'resolved', 'dismissed'] as const;
type PlatformSupportStatus = (typeof PLATFORM_SUPPORT_STATUSES)[number];

function statusLabel(status: string): string {
  return status.replaceAll('-', ' ');
}

function dateLabel(value?: string): string {
  if (!value) return 'Not observed';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function PlatformAdminSupport({ area }: { area: AdminArea<PlatformAdminSupportData> }) {
  const [rows, setRows] = useState(area.data.rows);
  const [summary, setSummary] = useState(area.data.summary);
  const [savingId, setSavingId] = useState<string>();
  const [error, setError] = useState<string>();

  async function changeStatus(caseId: string, status: PlatformSupportStatus) {
    const row = rows.find((item) => item.id === caseId);
    if (!row || row.status === status) return;
    setSavingId(caseId);
    setError(undefined);
    try {
      const response = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ caseId, status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'The support case could not be updated.');
      setRows((current) => current.map((item) => item.id === caseId ? { ...item, status } : item));
      setSummary((current) => {
        const next = { ...current.byStatus };
        next[row.status] = Math.max(0, (next[row.status] ?? 0) - 1);
        next[status] = (next[status] ?? 0) + 1;
        return { ...current, byStatus: next };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The support case could not be updated.');
    } finally {
      setSavingId(undefined);
    }
  }

  return <div className="space-y-8">
    <DataAreaHeader area={area} title="Support cases" description="A durable queue for user-reported opportunity issues. Operators can move a case through its lifecycle; every status change is audited and emits a worker-readable outbox event." />
    <WarningList warnings={area.warnings} />
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Support summary">
      <MetricCard label="All cases" value={summary.total} detail="Durable issue reports" />
      <MetricCard label="Open" value={summary.byStatus.open ?? 0} detail="Waiting for triage" />
      <MetricCard label="In progress" value={summary.byStatus['in-progress'] ?? 0} detail="Owned by an operator" />
      <MetricCard label="Resolved" value={summary.byStatus.resolved ?? 0} detail="Closed with a resolution" />
      <MetricCard label="Dismissed" value={summary.byStatus.dismissed ?? 0} detail="Not actionable" />
    </section>

    <section aria-labelledby="support-case-list-title">
      <SectionHeading eyebrow="Queue" title="Reported issues" description="Account and opportunity references are shown for authorized platform operators. Email bodies, provider tokens, and unrelated private content are not included." />
      <div className="mt-4 border border-border bg-white">
        <h2 id="support-case-list-title" className="sr-only">Reported opportunity issues</h2>
        {rows.length === 0 ? <div className="px-5 py-14 text-center"><p className="text-sm font-medium text-foreground">{area.data.availability === 'unavailable' ? 'Support queue unavailable' : 'No support cases yet'}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{area.data.availability === 'unavailable' ? 'Connect the database-backed issue-report tables before treating this as an empty queue.' : 'User-reported opportunity issues will appear here when submitted.'}</p></div> : <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm"><caption className="sr-only">Durable support cases</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Case</th><th scope="col" className="px-4 py-3 font-medium">Reporter</th><th scope="col" className="px-4 py-3 font-medium">Opportunity</th><th scope="col" className="px-4 py-3 font-medium">Reason</th><th scope="col" className="px-4 py-3 font-medium">Created</th><th scope="col" className="px-4 py-3 font-medium">Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border align-top last:border-0 hover:bg-muted/20"><th scope="row" className="max-w-[220px] px-4 py-3 font-mono text-xs font-normal text-foreground"><span className="block truncate">{row.id}</span><span className="mt-1 block text-[11px] text-muted-foreground">{dateLabel(row.updatedAt)}</span></th><td className="max-w-[220px] px-4 py-3 text-xs text-muted-foreground"><span className="block truncate text-foreground">{row.accountEmail ?? 'Email unavailable'}</span><span className="mt-1 block truncate font-mono text-[11px]">{row.accountId}</span></td><td className="max-w-[240px] px-4 py-3 text-xs text-muted-foreground"><span className="block truncate text-foreground">{row.opportunityTitle ?? 'Opportunity unavailable'}</span><span className="mt-1 block truncate font-mono text-[11px]">{row.opportunityId}</span></td><td className="max-w-[300px] px-4 py-3 text-xs"><span className="block capitalize text-foreground">{statusLabel(row.reason)}</span>{row.note && <span className="mt-1 block line-clamp-3 text-muted-foreground">{row.note}</span>}</td><td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">{dateLabel(row.createdAt)}</td><td className="px-4 py-3"><StatusSelect rowId={row.id} status={row.status} saving={savingId === row.id} onChange={changeStatus} /></td></tr>)}</tbody></table>
          </div>
          <div className="divide-y divide-border md:hidden">{rows.map((row) => <article key={row.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-mono text-xs text-foreground">{row.id}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{statusLabel(row.reason)} · {dateLabel(row.createdAt)}</p></div><StatusSelect rowId={row.id} status={row.status} saving={savingId === row.id} onChange={changeStatus} /></div><div className="text-sm"><p className="font-medium text-foreground">{row.opportunityTitle ?? 'Opportunity unavailable'}</p><p className="mt-1 text-xs text-muted-foreground">{row.accountEmail ?? row.accountId}</p></div>{row.note && <p className="border-l-2 border-border pl-3 text-xs leading-5 text-muted-foreground">{row.note}</p>}</article>)}</div>
        </>}
        <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">Showing up to 200 recent rows. Summary counts come from the durable table and may include older cases.</div>
      </div>
    </section>

    <section className="border-t border-border pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight text-foreground">Next support contracts</h2><p className="mt-1 text-sm text-muted-foreground">These remain deliberately out of the queue until their data ownership and audit semantics are explicit.</p></div><MaturityBadge maturity={area.provenance.maturity} /></div><ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{area.data.planned.map((item) => <li key={item} className="border border-border bg-white px-3 py-2">{item}</li>)}</ul></section>
  </div>;
}

function StatusSelect({ rowId, status, saving, onChange }: { rowId: string; status: string; saving: boolean; onChange: (rowId: string, status: PlatformSupportStatus) => void }) {
  return <label className="block"><span className="sr-only">Status for {rowId}</span><select value={status} disabled={saving} onChange={(event) => onChange(rowId, event.target.value as PlatformSupportStatus)} className="h-9 min-w-32 border border-border bg-white px-2 text-xs capitalize text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-wait disabled:opacity-60">{PLATFORM_SUPPORT_STATUSES.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}</select></label>;
}
