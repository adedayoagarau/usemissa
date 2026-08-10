"use client";

import { useMemo, useState } from "react";
import {
  DataAreaHeader,
  MaturityBadge,
  MetricCard,
  WarningList,
} from "@/components/platform-admin";
import type { AdminArea } from "@/lib/platformAdmin";
import type { PlatformAdminCrmData } from "@/lib/platformAdminFoundations";
import { captureProductEvent } from "@/components/analytics-provider";

function dateLabel(value?: string): string {
  if (!value) return "Not observed";
  return new Date(value).toLocaleString();
}
export default function PlatformAdminCrm({
  area,
}: {
  area: AdminArea<PlatformAdminCrmData>;
}) {
  const [search, setSearch] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return area.data.rows;
    return area.data.rows.filter((row) =>
      [
        row.subjectId,
        row.subjectLabel,
        row.accountEmail,
        row.eventType,
        row.source,
        row.title,
        row.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [area.data.rows, search]);

  async function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/crm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ organizationId, title, body }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to save note");
      setMessage("Internal note recorded. Refresh to see it in the timeline.");
      captureProductEvent("admin_crm_note_created");
      setTitle("");
      setBody("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save note",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/crm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          kind: "contact",
          organizationId,
          name: contactName,
          email: contactEmail,
          role: contactRole,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error ?? "Unable to save contact");
      setMessage("CRM contact recorded. Refresh to see the durable row.");
      captureProductEvent("admin_crm_contact_created");
      setContactName("");
      setContactEmail("");
      setContactRole("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save contact",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/crm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          kind: "task",
          organizationId,
          title: taskTitle,
          description: taskDescription,
          dueAt: taskDueAt
            ? new Date(`${taskDueAt}T12:00:00Z`).toISOString()
            : undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to save task");
      setMessage("CRM follow-up recorded. Refresh to see the durable row.");
      captureProductEvent("admin_crm_task_created");
      setTaskTitle("");
      setTaskDescription("");
      setTaskDueAt("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save task",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateTask(taskId: string, status: "open" | "done") {
    setMessage(undefined);
    try {
      const response = await fetch("/api/admin/crm", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId, status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error ?? "Unable to update task");
      setMessage("CRM task updated.");
      captureProductEvent("admin_crm_task_status_changed", { status });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update task",
      );
    }
  }

  return (
    <div className="space-y-8">
      <DataAreaHeader
        area={area}
        title="CRM timeline"
        description="Organization-level relationship notes and redacted system activity. Internal notes are append-only, tenant-aware, idempotent, audited, and never published to customer-facing surfaces."
      />
      <WarningList warnings={area.warnings} />
      <section
        className="overflow-hidden rounded-xl border border-border bg-white"
        aria-labelledby="crm-workflow-title"
      >
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Operator record
          </p>
          <h2
            id="crm-workflow-title"
            className="mt-1 text-lg font-semibold tracking-tight text-foreground"
          >
            Know the relationship, then decide the next action
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            CRM is organization-first: observed activity is context, internal
            notes are operator memory, and follow-ups are explicit work with an
            owner and due date.
          </p>
        </div>
        <ol className="grid sm:grid-cols-3">
          {[
            [
              "01",
              "Timeline",
              "Read the durable activity and notes for the organization.",
            ],
            [
              "02",
              "Context",
              "Keep contacts explicitly assigned; never infer a customer relationship.",
            ],
            [
              "03",
              "Next action",
              "Create a follow-up with an explicit due date and completion state.",
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
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="CRM summary"
      >
        <MetricCard
          label="Timeline events"
          value={area.data.summary.timelineEvents}
          detail="Durable notes plus redacted activity"
        />
        <MetricCard
          label="Internal notes"
          value={area.data.summary.notes}
          detail="Operator-authored CRM notes"
        />
        <MetricCard
          label="Organizations"
          value={area.data.summary.organizationsWithActivity}
          detail="Organizations with observed activity"
          href="/admin/organizations"
        />
        <MetricCard
          label="Accounts"
          value={area.data.summary.accountsWithActivity}
          detail="Account-level activity references"
          href="/admin/customers"
        />
        <MetricCard
          label="Contacts"
          value={area.data.summary.contacts}
          detail="Durable organization contacts"
        />
        <MetricCard
          label="Open follow-ups"
          value={area.data.summary.openTasks}
          detail={`${area.data.summary.tasks} total CRM tasks`}
        />
      </section>
      <section
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
        aria-labelledby="crm-timeline-title"
      >
        <div className="min-w-0 border border-border bg-white">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2
                  id="crm-timeline-title"
                  className="text-lg font-semibold tracking-tight text-foreground"
                >
                  Relationship timeline
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rows.length} events shown · system rows contain metadata
                  only, not private messages or submissions.
                </p>
              </div>
              <MaturityBadge maturity={area.provenance.maturity} />
            </div>
            <label className="mt-4 block">
              <span className="sr-only">Search CRM timeline</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search organization, event, or note…"
                className="h-10 w-full border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">
              No CRM timeline events match the current filter.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <article key={`${row.source}:${row.id}`} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {row.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.subjectLabel ?? row.subjectId} · {row.subjectType}{" "}
                        · {row.eventType} · {row.source}
                      </p>
                    </div>
                    <time
                      className="font-mono text-[11px] whitespace-nowrap text-muted-foreground"
                      dateTime={row.createdAt}
                    >
                      {dateLabel(row.createdAt)}
                    </time>
                  </div>
                  {row.body && (
                    <p className="mt-3 border-l-2 border-border pl-3 text-sm leading-6 text-muted-foreground">
                      {row.body}
                    </p>
                  )}
                  {row.accountEmail && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Account reference: {row.accountEmail}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
        <aside className="border border-border bg-white p-5 xl:sticky xl:top-6 xl:self-start">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Add internal note
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Notes belong to an organization. They are not customer-visible and
            do not change membership, billing, or workflow state.
          </p>
          <form onSubmit={addNote} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-foreground">
                Organization ID
              </span>
              <input
                required
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                placeholder="org_…"
                className="mt-1 h-10 w-full border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground">Title</span>
              <input
                required
                maxLength={240}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Onboarding follow-up"
                className="mt-1 h-10 w-full border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground">Note</span>
              <textarea
                required
                maxLength={4000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={6}
                placeholder="What should the next operator know?"
                className="mt-1 w-full resize-y border border-border px-3 py-2 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <button
              type="submit"
              disabled={saving || !area.data.available}
              className="min-h-10 w-full bg-foreground px-4 text-sm font-medium text-white hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Record internal note"}
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
      <section
        className="grid gap-5 lg:grid-cols-2"
        aria-label="CRM contacts and follow-ups"
      >
        <div className="border border-border bg-white">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Contacts
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Explicitly assigned organization contacts; no global account is
              silently mapped.
            </p>
          </div>
          {area.data.contacts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No CRM contacts recorded.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {area.data.contacts.map((contact) => (
                <article key={contact.id} className="px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {contact.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {contact.role ?? "No role"} · {contact.status}
                      </p>
                    </div>
                    {contact.email && (
                      <a
                        className="text-xs text-accent-deep underline underline-offset-4"
                        href={`mailto:${contact.email}`}
                      >
                        {contact.email}
                      </a>
                    )}
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {contact.organizationId ?? contact.accountId}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="border border-border bg-white">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Follow-ups
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Operator-owned tasks with explicit due dates and completion state.
            </p>
          </div>
          {area.data.tasks.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No CRM follow-ups recorded.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {area.data.tasks.map((task) => (
                <article
                  key={task.id}
                  className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5"
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}
                    >
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {task.status} ·{" "}
                      {task.dueAt ? dateLabel(task.dueAt) : "No due date"}
                    </p>
                    {task.description && (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                  </div>
                  {task.status === "done" ? (
                    <button
                      type="button"
                      onClick={() => updateTask(task.id, "open")}
                      className="shrink-0 text-xs font-medium text-accent-deep underline underline-offset-4"
                    >
                      Reopen
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateTask(task.id, "done")}
                      className="shrink-0 border border-border px-2.5 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
                    >
                      Mark done
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <section
        className="grid gap-5 lg:grid-cols-2"
        aria-label="CRM create records"
      >
        <form
          onSubmit={addContact}
          className="border border-border bg-white p-5"
        >
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Add contact
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium">Name</span>
              <input
                required
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                className="mt-1 h-10 w-full border border-border px-3 text-sm"
                placeholder="Jane Doe"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium">Email</span>
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                className="mt-1 h-10 w-full border border-border px-3 text-sm"
                placeholder="jane@example.org"
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="text-xs font-medium">Role</span>
            <input
              value={contactRole}
              onChange={(event) => setContactRole(event.target.value)}
              className="mt-1 h-10 w-full border border-border px-3 text-sm"
              placeholder="Programme director"
            />
          </label>
          <button
            type="submit"
            disabled={saving || !area.data.available}
            className="mt-4 min-h-10 bg-foreground px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            Record contact
          </button>
        </form>
        <form onSubmit={addTask} className="border border-border bg-white p-5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Add follow-up
          </h2>
          <label className="mt-4 block">
            <span className="text-xs font-medium">Title</span>
            <input
              required
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              className="mt-1 h-10 w-full border border-border px-3 text-sm"
              placeholder="Send onboarding pack"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-medium">Due date</span>
            <input
              type="date"
              value={taskDueAt}
              onChange={(event) => setTaskDueAt(event.target.value)}
              className="mt-1 h-10 w-full border border-border px-3 text-sm"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-medium">Description</span>
            <textarea
              value={taskDescription}
              onChange={(event) => setTaskDescription(event.target.value)}
              rows={3}
              className="mt-1 w-full border border-border px-3 py-2 text-sm"
              placeholder="What should happen next?"
            />
          </label>
          <button
            type="submit"
            disabled={saving || !area.data.available}
            className="mt-4 min-h-10 bg-foreground px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            Create follow-up
          </button>
        </form>
      </section>
      <p className="text-xs leading-5 text-muted-foreground">
        CRM scope is deliberately organization-first. A Missa account or support
        report is not automatically assigned to a customer organization;
        operators must use an explicit organization ID.
      </p>
    </div>
  );
}
