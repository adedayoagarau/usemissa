import { NextResponse } from "next/server";
import type { Pool } from "pg";
import {
  readOpportunityDeadlineFacts,
  replaceOpportunityDeadlineFacts,
} from "@missa/radar-adapters";
import { requireOrganizationAccess, type OrganizationAccess } from "@/lib/organizationAccess";
import { workspaceRelationalAuthorityEnabled } from "@/lib/workspaceEngine";
import {
  deadlineFactsErrorResponse,
  deadlineFactsHeaders as headers,
  deadlineFactsPool,
  parseDeadlineFactsBody,
} from "@/lib/deadline-facts-server";

type Params = { params: Promise<{ id: string; openCallId: string }> };

/**
 * The public Opportunity record behind an organization's open call. Fee tiers
 * and stages live on that record, so an open call that has not been linked to
 * one has nothing to edit yet.
 */
async function linkedOpportunityId(pool: Pool, access: OrganizationAccess, organizationId: string, openCallId: string): Promise<string | undefined> {
  if (!workspaceRelationalAuthorityEnabled()) {
    const openCall = access.scope?.openCall(openCallId) as { radarOpportunityId?: string } | undefined;
    return openCall?.radarOpportunityId || undefined;
  }
  const result = await pool.query<{ radar_opportunity_id: string | null }>(
    `select oc.radar_opportunity_id
       from open_calls oc
       join programs p on p.id = oc.program_id
       join entities e on e.id = p.entity_id
      where oc.id = $1 and e.organization_id = $2`,
    [openCallId, organizationId],
  );
  return result.rows[0]?.radar_opportunity_id ?? undefined;
}

const NOT_LINKED = "This opportunity is not listed on Missa yet, so its dates cannot be edited here.";

/**
 * Any member who can open the opportunity builder can read the dates; the
 * editor shows them read-only to members who cannot change them.
 */
export async function GET(request: Request, { params }: Params) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: "opportunities.read" });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const pool = deadlineFactsPool();
  if (!pool) return NextResponse.json({ error: "A database is required to edit dates." }, { status: 503, headers });
  try {
    const opportunityId = await linkedOpportunityId(pool, result.access, id, openCallId);
    if (!opportunityId) return NextResponse.json({ error: NOT_LINKED }, { status: 404, headers });
    const facts = await readOpportunityDeadlineFacts(pool, opportunityId);
    if (!facts) return NextResponse.json({ error: NOT_LINKED }, { status: 404, headers });
    return NextResponse.json(facts, { headers: { ...headers, etag: `"${facts.revision}"` } });
  } catch (error) {
    return deadlineFactsErrorResponse(error);
  }
}

/** Replace the fee tiers and stages the organization publishes, recorded with source "organization". */
export async function PUT(request: Request, { params }: Params) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: "organization.manage" });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const pool = deadlineFactsPool();
  if (!pool) return NextResponse.json({ error: "A database is required to edit dates." }, { status: 503, headers });
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey) return NextResponse.json({ error: "Idempotency-Key is required." }, { status: 400, headers });
  const parsed = parseDeadlineFactsBody(await request.json().catch(() => null), request.headers.get("If-Match"));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400, headers });
  try {
    const opportunityId = await linkedOpportunityId(pool, result.access, id, openCallId);
    if (!opportunityId) return NextResponse.json({ error: NOT_LINKED }, { status: 404, headers });
    const saved = await replaceOpportunityDeadlineFacts(pool, {
      opportunityId,
      source: "organization",
      actorAccountId: result.access.session.account.id,
      idempotencyKey,
      ...parsed,
    });
    return NextResponse.json(saved, { headers: { ...headers, etag: `"${saved.facts.revision}"` } });
  } catch (error) {
    return deadlineFactsErrorResponse(error);
  }
}
