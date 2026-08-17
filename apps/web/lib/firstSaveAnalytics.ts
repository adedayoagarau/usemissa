import { trackPlatformAnalytics } from "./platformAnalytics";

export type FirstSaveEventName =
  | "discovery.opportunity_save_intent_created"
  | "auth.authentication_required"
  | "auth.authentication_succeeded"
  | "journey.intent_revalidated"
  | "journey.material_change_presented"
  | "tracker.opportunity_created"
  | "tracker.opportunity_already_saved"
  | "discovery.opportunity_saved"
  | "tracker.next_action_presented"
  | "tracker.next_action_completed"
  | "journey.guidance_dismissed"
  | "journey.state_recovered"
  | "journey.abandoned";

type FirstSaveEvent = {
  eventName: FirstSaveEventName;
  journeyId: string;
  transition: string;
  opportunityId?: string;
  accountId?: string;
  snapshotFingerprint?: string;
  result?: string;
  changeCodes?: string[];
  nextActionKind?: string;
  reason?: string;
};

export async function trackFirstSaveEvent(
  event: FirstSaveEvent,
): Promise<void> {
  const properties: Record<string, string | number | boolean> = {
    journey_id: event.journeyId,
    transition: event.transition,
  };
  if (event.opportunityId) properties.opportunity_id = event.opportunityId;
  if (event.snapshotFingerprint)
    properties.snapshot_fingerprint = event.snapshotFingerprint;
  if (event.result) properties.result = event.result;
  if (event.changeCodes?.length)
    properties.change_codes = event.changeCodes.slice(0, 8).join(",");
  if (event.nextActionKind) properties.next_action_kind = event.nextActionKind;
  if (event.reason) properties.reason = event.reason;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      trackPlatformAnalytics({
        eventName: event.eventName,
        source: "first-save-journey",
        ...(event.accountId ? { accountId: event.accountId } : {}),
        properties,
        idempotencyKey: `${event.journeyId}:${event.transition}`,
      }),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, 300);
      }),
    ]);
  } catch {
    // Analytics never owns a customer Save transition. Canonical Tracker
    // persistence remains authoritative when measurement is unavailable.
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
