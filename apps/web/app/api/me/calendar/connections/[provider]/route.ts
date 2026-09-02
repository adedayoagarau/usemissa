import { NextResponse } from "next/server";
import type { CalendarProvider } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorCalendarRepository } from "@/lib/creatorRepositories";
import { revokeCalendarProvider } from "@/lib/calendar-providers";
const h = { "Cache-Control": "private, no-store" };
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie")),
    provider = (await params).provider as CalendarProvider;
  if (!session || !["google", "microsoft"].includes(provider))
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers: h },
    );
  const repository = getCreatorCalendarRepository();
  if (!repository)
    return NextResponse.json(
      { error: "Calendar connection is unavailable." },
      { status: 503, headers: h },
    );
  try {
    const token = await repository.revokeProvider(session.account.id, provider);
    if (token)
      await revokeCalendarProvider(provider, token).catch(() => undefined);
    return NextResponse.json({ revoked: true, provider }, { headers: h });
  } catch {
    return NextResponse.json(
      { error: "Could not disconnect this calendar." },
      { status: 500, headers: h },
    );
  }
}
