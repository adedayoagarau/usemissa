import { NextResponse } from "next/server";
import { CreatorCalendarError } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorCalendarRepository } from "@/lib/creatorRepositories";

const headers = { "Cache-Control": "private, no-store" };
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return json({ error: "Not authenticated" }, 401);
  const repository = getCreatorCalendarRepository();
  if (!repository) return json({ error: "Calendar is unavailable." }, 503);
  const body = await request.json().catch(() => undefined) as { eventId?: unknown; action?: unknown } | undefined;
  const eventId = typeof body?.eventId === "string" ? body.eventId : "";
  const action = body?.action === "move-preparation" || body?.action === "keep-preparation" ? body.action : undefined;
  if (!eventId || !action) return json({ error: "Choose what to do with preparation time." }, 400);
  try {
    return json(await repository.resolveDeadlineReconciliation(session.account.id, eventId, action));
  } catch (error) {
    return error instanceof CreatorCalendarError ? json({ error: error.message }, 400) : json({ error: "We could not update the deadline plan." }, 500);
  }
}
