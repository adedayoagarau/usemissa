"use client";

import { useMemo, useState } from "react";
import {
  DataAreaHeader,
  MaturityBadge,
  MetricCard,
  SectionHeading,
  WarningList,
} from "@/components/platform-admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AdminArea } from "@/lib/platformAdmin";
import type { PlatformAdminSupportData } from "@/lib/platformAdminSupport";

const PLATFORM_SUPPORT_STATUSES = [
  "open",
  "in-progress",
  "resolved",
  "dismissed",
] as const;
type PlatformSupportStatus = (typeof PLATFORM_SUPPORT_STATUSES)[number];

const PUBLIC_FIELD_LABELS: Record<string, string> = {
  deadline_date: "Deadline date",
  status: "Opportunity status",
  fee_status: "Fee status",
  fee_cents: "Fee amount",
  guidelines_url: "Guidelines URL",
  submission_url: "Submission URL",
  location: "Location",
  title: "Title",
};

function statusLabel(status: string): string {
  return status.replaceAll("-", " ");
}

function dateLabel(value?: string): string {
  if (!value) return "Not observed";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export default function PlatformAdminSupport({
  area,
}: {
  area: AdminArea<PlatformAdminSupportData>;
}) {
  const [rows, setRows] = useState(area.data.rows);
  const [summary, setSummary] = useState(area.data.summary);
  const [savingId, setSavingId] = useState<string>();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pendingChange, setPendingChange] = useState<{ caseId: string; status: PlatformSupportStatus }>();
  const [resolutionById, setResolutionById] = useState<Record<string, { correction: string; evidenceUrl: string; field: string; value: string }>>({});
  const [statusFilter, setStatusFilter] = useState<
    PlatformSupportStatus | "all"
  >("all");

  const filteredRows = useMemo(
    () =>
      statusFilter === "all"
        ? rows
        : rows.filter((row) => row.status === statusFilter),
    [rows, statusFilter],
  );

  function requestStatusChange(caseId: string, status: PlatformSupportStatus) {
    const row = rows.find((item) => item.id === caseId);
    if (!row || row.status === status) return;
    setPendingChange({ caseId, status });
  }

  async function changeStatus(caseId: string, status: PlatformSupportStatus) {
    const row = rows.find((item) => item.id === caseId);
    if (!row || row.status === status) return;
    setSavingId(caseId);
    setError(undefined);
    setMessage(undefined);
    const resolution = resolutionById[caseId];
    try {
      const response = await fetch("/api/admin/support", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ caseId, status, ...(resolution?.correction.trim() ? { correction: resolution.correction.trim() } : {}), ...(resolution?.evidenceUrl.trim() ? { evidenceUrl: resolution.evidenceUrl.trim() } : {}), ...(resolution?.field ? { correctedField: resolution.field, correctedValue: resolution.value } : {}) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "The support case could not be updated.",
        );
      setRows((current) =>
        current.map((item) =>
          item.id === caseId ? { ...item, status } : item,
        ),
      );
      setSummary((current) => {
        const next = { ...current.byStatus };
        next[row.status] = Math.max(0, (next[row.status] ?? 0) - 1);
        next[status] = (next[status] ?? 0) + 1;
        return { ...current, byStatus: next };
      });
      setMessage(
        resolution?.field
          ? "Support update accepted. Verify the current public record and outbox processing before treating the correction as externally confirmed."
          : "Support status update accepted and audited. This does not confirm any external provider action.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The support case could not be updated.",
      );
    } finally {
      setSavingId(undefined);
    }
  }

  const pendingRow = pendingChange
    ? rows.find((row) => row.id === pendingChange.caseId)
    : undefined;
  const pendingResolution = pendingChange
    ? resolutionById[pendingChange.caseId]
    : undefined;
  const pendingMissingEvidence = Boolean(
    pendingChange &&
      ((pendingChange.status === "resolved" &&
        (!pendingResolution?.correction.trim() ||
          !pendingResolution.evidenceUrl.trim())) ||
        (pendingResolution?.field &&
          (!pendingResolution.value.trim() ||
            !pendingResolution.correction.trim() ||
            !pendingResolution.evidenceUrl.trim()))),
  );

  return (
    <div className="space-y-8">
      <DataAreaHeader
        area={area}
        title="Support cases"
        description="A durable queue for user-reported opportunity issues. Operators can move a case through its lifecycle; every status change is audited and emits a worker-readable outbox event."
      />
      <WarningList warnings={area.warnings} />
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive-subtle px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {message && (
        <p role="status" className="rounded-lg border border-information/30 bg-information-subtle px-4 py-3 text-sm text-information">
          {message}
        </p>
      )}
      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Support summary"
      >
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`text-left ${statusFilter === "all" ? "rounded-xl ring-2 ring-primary/30" : ""}`}
        >
          <MetricCard
            label="All cases"
            value={summary.total}
            detail="Durable issue reports"
          />
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("open")}
          className={`text-left ${statusFilter === "open" ? "rounded-xl ring-2 ring-primary/30" : ""}`}
        >
          <MetricCard
            label="Open"
            value={summary.byStatus.open ?? 0}
            detail="Waiting for triage"
          />
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("in-progress")}
          className={`text-left ${statusFilter === "in-progress" ? "rounded-xl ring-2 ring-primary/30" : ""}`}
        >
          <MetricCard
            label="In progress"
            value={summary.byStatus["in-progress"] ?? 0}
            detail="Owned by an operator"
          />
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("resolved")}
          className={`text-left ${statusFilter === "resolved" ? "rounded-xl ring-2 ring-primary/30" : ""}`}
        >
          <MetricCard
            label="Resolved"
            value={summary.byStatus.resolved ?? 0}
            detail="Closed with a resolution"
          />
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("dismissed")}
          className={`text-left ${statusFilter === "dismissed" ? "rounded-xl ring-2 ring-primary/30" : ""}`}
        >
          <MetricCard
            label="Dismissed"
            value={summary.byStatus.dismissed ?? 0}
            detail="Not actionable"
          />
        </button>
      </section>

      <section aria-labelledby="support-case-list-title">
        <SectionHeading
          eyebrow="Queue"
          title="Reported issues"
          description="Account and opportunity references are shown for authorized platform operators. Email bodies, provider tokens, and unrelated private content are not included."
        />
        <div className="mt-4 border border-border bg-card">
          <h2 id="support-case-list-title" className="sr-only">
            Reported opportunity issues
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 text-xs text-muted-foreground">
            <span>
              {filteredRows.length} case{filteredRows.length === 1 ? "" : "s"}{" "}
              shown
              {statusFilter !== "all" ? ` · ${statusLabel(statusFilter)}` : ""}
            </span>
            {statusFilter !== "all" && (
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="font-medium text-accent-deep underline underline-offset-4"
              >
                Show all cases
              </button>
            )}
          </div>
          {filteredRows.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm font-medium text-foreground">
                {rows.length === 0
                  ? area.data.availability === "unavailable"
                    ? "Support queue unavailable"
                    : "No support cases yet"
                  : "No cases in this status"}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {rows.length === 0
                  ? area.data.availability === "unavailable"
                    ? "Connect the database-backed issue-report tables before treating this as an empty queue."
                    : "User-reported opportunity issues will appear here when submitted."
                  : "Choose another status lens to continue triage."}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <caption className="sr-only">Durable support cases</caption>
                  <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Case
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Reporter
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Opportunity
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Reason
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Created
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border align-top last:border-0 hover:bg-muted/20"
                      >
                        <th
                          scope="row"
                          className="max-w-[220px] px-4 py-3 font-mono text-xs font-normal text-foreground"
                        >
                          <span className="block truncate">{row.id}</span>
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            {dateLabel(row.updatedAt)}
                          </span>
                        </th>
                        <td className="max-w-[220px] px-4 py-3 text-xs text-muted-foreground">
                          <span className="block truncate text-foreground">
                            {row.accountEmail ?? "Email unavailable"}
                          </span>
                          <span className="mt-1 block truncate font-mono text-[11px]">
                            {row.accountId}
                          </span>
                        </td>
                        <td className="max-w-[240px] px-4 py-3 text-xs text-muted-foreground">
                          <span className="block truncate text-foreground">
                            {row.opportunityTitle ?? "Opportunity unavailable"}
                          </span>
                          <span className="mt-1 block truncate font-mono text-[11px]">
                            {row.opportunityId}
                          </span>
                        </td>
                        <td className="max-w-[300px] px-4 py-3 text-xs">
                          <span className="block text-foreground capitalize">
                            {statusLabel(row.reason)}
                          </span>
                          {row.note && (
                            <span className="mt-1 line-clamp-3 block text-muted-foreground">
                              {row.note}
                            </span>
                          )}
                          {row.status !== "resolved" ? <div className="mt-3 grid gap-2">
                            <label className="text-[11px] text-muted-foreground">Verified correction
                              <textarea className="mt-1 block w-full border border-border px-2 py-1 text-xs" value={resolutionById[row.id]?.correction ?? ""} onChange={(event) => setResolutionById((current) => ({ ...current, [row.id]: { correction: event.target.value, evidenceUrl: current[row.id]?.evidenceUrl ?? "", field: current[row.id]?.field ?? "", value: current[row.id]?.value ?? "" } }))} placeholder="What should the public record say?" />
                            </label>
                            <label className="text-[11px] text-muted-foreground">Apply to public field
                              <select className="mt-1 block w-full border border-border px-2 py-1 text-xs" value={resolutionById[row.id]?.field ?? ""} onChange={(event) => setResolutionById((current) => ({ ...current, [row.id]: { correction: current[row.id]?.correction ?? "", evidenceUrl: current[row.id]?.evidenceUrl ?? "", field: event.target.value, value: current[row.id]?.value ?? "" } }))}><option value="">Record only</option><option value="deadline_date">Deadline date</option><option value="status">Status</option><option value="fee_status">Fee status</option><option value="fee_cents">Fee amount (cents)</option><option value="guidelines_url">Guidelines URL</option><option value="submission_url">Submission URL</option><option value="location">Location</option><option value="title">Title</option></select>
                            </label>
                            {resolutionById[row.id]?.field ? <label className="text-[11px] text-muted-foreground">Corrected value<input className="mt-1 block w-full border border-border px-2 py-1 text-xs" value={resolutionById[row.id]?.value ?? ""} onChange={(event) => setResolutionById((current) => ({ ...current, [row.id]: { correction: current[row.id]?.correction ?? "", evidenceUrl: current[row.id]?.evidenceUrl ?? "", field: current[row.id]?.field ?? "", value: event.target.value } }))} /></label> : null}
                            <label className="text-[11px] text-muted-foreground">Official source URL
                              <input className="mt-1 block w-full border border-border px-2 py-1 text-xs" type="url" value={resolutionById[row.id]?.evidenceUrl ?? ""} onChange={(event) => setResolutionById((current) => ({ ...current, [row.id]: { correction: current[row.id]?.correction ?? "", evidenceUrl: event.target.value, field: current[row.id]?.field ?? "", value: current[row.id]?.value ?? "" } }))} placeholder="https://official-source.example" />
                            </label>
                          </div> : null}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                          {dateLabel(row.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusSelect
                            rowId={row.id}
                            status={row.status}
                            saving={savingId === row.id}
                            onChange={requestStatusChange}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-border md:hidden">
                {filteredRows.map((row) => (
                  <article key={row.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-foreground">
                          {row.id}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground capitalize">
                          {statusLabel(row.reason)} · {dateLabel(row.createdAt)}
                        </p>
                      </div>
                      <StatusSelect
                        rowId={row.id}
                        status={row.status}
                        saving={savingId === row.id}
                        onChange={requestStatusChange}
                      />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-foreground">
                        {row.opportunityTitle ?? "Opportunity unavailable"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.accountEmail ?? row.accountId}
                      </p>
                    </div>
                    {row.note && (
                      <p className="border border-border p-3 text-xs leading-5 text-muted-foreground">
                        {row.note}
                      </p>
                    )}
                    {row.status !== "resolved" ? <div className="grid gap-2">
                      <label className="text-xs text-muted-foreground">Verified correction<textarea className="mt-1 block w-full border border-border px-2 py-1 text-xs" value={resolutionById[row.id]?.correction ?? ""} onChange={(event) => setResolutionById((current) => ({ ...current, [row.id]: { correction: event.target.value, evidenceUrl: current[row.id]?.evidenceUrl ?? "", field: current[row.id]?.field ?? "", value: current[row.id]?.value ?? "" } }))} /></label>
                      <label className="text-xs text-muted-foreground">Official source URL<input className="mt-1 block w-full border border-border px-2 py-1 text-xs" type="url" value={resolutionById[row.id]?.evidenceUrl ?? ""} onChange={(event) => setResolutionById((current) => ({ ...current, [row.id]: { correction: current[row.id]?.correction ?? "", evidenceUrl: event.target.value, field: current[row.id]?.field ?? "", value: current[row.id]?.value ?? "" } }))} /></label>
                      <label className="text-xs text-muted-foreground">Apply to public field<select className="mt-1 block w-full border border-border px-2 py-1 text-xs" value={resolutionById[row.id]?.field ?? ""} onChange={(event) => setResolutionById((current) => ({ ...current, [row.id]: { correction: current[row.id]?.correction ?? "", evidenceUrl: current[row.id]?.evidenceUrl ?? "", field: event.target.value, value: current[row.id]?.value ?? "" } }))}><option value="">Record only</option><option value="deadline_date">Deadline date</option><option value="status">Status</option><option value="fee_status">Fee status</option><option value="fee_cents">Fee amount (cents)</option><option value="guidelines_url">Guidelines URL</option><option value="submission_url">Submission URL</option><option value="location">Location</option><option value="title">Title</option></select></label>
                      {resolutionById[row.id]?.field ? <label className="text-xs text-muted-foreground">Corrected value<input className="mt-1 block w-full border border-border px-2 py-1 text-xs" value={resolutionById[row.id]?.value ?? ""} onChange={(event) => setResolutionById((current) => ({ ...current, [row.id]: { correction: current[row.id]?.correction ?? "", evidenceUrl: current[row.id]?.evidenceUrl ?? "", field: current[row.id]?.field ?? "", value: event.target.value } }))} /></label> : null}
                    </div> : null}
                  </article>
                ))}
              </div>
            </>
          )}
          <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
            Showing up to 200 recent rows. Summary counts come from the durable
            table and may include older cases.
          </div>
        </div>
      </section>

      <AlertDialog open={Boolean(pendingRow)} onOpenChange={(open) => { if (!open) setPendingChange(undefined); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingResolution?.field
                ? `Update ${PUBLIC_FIELD_LABELS[pendingResolution.field] ?? pendingResolution.field} for “${pendingRow?.opportunityTitle ?? pendingRow?.opportunityId}”?`
                : `Change support case ${pendingRow?.id} to ${pendingChange ? statusLabel(pendingChange.status) : "the selected status"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingResolution?.field
                ? "This changes the named public opportunity field, records the correction and official source, updates the support case, and emits a worker-readable outbox event. Review every value before continuing."
                : "This changes the durable support status and emits a worker-readable outbox event. It does not prove an external correction or provider action occurred."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRow && pendingChange && (
            <dl className="grid gap-2 border border-border bg-muted/30 p-3 text-xs">
              <div><dt className="font-medium text-muted-foreground">Case</dt><dd className="mt-0.5 break-words text-foreground">{pendingRow.id}</dd></div>
              <div><dt className="font-medium text-muted-foreground">Opportunity</dt><dd className="mt-0.5 text-foreground">{pendingRow.opportunityTitle ?? pendingRow.opportunityId}</dd></div>
              <div><dt className="font-medium text-muted-foreground">Status change</dt><dd className="mt-0.5 text-foreground capitalize">{statusLabel(pendingRow.status)} → {statusLabel(pendingChange.status)}</dd></div>
              {pendingResolution?.field && <><div><dt className="font-medium text-muted-foreground">Public field</dt><dd className="mt-0.5 text-foreground">{PUBLIC_FIELD_LABELS[pendingResolution.field] ?? pendingResolution.field}</dd></div><div><dt className="font-medium text-muted-foreground">New value</dt><dd className="mt-0.5 break-words text-foreground">{pendingResolution.value || "No value entered"}</dd></div><div><dt className="font-medium text-muted-foreground">Correction detail</dt><dd className="mt-0.5 break-words text-foreground">{pendingResolution.correction || "No correction detail entered"}</dd></div><div><dt className="font-medium text-muted-foreground">Official source</dt><dd className="mt-0.5 break-all text-foreground">{pendingResolution.evidenceUrl || "No official source entered"}</dd></div></>}
            </dl>
          )}
          {pendingMissingEvidence && (
            <p role="alert" className="border border-warning/30 bg-warning-subtle p-3 text-xs leading-5 text-warning">
              Add the correction detail and official source before resolving a case. A public-field change also requires its new value.
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current state</AlertDialogCancel>
            <AlertDialogAction disabled={pendingMissingEvidence} variant={pendingChange?.status === "dismissed" ? "destructive" : "default"} onClick={() => { if (!pendingChange) return; const change = pendingChange; setPendingChange(undefined); void changeStatus(change.caseId, change.status); }}>
              {pendingResolution?.field ? "Apply public-field change" : "Confirm status change"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Next support contracts
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These remain deliberately out of the queue until their data
              ownership and audit semantics are explicit.
            </p>
          </div>
          <MaturityBadge maturity={area.provenance.maturity} />
        </div>
        <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {area.data.planned.map((item) => (
            <li key={item} className="border border-border bg-card px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatusSelect({
  rowId,
  status,
  saving,
  onChange,
}: {
  rowId: string;
  status: string;
  saving: boolean;
  onChange: (rowId: string, status: PlatformSupportStatus) => void;
}) {
  return (
    <label className="block">
      <span className="sr-only">Status for {rowId}</span>
      <select
        value={status}
        disabled={saving}
        onChange={(event) =>
          onChange(rowId, event.target.value as PlatformSupportStatus)
        }
        className="h-9 min-w-32 border border-border bg-card px-2 text-xs text-foreground capitalize outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-wait disabled:opacity-60"
      >
        {PLATFORM_SUPPORT_STATUSES.map((option) => (
          <option key={option} value={option}>
            {statusLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
