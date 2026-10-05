"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarCheck2, CalendarDays, CalendarX2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { ApplicationCalendarDelivery } from "@/lib/application-workspace-types";

const PROVIDER_NAMES = { google: "Google Calendar", microsoft: "Outlook Calendar" } as const;

function eventWhen(startAt: string, allDay: boolean) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    ...(allDay ? { timeZone: "UTC" } : { hour: "numeric", minute: "2-digit" }),
  }).format(new Date(startAt));
}

/**
 * Where this application's dates are delivered: the private deadline feed,
 * each connected calendar, and the preparation sessions planned for it.
 * Sync state is shown only as reported by the provider queue.
 */
export function ApplicationCalendarDeliveryPanel({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const [data, setData] = useState<ApplicationCalendarDelivery | null>(null);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState<string>();

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/me/applications/${encodeURIComponent(opportunityId)}/calendar`,
        { cache: "no-store" },
      );
      if (response.status === 503) {
        setError("unavailable");
        return;
      }
      if (!response.ok) throw new Error();
      setData(await response.json());
      setError("");
    } catch {
      setError("Calendar delivery could not load.");
    }
  }, [opportunityId]);

  useEffect(() => {
    // Load delivery state from the server when the application changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes delivery state
    void load();
  }, [load]);

  async function retry(eventId: string) {
    setRetrying(eventId);
    try {
      const response = await fetch("/api/me/calendar/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "We could not retry this sync.");
      toast.success("Sync queued again");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "We could not retry this sync.");
    } finally {
      setRetrying(undefined);
    }
  }

  return (
    <section aria-labelledby="record-calendar-title" className="space-y-4">
      <div className="space-y-1">
        <h3 id="record-calendar-title" className="text-lg font-semibold">
          Calendar
        </h3>
        <p className="text-sm text-muted-foreground">
          Deadlines reach your calendar through your private feed or a connected
          calendar. Missa shows “Synced” only after the calendar confirms it.
        </p>
      </div>
      {error === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          Calendar delivery is not available in this workspace.
        </p>
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
          {error}
          <Button variant="ghost" onClick={() => void load()}>
            <RefreshCw />
            Try again
          </Button>
        </div>
      ) : !data ? (
        <div role="status" aria-label="Loading calendar delivery">
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          <li className="flex min-h-16 items-center gap-3 py-3">
            {data.feedActive ? (
              <CalendarCheck2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <CalendarDays className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Private deadline feed</p>
              <p className="text-xs text-muted-foreground">
                {data.feedActive
                  ? "On · this deadline and its response date are included"
                  : "Off · subscribe from Tracker or Calendar to see deadlines in any calendar app"}
              </p>
            </div>
          </li>
          {data.connections.map((connection) => (
            <li key={connection.provider} className="flex min-h-16 items-center gap-3 py-3">
              {connection.status === "active" ? (
                <CalendarCheck2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <CalendarX2 className="size-5 shrink-0 text-destructive" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{PROVIDER_NAMES[connection.provider]}</p>
                <p className="text-xs text-muted-foreground">
                  {connection.status === "active"
                    ? connection.lastSyncAt
                      ? `Connected · last synced ${eventWhen(connection.lastSyncAt, false)}`
                      : "Connected · waiting for the first sync"
                    : "Disconnected · Missa can’t update this calendar until you reconnect"}
                </p>
              </div>
              {connection.status !== "active" ? (
                <Link href="/calendar" className={buttonVariants({ variant: "outline" })}>
                  Reconnect
                </Link>
              ) : null}
            </li>
          ))}
          {data.events.map((event) => (
            <li key={event.id} className="flex min-h-16 items-center gap-3 py-3">
              {event.syncStatus === "failed" ? (
                <AlertTriangle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
              ) : event.syncStatus === "queued" || event.syncStatus === "running" ? (
                <span className="flex size-5 shrink-0 items-center justify-center text-information">
                  <Spinner aria-hidden="true" />
                </span>
              ) : (
                <CalendarDays className="size-5 shrink-0 text-primary" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">{eventWhen(event.startAt, event.allDay)}</span>
                  {" · "}
                  {event.syncStatus === "failed"
                    ? "Sync failed"
                    : event.syncStatus === "queued" || event.syncStatus === "running"
                      ? "Syncing…"
                      : event.syncStatus === "succeeded"
                        ? "Synced"
                        : "In Missa Calendar"}
                  {event.deadlineChanged ? " · The deadline moved. Review this session." : ""}
                </p>
              </div>
              {event.syncStatus === "failed" ? (
                <Button
                  variant="outline"
                  disabled={retrying === event.id}
                  aria-busy={retrying === event.id || undefined}
                  onClick={() => void retry(event.id)}
                >
                  <RefreshCw />
                  Retry
                </Button>
              ) : event.deadlineChanged ? (
                <Link
                  href="/calendar"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Review
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
