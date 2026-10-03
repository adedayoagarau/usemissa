"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  Circle,
  CircleDot,
  FileCheck2,
  FileText,
  History,
  Inbox,
  Library,
  LockKeyhole,
  NotebookPen,
  RefreshCw,
  Globe,
  Target,
  UserRound,
} from "lucide-react";
import type { MyStatus } from "@missa/radar-engine";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { STATUS_LABELS } from "@/lib/statusLabels";
import {
  applicationDate,
  type ApplicationDetail,
} from "@/lib/application-workspace-types";
import {
  buildLifecycle,
  eventProvenance,
  isBeforeSubmission,
  lifecycleStep,
  nextMove,
  type LifecycleStepView,
  type ProvenanceKind,
} from "@/lib/application-lifecycle";
import { deadlineCountdown, closingTimeLabel } from "@/lib/application-timing";
import { estimateStartBy } from "@/lib/start-by";
import { ApplicationPreparation } from "./application-preparation";
import { StartByDate } from "./start-by-date";
import { ApplicationReminders } from "./application-reminders";
import { ApplicationCalendarDeliveryPanel } from "./application-calendar-delivery";
import { TrackerResponseForecaster } from "@/components/tracker/tracker-response-forecaster";
import type { TrackerHostedSubmission } from "@/components/tracker-product";

export type ApplicationRecordSection =
  | "overview"
  | "prepare"
  | "timing"
  | "materials"
  | "history";

export const APPLICATION_RECORD_SECTIONS: ReadonlyArray<{
  id: ApplicationRecordSection;
  label: string;
}> = [
  { id: "overview", label: "Overview" },
  { id: "prepare", label: "Prepare" },
  { id: "timing", label: "Dates" },
  { id: "materials", label: "Materials" },
  { id: "history", label: "History" },
];

export function parseRecordSection(
  value: string | null | undefined,
): ApplicationRecordSection {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "reminders" || normalized === "calendar") return "timing";
  return (
    APPLICATION_RECORD_SECTIONS.find((section) => section.id === normalized)
      ?.id ?? "overview"
  );
}

type DialogMode = "notes" | "submission" | "response" | "correction";

const RESPONSE_STATUSES: MyStatus[] = [
  "received",
  "in-review",
  "longlisted",
  "shortlisted",
  "finalist",
  "waitlisted",
  "revision-requested",
  "accepted",
  "declined",
  "withdrawn",
  "partially-withdrawn",
  "delivered",
];

const CORRECTION_STATUSES: MyStatus[] = [
  "saved",
  "preparing",
  "ready-to-submit",
  "submitted",
  ...RESPONSE_STATUSES,
  "archived",
];

const PROVENANCE_ICON: Record<ProvenanceKind, typeof UserRound> = {
  creator: UserRound,
  "missa-hosted": FileCheck2,
  organization: Building2,
  inferred: Globe,
};

const typeLabel = (value: string) =>
  value === "open-call"
    ? "Open call"
    : value.replaceAll("-", " ").replace(/^./u, (c) => c.toUpperCase());

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The canonical record for one tracked application. Every surface that links
 * to `/tracker?application=<id>` opens this record: Inbox reminders, email,
 * Calendar, Library usage, Home, and the Tracker list itself.
 */
