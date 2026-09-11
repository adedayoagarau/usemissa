import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { formDefinitionSchema } from '@/lib/portalConfigurationSchema';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

type Params = { id: string; versionId: string };

export async function PATCH(request: Request, { params }: { params: Promise<Params> }) {
  const { id, versionId } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  const body = await request.json();
  const parsed = formDefinitionSchema.safeParse(body.definition);
  if (!parsed.success) return NextResponse.json({ error: 'Form definition is invalid', issues: parsed.error.flatten() }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const command = workspaceCommandEnvelope(request, { actorAccountId: access.access.session.account.id, organizationId: id, commandType: 'form_version.update', payload: parsed.data, expectedRevision: body.expectedRevision });
    const updated = await workspace.updateFormVersion(command, versionId, parsed.data);
    return NextResponse.json({ id: updated.resourceId, revision: updated.revision, receiptId: updated.receiptId, idempotent: updated.replayed });
  } catch (error) {
    const mapped = workspaceMutationError(error)!;
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
