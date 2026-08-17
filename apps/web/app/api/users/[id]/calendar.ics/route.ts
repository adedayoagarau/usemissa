import { NextResponse } from "next/server";
import { verifyFeedToken } from "@missa/radar-engine";
import { sessionSecret } from "@/lib/auth";
import { getEngine } from "@/lib/engine";

/** No session-cookie auth here on purpose (see calendar-token/route.ts's
 * comment) -- verified via the token query param instead. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const engine = await getEngine();
  const key = engine.store.users.get(id)?.calendarFeedKey;
  const payload = key
    ? verifyFeedToken(token, `${sessionSecret()}:${key}`)
    : undefined;
  if (!payload || payload.userId !== id) {
    return NextResponse.json(
      { error: "Invalid or missing calendar feed token" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ics = engine.calendarFeed(id);
  return new NextResponse(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
