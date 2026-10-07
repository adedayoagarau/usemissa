import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };
const RELATIONAL_UNAVAILABLE = 'Rubrics are not available while relational authority is enabled; rounds use the single 0 to 100 score.';

/** The round's current rubric and every earlier version. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'reviews.read' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: RELATIONAL_UNAVAILABLE }, { status: 503, headers });
  if (!result.access.scope.reviewRound(roundId)) return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404, headers });
  const versions = result.access.workspace.rubricVersionsForRound(roundId);
  return NextResponse.json({ current: result.access.workspace.rubricForRound(roundId) ?? null, versions }, { headers });
}

/**
 * Saves a new rubric version: `criteria` is a list of { id?, label,
 * description?, weight 1-10, maxScore 3-10 }. An empty list returns the round
 * to the single score. Reads already scored keep the version they used.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: RELATIONAL_UNAVAILABLE }, { status: 503, headers });
  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.criteria)) return NextResponse.json({ error: 'Send criteria as a list' }, { status: 400, headers });
  try {
    const before = result.access.workspace.rubricVersionsForRound(roundId).at(-1)?.id;
    const rubric = result.access.workspace.setRoundRubric(id, roundId, body.criteria, result.access.session.account.id);
    if (rubric.id !== before) await persistOrganizationMutation(result.access, { action: 'review-round.rubric_set', targetType: 'review_round', targetId: roundId, detail: { version: rubric.version, criteria: rubric.criteria.length } });
    return NextResponse.json({ current: rubric.criteria.length ? rubric : null, version: rubric.version, changed: rubric.id !== before }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The rubric could not be saved';
    return NextResponse.json({ error: message }, { status: /not part of this organization/.test(message) ? 404 : 400, headers });
  }
}
