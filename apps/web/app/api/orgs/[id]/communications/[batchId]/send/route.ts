import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { batchSummary, batchTemplateVersion, renderBatchLetters, COMMUNICATIONS_UNAVAILABLE } from '@/lib/communicationsData';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';
import { deliverOrganizationCommunication } from '@/emails/organization-communication';
import { trackPlatformAnalytics } from '@/lib/platformAnalytics';
import { sendCommunicationBatch } from '@/lib/communicationsSend';
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

  const sent = await sendCommunicationBatch({ radar, workspace, organizationId: id, batchId, actorAccountId: actor, connectionString });
  if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: sent.status, headers });
  const summary = batchSummary(batch, radar);
  await persistOrganizationMutation(result.access, { action: 'communication.sent', targetType: 'communication_batch', targetId: batchId, detail: { status: batch.status, ...summary.counts } });
  await trackPlatformAnalytics({ eventName: 'organization.decision_email_batch_sent', source: 'organization-api', accountId: actor, organizationId: id, properties: { sent: summary.counts.sent ?? 0, failed: summary.counts.failed ?? 0 } }).catch(() => undefined);
  return NextResponse.json(summary, { headers });
}
