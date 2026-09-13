"use client";

import { useSyncExternalStore } from "react";
import { Clock3 } from "lucide-react";
import { formatDeadlineLabel } from "@/lib/deadlineLabel";
import styles from "./opportunity-detail.module.css";

const emptySubscribe = () => () => {};

interface ClientDeadlineLabel {
  day: string;
  label: string;
  urgent: boolean;
}

function localDayKey(now: Date): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// Cached per deadline date so getSnapshot returns a stable value between calls.
const snapshotCache = new Map<string, ClientDeadlineLabel>();

function readClientLabel(date: string): ClientDeadlineLabel {
  const day = localDayKey(new Date());
  const cached = snapshotCache.get(date);
  if (cached && cached.day === day) return cached;
  const next = formatDeadlineLabel(date);
  const value: ClientDeadlineLabel = {
    day,
    label: next?.label ?? "",
    urgent: next?.urgent ?? false,
  };
  snapshotCache.set(date, value);
  return value;
}

/**
 * Renders the deadline chip from the server value first, then corrects it to
 * the viewer's local calendar day after hydration. The relative wording ("today",
 * "tomorrow") must follow the reader's day, not the server's UTC day.
 */
export function OpportunityDeadlineChip({
  date,
  fallbackLabel,
  fallbackUrgent,
}: {
  date?: string;
  fallbackLabel: string;
  fallbackUrgent: boolean;
}) {
  const client = useSyncExternalStore(
    emptySubscribe,
    () => (date ? readClientLabel(date) : null),
    () => null,
  );
  const label = client?.label || fallbackLabel;
  const urgent = client ? client.urgent : fallbackUrgent;

  return (
    <span
      className={styles.signalChip}
      data-tone={urgent ? "urgent" : undefined}
    >
      <Clock3 aria-hidden="true" />
      {label}
    </span>
  );
}
