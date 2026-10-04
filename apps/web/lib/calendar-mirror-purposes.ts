/**
 * Purposes of the calendar events Missa mirrors only for the Google and
 * Microsoft export: plan steps, stages, fee-tier closes and forecasts. The
 * Calendar shows these from their own sources, so it leaves mirrored rows out
 * and never offers them as personal time to edit. Kept free of server imports
 * so the Calendar client can use it; matches PROVIDER_MIRROR_PURPOSES in
 * @missa/radar-adapters (checked by calendar-provider-mirror.test.ts).
 */
export const CALENDAR_MIRROR_PURPOSES = ["plan-step", "stage", "tier-close", "forecast"] as const;

export function isCalendarMirrorPurpose(purpose: string | undefined): boolean {
  return purpose !== undefined && (CALENDAR_MIRROR_PURPOSES as readonly string[]).includes(purpose);
}
