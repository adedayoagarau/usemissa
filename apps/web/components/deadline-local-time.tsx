"use client";

import { useSyncExternalStore } from "react";
import { describeDeadline } from "@/lib/deadline-moment";

const emptySubscribe = () => () => {};
const cache = new Map<string, string | null>();

function readLocal(date: string | null | undefined, time: string, timezone: string): string | null {
  const key = `${date ?? ""}|${time}|${timezone}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  const local = describeDeadline({ kind: "exact", date, time, timezone }).closesLocal ?? null;
  cache.set(key, local);
  return local;
}

/**
 * The close moment in the viewer's own time zone. Read on the client only, so
 * the server's zone never leaks into the page, and shown only when it differs
 * from the source's zone.
 */
export function DeadlineLocalTime({
  date,
  time,
  timezone,
  className,
}: {
  date?: string | null;
  time?: string | null;
  timezone?: string | null;
  className?: string;
}) {
  const local = useSyncExternalStore(
    emptySubscribe,
    () => (time && timezone ? readLocal(date, time, timezone) : null),
    () => null,
  );
  if (!local) return null;
  return (
    <span className={className}>
      Your time: <span className="font-mono tabular-nums">{local}</span>
    </span>
  );
}
