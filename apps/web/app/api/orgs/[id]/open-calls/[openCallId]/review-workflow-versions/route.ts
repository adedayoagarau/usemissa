import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { reviewWorkflowDefinitionSchema } from '@/lib/portalConfigurationSchema';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

type Params = { id: string; openCallId: string };

export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { id, openCallId } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  return NextResponse.json(await (await getRelationalWorkspace()).reviewWorkflowVersionsForOpenCall(id, openCallId));
}

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const { id, openCallId } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  const parsed = reviewWorkflowDefinitionSchema.safeParse((await request.json()).definition);
  if (!parsed.success) return NextResponse.json({ error: 'Review workflow is invalid', issues: parsed.error.flatten() }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { openCallId, definition: parsed.data };
    const command = workspaceCommandEnvelope(request, { actorAccountId: access.access.session.account.id, organizationId: id, commandType: 'review_workflow_version.create', payload });
    const created = await workspace.createReviewWorkflowVersion(command, payload);
    return NextResponse.json({ id: created.resourceId, revision: created.revision, receiptId: created.receiptId, idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error)!;
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
