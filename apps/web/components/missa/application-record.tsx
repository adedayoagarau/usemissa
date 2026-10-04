"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  Circle,
  CircleDot,
  FileCheck2,
  FileText,
  Globe,
  History,
  Inbox,
  Library,
  NotebookPen,
  RefreshCw,
  Target,
  UserRound,
} from "lucide-react";
import type { MyStatus } from "@missa/radar-engine";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { STATUS_LABELS } from "@/lib/statusLabels";
import {
  applicationDate,
  type ApplicationDetail,
} from "@/lib/application-workspace-types";
import {
  buildLifecycle,
  eventProvenance,
  isBeforeSubmission,
  nextMove,
  type LifecycleStepView,
  type ProvenanceKind,
} from "@/lib/application-lifecycle";
import { ApplicationEmailEvidence, emailDay } from "./application-email-evidence";
import { SheetSectionHeading } from "./sheet-section-heading";
import { TrackerResponseForecaster } from "@/components/tracker/tracker-response-forecaster";
import type { TrackerHostedSubmission } from "@/components/tracker-product";

/**
 * The application record inside the Tracker sheet: progress and lifecycle,
 * materials, notes, and dated history. Every surface that links to
 * `/tracker?application=<id>` lands here; `&section=` scrolls to one part.
 */

/** Heading ids, in order of preference, for each `&section=` value. */
const SECTION_TARGETS: Record<string, string[]> = {
  overview: ["sheet-progress-title"],
  progress: ["sheet-progress-title"],
  prepare: ["sheet-plan-title", "sheet-checklist"],
  plan: ["sheet-plan-title", "sheet-checklist"],
  checklist: ["sheet-checklist", "sheet-plan-title"],
  timing: ["sheet-reminders"],
  dates: ["sheet-reminders"],
  reminders: ["sheet-reminders"],
  calendar: ["sheet-reminders"],
  materials: ["sheet-materials-title"],
  notes: ["sheet-notes-title"],
  history: ["sheet-history-title"],
};

