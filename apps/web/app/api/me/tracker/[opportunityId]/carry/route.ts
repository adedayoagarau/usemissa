import { NextResponse } from "next/server";
import {
  CarryNotAvailableError,
  carryTrackedToNextCycle,
  CreatorConflictError,
  CreatorIdempotencyConflictError,
  creatorPoolFor,
  creatorRelationalAuthorityEnabled,
  resolveTrackedId,
  TrackingLimitReachedError,
} from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { trackingLimitBody } from "@/lib/trackingLimit";

const headers = { "Cache-Control": "private, no-store" };

/**
 * Carry a tracked call to its next cycle. The path segment is the Tracker's
 * opportunity id, like its sibling routes; a tracked record id is accepted too.
 * The record is carried in place (see carryTrackedToNextCycle), so the
 * response carries the new revision for the next write.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ opportunityId: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers });
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!creatorRelationalAuthorityEnabled(process.env) || !databaseUrl) {
    return NextResponse.json(
      { error: "Carrying a call to its next cycle is not available for this Tracker yet." },
      { status: 409, headers },
    );
  }

  const { opportunityId } = await params;
  const body = (await request.json().catch(() => ({}))) as { expectedRevision?: unknown } | null;
  const expectedRevision = body?.expectedRevision;
  if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || (expectedRevision as number) < 1)) {
    return NextResponse.json({ error: "expectedRevision must be a positive integer" }, { status: 400, headers });
  }
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    return NextResponse.json({ error: "Idempotency-Key must contain 1 to 200 characters" }, { status: 400, headers });
  }

  const pool = creatorPoolFor(databaseUrl);
  const trackedId = await resolveTrackedId(pool, session.account.id, opportunityId);
  if (!trackedId) {
    return NextResponse.json({ error: "Tracker item not found" }, { status: 404, headers });
  }
  try {
    const result = await carryTrackedToNextCycle(pool, session.account.id, trackedId, {
      idempotencyKey,
      expectedRevision: expectedRevision as number | undefined,
    });
    if (!result) {
      return NextResponse.json({ error: "Tracker item not found" }, { status: 404, headers });
    }
    return NextResponse.json(result, { headers });
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
    if (error instanceof CreatorIdempotencyConflictError || error instanceof CarryNotAvailableError) {
      return NextResponse.json({ error: error.message, code: error instanceof CarryNotAvailableError ? error.code : undefined }, { status: 409, headers });
    }
    if (error instanceof TrackingLimitReachedError) {
      return NextResponse.json(trackingLimitBody(error), { status: 409, headers });
    }
    throw error;
  }
}
