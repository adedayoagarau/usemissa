import { NextResponse } from "next/server";
import { creatorCommandEnvelope, CreatorConflictError, CreatorIdempotencyConflictError } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorNotificationRepository } from "@/lib/creatorRepositories";
import { deliverEmailChoiceConfirmation } from "@/lib/account-letters";

const headers = { "Cache-Control": "private, no-store" };
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });

/** Answer the one-time "turn on reminder emails and the weekly digest?" question. */
export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return json({ error: "Not authenticated" }, 401);
  const repository = getCreatorNotificationRepository();
  if (!repository) return json({ error: "Notification preferences are unavailable." }, 503);
  const body = await request.json().catch(() => null) as { accept?: unknown; expectedRevision?: unknown } | null;
  const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!body || typeof body.accept !== "boolean" || !Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 1 || !key || key.length > 200) {
    return json({ error: "Refresh the page and choose again." }, 400);
  }
  try {
    const receipt = await repository.recordEmailChoice(
      creatorCommandEnvelope(session.account.id, "notification-preferences.email-choice", key, { accept: body.accept }, Number(body.expectedRevision)),
      body.accept,
    );
    if (body.accept && session.account.email) {
      await deliverEmailChoiceConfirmation({ accountId: session.account.id, email: session.account.email }).catch(() => undefined);
    }
    return json({ ...await repository.preferences(session.account.id), receipt });
  } catch (error) {
    if (error instanceof CreatorConflictError || error instanceof CreatorIdempotencyConflictError) return json({ error: error.message }, 409);
    return json({ error: "We could not save your email choice." }, 500);
  }
}
