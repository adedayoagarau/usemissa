"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountBadge } from "@/components/missa/count-badge";
import { ApplicationStateBadge } from "@/components/missa/application-state-badge";
import type {
  HomeGoalPace,
  HomeRow,
  HomeWeek,
  HomeWeekEvent,
} from "@/lib/creator-home";
import type { StartByReason } from "@/lib/start-by";

type ChecklistItem = {
  id: string;
  label: string;
  state: "missing" | "ready" | "complete" | "not-applicable";
  revision: number;
};

/**
 * The lead move's open preparation steps, completed in place through the same
 * checklist API the Tracker record uses. Home re-reads Tracker state after
 * every save, so start-by, runway, and ranking stay derived.
 */
export function HomeNextSteps({
  opportunityId,
  title,
  reasons,
  href,
}: {
  opportunityId: string;
  title: string;
  reasons: StartByReason[];
  href: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const keys = useRef(new Map<string, string>());

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/me/opportunities/${encodeURIComponent(opportunityId)}/checklist`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { items: ChecklistItem[] };
      setItems(data.items.filter((item) => item.state !== "not-applicable"));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [opportunityId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes checklist state
    void load();
  }, [load]);

  async function toggle(item: ChecklistItem) {
    const complete = item.state !== "complete" && item.state !== "ready";
    const signature = `${item.id}:${item.revision}:${complete}`;
    const key = keys.current.get(signature) ?? crypto.randomUUID();
    keys.current.set(signature, key);
    setBusy(item.id);
    setItems(
      (current) =>
        current?.map((entry) =>
          entry.id === item.id
            ? { ...entry, state: complete ? "complete" : "missing" }
            : entry,
        ) ?? null,
    );
    try {
      const response = await fetch(`/api/me/checklist-items/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
          "If-Match": String(item.revision),
        },
        body: JSON.stringify({ state: complete ? "complete" : "missing" }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "That step could not be saved.");
      }
      keys.current.delete(signature);
      toast.success(
        complete
          ? "Step done. Missa updated the start-by date."
          : "Step reopened",
      );
      await load();
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "That step could not be saved.",
      );
      await load();
    } finally {
      setBusy(null);
    }
  }

  const detailFor = (label: string) =>
    reasons.find((reason) => reason.label === label)?.detail;

  if (failed)
    return (
      <p className="text-sm text-muted-foreground">
        Your steps could not load.{" "}
        <Button variant="link" onClick={() => void load()}>
          Try again
        </Button>
      </p>
    );
  if (!items)
    return (
      <div
        className="flex flex-col gap-3"
        aria-busy="true"
        aria-label="Loading next steps"
      >
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );

  const open = items.filter((item) => item.state === "missing");
  const done = items.length - open.length;
  const shown = [
    ...open.slice(0, 3),
    ...items.filter((item) => item.state !== "missing"),
  ].slice(0, 3);

  return (
    <div className="flex flex-col gap-3">
      <h4 className="flex items-baseline justify-between gap-3 text-sm font-semibold">
        <span>Next steps</span>
        <span className="font-normal text-muted-foreground">
          <span className="font-mono tabular-nums">{done}</span> of{" "}
          <span className="font-mono tabular-nums">{items.length}</span> ready
        </span>
      </h4>
      {items.length === 0 ? (
        <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          No steps listed yet. Add what this call asks for and Missa will work
          out when to start.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((item) => {
            const checked = item.state === "complete" || item.state === "ready";
            const detail = detailFor(item.label);
            return (
              <li key={item.id}>
                <label
                  className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-lg p-3 ${checked ? "bg-accent-tint" : "bg-muted/60"}`}
                >
                  <Checkbox
                    checked={checked}
                    disabled={busy === item.id}
                    onCheckedChange={() => void toggle(item)}
                    aria-label={`${item.label} for ${title}`}
                    className="mt-0.5"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={`text-sm font-semibold ${checked ? "text-muted-foreground line-through" : ""}`}
                    >
                      {item.label}
                    </span>
                    {detail && !checked ? (
                      <span className="text-xs text-muted-foreground">
                        {detail}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href={href}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        {open.length > 3 ? `All ${items.length} steps` : "Open the full record"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

/**
 * "Have you heard back?" for a response check-in. "Not yet" snoozes the
 * reminder by a week through the reminders API; "Yes" opens the record, where
 * the answer is recorded with its date.
 */
export function HomeCheckIn({
  reminder,
  href,
  title,
  primary = false,
}: {
  reminder?: { id: string; revision: number };
  href: string;
  title: string;
  /** The lead move carries the page's one Forest action. */
  primary?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const key = useRef<string | null>(null);

  async function notYet() {
    if (!reminder) return;
    key.current ??= crypto.randomUUID();
    setPending(true);
    try {
      const response = await fetch(`/api/me/reminders/${reminder.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key.current,
          "If-Match": String(reminder.revision),
        },
        body: JSON.stringify({ action: "snooze", days: 7 }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          body.error ?? "The check-in could not be moved. Try again.",
        );
      }
      key.current = null;
      toast.success("Still waiting. Missa will ask again in a week.");
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The check-in could not be moved. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="pb-2 text-sm font-semibold">
        Have you heard back?
      </legend>
      <div className="flex flex-wrap gap-3">
        <Link
          href={href}
          className={cn(
            buttonVariants({ variant: primary ? "default" : "outline" }),
          )}
        >
          Yes, record the answer
          <span className="sr-only"> for {title}</span>
        </Link>
        {reminder ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => void notYet()}
          >
            {pending ? "Saving…" : "Not yet"}
          </Button>
        ) : null}
      </div>
    </fieldset>
  );
}

/** How the goal's pace is judged, one click away. */
export function GoalPaceExplanation({ pace }: { pace: HomeGoalPace }) {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="sm" className="self-start" />}
      >
        <Info aria-hidden="true" />
        How pace is worked out
      </PopoverTrigger>
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>{pace.goal.title}</PopoverTitle>
          <PopoverDescription>
            Worked out from your Tracker today.
          </PopoverDescription>
        </PopoverHeader>
        <ul className="flex flex-col gap-2 text-sm">
          {pace.explanation.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

const MARKER: Record<HomeWeekEvent["kind"], string> = {
  overdue: "size-2 rounded-xs bg-ochre",
  closes: "size-2 rounded-xs bg-ochre",
  "start-by": "size-2 rounded-full bg-primary",
  "check-in": "size-2 rounded-xs border-2 border-mineral-blue",
  submitted: "size-2 rounded-full border border-muted-foreground",
};

function dayLabel(date: string, isToday: boolean) {
  const value = new Date(`${date}T12:00:00Z`);
  return {
    name: isToday
      ? "Today"
      : new Intl.DateTimeFormat("en", {
          weekday: "short",
          timeZone: "UTC",
        }).format(value),
    number: new Intl.DateTimeFormat("en", {
      day: "numeric",
      timeZone: "UTC",
    }).format(value),
    long: new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(value),
  };
}

function EventRow({ event }: { event: HomeWeekEvent }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border py-3 last:border-b-0">
      <ApplicationStateBadge tone={event.tone}>
        {event.label}
      </ApplicationStateBadge>
      <span className="min-w-0 flex-[1_1_16rem]">
        <span className="block font-heading text-base break-words">
          {event.title}
        </span>
        <span className="block text-sm text-muted-foreground">
          {event.detail}
        </span>
      </span>
      <Link
        href={event.href}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        Open record
        <span className="sr-only">: {event.title}</span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** Seven day tiles and "Later"; choosing one shows what falls on it. */
export function HomeWeekView({
  week,
  quietHint,
}: {
  week: HomeWeek;
  quietHint: string;
}) {
  const [value, setValue] = useState<string>(week.days[0]?.date ?? "later");
  return (
    <Tabs
      value={value}
      onValueChange={(next) => next && setValue(String(next))}
    >
      <TabsList variant="tiles" size="auto" aria-label="Days this week">
        {week.days.map((day) => {
          const label = dayLabel(day.date, day.isToday);
          const counted = day.events.filter(
            (event) => event.kind !== "submitted",
          ).length;
          return (
            <TabsTrigger
              key={day.date}
              value={day.date}
              aria-label={`${label.long}: ${counted ? `${counted} to note` : "nothing due"}`}
            >
              <span className="flex items-baseline justify-between gap-1 text-xs font-semibold">
                <span className={day.isToday ? "text-primary" : ""}>
                  {label.name}
                </span>
                <span className="font-mono font-normal tabular-nums">
                  {label.number}
                </span>
              </span>
              <span className="flex min-h-2 flex-wrap gap-1" aria-hidden="true">
                {day.events.map((event) => (
                  <span
                    key={`${event.kind}-${event.opportunityId}`}
                    className={MARKER[event.kind]}
                  />
                ))}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {counted ? `${counted} to note` : "Free"}
              </span>
            </TabsTrigger>
          );
        })}
        <TabsTrigger
          value="later"
          aria-label={`After this week: ${week.later.length} deadlines`}
        >
          <span className="text-xs font-semibold">Later</span>
          <span className="flex min-h-2 flex-wrap gap-1" aria-hidden="true">
            {week.later.map((event) => (
              <span key={event.opportunityId} className={MARKER.closes} />
            ))}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {week.later.length
              ? `${week.later.length} ${week.later.length === 1 ? "deadline" : "deadlines"}`
              : "Clear"}
          </span>
        </TabsTrigger>
      </TabsList>
      {week.days.map((day) => (
        <TabsContent key={day.date} value={day.date}>
          <div className="rounded-xl border border-border px-6 py-2">
            {day.events.length ? (
              <ul>
                {day.events.map((event) => (
                  <EventRow
                    key={`${event.kind}-${event.opportunityId}`}
                    event={event}
                  />
                ))}
              </ul>
            ) : (
              <p className="py-5 text-sm text-muted-foreground">
                Nothing falls on {dayLabel(day.date, day.isToday).long}.{" "}
                {quietHint}
              </p>
            )}
          </div>
        </TabsContent>
      ))}
      <TabsContent value="later">
        <div className="rounded-xl border border-border px-6 py-2">
          {week.later.length ? (
            <ul>
              {week.later.map((event) => (
                <EventRow key={event.opportunityId} event={event} />
              ))}
            </ul>
          ) : (
            <p className="py-5 text-sm text-muted-foreground">
              No saved call closes in the next 30 days.
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function TrackerRow({ row }: { row: HomeRow }) {
  return (
    <li>
      <Link
        href={row.href}
        className="-mx-2 flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border-b border-border px-2 py-3 text-foreground hover:bg-muted/60 sm:flex-nowrap"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-base break-words">
            {row.title}
          </span>
          <span className="block text-sm text-muted-foreground">
            {row.organizationName ? `${row.organizationName} · ` : ""}
            {row.detail}
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5 sm:w-44 sm:flex-none sm:items-end">
          {row.status ? (
            <ApplicationStateBadge tone={row.status.tone}>
              {row.status.label}
            </ApplicationStateBadge>
          ) : null}
          {row.progress ? (
            <span className="flex w-full flex-col gap-1">
              <span className="text-xs text-muted-foreground sm:text-end">
                <span className="font-mono tabular-nums">
                  {row.progress.done}
                </span>{" "}
                of{" "}
                <span className="font-mono tabular-nums">
                  {row.progress.total}
                </span>{" "}
                steps
              </span>
              <span
                aria-hidden="true"
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{
                    width: `${(row.progress.done / Math.max(1, row.progress.total)) * 100}%`,
                  }}
                />
              </span>
            </span>
          ) : null}
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

/** Preparing, Awaiting, and Decided as peer views of the same Tracker. */
export function HomeTrackerTabs({
  preparing,
  awaiting,
  decided,
}: {
  preparing: HomeRow[];
  awaiting: HomeRow[];
  decided: HomeRow[];
}) {
  const tabs: Array<{
    value: string;
    label: string;
    rows: HomeRow[];
    empty: string;
  }> = [
    {
      value: "preparing",
      label: "Preparing",
      rows: preparing,
      empty: "Nothing in preparation. Start a saved call from your Tracker.",
    },
    {
      value: "awaiting",
      label: "Awaiting",
      rows: awaiting,
      empty: "Nothing is waiting on a response.",
    },
    {
      value: "decided",
      label: "Decided",
      rows: decided,
      empty: "No decisions in the last 30 days.",
    },
  ];
  const first = tabs.find((tab) => tab.rows.length)?.value ?? "preparing";
  return (
    <Tabs defaultValue={first}>
      <TabsList variant="line" aria-label="Tracker stages">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} size="touch">
            {tab.label}
            <CountBadge
              count={tab.rows.length}
              label={tab.label.toLowerCase()}
            />
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.rows.length ? (
            <ul className="border-t border-border">
              {tab.rows.map((row) => (
                <TrackerRow key={row.opportunityId} row={row} />
              ))}
            </ul>
          ) : (
            <p className="border-t border-border py-5 text-sm text-muted-foreground">
              {tab.empty}
            </p>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
