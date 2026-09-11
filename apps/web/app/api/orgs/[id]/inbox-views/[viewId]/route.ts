import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

type RouteContext = { params: Promise<{ id: string; viewId: string }> };

function parseView(body: unknown): { name: string; filter: { status?: string; openCallId?: string } } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const filter = value.filter;
  if (!name || name.length > 120 || !filter || typeof filter !== 'object' || Array.isArray(filter)) return null;
  const candidate = filter as Record<string, unknown>;
  if ((candidate.status !== undefined && typeof candidate.status !== 'string') || (candidate.openCallId !== undefined && typeof candidate.openCallId !== 'string')) return null;
  const allowedStatuses = new Set(['submitted', 'in-review', 'decided', 'withdrawn']);
  if (candidate.status !== undefined && !allowedStatuses.has(candidate.status)) return null;
  return {
    name,
    filter: {
      ...(candidate.status ? { status: candidate.status } : {}),
      ...(candidate.openCallId ? { openCallId: candidate.openCallId } : {}),
    },
  };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, viewId } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Inbox views are not available yet' }, { status: 503 });
  const parsed = parseView(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: 'Provide a valid inbox view' }, { status: 400 });
  const expectedRevision = Number(request.headers.get('if-match') ?? '');
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return NextResponse.json({ error: 'If-Match revision is required' }, { status: 428 });
  try {
    const workspace = await getRelationalWorkspace();
    const envelope = workspaceCommandEnvelope(request, { actorAccountId: access.access.session.account.id, organizationId: id, commandType: 'organization_inbox_view.update', expectedRevision, payload: parsed });
    const updated = await workspace.updateOrganizationInboxView(envelope, viewId, parsed);
    return NextResponse.json({ id: updated.resourceId, ...parsed, revision: updated.revision, receiptId: updated.receiptId });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Inbox view could not be updated' }, { status: mapped?.status ?? 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id, viewId } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Inbox views are not available yet' }, { status: 503 });
  const expectedRevision = Number(request.headers.get('if-match') ?? '');
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return NextResponse.json({ error: 'If-Match revision is required' }, { status: 428 });
  try {
    const workspace = await getRelationalWorkspace();
    const envelope = workspaceCommandEnvelope(request, { actorAccountId: access.access.session.account.id, organizationId: id, commandType: 'organization_inbox_view.delete', expectedRevision, payload: { viewId } });
    const deleted = await workspace.deleteOrganizationInboxView(envelope, viewId);
    return NextResponse.json({ id: deleted.resourceId, deleted: true, revision: deleted.revision, receiptId: deleted.receiptId });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Inbox view could not be deleted' }, { status: mapped?.status ?? 500 });
  }
}