export function ApplicationRecord({
  opportunityId,
  hosted,
  works = [],
  initialSection = "overview",
  onChanged,
  onSectionChange,
}: {
  opportunityId: string;
  hosted?: TrackerHostedSubmission;
  works?: Array<{ id: string; title: string }>;
  initialSection?: ApplicationRecordSection;
  /** Called after any saved change with the latest record. */
  onChanged?: (detail: ApplicationDetail) => void;
  onSectionChange?: (section: ApplicationRecordSection) => void;
}) {
  const [data, setData] = useState<ApplicationDetail | null>(null);
  const [loadError, setLoadError] = useState<"" | "unavailable" | "failed" | "missing">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<ApplicationRecordSection>(initialSection);
  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<MyStatus>("submitted");
  const [when, setWhen] = useState(today());
  const [recordNote, setRecordNote] = useState("");
  const request = useRef<{ body: string; key: string; revision: number } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/me/applications/${encodeURIComponent(opportunityId)}`,
      { cache: "no-store" },
    );
    if (response.status === 404) {
      setLoadError("missing");
      return null;
    }
    if (response.status === 503) {
      setLoadError("unavailable");
      return null;
    }
    if (!response.ok) {
      setLoadError("failed");
      return null;
    }
    const result = (await response.json()) as ApplicationDetail;
    setLoadError("");
    setData(result);
    return result;
  }, [opportunityId]);

  useEffect(() => {
    // Load the canonical record whenever the selected application changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes record state
    void load().catch(() => setLoadError("failed"));
  }, [load]);

  const loaded = Boolean(data);
  useEffect(() => {
    if (loaded) heading.current?.focus({ preventScroll: true });
  }, [loaded]);

  const hostedReceipt = useMemo(
    () =>
      hosted
        ? {
            submittedAt: hosted.submittedAt,
            decisions: hosted.works
              .filter((work) => work.outcome)
              .map((work) => ({ title: work.title, outcome: work.outcome! })),
          }
        : undefined,
    [hosted],
  );

  const lifecycle = useMemo(
    () =>
      data
        ? buildLifecycle({
            status: data.myStatus,
            statusLabel: STATUS_LABELS[data.myStatus],
            history: data.history,
            submittedAt: data.submittedAt,
            hosted: hostedReceipt,
          })
        : [],
    [data, hostedReceipt],
  );

  function changeSection(next: ApplicationRecordSection) {
    setSection(next);
    onSectionChange?.(next);
  }

  async function send(body: Record<string, unknown>, successMessage: string) {
    if (!data) return false;
    setBusy(true);
    setError("");
    const serialized = JSON.stringify(body);
    if (
      request.current?.body !== serialized ||
      request.current.revision !== data.revision
    )
      request.current = {
        body: serialized,
        key: crypto.randomUUID(),
        revision: data.revision,
      };
    try {
      const response = await fetch(
        `/api/me/applications/${encodeURIComponent(opportunityId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": request.current.key,
            "If-Match": String(data.revision),
          },
          body: serialized,
        },
      );
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error ?? "Your update could not be saved.");
      }
      request.current = null;
      const refreshed = await load();
      if (refreshed) onChanged?.(refreshed);
      toast.success(successMessage);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Your update could not be saved.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  function recordStatus(nextStatus: MyStatus, occurredOn: string, note: string) {
    return send(
      {
        action: "record",
        status: nextStatus,
        occurredOn,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        note,
      },
      `${STATUS_LABELS[nextStatus]} recorded`,
    );
  }

  async function linkWork(workId: string) {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/me/tracker/${encodeURIComponent(opportunityId)}/work`,
        {
          method: workId ? "PUT" : "DELETE",
          headers: {
            "content-type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            ...(workId ? { workId } : {}),
            expectedRevision: data.revision,
          }),
        },
      );
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error ?? "The Work link could not be updated.");
      }
      const refreshed = await load();
      if (refreshed) onChanged?.(refreshed);
      toast.success(workId ? "Work linked" : "Work link removed");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The Work link could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeAlerts(notify: boolean) {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/me/tracker/${encodeURIComponent(opportunityId)}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({ notify, expectedRevision: data.revision }),
        },
      );
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error ?? "Alerts could not be updated.");
      }
      const refreshed = await load();
      if (refreshed) onChanged?.(refreshed);
      toast.success(notify ? "Alerts on for this call" : "Alerts off for this call");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Alerts could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  function openDialog(mode: DialogMode) {
    if (!data) return;
    setError("");
    setWhen(today());
    setRecordNote("");
    if (mode === "notes") setNotes(data.notes);
    if (mode === "submission") setStatus("submitted");
    if (mode === "response")
      setStatus(
        RESPONSE_STATUSES.includes(data.myStatus) ? data.myStatus : "received",
      );
    if (mode === "correction") setStatus(data.myStatus);
    setDialog(mode);
  }

  if (loadError === "unavailable" || loadError === "missing") {
    return (
      <Empty variant="bordered" size="spacious">
        <EmptyHeader>
          <EmptyTitle>
            {loadError === "missing"
              ? "This application is no longer in your Tracker"
              : "The full application record is not available here yet"}
          </EmptyTitle>
          <EmptyDescription>
            {loadError === "missing"
              ? "It may have been removed. Your other Tracker items are unchanged."
              : "Preparation, reminders, and history need account storage. You can still review the opportunity and update its status from your Tracker card."}
          </EmptyDescription>
        </EmptyHeader>
        {loadError === "unavailable" ? (
          <Link
            href={`/opportunities/${encodeURIComponent(opportunityId)}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Review opportunity
            <ArrowRight />
          </Link>
        ) : null}
      </Empty>
    );
  }

  if (loadError === "failed") {
    return (
      <Alert variant="destructive">
        <AlertTitle>This application could not load</AlertTitle>
        <AlertDescription>
          Check your connection, then try again. Nothing has changed.
        </AlertDescription>
        <Button
          variant="outline"
          className="mt-3 w-fit"
          onClick={() => void load().catch(() => setLoadError("failed"))}
        >
          <RefreshCw />
          Try again
        </Button>
      </Alert>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading application">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const move = nextMove({
    status: data.myStatus,
    checklist: data.preparationTotal
      ? { total: data.preparationTotal, done: data.preparationDone }
      : undefined,
    hosted: Boolean(hosted),
  });
  const countdown = deadlineCountdown(data.deadline, data.deadlineKind);
  const beforeSubmission = isBeforeSubmission(data.myStatus) && !hosted;
  const current = lifecycle.find((step) => step.state === "current");
  const startBy = beforeSubmission
    ? estimateStartBy({
        deadline: data.deadline,
        deadlineKind: data.deadlineKind,
        items: data.preparationItems,
      })
    : null;

  return (
    <article className="space-y-6" aria-labelledby="application-record-title">
      <header className="space-y-3">
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>{data.organizationName || "Organization not listed"}</span>
          <span aria-hidden="true">·</span>
          <span>{typeLabel(data.type)}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            Private to you
          </span>
        </p>
        <h2
          id="application-record-title"
          ref={heading}
          tabIndex={-1}
          className="font-heading text-3xl leading-tight font-medium tracking-tight break-words outline-none"
        >
          {data.title}
        </h2>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">Stage</dt>
            <dd className="font-medium">
              {current?.label ?? STATUS_LABELS[data.myStatus]}
              {current?.detail ? ` · ${current.detail}` : ""}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">
              {data.deadline && data.deadlineKind === "inferred"
                ? "Listed date"
                : "Apply by"}
            </dt>
            <dd>
              {data.deadline ? (
                <span className="font-mono tabular-nums">
                  {applicationDate(data.deadline)}
                </span>
              ) : data.deadlineKind === "rolling" ? (
                "Rolling"
              ) : (
                "Not listed"
              )}
              {countdown && beforeSubmission ? (
                <span
                  className={
                    countdown.urgent
                      ? "ms-2 rounded-full bg-warning-subtle px-2 py-0.5 text-xs font-medium text-ochre-deep"
                      : "ms-2 text-xs text-muted-foreground"
                  }
                >
                  {countdown.label}
                </span>
              ) : null}
            </dd>
          </div>
          {startBy ? (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Start preparing</dt>
              <dd className="-ms-2">
                <StartByDate startBy={startBy} title={data.title} />
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      {!data.available ? (
        <Alert>
          <AlertTitle>The public listing is unavailable</AlertTitle>
          <AlertDescription>
            Your application, notes, and history remain here.
          </AlertDescription>
        </Alert>
      ) : null}

      {error && !dialog ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs
        value={section}
        onValueChange={(value) => changeSection(value as ApplicationRecordSection)}
        className="gap-6"
      >
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList variant="line" className="min-h-11 gap-4">
            {APPLICATION_RECORD_SECTIONS.map((candidate) => (
              <TabsTrigger key={candidate.id} value={candidate.id} size="touch">
                {candidate.label}
                {candidate.id === "prepare" && data.preparationTotal ? (
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {data.preparationDone}/{data.preparationTotal}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8">
          <section
            aria-labelledby="record-next-title"
            className="space-y-4 rounded-xl border border-border p-6"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Next step</p>
              <h3 id="record-next-title" className="text-lg font-semibold">
                {move.label}
              </h3>
              <p className="text-sm text-muted-foreground">{move.reason}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {hosted ? (
                <Link
                  href={`/tracker/submissions/${hosted.id}`}
                  className={buttonVariants({ variant: "default" })}
                >
                  View submission receipt
                  <ArrowRight />
                </Link>
              ) : move.kind === "start-preparing" ? (
                <Button
                  disabled={busy}
                  aria-busy={busy || undefined}
                  onClick={() => void recordStatus("preparing", today(), "")}
                >
                  Start preparing
                </Button>
              ) : move.kind === "mark-ready" ? (
                <Button
                  disabled={busy}
                  aria-busy={busy || undefined}
                  onClick={() => void recordStatus("ready-to-submit", today(), "")}
                >
                  <Check />
                  Mark ready
                </Button>
              ) : move.kind === "record-submission" ? (
                <Button onClick={() => openDialog("submission")}>
                  <FileCheck2 />
                  Record submission
                </Button>
              ) : move.kind === "record-response" ? (
                <Button onClick={() => openDialog("response")}>
                  <Inbox />
                  Record a response
                </Button>
              ) : null}
              {beforeSubmission && move.kind !== "record-submission" ? (
                <Button variant="outline" onClick={() => openDialog("submission")}>
                  Record submission
                </Button>
              ) : null}
              {data.applyUrl && beforeSubmission ? (
                <a
                  href={data.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Official application
                  <span className="sr-only"> (opens in a new tab)</span>
                  <ArrowUpRight />
                </a>
              ) : data.guidelinesUrl ? (
                <a
                  href={data.guidelinesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "ghost" })}
                >
                  Official guidelines
                  <span className="sr-only"> (opens in a new tab)</span>
                  <ArrowUpRight />
                </a>
              ) : data.available ? (
                <Link
                  href={`/opportunities/${encodeURIComponent(opportunityId)}`}
                  className={buttonVariants({ variant: "ghost" })}
                >
                  View opportunity
                  <ArrowRight />
                </Link>
              ) : null}
            </div>
            {beforeSubmission && data.applyUrl ? (
              <p className="text-xs text-muted-foreground">
                Opening the official application never marks it submitted.
                Record the submission here after you send it.
              </p>
            ) : null}
          </section>

          <LifecycleTimeline steps={lifecycle} />

          {!beforeSubmission ? (
            <TrackerResponseForecaster
              opportunityId={opportunityId}
              organizationName={data.organizationName}
              submittedAt={data.submittedAt}
              myStatus={data.myStatus}
            />
          ) : null}

          <section aria-labelledby="record-notes-title" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 id="record-notes-title" className="text-lg font-semibold">
                Private notes
              </h3>
              <Button variant="ghost" onClick={() => openDialog("notes")}>
                <NotebookPen />
                {data.notes ? "Edit notes" : "Add notes"}
              </Button>
            </div>
            {data.notes ? (
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                {data.notes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keep a question, a contact, or a detail for next time.
              </p>
            )}
          </section>

          <section aria-labelledby="record-goals-title" className="space-y-2">
            <h3 id="record-goals-title" className="text-lg font-semibold">
              Goals
            </h3>
            {data.goals.length ? (
              data.goals.map((goal) => (
                <Link
                  key={goal.id}
                  href={`/goals?goal=${encodeURIComponent(goal.id)}`}
                  className="flex min-h-11 items-center gap-3 text-sm text-primary"
                >
                  <Target className="size-4" aria-hidden="true" />
                  {goal.title}
                  <ArrowRight className="ms-auto size-4 shrink-0" aria-hidden="true" />
                </Link>
              ))
            ) : (
              <Link
                href="/goals"
                className="flex min-h-11 items-center gap-3 text-sm text-primary"
              >
                <Target className="size-4" aria-hidden="true" />
                Count this application toward a goal
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </section>

        </TabsContent>

        <TabsContent value="prepare" className="space-y-8">
          {beforeSubmission ? (
            <>
              <ApplicationPreparation
                opportunityId={opportunityId}
                onChanged={() => {
                  void load().then((refreshed) => {
                    if (refreshed) onChanged?.(refreshed);
                  });
                }}
              />
              <Link
                href={`/calendar?application=${encodeURIComponent(opportunityId)}&new=1`}
                className={buttonVariants({ variant: "outline" })}
              >
                <CalendarDays />
                Block preparation time
              </Link>
            </>
          ) : (
            <Empty variant="bordered">
              <EmptyHeader>
                <EmptyTitle>Preparation is finished</EmptyTitle>
                <EmptyDescription>
                  The materials you used are preserved under Materials.
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={() => changeSection("materials")}>
                Open materials
              </Button>
            </Empty>
          )}
        </TabsContent>

        <TabsContent value="timing" className="space-y-8">
          <DeadlineFacts detail={data} />
          <Field orientation="horizontal" className="items-start justify-between gap-6">
            <div className="space-y-1">
              <FieldLabel htmlFor="record-alerts">Changes to this call</FieldLabel>
              <FieldDescription>
                Tell me when the deadline moves, the call closes, or its details
                change.
              </FieldDescription>
            </div>
            <Switch
              id="record-alerts"
              checked={data.notify}
              disabled={busy}
              onCheckedChange={(checked) => void changeAlerts(checked)}
            />
          </Field>
          <ApplicationReminders application={data} />
          <ApplicationCalendarDeliveryPanel opportunityId={opportunityId} />
        </TabsContent>

        <TabsContent value="materials" className="space-y-8">
          <section aria-labelledby="record-work-title" className="space-y-3">
            <h3 id="record-work-title" className="text-lg font-semibold">
              Linked Work
            </h3>
            {beforeSubmission && works.length ? (
              <Field>
                <FieldLabel htmlFor="record-linked-work">
                  Work for this application
                </FieldLabel>
                <NativeSelect
                  id="record-linked-work"
                  value={data.workId ?? ""}
                  disabled={busy}
                  onChange={(event) => void linkWork(event.target.value)}
                >
                  <option value="">Not linked</option>
                  {works.map((work) => (
                    <option key={work.id} value={work.id}>
                      {work.title}
                    </option>
                  ))}
                </NativeSelect>
                <FieldDescription>
                  The Work’s Library version is preserved when you record the
                  submission.
                </FieldDescription>
              </Field>
            ) : null}
            {data.workId ? (
              <Link
                href={`/library/works/${encodeURIComponent(data.workId)}`}
                className="flex min-h-11 items-center gap-3 text-sm text-primary"
              >
                <Library className="size-4" aria-hidden="true" />
                {data.workTitle ?? "Open linked Work"} in Library
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : !works.length ? (
              <p className="text-sm text-muted-foreground">
                Add a Work to your{" "}
                <Link href="/library" className="text-primary underline underline-offset-4">
                  Library
                </Link>{" "}
                to reuse it across applications and your portfolio.
              </p>
            ) : null}
          </section>

          {hosted ? <HostedReceiptSummary hosted={hosted} /> : null}

          <section aria-labelledby="record-snapshot-title" className="space-y-4">
            <div className="space-y-1">
              <h3 id="record-snapshot-title" className="text-lg font-semibold">
                Preserved at submission
              </h3>
              <p className="text-sm text-muted-foreground">
                The exact Works, files, and saved answers linked when you recorded
                the submission. Later Library edits never change them.
              </p>
            </div>
            {data.materials.length ? (
              data.materials.map((version) => (
                <div
                  key={version.id}
                  className="space-y-3 rounded-xl border border-border p-6"
                >
                  <p className="text-xs text-muted-foreground">
                    Snapshot ·{" "}
                    <span className="font-mono tabular-nums">
                      {applicationDate(version.createdAt)}
                    </span>
                  </p>
                  {version.works.map((work) => (
                    <div key={work.id}>
                      <p className="font-heading text-lg">{work.title}</p>
                      {work.description ? (
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {work.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {version.answers.map((answer) => (
                    <div key={answer.id}>
                      <p className="text-sm font-medium">{answer.label}</p>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {answer.answer}
                      </p>
                    </div>
                  ))}
                  {version.files.map((file) => (
                    <a
                      key={file.id}
                      href={`/api/me/library/files/${encodeURIComponent(file.id)}`}
                      className="flex min-h-11 items-center gap-2 text-sm text-primary"
                    >
                      <FileText className="size-4" aria-hidden="true" />
                      {file.name}
                    </a>
                  ))}
                  {!version.works.length && !version.answers.length && !version.files.length ? (
                    <p className="text-sm text-muted-foreground">
                      No Library materials were linked when this submission was
                      recorded.
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {beforeSubmission
                  ? "A snapshot is saved automatically when you record the submission."
                  : "No snapshot was saved for this submission."}
              </p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">History</h3>
            <Button variant="ghost" onClick={() => openDialog("correction")}>
              <History />
              Correct the record
            </Button>
          </div>
          {data.history.length ? (
            <ol className="space-y-6 border-s border-border ps-6">
              {data.history.map((event) => {
                const provenance = eventProvenance(event);
                const Icon = PROVENANCE_ICON[provenance.kind];
                return (
                  <li key={event.id} className="space-y-1">
                    <p className="font-medium">
                      {STATUS_LABELS[event.to]}
                      {event.from === event.to ? " · date or details corrected" : ""}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">
                        {event.occurredOn
                          ? applicationDate(event.occurredOn)
                          : applicationDate(event.recordedAt)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Icon className="size-3.5" aria-hidden="true" />
                        {provenance.label}
                      </span>
                    </p>
                    {event.note ? (
                      <p className="text-sm break-words whitespace-pre-wrap">
                        {event.note}
                      </p>
                    ) : null}
                    {event.hasMaterials ? (
                      <button
                        type="button"
                        className="min-h-11 text-xs text-primary underline underline-offset-4"
                        onClick={() => changeSection("materials")}
                      >
                        Materials preserved with this update
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              No updates recorded yet.
            </p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogTitle className="text-xl">
            {dialog === "notes"
              ? "Private notes"
              : dialog === "submission"
                ? "Record your submission"
                : dialog === "response"
                  ? "Record a response"
                  : "Correct the record"}
          </DialogTitle>
          <DialogDescription>
            {dialog === "notes"
              ? "Only you can see these notes."
              : dialog === "submission"
                ? "Missa never marks an application submitted for you. Record it once you have sent it."
                : data.title}
          </DialogDescription>
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              const done =
                dialog === "notes"
                  ? send({ action: "notes", notes }, "Notes saved")
                  : recordStatus(status, when, recordNote);
              void done.then((ok) => {
                if (ok) setDialog(null);
              });
            }}
          >
            {dialog === "notes" ? (
              <Field>
                <FieldLabel htmlFor="record-notes">Notes</FieldLabel>
                <Textarea
                  id="record-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={6}
                  maxLength={10000}
                />
              </Field>
            ) : (
              <>
                {dialog !== "submission" ? (
                  <Field>
                    <FieldLabel htmlFor="record-status">
                      {dialog === "response" ? "What did you hear?" : "Status"}
                    </FieldLabel>
                    <NativeSelect
                      id="record-status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as MyStatus)}
                    >
                      {(dialog === "response" ? RESPONSE_STATUSES : CORRECTION_STATUSES).map(
                        (candidate) => (
                          <option key={candidate} value={candidate}>
                            {STATUS_LABELS[candidate]}
                          </option>
                        ),
                      )}
                    </NativeSelect>
                  </Field>
                ) : null}
                <Field>
                  <FieldLabel htmlFor="record-date">
                    {dialog === "submission" ? "Date submitted" : "Date"}
                  </FieldLabel>
                  <Input
                    id="record-date"
                    type="date"
                    value={when}
                    max={today()}
                    onChange={(event) => setWhen(event.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="record-note">
                    {dialog === "submission" ? "Evidence (optional)" : "Note (optional)"}
                  </FieldLabel>
                  <Textarea
                    id="record-note"
                    value={recordNote}
                    onChange={(event) => setRecordNote(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder={
                      dialog === "submission"
                        ? "Confirmation number, portal name, or email subject"
                        : undefined
                    }
                  />
                  {dialog === "submission" ? (
                    <FieldDescription>
                      Linked Works, files, and saved answers are preserved as they
                      are now. Preparation reminders stop.
                    </FieldDescription>
                  ) : null}
                </Field>
              </>
            )}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy} aria-busy={busy || undefined}>
                {busy
                  ? "Saving…"
                  : dialog === "notes"
                    ? "Save notes"
                    : dialog === "submission"
                      ? "Record submission"
                      : "Save update"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function LifecycleTimeline({ steps }: { steps: LifecycleStepView[] }) {
  return (
    <section aria-labelledby="record-lifecycle-title" className="space-y-4">
      <h3 id="record-lifecycle-title" className="text-lg font-semibold">
        Where this stands
      </h3>
      <ol className="space-y-0">
        {steps.map((step, index) => {
          const Icon = step.provenance ? PROVENANCE_ICON[step.provenance.kind] : null;
          return (
            <li
              key={step.id}
              aria-current={step.state === "current" ? "step" : undefined}
              className="relative flex gap-4 pb-5 last:pb-0"
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={
                    step.state === "complete"
                      ? "absolute start-[11px] top-7 bottom-1 w-px bg-primary"
                      : "absolute start-[11px] top-7 bottom-1 w-px bg-border"
                  }
                />
              ) : null}
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center" aria-hidden="true">
                {step.state === "complete" ? (
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" />
                  </span>
                ) : step.state === "current" ? (
                  <CircleDot className="size-6 text-primary" />
                ) : (
                  <Circle className="size-6 text-border" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span
                    className={
                      step.state === "upcoming"
                        ? "text-sm text-muted-foreground"
                        : "text-sm font-semibold"
                    }
                  >
                    {step.label}
                    {step.detail ? (
                      <span className="font-normal text-muted-foreground"> · {step.detail}</span>
                    ) : null}
                    <span className="sr-only">
                      {step.state === "complete"
                        ? ", complete"
                        : step.state === "current"
                          ? ", current stage"
                          : ", not reached"}
                    </span>
                  </span>
                  {step.date ? (
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {applicationDate(step.date)}
                    </span>
                  ) : null}
                </p>
                {step.provenance && Icon ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon className="size-3.5" aria-hidden="true" />
                    {step.provenance.label}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function DeadlineFacts({ detail }: { detail: ApplicationDetail }) {
  const closing = detail.deadlineTime
    ? closingTimeLabel(detail.deadlineTime, detail.deadlineTimezone)
    : null;
  return (
    <section aria-labelledby="record-deadline-title" className="space-y-3">
      <h3 id="record-deadline-title" className="text-lg font-semibold">
        Deadline
      </h3>
      <dl className="grid gap-4 rounded-xl border border-border p-6 sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-xs text-muted-foreground">
            {detail.deadlineKind === "inferred" ? "Listed date" : "Apply by"}
          </dt>
          <dd className="font-mono text-base tabular-nums">
            {detail.deadline
              ? applicationDate(detail.deadline)
              : detail.deadlineKind === "rolling"
                ? "Rolling"
                : "Not listed"}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs text-muted-foreground">Closes</dt>
          <dd className="text-sm">
            {closing ? (
              <>
                <span className="font-mono tabular-nums">{closing.provider}</span>
                {closing.local ? (
                  <span className="block text-xs text-muted-foreground">
                    Your time:{" "}
                    <span className="font-mono tabular-nums">{closing.local}</span>
                  </span>
                ) : null}
              </>
            ) : detail.deadline ? (
              "End of the day · no closing time stated"
            ) : (
              "No closing time"
            )}
          </dd>
        </div>
        {detail.deadlineKind === "inferred" || detail.deadlineKind === "conflicting" ? (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            This date is not confirmed by the organization. Check the official
            guidelines before relying on it.
          </p>
        ) : null}
      </dl>
    </section>
  );
}

function HostedReceiptSummary({ hosted }: { hosted: TrackerHostedSubmission }) {
  return (
    <section
      aria-labelledby="record-receipt-title"
      className="space-y-3 rounded-xl border border-border p-6"
    >
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileCheck2 className="size-4" aria-hidden="true" />
        Confirmed by a Missa-hosted submission ·{" "}
        <span className="font-mono tabular-nums">
          {applicationDate(hosted.submittedAt)}
        </span>
      </p>
      <h3 id="record-receipt-title" className="text-lg font-semibold">
        Submission receipt
      </h3>
      {hosted.works.length ? (
        <ul className="divide-y divide-border">
          {hosted.works.map((work) => (
            <li key={work.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="font-heading text-base">{work.title}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {work.outcome ? (
                  <>
                    <Building2 className="size-3.5" aria-hidden="true" />
                    {typeLabel(work.outcome)} · from the organization
                  </>
                ) : (
                  "No decision yet"
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href={`/tracker/submissions/${hosted.id}`}
        className={buttonVariants({ variant: "outline" })}
      >
        Open receipt
        <ArrowRight />
      </Link>
    </section>
  );
}

export { lifecycleStep };
