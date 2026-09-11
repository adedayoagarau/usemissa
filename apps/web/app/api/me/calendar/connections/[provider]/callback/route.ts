import { NextResponse } from "next/server";
import type { CalendarProvider } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorCalendarRepository } from "@/lib/creatorRepositories";
import { exchangeCalendarCode } from "@/lib/calendar-providers";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie")),
    provider = (await params).provider as CalendarProvider,
    url = new URL(request.url),
    code = url.searchParams.get("code"),
    state = url.searchParams.get("state");
  if (
    !session ||
    !code ||
    !state ||
    !["google", "microsoft"].includes(provider)
  )
    return NextResponse.redirect(
      new URL("/calendar?connect=cancelled", request.url),
    );
  const repository = getCreatorCalendarRepository();
  if (!repository)
    return NextResponse.redirect(
      new URL("/calendar?connect=unavailable", request.url),
    );
  try {
    const consumed = await repository.consumeOAuthState(
        session.account.id,
        provider,
        state,
      ),
      exchange = await exchangeCalendarCode(
        provider,
        code,
        consumed.codeVerifier,
        consumed.redirectUri,
      );
    await repository.connectProvider(session.account.id, {
      provider,
      ...exchange,
    });
    return NextResponse.redirect(
      new URL(`/calendar?connect=${provider}-connected`, request.url),
    );
  } catch {
    return NextResponse.redirect(
      new URL(`/calendar?connect=${provider}-failed`, request.url),
    );
  }
}
