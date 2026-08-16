import { NextResponse } from "next/server";
import { createFeedToken } from "@missa/radar-engine";
import { requireSelf, sessionSecret } from "@/lib/auth";
import { getEngine, persistRadar } from "@/lib/engine";

/** Issues a long-lived, purpose-scoped token for the personal calendar feed
 * (FR25) -- calendar apps subscribe to a URL and can't log in with a
 * session cookie, so this is a separate signed token, not the session
 * cookie. Mirrors packages/radar-engine/src/server/server.ts's existing
 * calendar-token route. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.error },
      {
        status: auth.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  const engine = await getEngine();
  const user = engine.store.users.get(id);
  if (!user)
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404, headers: { "Cache-Control": "private, no-store" } },
    );
  if (!user.calendarFeedKey) {
    user.calendarFeedKey = crypto.randomUUID();
    user.calendarFeedConnectedAt = new Date().toISOString();
    engine.recordAudit(
      auth.session.account.id,
      "profile.calendar_connected",
      "user_profile",
      id,
      JSON.stringify({ field: "calendar" }),
    );
    await persistRadar();
  }

  return NextResponse.json(
    {
      token: createFeedToken(id, `${sessionSecret()}:${user.calendarFeedKey}`),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
