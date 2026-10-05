import { NextResponse } from "next/server";
import { creatorCommandEnvelope, CreatorConflictError, CreatorIdempotencyConflictError, quietHoursMinute } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorNotificationRepository } from "@/lib/creatorRepositories";
import { smsConfig } from "@/lib/sms";
import { notificationPreferencesView, smsPlanEligible } from "@/lib/sms-preferences";

const headers = { "Cache-Control": "private, no-store" };
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });

function validTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * Timing fields are optional so an older client keeps the saved values. An
 * explicit null or empty string clears them.
 */
function timingInput(body: Record<string, unknown>, current: { timezone?: string | null; quietHoursStart?: string | null; quietHoursEnd?: string | null }) {
  const pick = (key: "timezone" | "quietHoursStart" | "quietHoursEnd") =>
    key in body ? (body[key] === "" ? null : body[key]) : (current[key] ?? null);
  const timezone = pick("timezone"), quietHoursStart = pick("quietHoursStart"), quietHoursEnd = pick("quietHoursEnd");
  if (timezone !== null && (typeof timezone !== "string" || !validTimezone(timezone))) return { error: "Choose a valid timezone." };
  if ((quietHoursStart === null) !== (quietHoursEnd === null)) return { error: "Set both a start and an end for quiet hours, or neither." };
  if (quietHoursStart !== null) {
    const start = quietHoursMinute(typeof quietHoursStart === "string" ? quietHoursStart : null);
    const end = quietHoursMinute(typeof quietHoursEnd === "string" ? quietHoursEnd : null);
    if (start === null || end === null) return { error: "Choose quiet hours as times of day." };
    if (start === end) return { error: "Quiet hours need different start and end times." };
  }
  return { timezone: timezone as string | null, quietHoursStart: quietHoursStart as string | null, quietHoursEnd: quietHoursEnd as string | null };
}

function isRevisionConflict(error: unknown): error is CreatorConflictError {
  if (error instanceof CreatorConflictError) return true;
  if (!error || typeof error !== "object") return false;
  const value = error as { expectedRevision?: unknown; actualRevision?: unknown; resourceType?: unknown };
  return value.resourceType === "notification-preferences"
    && Number.isSafeInteger(value.expectedRevision)
    && Number.isSafeInteger(value.actualRevision);
}

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return json({ error: "Not authenticated" }, 401);
  const repository = getCreatorNotificationRepository();
  if (!repository) return json({ error: "Notification preferences are unavailable." }, 503);
  return json(await notificationPreferencesView(session.account.id));
}

export async function PUT(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return json({ error: "Not authenticated" }, 401);
  const repository = getCreatorNotificationRepository();
  if (!repository) return json({ error: "Notification preferences are unavailable." }, 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const cadence = body?.digestCadence;
  const fields = ["inAppEnabled", "emailEnabled", "savedSearchEnabled", "followEnabled", "reminderEnabled", "smsEnabled"] as const;
  if (!body || !fields.every((field) => typeof body[field] === "boolean") || !["off", "weekly"].includes(String(cadence))) {
    return json({ error: "Choose valid notification settings." }, 400);
  }
  const expectedRevision = body.expectedRevision;
  const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 1 || !key || key.length > 200) {
    return json({ error: "Refresh these settings before saving again." }, 400);
  }
  const timing = timingInput(body, await repository.preferences(session.account.id));
  if ("error" in timing) return json({ error: timing.error }, 400);
  // Texts stay on only while Telnyx is configured and the plan includes them;
  // the repository also requires a verified phone. The phone itself changes
  // only through /api/me/sms.
  const smsEnabled = body.smsEnabled === true && smsConfig() !== null && await smsPlanEligible(session.account.id);
  const input = {
    inAppEnabled: Boolean(body.inAppEnabled), emailEnabled: Boolean(body.emailEnabled),
    digestCadence: cadence as "off" | "weekly", savedSearchEnabled: Boolean(body.savedSearchEnabled),
    followEnabled: Boolean(body.followEnabled), reminderEnabled: Boolean(body.reminderEnabled), smsEnabled,
    ...timing,
  };
  try {
    const receipt = await repository.update(
      creatorCommandEnvelope(session.account.id, "notification-preferences.update", key, input, Number(expectedRevision)),
      input,
    );
    return json({ ...await notificationPreferencesView(session.account.id), receipt });
  } catch (error) {
    if (isRevisionConflict(error) || error instanceof CreatorIdempotencyConflictError) return json({ error: error.message }, 409);
    return json({ error: "We could not save notification preferences." }, 500);
  }
}
