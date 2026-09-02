import { NextResponse } from "next/server";
import { creatorCommandEnvelope, CreatorConflictError, CreatorIdempotencyConflictError } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorNotificationRepository } from "@/lib/creatorRepositories";

const headers = { "Cache-Control": "private, no-store" };
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });

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
  return json(await repository.preferences(session.account.id));
}

export async function PUT(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return json({ error: "Not authenticated" }, 401);
  const repository = getCreatorNotificationRepository();
  if (!repository) return json({ error: "Notification preferences are unavailable." }, 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const cadence = body?.digestCadence;
  const fields = ["inAppEnabled", "emailEnabled", "savedSearchEnabled", "followEnabled", "reminderEnabled"] as const;
  if (!body || !fields.every((field) => typeof body[field] === "boolean") || !["off", "daily", "weekly"].includes(String(cadence))) {
    return json({ error: "Choose valid notification settings." }, 400);
  }
  const expectedRevision = body.expectedRevision;
  const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 1 || !key || key.length > 200) {
    return json({ error: "Refresh these settings before saving again." }, 400);
  }
  const input = {
    inAppEnabled: Boolean(body.inAppEnabled), emailEnabled: Boolean(body.emailEnabled),
    digestCadence: cadence as "off" | "daily" | "weekly", savedSearchEnabled: Boolean(body.savedSearchEnabled),
    followEnabled: Boolean(body.followEnabled), reminderEnabled: Boolean(body.reminderEnabled),
  };
  try {
    const receipt = await repository.update(
      creatorCommandEnvelope(session.account.id, "notification-preferences.update", key, input, Number(expectedRevision)),
      input,
    );
    return json({ ...await repository.preferences(session.account.id), receipt });
  } catch (error) {
    if (isRevisionConflict(error) || error instanceof CreatorIdempotencyConflictError) return json({ error: error.message }, 409);
    return json({ error: "We could not save notification preferences." }, 500);
  }
}
