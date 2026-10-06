import { NextResponse } from 'next/server';
import { z } from 'zod';
import { unknownMergeFields } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { batchSummary, COMMUNICATIONS_UNAVAILABLE } from '@/lib/communicationsData';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update'),
    subject: z.string().trim().min(1).max(240).optional(),
    body: z.string().trim().min(1).max(20_000).optional(),
    recipients: z.array(z.object({ submissionId: z.string().trim().min(1), submitterAccountId: z.string().trim().min(1), workIds: z.array(z.string()).max(200).default([]) })).max(2_000).optional(),
  }),
  z.object({ action: z.literal('request-approval') }),
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('cancel') }),
]);

export async function GET(request: Request, { params }: { params: Promise<{ id: string; batchId: string }> }) {
  const { id, batchId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'messages.read' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: COMMUNICATIONS_UNAVAILABLE }, { status: 503, headers });
  const batch = result.access.workspace.communicationBatch(id, batchId);
  if (!batch) return NextResponse.json({ error: 'Unknown letter for this organization' }, { status: 404, headers });
  return NextResponse.json(batchSummary(batch, result.access.radar), { headers });
}

/**
 * Moves a letter through its gate: update wording or recipients, request
 * approval, approve (honouring the organization's second-approver rule) or
 * cancel. Sending has its own route.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; batchId: string }> }) {
  const { id, batchId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: COMMUNICATIONS_UNAVAILABLE }, { status: 503, headers });
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Choose update, request-approval, approve or cancel', issues: parsed.error.flatten().fieldErrors }, { status: 400, headers });
  const workspace = result.access.workspace;
  const actor = result.access.session.account.id;
  if (!workspace.communicationBatch(id, batchId)) return NextResponse.json({ error: 'Unknown letter for this organization' }, { status: 404, headers });
  try {
    const input = parsed.data;
    if (input.action === 'update') {
      const unknown = unknownMergeFields(`${input.subject ?? ''}\n${input.body ?? ''}`);
      if (unknown.length) return NextResponse.json({ error: `Unknown merge ${unknown.length === 1 ? 'tag' : 'tags'}: ${unknown.join(', ')}` }, { status: 400, headers });
      workspace.updateCommunicationBatch(id, batchId, { subject: input.subject, body: input.body, recipients: input.recipients }, actor);
    } else if (input.action === 'request-approval') {
      workspace.requestCommunicationApproval(id, batchId, actor);
    } else if (input.action === 'approve') {
      const organization = result.access.radar.store.organizations.get(id);
      const customization = resolveOrganizationCustomization(organization ?? { name: id });
      workspace.approveCommunicationBatch(id, batchId, actor, { secondApproverRequired: customization.communications.secondApproverRequired });
    } else {
      workspace.cancelCommunicationBatch(id, batchId, actor);
    }
    const batch = workspace.communicationBatch(id, batchId)!;
    await persistOrganizationMutation(result.access, { action: `communication.${input.action}`, targetType: 'communication_batch', targetId: batchId, detail: { status: batch.status, recipients: batch.recipients.length } });
    return NextResponse.json(batchSummary(batch, result.access.radar), { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The letter could not be updated' }, { status: 409, headers });
  }
}
