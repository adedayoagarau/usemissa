import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

const headers = { 'Cache-Control': 'private, no-store' };
const outcomes = ['accepted', 'declined', 'waitlisted'] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string; workId: string }> }) {
  const { id, workId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (!result.access.scope.work(workId)) return NextResponse.json({ error: 'Unknown Work for this organization' }, { status: 404, headers });
  const body = await request.json().catch(() => ({}));
  if (!(outcomes as readonly string[]).includes(body.outcome)) return NextResponse.json({ error: 'outcome must be accepted, declined, or waitlisted' }, { status: 400, headers });
  try {
    const decision = result.access.workspace.recordDecision(id, workId, body.outcome, result.access.session.account.id);
    await persistOrganizationMutation(result.access, { action: 'decision.recorded', targetType: 'work_decision', targetId: decision.id, detail: { workId, outcome: decision.outcome } });
    return NextResponse.json(decision, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to record decision' }, { status: 400, headers });
  }
}
