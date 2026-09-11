import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Inbox views are not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120) return NextResponse.json({ error: 'A view name is required' }, { status: 400 });
  const filter = body.filter;
  if (!filter || typeof filter !== 'object' || Array.isArray(filter) || (filter.status !== undefined && typeof filter.status !== 'string') || (filter.openCallId !== undefined && typeof filter.openCallId !== 'string')) return NextResponse.json({ error: 'Provide a valid inbox filter' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { name, filter: { ...(filter.status ? { status: filter.status } : {}), ...(filter.openCallId ? { openCallId: filter.openCallId } : {}) } };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'organization_inbox_view.create', payload });
    const created = await workspace.createOrganizationInboxView(command, payload);
    return NextResponse.json({ id: created.resourceId, ...payload, revision: created.revision, receiptId: created.receiptId }, { status: 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Inbox view could not be created' }, { status: mapped?.status ?? 500 });
  }
}
