import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { renderBatchLetters, COMMUNICATIONS_UNAVAILABLE } from '@/lib/communicationsData';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/** Renders the letter for each recipient (first 25 by default) exactly as it would be sent. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; batchId: string }> }) {
  const { id, batchId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: COMMUNICATIONS_UNAVAILABLE }, { status: 503, headers });
  const body = await request.json().catch(() => ({}));
  const limit = Number.isInteger(body.limit) && body.limit > 0 ? Math.min(body.limit, 200) : 25;
  const batch = result.access.workspace.communicationBatch(id, batchId);
  if (!batch) return NextResponse.json({ error: 'Unknown letter for this organization' }, { status: 404, headers });
  const organization = result.access.radar.store.organizations.get(id);
  const customization = resolveOrganizationCustomization(organization ?? { name: id });
  const subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : batch.subject;
  const letterBody = typeof body.body === 'string' && body.body.trim() ? body.body.trim() : batch.body;
  const previews = renderBatchLetters({ radar: result.access.radar, workspace: result.access.workspace, batch: { ...batch, subject, body: letterBody }, customization, limit });
  return NextResponse.json({ previews, total: batch.recipients.length, signoff: customization.communications.signoff, senderName: customization.communications.senderName, replyTo: customization.communications.replyTo }, { headers });
}
