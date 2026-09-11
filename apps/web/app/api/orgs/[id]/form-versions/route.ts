import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { formDefinitionSchema } from '@/lib/portalConfigurationSchema';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  return NextResponse.json(await (await getRelationalWorkspace()).formVersionsForOrganization(id));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  const body = await request.json();
  const definitionKey = typeof body.definitionKey === 'string' ? body.definitionKey.trim() : '';
  const parsed = formDefinitionSchema.safeParse(body.definition);
  if (!definitionKey || definitionKey.length > 120 || !parsed.success) return NextResponse.json({ error: 'Form definition is invalid' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { definitionKey, definition: parsed.data };
    const command = workspaceCommandEnvelope(request, { actorAccountId: access.access.session.account.id, organizationId: id, commandType: 'form_version.create', payload });
    const created = await workspace.createFormVersion(command, payload);
    return NextResponse.json({ id: created.resourceId, revision: created.revision, receiptId: created.receiptId, idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error)!;
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
