import type { SourceDefinition, SourceLane, SourceSchedule } from "./contracts.js";

const HOUR = 60 * 60 * 1000;

export function sourceIsOpen(schedule: SourceSchedule, now = new Date()): boolean {
  const nowMs = now.getTime();
  if (schedule.openFrom) {
    const from = Date.parse(schedule.openFrom);
    if (Number.isFinite(from) && nowMs < from) return false;
  }
  if (schedule.openUntil) {
    const until = Date.parse(schedule.openUntil);
    if (Number.isFinite(until) && nowMs > until) return false;
  }
  return true;
}

export function sourceIsDue(source: SourceDefinition, lastEnqueuedAt: string | null, now = new Date()): boolean {
  if (source.schedule.lane === "held" || source.schedule.lane === "single-run") return false;
  if (!sourceIsOpen(source.schedule, now)) return false;
  if (!lastEnqueuedAt) return true;
  const last = Date.parse(lastEnqueuedAt);
  if (!Number.isFinite(last)) return true;
  return now.getTime() >= last + Math.max(1, source.schedule.cadenceHours) * HOUR;
}

export function laneLabel(lane: SourceLane): string {
  return lane === "core-daily" ? "Daily core" : lane === "scheduled" ? "Scheduled" : lane === "single-run" ? "Single-run" : "Held";
}
