"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronRight, CircleDashed, ExternalLink, Play, Search, ShieldAlert } from "lucide-react";
import { captureProductEvent } from "@/components/analytics-provider";

type Run = {
  id: string;
  sourceId: string;
  trigger: string;
  mode: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  failureCode: string | null;
  snapshotCount: number;
  fieldCount: number;
  published: boolean;
  qualityDecision: string;
  qualityScore: number;
};

type Source = { id: string; name: string; kind: string; adapterId: string; registryTier?: number; trustStatus?: string; trustScore?: number; eligible?: boolean; skipReason?: string; schedule?: { lane: string; cadenceHours: number; openFrom?: string; openUntil?: string } };
type Detail = {
  run: Pick<Run, "id" | "sourceId" | "trigger" | "mode" | "status" | "createdAt">;
  source: { id: string; name: string; kind?: string; adapterId?: string };
  snapshots: Array<{ id: string; url: string; finalUrl: string; fetchedAt: string; statusCode: number; contentType: string | null; rendered: boolean }>;
  fields: Array<{ fieldName: string; rawValue: string | null; normalizedValue: unknown; confidence: number; provenance: { adapterId: string; method: string; sourceUrl: string; snapshotId: string } }>;
  candidateLinks: Array<{ url: string; role: string; label?: string }>;
  warnings: string[];
  quality: { decision: string; score: number; reasons: string[] };
  published: false;
};

const statusStyles: Record<string, string> = {
  completed: "border-green-200 bg-green-50 text-green-700",
  running: "border-blue-200 bg-blue-50 text-blue-700",
  queued: "border-slate-200 bg-slate-50 text-slate-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-amber-200 bg-amber-50 text-amber-700",
};

