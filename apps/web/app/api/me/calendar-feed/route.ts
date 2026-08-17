import { NextResponse } from "next/server";
import { createFeedToken } from "@missa/radar-engine";

import { getSessionAccount } from "@/lib/auth";
import { getEngine, persistRadar } from "@/lib/engine";
import { sessionSecret } from "@/lib/auth";

const headers = { "Cache-Control": "private, no-store" };

async function owner(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId) return undefined;
  const engine = await getEngine();
  const user = engine.store.users.get(session.account.userId);
  return user ? { session, engine, user } : undefined;
}

function feedUrl(request: Request, userId: string, key: string) {
  const token = createFeedToken(userId, `${sessionSecret()}:${key}`);
  return new URL(
    `/api/users/${encodeURIComponent(userId)}/calendar.ics?token=${encodeURIComponent(token)}`,
    request.url,
  ).toString();
}

export async function GET(request: Request) {
  const context = await owner(request);
  if (!context)
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers },
    );
  return NextResponse.json(
    {
      connected: Boolean(context.user.calendarFeedKey),
      connectedAt: context.user.calendarFeedConnectedAt,
    },
    { headers },
  );
}

export async function POST(request: Request) {
  const context = await owner(request);
  if (!context)
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers },
    );
  const body = (await request.json().catch(() => ({}))) as { action?: unknown };
  const action = body.action === "rotate" ? "rotate" : "create";
  if (action === "create" && context.user.calendarFeedKey)
    return NextResponse.json(
      {
        connected: true,
        connectedAt: context.user.calendarFeedConnectedAt,
        url: feedUrl(request, context.user.id, context.user.calendarFeedKey),
      },
      { headers },
    );
  context.user.calendarFeedKey = crypto.randomUUID();
  context.user.calendarFeedConnectedAt = new Date().toISOString();
  context.engine.recordAudit(
    context.session.account.id,
    action === "rotate"
      ? "profile.calendar_rotated"
      : "profile.calendar_connected",
    "user_profile",
    context.user.id,
    JSON.stringify({ field: "calendar" }),
  );
  await persistRadar();
  return NextResponse.json(
    {
      connected: true,
      connectedAt: context.user.calendarFeedConnectedAt,
      url: feedUrl(request, context.user.id, context.user.calendarFeedKey),
    },
    { status: action === "create" ? 201 : 200, headers },
  );
}

export async function DELETE(request: Request) {
  const context = await owner(request);
  if (!context)
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers },
    );
  if (context.user.calendarFeedKey) {
    delete context.user.calendarFeedKey;
    delete context.user.calendarFeedConnectedAt;
    context.engine.recordAudit(
      context.session.account.id,
      "profile.calendar_disconnected",
      "user_profile",
      context.user.id,
      JSON.stringify({ field: "calendar" }),
    );
    await persistRadar();
  }
  return new NextResponse(null, { status: 204, headers });
}
