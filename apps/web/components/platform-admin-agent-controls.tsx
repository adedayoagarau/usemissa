"use client";

import { useState } from "react";
import {
  DataAreaHeader,
  MaturityBadge,
  MetricCard,
  WarningList,
} from "@/components/platform-admin";
import type { AdminArea } from "@/lib/platformAdmin";
import type { PlatformAdminAgentControlsData } from "@/lib/platformAdminFoundations";
import { captureProductEvent } from "@/components/analytics-provider";

const targetTypes = [
  "agent-run",
  "handoff",
  "review-job",
  "enrichment-job",
] as const;
const actions = [
  "pause",
  "resume",
  "cancel",
  "replay",
  "requeue",
  "release-stale",
] as const;

export default function PlatformAdminAgentControls({
  area,
}: {
  area: AdminArea<PlatformAdminAgentControlsData>;
}) {
  const [targetType, setTargetType] =
    useState<(typeof targetTypes)[number]>("agent-run");
  const [targetId, setTargetId] = useState("");
  const [action, setAction] = useState<(typeof actions)[number]>("requeue");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function requestControl(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/agents", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ targetType, targetId, action, reason }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error ?? "Unable to request control");
      setMessage(
        "Control request queued. The Railway worker must acknowledge and apply it.",
      );
      captureProductEvent("admin_agent_control_requested", {
        targetType,
        action,
      });
      setTargetId("");
      setReason("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to request control",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <DataAreaHeader
        area={area}
        title="Agent controls"
        description="Governed control requests for the durable agent graph. Admin requests are authenticated, idempotent, audited, and emitted to outbox; they never call another agent directly and are not execution evidence until a worker acknowledgement arrives."
      />
      <WarningList warnings={area.warnings} />
      <section
        className="overflow-hidden rounded-xl border border-border bg-white"
        aria-labelledby="agent-control-contract"
      >
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Control contract
          </p>
          <h2
            id="agent-control-contract"
            className="mt-1 text-lg font-semibold tracking-tight text-foreground"
          >
            Request → acknowledge → audit
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            This surface asks the durable worker to act. It does not pretend
            that a queued request is proof of execution.
          </p>
        </div>
        <ol className="grid sm:grid-cols-3">
          {[
            [
              "01",
              "Request",
              "An authenticated operator submits an idempotent control request with a reason.",
            ],
            [
              "02",
              "Worker acknowledgement",
              "The receiving Railway lane checks state and policy before applying it.",
            ],
            [
              "03",
              "Audit trail",
              "The applied, rejected, or failed result becomes the durable record of what happened.",
            ],
          ].map(([number, title, detail], index) => (
            <li
              key={title}
              className={`px-4 py-4 sm:px-5 ${index < 2 ? "border-b sm:border-r sm:border-b-0" : ""}`}
            >
              <span className="font-mono text-xs text-primary">{number}</span>
              <h3 className="mt-2 text-sm font-medium text-foreground">
                {title}
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {detail}
              </p>
            </li>
          ))}
        </ol>
      </section>
      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Agent control summary"
      >
        <MetricCard
          label="Requests"
          value={area.data.summary.requests}
          detail="Recent control requests"
        />
        <MetricCard
          label="Awaiting worker"
          value={area.data.summary.requested}
          detail="Requested, not applied"
        />
        <MetricCard
          label="Applied"
          value={area.data.summary.applied}
          detail="Worker-confirmed only"
        />
        <MetricCard
          label="Failed"
          value={area.data.summary.failed}
          detail="Rejected or failed"
        />
        <MetricCard
          label="Targets"
          value={area.data.summary.targets}
          detail="Distinct graph records"
        />
      </section>
      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Worker lifecycle summary"
      >
        <MetricCard
          label="Runs observed"
          value={area.data.summary.runs}
          detail="Recent durable worker runs"
        />
        <MetricCard
          label="Running"
          value={area.data.summary.running}
          detail="Heartbeat-controlled runs"
        />
        <MetricCard
          label="Paused"
          value={area.data.summary.paused}
          detail="Operator-paused runs"
        />
        <MetricCard
          label="Stale"
          value={area.data.summary.stale}
          detail="Running without a recent heartbeat"
        />
      </section>
      <section
        className="border border-border bg-white"
        aria-labelledby="agent-runs-title"
      >
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Runtime
              </p>
              <h2
                id="agent-runs-title"
                className="mt-1 text-lg font-semibold tracking-tight text-foreground"
              >
                Live worker runs
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Lifecycle status is worker-owned. A stale run is a recovery
                signal, not proof that work is lost.
              </p>
            </div>
            <MaturityBadge maturity={area.provenance.maturity} />
          </div>
        </div>
        {area.data.runs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No durable worker runs recorded.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {area.data.runs.map((run) => (
              <article
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-1 size-2 shrink-0 rounded-full ${run.stale ? "bg-red-600" : run.status === "paused" ? "bg-amber-500" : run.status === "completed" ? "bg-green-600" : "bg-blue-600"}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {run.agentKind} ·{" "}
                      <span
                        className={
                          run.stale
                            ? "text-red-700"
                            : run.status === "paused"
                              ? "text-amber-700"
                              : "text-foreground"
                        }
                      >
                        {run.status}
                        {run.stale ? " · stale" : ""}
                      </span>
                    </p>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                      {run.id} · {run.inputCount} in / {run.outputCount} out
                    </p>
                    {run.error && (
                      <p className="mt-1 truncate text-xs text-red-700">
                        {run.error}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTargetType("agent-run");
                    setTargetId(run.id);
                  }}
                  className="min-h-9 border border-border px-3 text-xs font-medium text-foreground hover:border-primary hover:text-primary"
                >
                  Control run
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 border border-border bg-white">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Recent requests
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Requested is not applied. Only the receiving worker may
                  transition a request after checking state and policy.
                </p>
              </div>
              <MaturityBadge maturity={area.provenance.maturity} />
            </div>
          </div>
          {area.data.requests.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">
              No control requests recorded.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {area.data.requests.map((row) => (
                <article key={row.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {row.action} · {row.targetType}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {row.targetId}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium capitalize ${row.status === "applied" ? "text-green-700" : row.status === "failed" || row.status === "rejected" ? "text-red-700" : "text-amber-700"}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  {row.reason && (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      {row.reason}
                    </p>
                  )}
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {row.createdAt ?? "Not observed"} ·{" "}
                    {row.actorAccountId ?? "system"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
        <aside className="border border-border bg-white p-5 xl:sticky xl:top-6 xl:self-start">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Request a control
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Use the exact durable target ID from Operations. Replay creates a
            new worker-owned attempt; it does not overwrite the prior result.
          </p>
          <form onSubmit={requestControl} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-foreground">
                Target type
              </span>
              <select
                value={targetType}
                onChange={(event) =>
                  setTargetType(
                    event.target.value as (typeof targetTypes)[number],
                  )
                }
                className="mt-1 h-10 w-full border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {targetTypes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground">
                Target ID
              </span>
              <input
                required
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                placeholder="run_… or job_…"
                className="mt-1 h-10 w-full border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground">
                Action
              </span>
              <select
                value={action}
                onChange={(event) =>
                  setAction(event.target.value as (typeof actions)[number])
                }
                className="mt-1 h-10 w-full border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {actions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground">
                Reason
              </span>
              <textarea
                maxLength={1000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder="Why is this safe and necessary?"
                className="mt-1 w-full resize-y border border-border px-3 py-2 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <button
              type="submit"
              disabled={saving || !area.data.available}
              className="min-h-10 w-full bg-foreground px-4 text-sm font-medium text-white hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Queueing…" : "Queue control request"}
            </button>
            {message && (
              <p
                role="status"
                className="text-xs leading-5 text-muted-foreground"
              >
                {message}
              </p>
            )}
          </form>
        </aside>
      </section>
    </div>
  );
}
