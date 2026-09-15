"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApplicationReminder } from "@/lib/creator-reminders";
import type { ApplicationSummary } from "@/lib/application-workspace-types";
import {
  applicationDate,
  applicationView,
} from "@/lib/application-workspace-types";
import {
  DEFAULT_REMINDER_TIME,
  firstViableDeadlineSchedule,
  isAhead,
  isBeforeDeadlineClose,
  reminderDateForOffset,
  viableTimeOfDay,
} from "@/lib/reminder-schedule";
import { toast } from "sonner";

/** Reminder days offered for the deadline default, nearest useful day first. */
const DEADLINE_DEFAULT_OFFSETS = [7, 3, 1, 0];

function nextMorning() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T09:00`;
}
function closingLabel(iso: string, timeZone: string | null) {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  try {
    return new Intl.DateTimeFormat("en", {
      ...options,
      ...(timeZone ? { timeZone } : {}),
    }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en", options).format(new Date(iso));
  }
}
function whenLabel(item: ApplicationReminder) {
  if (item.state === "needs-review") return "Deadline needs review";
  if (item.state === "suppressed") return "Not sent · reminders were off";
  if (item.state === "expired") return "Deadline has passed";
  if (!item.dueAt) return "Sent to your Inbox";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: item.timezone,
    timeZoneName: "short",
  }).format(new Date(item.dueAt));
}

export function ApplicationReminders({
  application,
}: {
  application?: ApplicationSummary;
}) {
  const params = useSearchParams(),
    openedReminder = useRef<string | null>(null);
  const [items, setItems] = useState<ApplicationReminder[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"new" | ApplicationReminder | null>(
      null,
    ),
    [kind, setKind] = useState("preparation");
  const [title, setTitle] = useState(""),
    [when, setWhen] = useState(""),
    [repeat, setRepeat] = useState(0),
    [offset, setOffset] = useState(7),
    [timeOfDay, setTimeOfDay] = useState(DEFAULT_REMINDER_TIME),
    [dialogOpenedAt, setDialogOpenedAt] = useState(0);
  const request = useRef<{ signature: string; key: string } | null>(null);
  const preparing =
    application && applicationView(application.myStatus) === "saved";
  const canAdd =
    application && applicationView(application.myStatus) !== "history";
  const deadlineDay =
    dialog === "new" && application?.deadline
      ? reminderDateForOffset(application.deadline, offset)
      : null;
  const deadlineAhead = deadlineDay
    ? isAhead(deadlineDay, timeOfDay, new Date(dialogOpenedAt))
    : true;
  const deadlineBeforeClose = deadlineDay
    ? isBeforeDeadlineClose(deadlineDay, timeOfDay, application?.deadlineTime)
    : true;
  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/me/reminders${application ? `?application=${encodeURIComponent(application.opportunityId)}` : ""}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error();
      setItems((await response.json()).reminders);
      setError("");
    } catch {
      setError("Your reminders could not load. Try again.");
    }
  }, [application]);
  useEffect(() => {
    // Load reminders when the application context changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes reminder state
    void load();
  }, [load]);
  useEffect(() => {
    const id = params.get("reminder");
    if (id && items && openedReminder.current !== id) {
      const item = items.find((i) => i.id === id);
      if (item) {
        openedReminder.current = id;
        setDialog(item); // eslint-disable-line react-hooks/set-state-in-effect
      }
    }
  }, [params, items]);

  async function mutate(body: object, item?: ApplicationReminder) {
    setBusy(true);
    setError("");
    const signature = JSON.stringify([body, item?.id, item?.revision]);
    if (request.current?.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    try {
      const response = await fetch(
        `/api/me/reminders${item ? `/${item.id}` : ""}`,
        {
          method: item ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": request.current.key,
            ...(item ? { "If-Match": String(item.revision) } : {}),
          },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The reminder could not be saved.");
      request.current = null;
      await load();
      setDialog(null);
      toast.success(item ? "Reminder updated" : "Reminder set");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The reminder could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  const scheduled =
    items?.filter((i) => ["scheduled", "needs-review"].includes(i.state)) ?? [];
  return (
    <section
      className="space-y-4 border-t border-border pt-6"
      aria-labelledby={
        application ? "application-reminders-title" : "planned-reminders-title"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id={
            application
              ? "application-reminders-title"
              : "planned-reminders-title"
          }
          className="font-sans text-xl font-semibold"
        >
          {application ? "Reminders" : "Coming up"}
        </h2>
        {canAdd ? (
          <Button
            variant="ghost"
            onClick={() => {
              setKind(preparing ? "preparation" : "response");
              setTitle(
                preparing ? "Prepare my application" : "Check for a response",
              );
              setWhen(nextMorning());
              setRepeat(0);
              setDialogOpenedAt(Date.now());
              // Seed the deadline defaults so a deadline that is already today
              // opens on a time that is still ahead instead of the 9am default.
              if (application?.deadline) {
                const now = new Date();
                const schedule = firstViableDeadlineSchedule(
                  application.deadline,
                  now,
                  DEADLINE_DEFAULT_OFFSETS,
                  application.deadlineTime,
                ) ?? {
                  offsetDays: 0,
                  timeOfDay: viableTimeOfDay(application.deadline, now),
                };
                setOffset(schedule.offsetDays);
                setTimeOfDay(schedule.timeOfDay);
              } else {
                setTimeOfDay(DEFAULT_REMINDER_TIME);
              }
              setError("");
              setDialog("new");
            }}
          >
            <BellPlus />
            Set reminder
          </Button>
        ) : null}
      </div>
      {!items && !error ? (
        <div role="status" aria-label="Loading reminders">
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}
      {error && !dialog ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
          <Button variant="ghost" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}
      {scheduled.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            setError("");
            setDialog(item);
          }}
          className="flex w-full items-start gap-4 border-b border-border py-4 text-start outline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Bell className="mt-1 size-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{item.title}</span>
            {!application ? (
              <span className="mt-1 block text-sm text-muted-foreground">
                {item.applicationTitle}
              </span>
            ) : null}
            <span className="mt-2 block text-xs text-muted-foreground">
              {whenLabel(item)}
              {item.repeatDays ? ` · Every ${item.repeatDays} days` : ""}
            </span>
            {!item.inAppEnabled ? (
              <span className="mt-2 block text-xs text-muted-foreground">
                Paused by your notification settings
              </span>
            ) : null}
          </span>
          <ArrowRight className="mt-1 size-4 shrink-0" />
        </button>
      ))}
      {items && !scheduled.length ? (
        <p className="text-sm text-muted-foreground">
          {application
            ? "No upcoming reminders."
            : "Your scheduled application reminders will appear here."}
        </p>
      ) : null}
      {!application ? (
        <Link
          href="/tracker?view=saved"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-primary"
        >
          Plan an application
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogTitle className="text-xl">
            {dialog === "new" ? "Set a reminder" : dialog?.title}
          </DialogTitle>
          <DialogDescription>
            {application?.title ??
              (dialog && dialog !== "new" ? dialog.applicationTitle : "")}
          </DialogDescription>
          {dialog === "new" && application ? (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                const timezone =
                  Intl.DateTimeFormat().resolvedOptions().timeZone;
                void mutate(
                  kind === "deadline"
                    ? {
                        opportunityId: application.opportunityId,
                        kind,
                        offsetDays: offset,
                        timeOfDay,
                        timezone,
                      }
                    : {
                        opportunityId: application.opportunityId,
                        kind,
                        title,
                        dueAt: new Date(when).toISOString(),
                        repeatDays: repeat,
                        timezone,
                      },
                );
              }}
            >
              {preparing &&
              application.deadline &&
              ["fixed", "exact"].includes(application.deadlineKind) ? (
                <Field>
                  <FieldLabel htmlFor="reminder-kind">
                    Remind me about
                  </FieldLabel>
                  <NativeSelect
                    id="reminder-kind"
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="preparation">
                      Preparing my application
                    </option>
                    <option value="deadline">The application deadline</option>
                  </NativeSelect>
                </Field>
              ) : null}
              {kind === "deadline" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Apply by {applicationDate(application.deadline)}. This
                    reminder follows changes to the confirmed deadline.
                  </p>
                  <Field>
                    <FieldLabel htmlFor="reminder-offset">When</FieldLabel>
                    <NativeSelect
                      id="reminder-offset"
                      value={offset}
                      onChange={(e) => {
                        const nextOffset = Number(e.target.value);
                        setOffset(nextOffset);
                        if (!application.deadline) return;
                        const schedule = firstViableDeadlineSchedule(
                          application.deadline,
                          new Date(dialogOpenedAt),
                          [nextOffset],
                          application.deadlineTime,
                        );
                        if (schedule) setTimeOfDay(schedule.timeOfDay);
                      }}
                    >
                      {[
                        [14, "Two weeks before"],
                        [7, "A week before"],
                        [3, "Three days before"],
                        [1, "The day before"],
                        [0, "On the day"],
                      ].map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field data-invalid={!deadlineAhead || !deadlineBeforeClose}>
                    <FieldLabel htmlFor="reminder-time">Time</FieldLabel>
                    <Input
                      id="reminder-time"
                      type="time"
                      value={timeOfDay}
                      onChange={(event) => setTimeOfDay(event.target.value)}
                      required
                      step={60}
                      aria-invalid={!deadlineAhead || !deadlineBeforeClose}
                      aria-describedby="reminder-time-description"
                    />
                    <FieldDescription id="reminder-time-description">
                      {application.deadlineTime
                        ? `The provider closes applications at ${closingLabel(application.deadlineTime, application.deadlineTimezone)}.`
                        : "No closing time is stated, so Missa uses the end of the deadline day."}
                    </FieldDescription>
                    {!deadlineAhead ? (
                      <p role="alert" className="text-sm text-destructive">
                        Choose a reminder time that is still ahead.
                      </p>
                    ) : !deadlineBeforeClose ? (
                      <p role="alert" className="text-sm text-destructive">
                        Choose a time before the application closes.
                      </p>
                    ) : null}
                  </Field>
                </>
              ) : (
                <>
                  <Field>
                    <FieldLabel htmlFor="reminder-title">
                      What do you want to do?
                    </FieldLabel>
                    <Input
                      id="reminder-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      maxLength={160}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="reminder-when">When</FieldLabel>
                    <Input
                      id="reminder-when"
                      type="datetime-local"
                      value={when}
                      onChange={(e) => setWhen(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="reminder-repeat">Repeat</FieldLabel>
                    <NativeSelect
                      id="reminder-repeat"
                      value={repeat}
                      onChange={(e) => setRepeat(Number(e.target.value))}
                    >
                      <option value={0}>Just once</option>
                      <option value={7}>Every week</option>
                      <option value={14}>Every two weeks</option>
                      <option value={30}>Every 30 days</option>
                    </NativeSelect>
                  </Field>
                </>
              )}
              <p className="text-xs text-muted-foreground">
                Appears in your Missa Inbox.{" "}
                {kind === "response"
                  ? "Check-ins stop when you record an outcome."
                  : "Preparation reminders stop when you record a submission."}
              </p>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    busy ||
                    (kind === "deadline" &&
                      (!deadlineAhead || !deadlineBeforeClose))
                  }
                >
                  {busy ? "Saving…" : "Set reminder"}
                </Button>
              </div>
            </form>
          ) : dialog && dialog !== "new" ? (
            <div className="space-y-5">
              <p className="text-sm">{whenLabel(dialog)}</p>
              {!dialog.inAppEnabled ? (
                <p className="text-sm text-muted-foreground">
                  Turn on in-app reminders in{" "}
                  <Link
                    href="/inbox#notification-preferences-title"
                    className="text-primary underline"
                  >
                    notification settings
                  </Link>{" "}
                  to receive this.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                {dialog.state !== "needs-review" ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void mutate({ action: "snooze", days: 1 }, dialog)
                      }
                    >
                      Tomorrow
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void mutate({ action: "snooze", days: 7 }, dialog)
                      }
                    >
                      In a week
                    </Button>
                  </>
                ) : null}
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void mutate({ action: "cancel" }, dialog)}
                >
                  Cancel reminder
                </Button>
              </div>
              <Link
                href={`/tracker?view=${dialog.kind === "response" ? "awaiting" : "saved"}&application=${encodeURIComponent(dialog.opportunityId)}`}
                className="inline-flex min-h-11 items-center gap-2 text-sm text-primary"
                onClick={() => setDialog(null)}
              >
                Open application
                <ArrowRight className="size-4" />
              </Link>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
