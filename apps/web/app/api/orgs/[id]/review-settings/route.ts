import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ organizationId: id, blindMode: 'identity-redacted', revision: 1 });
  return NextResponse.json(await (await getRelationalWorkspace()).organizationReviewSettings(id));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Review privacy settings are not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (body.blindMode !== 'none' && body.blindMode !== 'identity-redacted') return NextResponse.json({ error: 'Choose a valid blind mode' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const settings = await workspace.organizationReviewSettings(id);
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'organization_review_settings.update', payload: { blindMode: body.blindMode }, expectedRevision: body.revision ?? settings.revision });
    const updated = await workspace.updateOrganizationReviewSettings(command, body.blindMode);
    return NextResponse.json({ organizationId: id, blindMode: body.blindMode, revision: updated.revision, receiptId: updated.receiptId, idempotent: updated.replayed }, { status: updated.replayed ? 200 : 200 });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Review privacy settings could not be saved' }, { status: mapped?.status ?? 500 });
  }
}
