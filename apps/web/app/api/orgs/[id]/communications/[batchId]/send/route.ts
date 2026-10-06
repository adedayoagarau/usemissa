import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { batchSummary, batchTemplateVersion, renderBatchLetters, COMMUNICATIONS_UNAVAILABLE } from '@/lib/communicationsData';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';
import { deliverOrganizationCommunication } from '@/emails/organization-communication';
import { trackPlatformAnalytics } from '@/lib/platformAnalytics';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * Sends an approved letter batch through Resend, one durable effect per
 * recipient. `{ test: true }` instead sends the first recipient's rendering
 * to the signed-in admin and changes nothing on the batch. Recipients whose
 * send failed stay `failed` and a later call retries only them.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; batchId: string }> }) {
  const { id, batchId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: COMMUNICATIONS_UNAVAILABLE }, { status: 503, headers });
  const body = await request.json().catch(() => ({}));
  const { workspace, radar } = result.access;
  const batch = workspace.communicationBatch(id, batchId);
  if (!batch) return NextResponse.json({ error: 'Unknown letter for this organization' }, { status: 404, headers });
  const organization = radar.store.organizations.get(id);
  const customization = resolveOrganizationCustomization(organization ?? { name: id });
  const actor = result.access.session.account.id;
  const connectionString = process.env.DATABASE_URL;

  if (body.test === true) {
    const admin = radar.store.accounts.get(actor);
    if (!admin?.email) return NextResponse.json({ error: 'Your account has no email address to send a test to' }, { status: 400, headers });
    const [first] = renderBatchLetters({ radar, workspace, batch, customization, limit: 1 });
    if (!first) return NextResponse.json({ error: 'Add at least one recipient to render a test' }, { status: 400, headers });
    const report = await deliverOrganizationCommunication({ rendered: first, recipientEmail: admin.email, recipientAccountId: admin.id, organizationId: id, actorAccountId: actor, batchId, submissionId: first.submissionId, kind: batch.kind, replyTo: customization.communications.replyTo, templateVersion: batchTemplateVersion(batch), test: true }, connectionString);
    return NextResponse.json({ test: true, status: report.status, reason: report.reason }, { status: report.status === 'sent' || report.status === 'replayed' ? 200 : 502, headers });
  }

  if (process.env.NODE_ENV === 'production' && (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM)) {
    return NextResponse.json({ error: 'Letter sending is not configured yet. Set RESEND_API_KEY and RESEND_FROM.' }, { status: 503, headers });
  }
  try {
    workspace.beginCommunicationSend(id, batchId, actor);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'This letter cannot be sent' }, { status: 409, headers });
  }
  const templateVersion = batchTemplateVersion(batch);
  const letters = renderBatchLetters({ radar, workspace, batch, customization });
  for (const letter of letters) {
    const recipient = batch.recipients.find((item) => item.submissionId === letter.submissionId)!;
    if (recipient.status === 'sent' || recipient.status === 'skipped') continue;
    const account = radar.store.accounts.get(recipient.submitterAccountId);
    if (!account?.email) {
      workspace.recordCommunicationRecipientResult(id, batchId, recipient.submissionId, { status: 'skipped', reason: 'No email address on the submitter account' });
      continue;
    }
    const report = await deliverOrganizationCommunication({ rendered: letter, recipientEmail: account.email, recipientAccountId: account.id, organizationId: id, actorAccountId: actor, batchId, submissionId: recipient.submissionId, kind: batch.kind, replyTo: customization.communications.replyTo, templateVersion }, connectionString);
    if (report.status === 'sent' || report.status === 'replayed') workspace.recordCommunicationRecipientResult(id, batchId, recipient.submissionId, { status: 'sent', effectId: report.effectId });
    else if (report.status === 'suppressed') workspace.recordCommunicationRecipientResult(id, batchId, recipient.submissionId, { status: 'suppressed', reason: report.reason });
    else workspace.recordCommunicationRecipientResult(id, batchId, recipient.submissionId, { status: 'failed', reason: report.reason ?? 'Provider did not accept the message' });
  }
  workspace.finishCommunicationSend(id, batchId, actor);
  const summary = batchSummary(batch, radar);
  await persistOrganizationMutation(result.access, { action: 'communication.sent', targetType: 'communication_batch', targetId: batchId, detail: { status: batch.status, ...summary.counts } });
  await trackPlatformAnalytics({ eventName: 'organization.decision_email_batch_sent', source: 'organization-api', accountId: actor, organizationId: id, properties: { sent: summary.counts.sent ?? 0, failed: summary.counts.failed ?? 0 } }).catch(() => undefined);
  return NextResponse.json(summary, { headers });
}
