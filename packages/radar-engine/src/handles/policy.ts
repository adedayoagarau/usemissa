/**
 * Handle lifecycle policy is deliberately explicit and boring. Change
 * HANDLE_CLAIM_ACCESS_MODE to `open` when the protected invitee window has
 * been reviewed and general claiming should open without rewriting claim
 * logic.
 */
export const HANDLE_CLAIM_ACCESS_MODE = "invite-only" as const;
export type HandleClaimAccessMode = typeof HANDLE_CLAIM_ACCESS_MODE | "open";

export const HANDLE_CLAIM_INVITEE_WINDOW_DAYS = 14;
export const HANDLE_RENAME_INTERVAL_DAYS = 30;
export const HANDLE_DELETION_HOLD_DAYS = 90;
export const HANDLE_TRAFFIC_WINDOW_DAYS = 90;
/** A handle with 100 public page views in the trailing 90 days is never released. */
export const HANDLE_MEANINGFUL_TRAFFIC_PAGEVIEWS = 100;

const DAY_MS = 24 * 60 * 60 * 1000;

export function inviteeClaimWindowOpen(input: {
  redeemedAt: Date | string | null | undefined;
  now?: Date;
  accessMode?: HandleClaimAccessMode;
  windowDays?: number;
}): boolean {
  if ((input.accessMode ?? HANDLE_CLAIM_ACCESS_MODE) === "open") return true;
  if (!input.redeemedAt) return false;
  const redeemedAt = new Date(input.redeemedAt);
  if (Number.isNaN(redeemedAt.getTime())) return false;
  const now = input.now ?? new Date();
  const windowDays = input.windowDays ?? HANDLE_CLAIM_INVITEE_WINDOW_DAYS;
  return (
    now.getTime() >= redeemedAt.getTime() &&
    now.getTime() < redeemedAt.getTime() + windowDays * DAY_MS
  );
}

export function renameAllowed(input: {
  lastRenamedAt: Date | string | null | undefined;
  now?: Date;
  intervalDays?: number;
}): boolean {
  if (!input.lastRenamedAt) return true;
  const lastRenamedAt = new Date(input.lastRenamedAt);
  if (Number.isNaN(lastRenamedAt.getTime())) return false;
  const now = input.now ?? new Date();
  const intervalDays = input.intervalDays ?? HANDLE_RENAME_INTERVAL_DAYS;
  return now.getTime() >= lastRenamedAt.getTime() + intervalDays * DAY_MS;
}

export function handleReleaseDecision(input: {
  deletedAt: Date | string;
  now?: Date;
  publicPageViews?: number;
  holdDays?: number;
  meaningfulTrafficPageviews?: number;
}): "hold" | "never-release" | "eligible" {
  const deletedAt = new Date(input.deletedAt);
  if (Number.isNaN(deletedAt.getTime())) return "hold";
  if (
    input.publicPageViews === undefined ||
    !Number.isFinite(input.publicPageViews) ||
    input.publicPageViews < 0
  )
    return "hold";
  if (
    input.publicPageViews >=
    (input.meaningfulTrafficPageviews ?? HANDLE_MEANINGFUL_TRAFFIC_PAGEVIEWS)
  ) {
    return "never-release";
  }
  const now = input.now ?? new Date();
  const holdDays = input.holdDays ?? HANDLE_DELETION_HOLD_DAYS;
  return now.getTime() < deletedAt.getTime() + holdDays * DAY_MS
    ? "hold"
    : "eligible";
}
