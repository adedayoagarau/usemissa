import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { opportunityConfigurationSchema } from '@/lib/portalConfigurationSchema';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

type Params = { id: string; openCallId: string };

export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { id, openCallId } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  return NextResponse.json(await (await getRelationalWorkspace()).opportunityConfigurationVersionsForOpenCall(id, openCallId));
}

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const { id, openCallId } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  const parsed = opportunityConfigurationSchema.safeParse((await request.json()).configuration);
  if (!parsed.success) return NextResponse.json({ error: 'Opportunity configuration is invalid', issues: parsed.error.flatten() }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { openCallId, configuration: parsed.data };
    const command = workspaceCommandEnvelope(request, { actorAccountId: access.access.session.account.id, organizationId: id, commandType: 'opportunity_configuration_version.create', payload });
    const created = await workspace.createOpportunityConfigurationVersion(command, payload);
    return NextResponse.json({ id: created.resourceId, revision: created.revision, receiptId: created.receiptId, idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error)!;
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
