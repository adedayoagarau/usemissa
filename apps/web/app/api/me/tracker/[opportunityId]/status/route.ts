import { NextResponse } from "next/server";
import { isMyStatus } from "@missa/radar-engine";
import {
  canonicalTrackerStatus,
  CreatorConflictError,
  CreatorIdempotencyConflictError,
  creatorRelationalAuthorityEnabled,
  updateCanonicalTrackerStatus,
} from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { getEngine, persistRadar } from "@/lib/engine";
import { trackFirstSaveEvent } from "@/lib/firstSaveAnalytics";
import { verifyFirstSaveCompletionToken } from "@/lib/firstSaveIntent";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ opportunityId: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  const postgresTracker =
    creatorRelationalAuthorityEnabled(process.env) &&
    Boolean(process.env.DATABASE_URL);
  if (!session || (!session.account.userId && !postgresTracker)) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers },
    );
  }

  const { opportunityId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.status !== "string" || !isMyStatus(body.status)) {
    return NextResponse.json(
      { error: "Choose a valid Tracker status" },
      { status: 400, headers },
    );
  }
  const completion = verifyFirstSaveCompletionToken(
    typeof body.completionToken === "string" ? body.completionToken : undefined,
  );
  const completionMatches =
    completion?.accountId === session.account.id &&
    completion.opportunityId === opportunityId;

  if (postgresTracker && process.env.DATABASE_URL) {
    const status = canonicalTrackerStatus(body.status);
    if (!status) {
      return NextResponse.json(
        { error: "This Tracker status is not available for this record yet" },
        { status: 400, headers },
      );
    }
    const expectedRevision = body.expectedRevision;
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
      return NextResponse.json(
        { error: "expectedRevision must be a positive integer" },
        { status: 400, headers },
      );
    }
    if (!idempotencyKey || idempotencyKey.length > 200) {
      return NextResponse.json(
        { error: "Idempotency-Key must contain 1 to 200 characters" },
        { status: 400, headers },
      );
    }
    let updated;
    try {
      updated = await updateCanonicalTrackerStatus(
        process.env.DATABASE_URL,
        session.account.id,
        opportunityId,
        status,
        { expectedRevision, idempotencyKey },
      );
    } catch (error) {
      if (error instanceof CreatorConflictError) {
        return NextResponse.json(
          {
            error: error.message,
            conflict: {
              action: "refresh-and-retry",
              expectedRevision: error.expectedRevision,
              actualRevision: error.actualRevision,
            },
          },
          { status: 409, headers },
        );
      }
      if (error instanceof CreatorIdempotencyConflictError) {
        return NextResponse.json(
          { error: error.message },
          { status: 409, headers },
        );
      }
      throw error;
    }
    if (!updated) {
      return NextResponse.json(
        { error: "Tracker item not found" },
        { status: 404, headers },
      );
    }
    if (
      completionMatches &&
      updated.status === "updated" &&
      status !== "interested"
    ) {
      await trackFirstSaveEvent({
        eventName: "tracker.next_action_completed",
        journeyId: completion.journeyId,
        transition: "first-action-completed",
        opportunityId,
        accountId: session.account.id,
        result: body.status,
      });
    }
    return NextResponse.json(updated, { headers });
  }

  const engine = await getEngine();
  const userId = session.account.userId!;
  const current = engine.store.tracked.find(
    (item) => item.userId === userId && item.opportunityId === opportunityId,
  );
  if (!current) {
    return NextResponse.json(
      { error: "Tracker item not found" },
      { status: 404, headers },
    );
  }

  const previousStatus = current.myStatus;
  const tracked = engine.setMyStatus(userId, opportunityId, body.status);
  const changed = previousStatus !== tracked.myStatus;
  if (changed) {
    engine.recordAudit(
      session.account.id,
      "tracker.status_updated",
      "tracked_opportunity",
      opportunityId,
      JSON.stringify({ from: previousStatus, to: tracked.myStatus }),
    );
  }
  // Persist on retries too. A previous request may have mutated the warm
  // legacy engine before its persistence attempt failed.
  await persistRadar();
  if (
    changed &&
    completionMatches &&
    ["interested", "saved"].includes(previousStatus) &&
    !["interested", "saved"].includes(tracked.myStatus)
  ) {
    await trackFirstSaveEvent({
      eventName: "tracker.next_action_completed",
      journeyId: completion.journeyId,
      transition: "first-action-completed",
      opportunityId,
      accountId: session.account.id,
      result: tracked.myStatus,
    });
  }

  return NextResponse.json(
    {
      status: previousStatus === tracked.myStatus ? "unchanged" : "updated",
      tracked,
    },
    { headers },
  );
}
