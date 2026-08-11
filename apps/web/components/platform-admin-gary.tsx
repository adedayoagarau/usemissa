"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GaryDashboardData, GaryQueueAction, GaryReviewRow } from "@missa/radar-adapters";
import { DataAreaHeader, MetricCard, WarningList } from "@/components/platform-admin";
import type { AdminArea } from "@/lib/platformAdmin";

const statusClass: Record<string, string> = {
  published: "border-green-200 bg-green-50 text-green-700",
  recommended: "border-blue-200 bg-blue-50 text-blue-700",
  queued: "border-slate-200 bg-slate-50 text-slate-700",
  processing: "border-blue-200 bg-blue-50 text-blue-700",
  needs_human: "border-amber-200 bg-amber-50 text-amber-800",
  failed: "border-red-200 bg-red-50 text-red-700",
  held: "border-violet-200 bg-violet-50 text-violet-700",
  rejected: "border-slate-200 bg-slate-50 text-slate-600",
};

function time(value?: string): string {
  if (!value) return "Not observed";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function State({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${ok ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
    <span className={`size-2 rounded-full ${ok ? "bg-green-600" : "bg-amber-500"}`} aria-hidden="true" />{label}
  </span>;
}

function ReviewActions({ row }: { row: GaryReviewRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState<GaryQueueAction>();
  const [message, setMessage] = useState<string>();
  async function act(action: GaryQueueAction) {
    setBusy(action); setMessage(undefined);
    try {
      const response = await fetch("/api/admin/gary", {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ jobId: row.id, action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Gary could not apply that action");
      setMessage(action === "publish" ? "Publish requested" : `${action[0].toUpperCase()}${action.slice(1)} requested`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally { setBusy(undefined); }
  }
  const button = "min-h-9 rounded-md border border-border bg-white px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50";
  return <div>
    <div className="flex flex-wrap gap-2">
      {row.status !== "published" && <button className={button} disabled={Boolean(busy)} onClick={() => void act("publish")}>Publish</button>}
      {(row.status === "failed" || row.status === "held" || row.status === "needs_human") && <button className={button} disabled={Boolean(busy)} onClick={() => void act("retry")}>Review again</button>}
      {!['held', 'published', 'rejected'].includes(row.status) && <button className={button} disabled={Boolean(busy)} onClick={() => void act("hold")}>Hold</button>}
      {!['published', 'rejected'].includes(row.status) && <button className={button} disabled={Boolean(busy)} onClick={() => void act("reject")}>Reject</button>}
    </div>
    {message && <p role="status" className="mt-2 text-xs text-muted-foreground">{message}</p>}
  </div>;
}

export default function PlatformAdminGary({ area }: { area: AdminArea<GaryDashboardData> }) {
  const [filter, setFilter] = useState("attention");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => area.data.rows.filter((row) => {
    const attention = ['needs_human', 'failed', 'held'].includes(row.status);
    const matchesFilter = filter === 'all' || (filter === 'attention' ? attention : row.status === filter);
    const haystack = `${row.title} ${row.organizer} ${row.status}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [area.data.rows, filter, query]);
  const selectClass = "min-h-10 rounded-md border border-border bg-white px-3 text-sm text-foreground";
  return <div className="space-y-8">
    <DataAreaHeader area={area} title="Gary control room" description="Track discovery, morning AI review, publication, source freshness, Railway worker health, and email delivery without using the command line." />
    <WarningList warnings={area.warnings} />

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" aria-label="Gary summary">
      <MetricCard label="Waiting" value={area.data.summary.queued} detail="Ready for morning review" />
      <MetricCard label="Reviewing" value={area.data.summary.processing} detail="Leased by reviewer" />
      <MetricCard label="Published" value={area.data.summary.published} detail="Passed publication policy" />
      <MetricCard label="Needs you" value={area.data.summary.needsHuman} detail="Ambiguous or incomplete" />
      <MetricCard label="Failed" value={area.data.summary.failed} detail="Will retry automatically" />
      <MetricCard label="AI cost today" value={`$${area.data.summary.estimatedCostUsd.toFixed(4)}`} detail={area.data.readiness.model} />
    </section>

    <section className="rounded-xl border border-border bg-white p-5" aria-labelledby="gary-readiness">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 id="gary-readiness" className="text-lg font-semibold">Production readiness</h2><p className="mt-1 text-sm text-muted-foreground">Green means the durable heartbeat or delivery evidence is current.</p></div>
        <div className="flex flex-wrap gap-2"><State ok={area.data.readiness.crawler} label="Crawler" /><State ok={area.data.readiness.reviewer} label="AI reviewer" /><State ok={area.data.readiness.email} label="Email digest" /></div>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
        <div><dt className="text-muted-foreground">Morning run</dt><dd className="mt-1 font-medium">{area.data.readiness.reviewHour}:00 · {area.data.readiness.timezone}</dd></div>
        <div><dt className="text-muted-foreground">Auto-publish confidence</dt><dd className="mt-1 font-medium">{Math.round(area.data.readiness.publishThreshold * 100)}% or higher</dd></div>
        <div><dt className="text-muted-foreground">Latest email</dt><dd className="mt-1 font-medium">{area.data.latestDigest ? `${area.data.latestDigest.status} · ${area.data.latestDigest.date}` : 'Not sent yet'}</dd></div>
      </dl>
    </section>

    <section className="space-y-4" aria-labelledby="gary-review-queue">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="gary-review-queue" className="text-xl font-semibold">Morning review queue</h2><p className="mt-1 text-sm text-muted-foreground">Gary publishes high-confidence calls automatically. Use these controls only for exceptions.</p></div>
        <div className="flex flex-wrap gap-2">
          <input className={`${selectClass} min-w-56`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or journal" aria-label="Search Gary review queue" />
          <select className={selectClass} value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter Gary review queue">
            <option value="attention">Needs attention</option><option value="queued">Waiting</option><option value="published">Published</option><option value="failed">Failed</option><option value="all">All</option>
          </select>
        </div>
      </div>
      {rows.length === 0 ? <div className="rounded-xl border border-dashed border-border p-8 text-center"><p className="font-medium">Nothing in this view</p><p className="mt-1 text-sm text-muted-foreground">Gary has no matching exceptions right now.</p></div> :
        <div className="space-y-3">{rows.map((row) => <article key={row.id} className="rounded-xl border border-border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{row.organizer}</p><h3 className="mt-1 text-lg font-semibold text-foreground">{row.title}</h3><p className="mt-1 text-xs text-muted-foreground">Deadline {row.deadline ?? 'unknown'} · host {row.hostStatus ?? 'not checked'} · {row.attempts} attempt{row.attempts === 1 ? '' : 's'}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass[row.status] ?? statusClass.queued}`}>{row.status.replaceAll('_', ' ')}</span></div>
          {row.reasons.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{row.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
          {row.lastError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{row.lastError}</p>}
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div className="flex gap-3 text-xs"><a className="font-medium text-primary underline-offset-4 hover:underline" href={row.sourceUrl} target="_blank" rel="noreferrer">PW evidence</a>{row.officialUrl && <a className="font-medium text-primary underline-offset-4 hover:underline" href={row.officialUrl} target="_blank" rel="noreferrer">Host page</a>}</div><ReviewActions row={row} /></div>
        </article>)}</div>}
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-white p-5"><h2 className="text-lg font-semibold">Railway workers</h2><div className="mt-4 space-y-3">{area.data.heartbeats.length === 0 ? <p className="text-sm text-muted-foreground">No worker heartbeat has arrived.</p> : area.data.heartbeats.map((worker) => <div key={worker.workerKind} className="flex items-start justify-between gap-3 border-t border-border pt-3 first:border-0 first:pt-0"><div><p className="text-sm font-medium capitalize">{worker.workerKind}</p><p className="mt-1 text-xs text-muted-foreground">Last heartbeat {time(worker.heartbeatAt)}</p>{worker.lastError && <p className="mt-1 text-xs text-red-700">{worker.lastError}</p>}</div><State ok={!worker.stale && worker.status !== 'failed'} label={worker.stale ? 'Stale' : worker.status} /></div>)}</div></div>
      <div className="rounded-xl border border-border bg-white p-5"><h2 className="text-lg font-semibold">Source freshness</h2><div className="mt-4 space-y-3">{area.data.sources.map((source) => <div key={source.id} className="border-t border-border pt-3 first:border-0 first:pt-0"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{source.name}</p><p className="mt-1 text-xs text-muted-foreground">Last success {time(source.lastSuccessfulAt)} · every {source.freshnessHours}h</p></div><span className="text-xs font-medium capitalize">{source.backfillStatus}</span></div>{source.lastError && <p className="mt-2 text-xs text-red-700">{source.lastError}</p>}</div>)}</div></div>
    </section>

    <section className="rounded-xl border border-border bg-white p-5" aria-labelledby="gary-retention"><h2 id="gary-retention" className="text-lg font-semibold">Evidence retention</h2><p className="mt-1 text-sm text-muted-foreground">Recommended policy. Cleanup remains disabled until a dry-run report is reviewed.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="py-3 pr-4 font-medium">Data</th><th className="px-4 py-3 font-medium">Keep</th><th className="pl-4 py-3 font-medium">Cleanup rule</th></tr></thead><tbody>{area.data.retention.map((item) => <tr key={item.data} className="border-b border-border last:border-0"><th className="py-3 pr-4 font-medium">{item.data}</th><td className="px-4 py-3 text-muted-foreground">{item.retainFor}</td><td className="pl-4 py-3 text-muted-foreground">{item.cleanup}</td></tr>)}</tbody></table></div></section>
  </div>;
}
