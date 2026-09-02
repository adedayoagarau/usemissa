import { NextResponse } from "next/server";
import type { CalendarProvider } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorCalendarRepository } from "@/lib/creatorRepositories";
import { calendarAuthorization } from "@/lib/calendar-providers";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie")),
    provider = (await params).provider as CalendarProvider;
  if (!session || !["google", "microsoft"].includes(provider))
    return NextResponse.redirect(
      new URL("/calendar?connect=invalid", request.url),
    );
  const repository = getCreatorCalendarRepository();
  if (!repository)
    return NextResponse.redirect(
      new URL("/calendar?connect=unavailable", request.url),
    );
  try {
    const provisional = calendarAuthorization(provider, "pending", "pending"),
      state = await repository.createOAuthState(
        session.account.id,
        provider,
        provisional.redirectUri,
      ),
      authorization = calendarAuthorization(
        provider,
        state.state,
        state.codeChallenge,
      );
    return NextResponse.redirect(authorization.url);
  } catch {
    return NextResponse.redirect(
      new URL(`/calendar?connect=${provider}-not-configured`, request.url),
    );
  }
}
