import { NextResponse } from "next/server";
import {
  CreatorConflictError,
  CreatorIdempotencyConflictError,
  creatorRelationalAuthorityEnabled,
  removeCanonicalTrackedOpportunity,
  updateCanonicalTrackerReminder,
} from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";

const headers = { "Cache-Control": "private, no-store" };

function commandInput(request: Request, body: Record<string, unknown>) {
  const expectedRevision = body.expectedRevision;
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 1) {
    return { error: "expectedRevision must be a positive integer" } as const;
  }
  if (!idempotencyKey || idempotencyKey.length > 200) {
    return { error: "Idempotency-Key must contain 1 to 200 characters" } as const;
  }
  return { expectedRevision: Number(expectedRevision), idempotencyKey } as const;
}

function relationalUnavailable() {
  return NextResponse.json(
    { error: "This Tracker action is unavailable while relational authority is disabled." },
    { status: 503, headers },
  );
}

function commandError(error: unknown) {
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
    return NextResponse.json({ error: error.message }, { status: 409, headers });
  }
  throw error;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ opportunityId: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers });
  if (!creatorRelationalAuthorityEnabled(process.env) || !process.env.DATABASE_URL) return relationalUnavailable();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.notify !== "boolean") {
    return NextResponse.json({ error: "notify must be true or false" }, { status: 400, headers });
  }
  const input = commandInput(request, body);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400, headers });
  try {
    const result = await updateCanonicalTrackerReminder(
      process.env.DATABASE_URL,
      session.account.id,
      (await params).opportunityId,
      body.notify,
      input,
    );
    return result
      ? NextResponse.json(result, { headers })
      : NextResponse.json({ error: "Tracker item not found" }, { status: 404, headers });
  } catch (error) { return commandError(error); }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ opportunityId: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers });
  if (!creatorRelationalAuthorityEnabled(process.env) || !process.env.DATABASE_URL) return relationalUnavailable();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Request body is required" }, { status: 400, headers });
  const input = commandInput(request, body);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400, headers });
  try {
    const result = await removeCanonicalTrackedOpportunity(
      process.env.DATABASE_URL,
      session.account.id,
      (await params).opportunityId,
      input,
    );
    return result
      ? NextResponse.json(result, { headers })
      : NextResponse.json({ error: "Tracker item not found" }, { status: 404, headers });
  } catch (error) { return commandError(error); }
}
