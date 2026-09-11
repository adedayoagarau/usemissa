import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ organizationId: id, draftDays: 30, uploadDays: 365, reviewDays: 730, messageDays: 730, revision: 1 });
  return NextResponse.json(await (await getRelationalWorkspace()).organizationRetentionPolicy(id));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Retention policy is not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const fields = ['draftDays', 'uploadDays', 'reviewDays', 'messageDays'] as const;
  if (fields.some((field) => !Number.isInteger(body[field]) || body[field] < 1 || body[field] > 3_650)) return NextResponse.json({ error: 'Retention values must be whole days between 1 and 3650' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const current = await workspace.organizationRetentionPolicy(id);
    const payload = { draftDays: body.draftDays, uploadDays: body.uploadDays, reviewDays: body.reviewDays, messageDays: body.messageDays };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'organization_retention_policy.update', payload, expectedRevision: body.revision ?? current.revision });
    const updated = await workspace.updateOrganizationRetentionPolicy(command, payload);
    return NextResponse.json({ organizationId: id, ...payload, revision: updated.revision, receiptId: updated.receiptId });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Retention policy could not be saved' }, { status: mapped?.status ?? 500 });
  }
}
