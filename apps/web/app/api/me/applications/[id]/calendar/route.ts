import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorCalendarRepository } from "@/lib/creatorRepositories";
import type { ApplicationCalendarDelivery } from "@/lib/application-workspace-types";

const headers = { "Cache-Control": "private, no-store" };
const DAY = 24 * 60 * 60 * 1000;

/**
 * Calendar delivery for one application: whether the personal deadline feed
 * is active, the state of each connected provider, and the planned events
 * linked to this application with their sync state. Read-only.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Sign in to view calendar delivery." }, { status: 401, headers });
  const repository = getCreatorCalendarRepository();
  if (!repository) return NextResponse.json({ error: "Calendar is unavailable." }, { status: 503, headers });
  const { id } = await params;
  try {
    const now = Date.now();
    const [feed, connections, events] = await Promise.all([
      repository.state(session.account.id),
      repository.connections(session.account.id),
      repository.events(session.account.id, new Date(now - 60 * DAY), new Date(now + 400 * DAY)),
    ]);
    const delivery: ApplicationCalendarDelivery = {
      feedActive: feed.active,
      connections: connections.map((connection) => ({
        provider: connection.provider,
        status: connection.status === "active" ? "active" : "reconnect-required",
        ...(connection.lastSyncAt ? { lastSyncAt: connection.lastSyncAt } : {}),
      })),
      events: events
        .filter((event) => event.opportunityId === id)
        .map((event) => ({
          id: event.id,
          title: event.title,
          startAt: event.startAt,
          allDay: event.allDay,
          ...(event.syncStatus ? { syncStatus: event.syncStatus } : {}),
          ...(event.deadlineReconciliationStatus === "needs-review" ? { deadlineChanged: true } : {}),
        })),
    };
    return NextResponse.json(delivery, { headers });
  } catch {
    return NextResponse.json({ error: "Calendar delivery could not load." }, { status: 503, headers });
  }
}
