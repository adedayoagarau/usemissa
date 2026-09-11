import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json([]);
  return NextResponse.json(await (await getRelationalWorkspace()).reviewerGroupsForOrganization(id));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Reviewer groups are not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120) return NextResponse.json({ error: 'A reviewer group name is required' }, { status: 400 });
  if (body.workloadLimit !== undefined && (!Number.isInteger(body.workloadLimit) || body.workloadLimit < 1 || body.workloadLimit > 10_000)) return NextResponse.json({ error: 'Workload limit must be a positive integer' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { name, ...(body.workloadLimit === undefined ? {} : { workloadLimit: body.workloadLimit }) };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'reviewer_group.create', payload });
    const created = await workspace.createReviewerGroup(command, payload);
    return NextResponse.json({ id: created.resourceId, ...payload, revision: created.revision, receiptId: created.receiptId }, { status: 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Reviewer group could not be created' }, { status: mapped?.status ?? 500 });
  }
}
