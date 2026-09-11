import type { SourceDefinition, SourceLane, SourceSchedule } from "./contracts.js";
import type { SourceRefreshPolicy } from "./sourceManifest.js";

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

export interface SourceRefreshObservation {
  changed: boolean;
  consecutiveUnchangedRuns: number;
  consecutiveFailures: number;
  hoursUntilDeadline?: number;
}

/** Pure policy; durable scheduler state can adopt it without Redis or publication authority. */
export function adaptiveCadenceHours(policy: SourceRefreshPolicy, observation: SourceRefreshObservation): number {
  if (observation.consecutiveFailures >= policy.failureCooldownAfterRuns) return policy.maximumCadenceHours;
  if (observation.consecutiveFailures > 0) return policy.minimumCadenceHours;
  if (observation.hoursUntilDeadline !== undefined && observation.hoursUntilDeadline >= 0) {
    if (observation.hoursUntilDeadline <= 72) return Math.max(policy.minimumCadenceHours, policy.finalDeadlineCadenceHours);
    if (observation.hoursUntilDeadline <= 14 * 24) return Math.max(policy.minimumCadenceHours, policy.nearDeadlineCadenceHours);
  }
  if (observation.changed) return Math.max(policy.minimumCadenceHours, Math.min(policy.baseCadenceHours, 24));
  if (observation.consecutiveUnchangedRuns >= policy.unchangedBackoffAfterRuns) return Math.min(policy.maximumCadenceHours, policy.baseCadenceHours * 2);
  return Math.min(policy.maximumCadenceHours, Math.max(policy.minimumCadenceHours, policy.baseCadenceHours));
}
