import { NextResponse } from 'next/server';
import { z } from 'zod';
import { communicationTemplate, unknownMergeFields } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { batchSummary, COMMUNICATIONS_UNAVAILABLE } from '@/lib/communicationsData';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

const recipientSchema = z.object({ submissionId: z.string().trim().min(1), submitterAccountId: z.string().trim().min(1), workIds: z.array(z.string()).max(200).default([]) });
const createBatchSchema = z.object({
  openCallId: z.string().trim().min(1),
  kind: z.enum(['rejection-with-dignity', 'longlist', 'shortlist', 'finalists', 'decision', 'custom']),
  subject: z.string().trim().min(1).max(240).optional(),
  body: z.string().trim().min(1).max(20_000).optional(),
  recipients: z.array(recipientSchema).max(2_000),
});

/** Lists letter batches for the organization, newest first. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'messages.read' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ available: false, reason: COMMUNICATIONS_UNAVAILABLE, batches: [] }, { headers });
  const batches = result.access.workspace.communicationBatchesForOrganization(id).map((batch) => batchSummary(batch, result.access.radar));
  return NextResponse.json({ available: true, batches }, { headers });
}

/** Creates a draft letter batch. Subject and body default to the kind's template. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: COMMUNICATIONS_UNAVAILABLE }, { status: 503, headers });
  const parsed = createBatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Check the letter details', issues: parsed.error.flatten().fieldErrors }, { status: 400, headers });
  const template = communicationTemplate(parsed.data.kind);
  const subject = parsed.data.subject ?? template.defaultSubject;
  const body = parsed.data.body ?? template.defaultBody;
  const unknown = unknownMergeFields(`${subject}\n${body}`);
  if (unknown.length) return NextResponse.json({ error: `Unknown merge ${unknown.length === 1 ? 'tag' : 'tags'}: ${unknown.join(', ')}` }, { status: 400, headers });
  try {
    const batch = result.access.workspace.createCommunicationBatch(id, { ...parsed.data, subject, body, createdByAccountId: result.access.session.account.id });
    await persistOrganizationMutation(result.access, { action: 'communication.created', targetType: 'communication_batch', targetId: batch.id, detail: { kind: batch.kind, recipients: batch.recipients.length } });
    return NextResponse.json(batchSummary(batch, result.access.radar), { status: 201, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The letter could not be created' }, { status: 400, headers });
  }
}
