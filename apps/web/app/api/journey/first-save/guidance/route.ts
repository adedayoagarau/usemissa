import { NextResponse } from "next/server";

import { getSessionAccount } from "@/lib/auth";
import { trackFirstSaveEvent } from "@/lib/firstSaveAnalytics";
import { verifyFirstSaveCompletionToken } from "@/lib/firstSaveIntent";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers },
    );
  }
  const body = await request.json().catch(() => null);
  const action =
    body?.action === "presented" || body?.action === "dismissed"
      ? body.action
      : undefined;
  const completion = verifyFirstSaveCompletionToken(
    typeof body?.completionToken === "string"
      ? body.completionToken
      : undefined,
  );
  if (!action || !completion || completion.accountId !== session.account.id) {
    return NextResponse.json(
      { error: "This guidance receipt is not valid." },
      { status: 400, headers },
    );
  }

  await trackFirstSaveEvent({
    eventName:
      action === "presented"
        ? "tracker.next_action_presented"
        : "journey.guidance_dismissed",
    journeyId: completion.journeyId,
    transition:
      action === "presented" ? "next-action-presented" : "guidance-dismissed",
    opportunityId: completion.opportunityId,
    accountId: session.account.id,
  });
  return NextResponse.json({ accepted: true }, { status: 202, headers });
}
