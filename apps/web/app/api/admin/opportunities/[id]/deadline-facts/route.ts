import { NextResponse } from "next/server";
import {
  readOpportunityDeadlineFacts,
  replaceOpportunityDeadlineFacts,
} from "@missa/radar-adapters";
import { platformAdminAuthResponse, requirePlatformAdmin } from "@/lib/platformAdmin";
import {
  deadlineFactsErrorResponse,
  deadlineFactsHeaders as headers,
  deadlineFactsPool,
  parseDeadlineFactsBody,
} from "@/lib/deadline-facts-server";

type Params = { params: Promise<{ id: string }> };

/** Platform-admin read of an opportunity's editable deadline facts. */
export async function GET(request: Request, { params }: Params) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;
  const pool = deadlineFactsPool();
  if (!pool) return NextResponse.json({ error: "A database is required to edit dates." }, { status: 503, headers });
  const { id } = await params;
  try {
    const facts = await readOpportunityDeadlineFacts(pool, id);
    if (!facts) return NextResponse.json({ error: "This opportunity could not be found." }, { status: 404, headers });
    return NextResponse.json(facts, { headers: { ...headers, etag: `"${facts.revision}"` } });
  } catch (error) {
    return deadlineFactsErrorResponse(error);
  }
}

/**
 * Replace every fee tier and stage, and optionally correct the deadline. A
 * corrected deadline is recorded as a verified correction, so the public page
 * shows it as changed with the previous date.
 */
export async function PUT(request: Request, { params }: Params) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  const pool = deadlineFactsPool();
  if (!pool) return NextResponse.json({ error: "A database is required to edit dates." }, { status: 503, headers });
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey) return NextResponse.json({ error: "Idempotency-Key is required." }, { status: 400, headers });
  const parsed = parseDeadlineFactsBody(await request.json().catch(() => null), request.headers.get("If-Match"));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400, headers });
  const { id } = await params;
  try {
    const result = await replaceOpportunityDeadlineFacts(pool, {
      opportunityId: id,
      source: "admin",
      actorAccountId: auth.session.account.id,
      idempotencyKey,
      ...parsed,
    });
    return NextResponse.json(result, { headers: { ...headers, etag: `"${result.facts.revision}"` } });
  } catch (error) {
    return deadlineFactsErrorResponse(error);
  }
}
