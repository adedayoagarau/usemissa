import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };
const RELATIONAL_UNAVAILABLE = 'Round due dates and briefs are not available while relational authority is enabled; use the relational review commands.';

/**
 * Round settings. `dueAt` (ISO date or null) sets the date the organization
 * asked readers for on every open read in the round; past it, an open read
 * counts as overdue and the reader reminder says so. `brief` (text or null)
 * sets what readers must read and acknowledge before they can score.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: RELATIONAL_UNAVAILABLE }, { status: 503, headers });
  const body = await request.json().catch(() => ({}));
  if (!('dueAt' in body) && !('brief' in body)) return NextResponse.json({ error: 'Send dueAt (an ISO date, or null) and/or brief (text, or null)' }, { status: 400, headers });
  if (!result.access.scope.reviewRound(roundId)) return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404, headers });
  if ('brief' in body) {
    if (body.brief !== null && (typeof body.brief !== 'string' || body.brief.length > 10_000)) return NextResponse.json({ error: 'brief must be text up to 10,000 characters, or null' }, { status: 400, headers });
    const organization = result.access.radar.store.organizations.get(id)!;
    const briefs = { ...(organization.customization?.roundBriefs ?? {}) };
    const text = typeof body.brief === 'string' ? body.brief.trim() : '';
    if (text) briefs[roundId] = { text, updatedAt: new Date().toISOString() };
    else delete briefs[roundId];
    organization.customization = { ...(organization.customization ?? {}), roundBriefs: briefs };
    await persistOrganizationMutation(result.access, { action: 'review-round.brief_set', targetType: 'review_round', targetId: roundId, detail: { hasBrief: Boolean(text) } }, { workspace: false });
    if (!('dueAt' in body)) return NextResponse.json({ roundId, brief: briefs[roundId] ?? null }, { headers });
  }
  let dueAt: string | undefined;
  if (body.dueAt !== null) {
    if (typeof body.dueAt !== 'string' || Number.isNaN(Date.parse(body.dueAt))) return NextResponse.json({ error: 'dueAt must be a valid date' }, { status: 400, headers });
    // A bare date means the end of that day in UTC, so a read is not overdue on its due day.
    dueAt = /^\d{4}-\d{2}-\d{2}$/.test(body.dueAt) ? new Date(`${body.dueAt}T23:59:59.000Z`).toISOString() : new Date(body.dueAt).toISOString();
  }
  try {
    const changed = result.access.workspace.setRoundDueDate(id, roundId, dueAt, result.access.session.account.id);
    await persistOrganizationMutation(result.access, { action: 'review-round.due_date_set', targetType: 'review_round', targetId: roundId, detail: { dueAt: dueAt ?? null, assignments: changed } });
    return NextResponse.json({ roundId, dueAt: dueAt ?? null, assignments: changed }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The due date could not be saved' }, { status: 404, headers });
  }
}
