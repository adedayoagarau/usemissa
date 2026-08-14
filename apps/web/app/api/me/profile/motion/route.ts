import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { type ProfileMotionEvent } from "@missa/radar-engine";

import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getEngine, persistRadar } from "@/lib/engine";

const noStore = { "Cache-Control": "no-store" };
const events: readonly ProfileMotionEvent[] = [
  "first-sample-published",
  "recorded-credit",
  "indexability-threshold",
  "handle-claimed",
];

async function session() {
  const cookieStore = await cookies();
  return getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
}

function errorResponse(error: string, status: 400 | 401 | 404) {
  return NextResponse.json({ error }, { status, headers: noStore });
}

export async function GET() {
  const current = await session();
  if (!current?.account.userId) return errorResponse("Not authenticated", 401);
  const engine = await getEngine();
  const user = engine.store.users.get(current.account.userId);
  if (!user) return errorResponse("Profile not found", 404);
  return NextResponse.json(
    { motion: user.profileMotion ?? {} },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  const current = await session();
  if (!current?.account.userId) return errorResponse("Not authenticated", 401);
  const body = await request.json().catch(() => null);
  const event =
    body &&
    typeof body === "object" &&
    "event" in body &&
    typeof body.event === "string"
      ? body.event
      : "";
  if (!events.includes(event as ProfileMotionEvent))
    return errorResponse("Unsupported Profile motion event.", 400);

  const engine = await getEngine();
  const result = engine.markProfileMotion(
    current.account.userId,
    event as ProfileMotionEvent,
  );
  if (result.recorded) {
    engine.recordAudit(
      current.account.id,
      "profile.motion_recorded",
      "user_profile",
      result.user.id,
      JSON.stringify({ event }),
    );
    await persistRadar();
  }
  return NextResponse.json(
    { event, recorded: result.recorded, occurredAt: result.occurredAt },
    { headers: noStore },
  );
}
