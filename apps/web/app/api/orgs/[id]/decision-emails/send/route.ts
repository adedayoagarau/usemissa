import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { Resend } from 'resend';
import { beginPlatformMessageEffect, completePlatformMessageEffect } from '@missa/radar-adapters';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { trackPlatformAnalytics } from '@/lib/platformAnalytics';
import { runDurableProviderDelivery } from '@/lib/durableMessageDelivery';
import { reconcileRequestedWorkIds } from '@/lib/organizationMessagePresentation';

const headers = { 'Cache-Control': 'private, no-store' };
function render(template: string, values: Record<string, string>): string { return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => values[key] ?? ''); }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim().slice(0, 200) || undefined;
  const batchKey = idempotencyKey ?? randomUUID();
  if (idempotencyKey) {
    const replay = result.access.radar.store.auditLog.find((entry) => {
      if (entry.action !== 'decision.email.batch_sent' || entry.targetId !== id || !entry.detail) return false;
      try { return (JSON.parse(entry.detail) as { idempotencyKey?: string }).idempotencyKey === idempotencyKey; } catch { return false; }
    });
    if (replay?.detail) {
      try { const detail = JSON.parse(replay.detail) as { workIds?: string[] }; return NextResponse.json({ sent: detail.workIds?.length ?? 0, workIds: detail.workIds ?? [], idempotent: true }, { headers }); } catch { /* continue as a fresh request */ }
    }
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return NextResponse.json({ error: 'Decision email sending is not configured yet. Set RESEND_API_KEY and RESEND_FROM.' }, { status: 503, headers });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'Durable message delivery is unavailable.' }, { status: 503, headers });
  const body = await request.json().catch(() => ({}));
  const candidateWorkIds: string[] = Array.isArray(body.workIds) ? body.workIds.filter((value: unknown): value is string => typeof value === 'string').map((value: string) => value.trim()).filter(Boolean) : [];
  const workIds: string[] = Array.from(new Set<string>(candidateWorkIds)).slice(0, 100);
  const subject = typeof body.subject === 'string' ? body.subject.trim() : 'Your Missa submission update';
  const template = typeof body.body === 'string' ? body.body : 'Hello,\n\n{{workTitle}} was {{outcome}}.\n\nThank you.';
  const templateVersion = createHash('sha256').update(`${subject}\u0000${template}`).digest('hex');
  const resend = new Resend(apiKey);
  const sent: string[] = [];
  const failed: string[] = [];
  for (const workId of workIds) {
    const work = result.access.scope.work(workId); const decision = work && result.access.workspace.decisionForWork(id, workId); const submission = work && result.access.workspace.store.submissions.get(work.submissionId); const account = submission && result.access.radar.store.accounts.get(submission.submitterAccountId); if (!work || !decision || !account?.email) { failed.push(workId); continue; }
    const emailSubject = render(subject, { workTitle: work.title, outcome: decision.outcome });
    const emailBody = render(template, { workTitle: work.title, outcome: decision.outcome });
    let effect: Awaited<ReturnType<typeof beginPlatformMessageEffect>> | undefined;
    try {
      effect = await beginPlatformMessageEffect(process.env.DATABASE_URL, {
        idempotencyKey: `decision-email:${batchKey}:${workId}`,
        accountId: result.access.session.account.id,
        recipientAccountId: account.id,
        actorAccountId: result.access.session.account.id,
        organizationId: id,
        kind: 'decision-email',
        provider: 'resend',
        templateKey: 'organization-decision-email',
        templateVersion,
        metadata: { workId, decisionId: decision.id },
      });
    } catch { failed.push(workId); continue; }
    const delivery = await runDurableProviderDelivery({
      shouldDeliver: effect.shouldDeliver, currentStatus: effect.currentStatus,
      send: async () => { const response = await resend.emails.send({ from, to: account.email, subject: emailSubject, text: emailBody }); if (response.error) throw new Error(response.error.message); return response; },
      recordAccepted: async (response) => completePlatformMessageEffect({ connectionString: process.env.DATABASE_URL!, effectId: effect.effectId, attemptNumber: effect.attemptNumber, status: 'accepted', providerMessageId: response.data?.id }).then(() => undefined),
      recordFailed: async (error) => completePlatformMessageEffect({ connectionString: process.env.DATABASE_URL!, effectId: effect.effectId, attemptNumber: effect.attemptNumber, status: 'failed', error: error instanceof Error ? error.message : 'Provider send failed' }).then(() => undefined),
    });
    if (delivery.outcome === 'accepted' || delivery.outcome === 'replayed-accepted') {
      sent.push(workId);
      if (delivery.outcome === 'accepted') result.access.radar.recordAudit(result.access.session.account.id, 'decision.email.sent', 'work_decision', decision.id, JSON.stringify({ effectId: effect.effectId, providerAccepted: true }));
    } else {
      failed.push(workId);
    }
  }
  failed.push(...reconcileRequestedWorkIds(workIds, sent, failed));
  await persistOrganizationMutation(result.access, { action: 'decision.email.batch_sent', targetType: 'organization', targetId: id, detail: { workIds: sent, failedWorkIds: failed, idempotencyKey } });
  await trackPlatformAnalytics({ eventName: 'organization.decision_email_batch_sent', source: 'organization-api', accountId: result.access.session.account.id, organizationId: id, properties: { sent: sent.length, failed: failed.length } });
  return NextResponse.json({ sent: sent.length, workIds: sent, failedWorkIds: failed, idempotent: false }, { headers });
}