export function recordSectionTargets(section: string | undefined): string[] {
  return SECTION_TARGETS[(section ?? "").trim().toLowerCase()] ?? [];
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

export type ApplicationRecordState = ReturnType<typeof useApplicationRecord>;

/** Loads one application record and owns its commands and dialog. */
export function useApplicationRecord({
  opportunityId,
  enabled,
  hosted,
  onChanged,
}: {
  opportunityId: string | undefined;
  enabled: boolean;
  hosted?: TrackerHostedSubmission;
  /** Called after any saved change with the latest record. */
  onChanged?: (detail: ApplicationDetail) => void;
}) {
  const [data, setData] = useState<ApplicationDetail | null>(null);
  const [loadError, setLoadError] = useState<"" | "unavailable" | "failed" | "missing">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<MyStatus>("submitted");
  const [when, setWhen] = useState(today());
  const [recordNote, setRecordNote] = useState("");
  const [evidenceId, setEvidenceId] = useState<string>();
  const request = useRef<{ body: string; key: string; revision: number } | null>(null);
  const onChangedRef = useRef(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  const load = useCallback(async () => {
    if (!opportunityId) return null;
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
    if (!enabled || !opportunityId) return;
    // A different application starts from a clean record.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes record state
    setData((current) => (current?.opportunityId === opportunityId ? current : null));
    setError("");
    void load().catch(() => setLoadError("failed"));
  }, [enabled, opportunityId, load]);

  const refresh = useCallback(async () => {
    const refreshed = await load().catch(() => null);
    if (refreshed) onChangedRef.current?.(refreshed);
    return refreshed;
  }, [load]);

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

  async function send(body: Record<string, unknown>, successMessage: string) {
    if (!data || !opportunityId) return false;
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
      await refresh();
      toast.success(successMessage);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your update could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function recordStatus(
    nextStatus: MyStatus,
    occurredOn: string,
    note: string,
    emailCandidateId?: string,
  ) {
    return send(
      {
        action: "record",
        status: nextStatus,
        occurredOn,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        note,
        ...(emailCandidateId ? { emailCandidateId } : {}),
      },
      `${STATUS_LABELS[nextStatus]} recorded`,
    );
  }

  async function linkWork(workId: string) {
    if (!data || !opportunityId) return;
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
      await refresh();
      toast.success(workId ? "Work linked" : "Work link removed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Work link could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  function openDialog(mode: DialogMode) {
    if (!data) return;
    setError("");
    setWhen(today());
    setRecordNote("");
    setEvidenceId(undefined);
    if (mode === "notes") setNotes(data.notes);
    if (mode === "submission") setStatus("submitted");
    if (mode === "response")
      setStatus(RESPONSE_STATUSES.includes(data.myStatus) ? data.myStatus : "received");
    if (mode === "correction") setStatus(data.myStatus);
    setDialog(mode);
  }

  /** Open "Record a response" prefilled from a forwarded email; the creator still confirms. */
  function reviewEmailResponse(evidence: {
    id: string;
    receivedAt: string;
    proposedStatus?: MyStatus | null;
  }) {
    openDialog("response");
    if (evidence.proposedStatus && RESPONSE_STATUSES.includes(evidence.proposedStatus))
      setStatus(evidence.proposedStatus);
    setWhen(emailDay(evidence.receivedAt));
    setEvidenceId(evidence.id);
  }

  return {
    opportunityId,
    data,
    loadError,
    error,
    busy,
    hosted,
    lifecycle,
    beforeSubmission: data ? isBeforeSubmission(data.myStatus) && !hosted : false,
    reload: () => void load().catch(() => setLoadError("failed")),
    refresh,
    recordStatus,
    linkWork,
    openDialog,
    reviewEmailResponse,
    dialogState: {
      dialog,
      setDialog,
      notes,
      setNotes,
      status,
      setStatus,
      when,
      setWhen,
      recordNote,
      setRecordNote,
      evidenceId,
      send,
    },
  };
}

/** Next step, email evidence, and the lifecycle with who recorded each step. */
export function RecordProgress({
  record,
  emailEvidence,
}: {
  record: ApplicationRecordState;
  emailEvidence: boolean;
}) {
  const { data, loadError, hosted, busy, beforeSubmission } = record;
  if (loadError === "unavailable" || loadError === "missing") return null;
  if (loadError === "failed")
    return (
      <Alert variant="destructive">
        <AlertTitle>Your application record could not load</AlertTitle>
        <AlertDescription>
          Check your connection, then try again. Nothing has changed.
        </AlertDescription>
        <Button variant="outline" className="mt-3 w-fit" onClick={record.reload}>
          <RefreshCw />
          Try again
        </Button>
      </Alert>
    );
  if (!data)
    return (
      <div className="space-y-3" role="status" aria-label="Loading your application record">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-28 w-full" />
      </div>
    );

  const move = nextMove({
    status: data.myStatus,
    checklist: data.preparationTotal
      ? { total: data.preparationTotal, done: data.preparationDone ?? 0 }
      : undefined,
    hosted: Boolean(hosted),
  });

  return (
    <section aria-labelledby="sheet-progress-title" className="space-y-5">
      <SheetSectionHeading id="sheet-progress-title" eyebrow="Progress">
        {move.label}
      </SheetSectionHeading>
      <p className="text-sm text-muted-foreground">{move.reason}</p>

      {!data.available ? (
        <Alert>
          <AlertTitle>The public listing is unavailable</AlertTitle>
          <AlertDescription>
            Your application, notes, and history remain here.
          </AlertDescription>
        </Alert>
      ) : null}

      {record.error && !record.dialogState.dialog ? (
        <Alert variant="destructive">
          <AlertDescription>{record.error}</AlertDescription>
        </Alert>
      ) : null}

      {emailEvidence && !hosted && record.opportunityId ? (
        <ApplicationEmailEvidence
          opportunityId={record.opportunityId}
          beforeSubmission={beforeSubmission}
          busy={busy}
          onConfirmSubmission={(evidence) =>
            record.recordStatus("submitted", emailDay(evidence.receivedAt), "", evidence.id)
          }
          onReviewResponse={record.reviewEmailResponse}
        />
      ) : null}

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
            onClick={() => void record.recordStatus("preparing", today(), "")}
          >
            Start preparing
          </Button>
        ) : move.kind === "mark-ready" ? (
          <Button
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={() => void record.recordStatus("ready-to-submit", today(), "")}
          >
            <Check />
            Mark ready
          </Button>
        ) : move.kind === "record-submission" ? (
          <Button onClick={() => record.openDialog("submission")}>
            <FileCheck2 />
            Record submission
          </Button>
        ) : move.kind === "record-response" ? (
          <Button onClick={() => record.openDialog("response")}>
            <Inbox />
            Record a response
          </Button>
        ) : null}
        {beforeSubmission && move.kind !== "record-submission" ? (
          <Button variant="outline" onClick={() => record.openDialog("submission")}>
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
        ) : null}
      </div>
      {beforeSubmission && data.applyUrl ? (
        <p className="text-xs text-muted-foreground">
          Opening the official application never marks it submitted. Record the
          submission here after you send it.
        </p>
      ) : null}

      <LifecycleTimeline steps={record.lifecycle} />

      {!beforeSubmission ? (
        <TrackerResponseForecaster
          opportunityId={data.opportunityId}
          organizationName={data.organizationName}
          submittedAt={data.submittedAt}
          myStatus={data.myStatus}
        />
      ) : null}
    </section>
  );
}

/** Linked Work, the hosted receipt, and what was preserved at submission. */
export function RecordMaterials({
  record,
  works,
}: {
  record: ApplicationRecordState;
  works: Array<{ id: string; title: string }>;
}) {
  const { data, hosted, busy, beforeSubmission } = record;
  if (!data) return null;
  return (
    <section aria-labelledby="sheet-materials-title" className="space-y-5">
      <SheetSectionHeading id="sheet-materials-title" eyebrow="Materials">
        {beforeSubmission ? "What you will send" : "What you sent"}
      </SheetSectionHeading>

      {beforeSubmission && works.length ? (
        <Field>
          <FieldLabel htmlFor="sheet-linked-work">Work for this application</FieldLabel>
          <NativeSelect
            id="sheet-linked-work"
            value={data.workId ?? ""}
            disabled={busy}
            onChange={(event) => void record.linkWork(event.target.value)}
          >
            <option value="">Not linked</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.title}
              </option>
            ))}
          </NativeSelect>
          <FieldDescription>
            The Work’s Library version is preserved when you record the submission.
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

      {hosted ? <HostedReceiptSummary hosted={hosted} /> : null}

      <div className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium">Preserved at submission</h4>
          <p className="text-sm text-muted-foreground">
            The exact Works, files, and saved answers linked when you recorded the
            submission. Later Library edits never change them.
          </p>
        </div>
        {data.materials.length ? (
          data.materials.map((version) => (
            <div key={version.id} className="space-y-3 rounded-lg border border-border p-4">
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
                  No Library materials were linked when this submission was recorded.
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
      </div>
    </section>
  );
}

/** Private notes and the goals this application counts toward. */
export function RecordNotes({ record }: { record: ApplicationRecordState }) {
  const { data } = record;
  if (!data) return null;
  return (
    <section aria-labelledby="sheet-notes-title" className="space-y-4">
      <SheetSectionHeading id="sheet-notes-title" eyebrow="Notes">
        Private to you
      </SheetSectionHeading>
      {data.notes ? (
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{data.notes}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Keep a question, a contact, or a detail for next time.
        </p>
      )}
      <Button variant="outline" onClick={() => record.openDialog("notes")}>
        <NotebookPen />
        {data.notes ? "Edit notes" : "Add notes"}
      </Button>
      <div className="space-y-1">
        {data.goals.length ? (
          data.goals.map((goal) => (
            <Link
              key={goal.id}
              href={`/goals?goal=${encodeURIComponent(goal.id)}`}
              className="flex min-h-11 items-center gap-3 text-sm text-primary"
            >
              <Target className="size-4" aria-hidden="true" />
              Counts toward {goal.title}
              <ArrowRight className="ms-auto size-4 shrink-0" aria-hidden="true" />
            </Link>
          ))
        ) : (
          <Link href="/goals" className="flex min-h-11 items-center gap-3 text-sm text-primary">
            <Target className="size-4" aria-hidden="true" />
            Count this application toward a goal
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}

/** Dated status history with provenance, and the correction dialog's entry point. */
export function RecordHistory({ record }: { record: ApplicationRecordState }) {
  const { data } = record;
  if (!data) return null;
  return (
    <section aria-labelledby="sheet-history-title" className="space-y-4">
      <SheetSectionHeading id="sheet-history-title" eyebrow="History">
        What has been recorded
      </SheetSectionHeading>
      {data.history.length ? (
        <ol className="space-y-5 border-s border-border ps-5">
          {data.history.map((event) => {
            const provenance = eventProvenance(event);
            const Icon = PROVENANCE_ICON[provenance.kind];
            return (
              <li key={event.id} className="space-y-1">
                <p className="text-sm font-medium">
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
                  <p className="text-sm break-words whitespace-pre-wrap">{event.note}</p>
                ) : null}
                {event.hasMaterials ? (
                  <a
                    href="#sheet-materials-title"
                    className="inline-flex min-h-11 items-center text-xs text-primary underline underline-offset-4"
                  >
                    Materials preserved with this update
                  </a>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">No updates recorded yet.</p>
      )}
      <Button variant="ghost" onClick={() => record.openDialog("correction")}>
        <History />
        Correct the record
      </Button>
    </section>
  );
}

/** The record's one dialog: notes, submission, response, or correction. */
export function RecordDialog({ record }: { record: ApplicationRecordState }) {
  const { data, busy, error } = record;
  const state = record.dialogState;
  // Keep the last mode on screen while the dialog animates closed, so its
  // title and fields do not flash to another mode on the way out.
  const [shownDialog, setShownDialog] = useState(state.dialog);
  if (state.dialog && state.dialog !== shownDialog) setShownDialog(state.dialog);
  const dialog = state.dialog ?? shownDialog;
  if (!data) return null;
  return (
    <Dialog
      open={state.dialog !== null}
      onOpenChange={(open) => {
        if (!open && !busy) state.setDialog(null);
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
                ? state.send({ action: "notes", notes: state.notes }, "Notes saved")
                : record.recordStatus(state.status, state.when, state.recordNote, state.evidenceId);
            void done.then((ok) => {
              if (ok) state.setDialog(null);
            });
          }}
        >
          {dialog === "notes" ? (
            <Field>
              <FieldLabel htmlFor="record-notes">Notes</FieldLabel>
              <Textarea
                id="record-notes"
                value={state.notes}
                onChange={(event) => state.setNotes(event.target.value)}
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
                    value={state.status}
                    onChange={(event) => state.setStatus(event.target.value as MyStatus)}
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
                  value={state.when}
                  max={today()}
                  onChange={(event) => state.setWhen(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="record-note">
                  {dialog === "submission" ? "Evidence (optional)" : "Note (optional)"}
                </FieldLabel>
                <Textarea
                  id="record-note"
                  value={state.recordNote}
                  onChange={(event) => state.setRecordNote(event.target.value)}
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
                    Linked Works, files, and saved answers are preserved as they are
                    now. Preparation reminders stop.
                  </FieldDescription>
                ) : null}
              </Field>
            </>
          )}
          {state.evidenceId ? (
            <p className="text-xs text-muted-foreground">
              Recorded with the matching email as evidence. Check the status before
              saving; Missa only suggested it.
            </p>
          ) : null}
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
              onClick={() => state.setDialog(null)}
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
  );
}

function LifecycleTimeline({ steps }: { steps: LifecycleStepView[] }) {
  return (
    <div className="space-y-3">
      <h4 id="sheet-lifecycle-title" className="text-sm font-medium">
        Where this stands
      </h4>
      <ol aria-labelledby="sheet-lifecycle-title" className="space-y-0">
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
                      ? "absolute start-3 top-7 bottom-1 w-px -translate-x-1/2 bg-primary rtl:translate-x-1/2"
                      : "absolute start-3 top-7 bottom-1 w-px -translate-x-1/2 bg-border rtl:translate-x-1/2"
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
    </div>
  );
}

function HostedReceiptSummary({ hosted }: { hosted: TrackerHostedSubmission }) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileCheck2 className="size-4" aria-hidden="true" />
        Confirmed by a Missa-hosted submission ·{" "}
        <span className="font-mono tabular-nums">{applicationDate(hosted.submittedAt)}</span>
      </p>
      <h4 className="text-sm font-medium">Submission receipt</h4>
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
    </div>
  );
}
