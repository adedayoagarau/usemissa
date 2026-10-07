import type { RadarEngine } from '@missa/radar-engine';
import type { CommunicationBatch, WorkspaceEngine } from '@missa/workspace-engine';
import { deliverOrganizationCommunication } from '@/emails/organization-communication';
import { batchTemplateVersion, renderBatchLetters } from './communicationsData';
import { resolveOrganizationCustomization } from './organizationCustomization';

export type SendBatchOutcome = { ok: true; batch: CommunicationBatch } | { ok: false; status: 409 | 503; error: string };

/**
 * The one send path for organization letters, used by the Send button and
 * the scheduler. Locks the batch (approval and wording are rechecked by the
 * engine), sends each unsent recipient through the durable mail service, and
 * derives the batch outcome. Persistence is the caller's job.
 */
export async function sendCommunicationBatch(input: {
  radar: Pick<RadarEngine, 'store'>;
  workspace: WorkspaceEngine;
  organizationId: string;
  batchId: string;
  actorAccountId: string;
  connectionString?: string;
  env?: Record<string, string | undefined>;
}): Promise<SendBatchOutcome> {
  const { radar, workspace, organizationId, batchId, actorAccountId } = input;
  const env = input.env ?? process.env;
  if (env.NODE_ENV === 'production' && (!env.RESEND_API_KEY || !env.RESEND_FROM)) {
    return { ok: false, status: 503, error: 'Letter sending is not configured yet. Set RESEND_API_KEY and RESEND_FROM.' };
  }
  try {
    workspace.beginCommunicationSend(organizationId, batchId, actorAccountId);
  } catch (error) {
    return { ok: false, status: 409, error: error instanceof Error ? error.message : 'This letter cannot be sent' };
  }
  const batch = workspace.communicationBatch(organizationId, batchId)!;
  const organization = radar.store.organizations.get(organizationId);
  const customization = resolveOrganizationCustomization(organization ?? { name: organizationId });
  const templateVersion = batchTemplateVersion(batch);
  for (const letter of renderBatchLetters({ radar, workspace, batch, customization })) {
    const recipient = batch.recipients.find((item) => item.submissionId === letter.submissionId)!;
    if (recipient.status === 'sent' || recipient.status === 'skipped') continue;
    const account = radar.store.accounts.get(recipient.submitterAccountId);
    if (!account?.email) {
      workspace.recordCommunicationRecipientResult(organizationId, batchId, recipient.submissionId, { status: 'skipped', reason: 'No email address on the submitter account' });
      continue;
    }
    const report = await deliverOrganizationCommunication({ rendered: letter, recipientEmail: account.email, recipientAccountId: account.id, organizationId, actorAccountId, batchId, submissionId: recipient.submissionId, kind: batch.kind, replyTo: customization.communications.replyTo, templateVersion }, input.connectionString);
    if (report.status === 'sent' || report.status === 'replayed') workspace.recordCommunicationRecipientResult(organizationId, batchId, recipient.submissionId, { status: 'sent', effectId: report.effectId });
    else if (report.status === 'suppressed') workspace.recordCommunicationRecipientResult(organizationId, batchId, recipient.submissionId, { status: 'suppressed', reason: report.reason });
    else workspace.recordCommunicationRecipientResult(organizationId, batchId, recipient.submissionId, { status: 'failed', reason: report.reason ?? 'Provider did not accept the message' });
  }
  workspace.finishCommunicationSend(organizationId, batchId, actorAccountId);
  return { ok: true, batch };
}

/** Provider delivery state per durable effect id, from the organization's message ledger. */
export async function deliveryStatusByEffect(connectionString: string | undefined, organizationId: string): Promise<Map<string, string> | undefined> {
  if (!connectionString) return undefined;
  try {
    const { readOrganizationMessageHistory } = await import('@missa/radar-adapters');
    const history = await readOrganizationMessageHistory(connectionString, organizationId, { limit: 500 });
    if (!history.available) return undefined;
    return new Map(history.effects.map((effect) => [effect.id, String(effect.status)]));
  } catch {
    return undefined;
  }
}

/** Customer wording for a provider state. Accepted is not delivered. */
export function deliveryLabel(status: string | undefined): string | undefined {
  switch (status) {
    case undefined: return undefined;
    case 'delivered': return 'Delivered';
    case 'accepted': return 'Accepted by the provider';
    case 'bounced': return 'Bounced';
    case 'suppressed': return 'Suppressed';
    case 'failed': return 'Failed at the provider';
    case 'queued':
    case 'attempted': return 'In flight';
    default: return 'Delivery unknown';
  }
}
