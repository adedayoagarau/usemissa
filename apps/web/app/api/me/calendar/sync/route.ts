import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorCalendarRepository } from "@/lib/creatorRepositories";
import { drainCalendarSyncJobs } from "@/lib/calendar-sync";
const h = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers: h },
    );
  const repository = getCreatorCalendarRepository();
  if (!repository)
    return NextResponse.json(
      { status: "unavailable", processed: 0 },
      { status: 503, headers: h },
    );
  const { processed, failed, reconnectRequired } = await drainCalendarSyncJobs(
    repository,
    { accountId: session.account.id, maxJobs: 20 },
  );
  return NextResponse.json(
    {
      status: failed || reconnectRequired ? "partial" : "complete",
      processed,
      failed: failed + reconnectRequired,
    },
    { headers: h },
  );
}
