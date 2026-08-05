'use client';

import { useState } from 'react';
import { DataAreaHeader, MaturityBadge, MetricCard, WarningList } from '@/components/platform-admin';
import type { AdminArea } from '@/lib/platformAdmin';
import type { PlatformAdminAgentControlsData } from '@/lib/platformAdminFoundations';

const targetTypes = ['agent-run', 'handoff', 'review-job', 'enrichment-job'] as const;
const actions = ['pause', 'resume', 'cancel', 'replay', 'requeue', 'release-stale'] as const;

export default function PlatformAdminAgentControls({ area }: { area: AdminArea<PlatformAdminAgentControlsData> }) {
  const [targetType, setTargetType] = useState<(typeof targetTypes)[number]>('agent-run');
  const [targetId, setTargetId] = useState('');
  const [action, setAction] = useState<(typeof actions)[number]>('requeue');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function requestControl(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setSaving(true);
    try {
      const response = await fetch('/api/admin/agents', { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ targetType, targetId, action, reason }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'Unable to request control');
      setMessage('Control request queued. The Railway worker must acknowledge and apply it.');
      setTargetId('');
      setReason('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to request control');
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-8">
    <DataAreaHeader area={area} title="Agent controls" description="Governed control requests for the durable agent graph. Admin requests are authenticated, idempotent, audited, and emitted to outbox; they never call another agent directly and are not execution evidence until a worker acknowledgement arrives." />
    <WarningList warnings={area.warnings} />
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Agent control summary"><MetricCard label="Requests" value={area.data.summary.requests} detail="Recent control requests" /><MetricCard label="Awaiting worker" value={area.data.summary.requested} detail="Requested, not applied" /><MetricCard label="Applied" value={area.data.summary.applied} detail="Worker-confirmed only" /><MetricCard label="Failed" value={area.data.summary.failed} detail="Rejected or failed" /><MetricCard label="Targets" value={area.data.summary.targets} detail="Distinct graph records" /></section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 border border-border bg-white"><div className="border-b border-border px-4 py-4 sm:px-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight text-foreground">Recent requests</h2><p className="mt-1 text-xs text-muted-foreground">Requested is not applied. Only the receiving worker may transition a request after checking state and policy.</p></div><MaturityBadge maturity={area.provenance.maturity} /></div></div>{area.data.requests.length === 0 ? <p className="px-5 py-12 text-center text-sm text-muted-foreground">No control requests recorded.</p> : <div className="divide-y divide-border">{area.data.requests.map((row) => <article key={row.id} className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium text-foreground">{row.action} · {row.targetType}</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">{row.targetId}</p></div><span className={`text-xs font-medium capitalize ${row.status === 'applied' ? 'text-green-700' : row.status === 'failed' || row.status === 'rejected' ? 'text-red-700' : 'text-amber-700'}`}>{row.status}</span></div>{row.reason && <p className="mt-3 text-xs leading-5 text-muted-foreground">{row.reason}</p>}<p className="mt-2 font-mono text-[11px] text-muted-foreground">{row.createdAt ?? 'Not observed'} · {row.actorAccountId ?? 'system'}</p></article>)}</div>}</div>
      <aside className="border border-border bg-white p-5 xl:sticky xl:top-6 xl:self-start"><h2 className="text-lg font-semibold tracking-tight text-foreground">Request a control</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Use the exact durable target ID from Operations. Replay creates a new worker-owned attempt; it does not overwrite the prior result.</p><form onSubmit={requestControl} className="mt-5 space-y-4"><label className="block"><span className="text-xs font-medium text-foreground">Target type</span><select value={targetType} onChange={(event) => setTargetType(event.target.value as (typeof targetTypes)[number])} className="mt-1 h-10 w-full border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">{targetTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block"><span className="text-xs font-medium text-foreground">Target ID</span><input required value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder="run_… or job_…" className="mt-1 h-10 w-full border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><label className="block"><span className="text-xs font-medium text-foreground">Action</span><select value={action} onChange={(event) => setAction(event.target.value as (typeof actions)[number])} className="mt-1 h-10 w-full border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">{actions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block"><span className="text-xs font-medium text-foreground">Reason</span><textarea maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Why is this safe and necessary?" className="mt-1 w-full resize-y border border-border px-3 py-2 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><button type="submit" disabled={saving || !area.data.available} className="min-h-10 w-full bg-foreground px-4 text-sm font-medium text-white hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Queueing…' : 'Queue control request'}</button>{message && <p role="status" className="text-xs leading-5 text-muted-foreground">{message}</p>}</form></aside>
    </section>
  </div>;
}
