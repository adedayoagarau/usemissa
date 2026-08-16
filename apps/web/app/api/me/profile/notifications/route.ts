import { NextResponse } from "next/server";
import {
  profileNotificationSettings,
  updateProfileNotificationSettings,
} from "@missa/radar-engine";

import { getSessionAccount } from "@/lib/auth";
import { getEngine, persistRadar } from "@/lib/engine";

const headers = { "Cache-Control": "private, no-store" };

async function owner(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId) return undefined;
  const engine = await getEngine();
  const user = engine.store.users.get(session.account.userId);
  return user ? { session, engine, user } : undefined;
}

export async function GET(request: Request) {
  const context = await owner(request);
  if (!context)
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers },
    );
  return NextResponse.json(profileNotificationSettings(context.user), {
    headers,
  });
}

export async function PATCH(request: Request) {
  const context = await owner(request);
  if (!context)
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers },
    );
  const body = await request.json().catch(() => null);
  try {
    const settings = updateProfileNotificationSettings(context.user, body);
    context.engine.recordAudit(
      context.session.account.id,
      "profile.notifications_updated",
      "user_profile",
      context.user.id,
      JSON.stringify({
        fields: ["emailAlerts", "deadlineReminderDays", "timezone"],
      }),
    );
    await persistRadar();
    return NextResponse.json(settings, { headers });
  } catch (cause) {
    return NextResponse.json(
      {
        error:
          cause instanceof Error
            ? cause.message
            : "We could not save your notification settings.",
      },
      { status: 400, headers },
    );
  }
}
