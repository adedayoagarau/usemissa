import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorCalendarRepository } from "@/lib/creatorRepositories";
import { deliverCalendarSync } from "@/lib/calendar-providers";
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
  let processed = 0,
    failed = 0;
  for (let index = 0; index < 20; index++) {
    const lease = await repository.leaseSyncJob(session.account.id);
    if (!lease) break;
    try {
      const providerEventId = await deliverCalendarSync(lease);
      await repository.completeSyncJob(lease, providerEventId);
      processed++;
    } catch (error) {
      await repository.failSyncJob(
        lease.jobId,
        error instanceof Error ? error.message : "provider_failed",
      );
      failed++;
    }
  }
  return NextResponse.json(
    { status: failed ? "partial" : "complete", processed, failed },
    { headers: h },
  );
}