function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyles[value] ?? "border-border bg-white text-muted-foreground"}`}>{value}</span>;
}

function formatTime(value: string | null): string {
  if (!value) return "not observed";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function IconForStatus({ value }: { value: string }) {
  if (value === "completed") return <CheckCircle2 className="size-4 text-green-700" aria-hidden="true" />;
  if (value === "failed") return <ShieldAlert className="size-4 text-red-700" aria-hidden="true" />;
  if (value === "running") return <CircleDashed className="size-4 animate-pulse text-blue-700" aria-hidden="true" />;
  return <AlertTriangle className="size-4 text-muted-foreground" aria-hidden="true" />;
}

export default function IngestionV2Workbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [runs, setRuns] = useState<Run[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [detail, setDetail] = useState<Detail>();
  const [status, setStatus] = useState("all");
  const [sourceId, setSourceId] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [batchRequesting, setBatchRequesting] = useState(false);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ingestion-v2", { cache: "no-store" });
      const payload = await response.json();
      setSources(payload.sources ?? []);
      if (!response.ok) throw new Error(payload.error ?? "Unable to load v2 runs");
      setRuns(payload.runs ?? []);
      if (payload.warning) setMessage(payload.warning);
      captureProductEvent("ingestion_workbench_viewed", { run_count: payload.runs?.length ?? 0, selected_run: Boolean(searchParams.get("run")), data_maturity: "durable" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load v2 runs");
      captureProductEvent("ingestion_workbench_error", { surface: "run-list", error_code: "load-failed" });
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const selectRun = useCallback(async (run: Run) => {
    setSelectedId(run.id);
    setDetail(undefined);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("run", run.id);
    router.replace(`/admin/ingestion-v2?${nextParams.toString()}`, { scroll: false });
    captureProductEvent("ingestion_run_selected", { source_id: run.sourceId, status: run.status, quality_decision: run.qualityDecision, failure_code: run.failureCode ?? "none" });
    const response = await fetch(`/api/admin/ingestion-v2?run=${encodeURIComponent(run.id)}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to load run evidence");
      return;
    }
    setDetail(payload);
  }, [router, searchParams]);

  async function requestRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequesting(true);
    setMessage("");
    try {
      const selectedSource = sourceId === "all" ? sources[0]?.id : sourceId;
      const response = await fetch("/api/admin/ingestion-v2", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceId: selectedSource }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The shadow run could not be queued");
      setMessage(`Accepted ${payload.runId}. Worker status will appear after the next refresh.`);
      captureProductEvent("ingestion_shadow_run_requested", { source_id: payload.sourceId, mode: payload.mode, request_result: "accepted" });
      await loadRuns();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The shadow run could not be queued");
      captureProductEvent("ingestion_workbench_error", { surface: "shadow-run-request", error_code: "request-failed" });
    } finally {
      setRequesting(false);
    }
  }

  async function requestLaneBatch(lane: "core-daily" | "scheduled" | "single-run") {
    setBatchRequesting(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ingestion-v2", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scope: "lane", lane, limit: 1000 }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The source batch could not be queued");
      setMessage(`Accepted ${payload.batchId}: ${payload.queuedCount} ${lane} sources queued. The worker will continue on each source cadence.`);
      captureProductEvent("ingestion_shadow_batch_requested", { scope: "lane", lane, queued_count: payload.queuedCount, request_result: "accepted" });
      await loadRuns();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The source batch could not be queued");
      captureProductEvent("ingestion_workbench_error", { surface: "shadow-lane-request", error_code: "request-failed" });
    } finally {
      setBatchRequesting(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRuns(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRuns]);

  useEffect(() => {
    const requestedId = searchParams.get("run");
    const requestedRun = requestedId ? runs.find((run) => run.id === requestedId) : undefined;
    if (requestedRun && requestedRun.id !== selectedId) {
      const timer = window.setTimeout(() => void selectRun(requestedRun), 0);
      return () => window.clearTimeout(timer);
    }
  }, [runs, searchParams, selectedId, selectRun]);

  const filteredRuns = useMemo(() => runs.filter((run) => {
    const matchesStatus = status === "all" || run.status === status || (status === "review" && run.qualityDecision === "review");
    const matchesSource = sourceId === "all" || run.sourceId === sourceId;
    const haystack = `${run.id} ${run.sourceId} ${run.status} ${run.failureCode ?? ""}`.toLowerCase();
    return matchesStatus && matchesSource && haystack.includes(query.toLowerCase().trim());
  }), [runs, status, sourceId, query]);

  const counts = useMemo(() => ({ failed: runs.filter((run) => run.status === "failed").length, review: runs.filter((run) => run.qualityDecision === "review").length, completed: runs.filter((run) => run.status === "completed").length }), [runs]);

  return <div className="space-y-6">
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Ingestion v2 state">
      {[{ label: "Failed runs", value: counts.failed, detail: "Needs diagnosis" }, { label: "Review quality", value: counts.review, detail: "Not promotion proof" }, { label: "Completed shadow", value: counts.completed, detail: "Still unpublished" }].map((item) => <div key={item.label} className="border border-border bg-white p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-2 font-mono text-2xl tabular-nums">{item.value}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div>)}
    </section>

    <section className="border border-primary/20 bg-accent-tint/30 p-4" aria-labelledby="ingestion-contract-title">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Shadow boundary</p><h2 id="ingestion-contract-title" className="mt-1 text-sm font-semibold">Fetched → extracted → reviewed → published</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">Nothing here publishes an opportunity or replaces source evidence. Stable sources run automatically; seasonal windows stay dormant until open.</p><p className="mt-2 text-xs text-muted-foreground">{sources.filter((source) => source.eligible !== false).length} eligible · {sources.filter((source) => source.schedule?.lane === "core-daily").length} daily core · {sources.filter((source) => source.schedule?.lane === "scheduled").length} scheduled · {sources.filter((source) => source.schedule?.lane === "single-run").length} single-run · {sources.filter((source) => source.eligible === false).length} held</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => void requestLaneBatch("core-daily")} disabled={batchRequesting || sources.length === 0} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-primary bg-white px-3 text-xs font-medium text-primary hover:bg-accent-tint disabled:cursor-wait disabled:opacity-60"><Play className="size-3.5" aria-hidden="true" />Daily core</button><button type="button" onClick={() => void requestLaneBatch("scheduled")} disabled={batchRequesting || sources.length === 0} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-white px-3 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-wait disabled:opacity-60">Scheduled</button><form onSubmit={requestRun} className="flex flex-wrap items-center gap-2"><label htmlFor="shadow-source" className="sr-only">Source for shadow pass</label><select id="shadow-source" value={sourceId === "all" ? sources.find((source) => source.eligible !== false)?.id ?? "" : sourceId} onChange={(event) => setSourceId(event.target.value)} className="min-h-9 max-w-[230px] rounded-md border border-border bg-white px-2 text-xs text-foreground"><option value="">No source available</option>{sources.filter((source) => source.eligible !== false).map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select><button type="submit" disabled={requesting || sources.length === 0} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-medium text-white hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"><Play className="size-3.5" aria-hidden="true" />Run one</button></form></div></div>
      {message && <p className="mt-3 text-xs text-muted-foreground" role="status" aria-live="polite">{message}</p>}
    </section>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]" aria-label="Ingestion v2 runs">
      <div className="min-w-0 border border-border bg-white">
        <div className="border-b border-border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight">Run queue</h2><p className="mt-1 text-xs text-muted-foreground">Newest durable runs first · {filteredRuns.length} shown</p></div><button type="button" onClick={() => { captureProductEvent("ingestion_run_filtered", { filter_name: "refresh", filter_value: "manual" }); void loadRuns(); }} className="min-h-8 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted">Refresh</button></div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><label className="relative block"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" aria-hidden="true" /><span className="sr-only">Search runs</span><input value={query} onChange={(event) => { setQuery(event.target.value); captureProductEvent("ingestion_run_filtered", { filter_name: "query", filter_value: event.target.value ? "present" : "empty" }); }} placeholder="Search run, source, failure code" className="min-h-9 w-full rounded-md border border-border pl-8 pr-3 text-xs outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20" /></label><select aria-label="Filter status" value={status} onChange={(event) => { setStatus(event.target.value); captureProductEvent("ingestion_run_filtered", { filter_name: "status", filter_value: event.target.value }); }} className="min-h-9 rounded-md border border-border bg-white px-2 text-xs"><option value="all">All statuses</option><option value="queued">Queued</option><option value="running">Running</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="review">Review quality</option></select><select aria-label="Filter source" value={sourceId} onChange={(event) => { setSourceId(event.target.value); captureProductEvent("ingestion_run_filtered", { filter_name: "source", filter_value: event.target.value }); }} className="min-h-9 rounded-md border border-border bg-white px-2 text-xs"><option value="all">All sources</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></div></div>
        {loading ? <p className="p-8 text-center text-sm text-muted-foreground">Loading durable run history…</p> : filteredRuns.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No runs match this view. Empty is not the same as healthy.</p> : <div className="divide-y divide-border">{filteredRuns.map((run) => <button type="button" key={run.id} onClick={() => void selectRun(run)} className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${selectedId === run.id ? "bg-accent-tint/40" : ""}`} aria-pressed={selectedId === run.id}><IconForStatus value={run.status} /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-foreground">{run.id}</span><StatusBadge value={run.status} /><span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">quality {run.qualityDecision}</span></span><span className="mt-2 block truncate text-sm font-medium text-foreground">{sources.find((source) => source.id === run.sourceId)?.name ?? run.sourceId}</span><span className="mt-1 block text-xs text-muted-foreground">{run.failureCode ?? "No failure"} · {run.snapshotCount} snapshots · {run.fieldCount} fields · {formatTime(run.createdAt)}</span></span><ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></button>)}</div>}
      </div>

      <aside className="min-w-0 border border-border bg-white" aria-label="Selected run evidence">{!selectedId ? <div className="flex min-h-[360px] items-center justify-center p-8 text-center"><div><CircleDashed className="mx-auto size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">Select a run to inspect</p><p className="mt-1 text-xs leading-5 text-muted-foreground">The inspector will show bounded source evidence, field provenance, destinations, and warnings.</p></div></div> : !detail ? <p className="p-8 text-center text-sm text-muted-foreground">Loading evidence…</p> : <div><div className="border-b border-border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[11px] text-muted-foreground">{detail.run.id}</p><h2 className="mt-1 text-lg font-semibold">{detail.source.name}</h2></div><StatusBadge value={detail.run.status} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-muted-foreground">Adapter</dt><dd className="mt-1 font-mono">{detail.source.adapterId ?? "not observed"}</dd></div><div><dt className="text-muted-foreground">Mode</dt><dd className="mt-1">{detail.run.mode} · unpublished</dd></div><div><dt className="text-muted-foreground">Started</dt><dd className="mt-1">{formatTime(detail.run.createdAt)}</dd></div><div><dt className="text-muted-foreground">Quality</dt><dd className="mt-1">{detail.quality.decision} · {detail.quality.score}</dd></div></dl></div><div className="divide-y divide-border"><section className="p-4"><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Why</h3><ul className="mt-3 space-y-2 text-xs leading-5">{detail.quality.reasons.length ? detail.quality.reasons.map((reason) => <li key={reason} className="border-l-2 border-primary/40 pl-3">{reason}</li>) : <li className="text-muted-foreground">No quality reasons recorded.</li>}</ul></section><section className="p-4"><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Snapshots · {detail.snapshots.length}</h3><div className="mt-3 space-y-2">{detail.snapshots.map((snapshot) => <a key={snapshot.id} href={snapshot.finalUrl || snapshot.url} target="_blank" rel="noreferrer" onClick={() => captureProductEvent("ingestion_run_evidence_viewed", { section: "snapshots", source_id: detail.run.sourceId, run_status: detail.run.status })} className="block rounded-md border border-border p-3 hover:bg-muted/30"><span className="flex items-center justify-between gap-2 text-xs font-medium"><span>{snapshot.statusCode} · {snapshot.rendered ? "rendered" : "fetched"}</span><ExternalLink className="size-3.5" aria-hidden="true" /></span><span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">{snapshot.finalUrl || snapshot.url}</span></a>)}</div></section><section className="p-4"><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Extraction · {detail.fields.length} fields</h3><div className="mt-3 divide-y divide-border border border-border">{detail.fields.slice(0, 12).map((field) => <div key={`${field.provenance.snapshotId}:${field.fieldName}`} className="p-3"><div className="flex justify-between gap-3 text-xs"><span className="font-medium">{field.fieldName}</span><span className="font-mono text-muted-foreground">{Math.round(field.confidence * 100)}%</span></div><p className="mt-1 break-words text-xs text-muted-foreground">{field.rawValue ?? "unknown"}</p><p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{field.provenance.method} · {field.provenance.snapshotId}</p></div>)}</div></section><section className="p-4"><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Destinations · {detail.candidateLinks.length}</h3><ul className="mt-3 space-y-2 text-xs">{detail.candidateLinks.map((link) => <li key={`${link.role}:${link.url}`}><a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-accent-deep underline underline-offset-2"><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] no-underline">{link.role}</span><span className="truncate">{link.label ?? link.url}</span></a></li>)}</ul>{detail.candidateLinks.length === 0 && <p className="text-xs text-muted-foreground">No destination candidates observed.</p>}</section><section className="p-4"><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Warnings</h3>{detail.warnings.length ? <ul className="mt-3 space-y-2 text-xs leading-5 text-amber-700">{detail.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul> : <p className="mt-3 text-xs text-muted-foreground">No warnings recorded.</p>}</section></div></div>}</aside>
    </section>
  </div>;
}
