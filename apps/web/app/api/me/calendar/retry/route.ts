import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorCalendarRepository } from "@/lib/creatorRepositories";

const headers = { "Cache-Control": "private, no-store" };
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return json({ error: "Not authenticated" }, 401);
  const repository = getCreatorCalendarRepository();
  if (!repository) return json({ error: "Calendar is unavailable." }, 503);
  const body = await request.json().catch(() => undefined) as { eventId?: unknown } | undefined;
  if (typeof body?.eventId !== "string" || !body.eventId) return json({ error: "Choose an event to retry." }, 400);
  try {
    const result = await repository.retryCalendarSync(session.account.id, body.eventId);
    return result.queued ? json(result) : json({ error: "There is no failed sync to retry." }, 404);
  } catch {
    return json({ error: "We could not retry this sync." }, 500);
  }
}
