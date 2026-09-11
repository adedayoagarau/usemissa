import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorCalendarRepository } from "@/lib/creatorRepositories";
import { calendarProviderConfigured } from "@/lib/calendar-providers";
const h = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers: h },
    );
  const repository = getCreatorCalendarRepository();
  if (!repository)
    return NextResponse.json(
      { connections: [], availability: { google: false, microsoft: false } },
      { headers: h },
    );
  return NextResponse.json(
    {
      connections: await repository.connections(session.account.id),
      availability: {
        google: calendarProviderConfigured("google"),
        microsoft: calendarProviderConfigured("microsoft"),
      },
    },
    { headers: h },
  );
}
