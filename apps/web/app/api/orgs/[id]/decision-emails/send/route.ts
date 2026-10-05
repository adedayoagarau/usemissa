import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { trackPlatformAnalytics } from '@/lib/platformAnalytics';
import { reconcileRequestedWorkIds } from '@/lib/organizationMessagePresentation';
import { sendMail } from '@/lib/mail-service';
import { renderDecisionLetter } from '@/emails/decision-letter';
import { checkDecisionLetters, WORKSPACE_DECISION_SCOPES, type DecisionLetterCheckInput } from '@missa/workspace-engine';
import { recordDecisionsAfterResponse, workspaceDecisionContext } from '@/lib/jevDecisions';

const headers = { 'Cache-Control': 'private, no-store' };
function render(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => values[key] ?? '');
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim().slice(0, 200) || undefined;
  const batchKey = idempotencyKey ?? randomUUID();
  if (idempotencyKey) {
    const replay = result.access.radar.store.auditLog.find((entry) => {
      if (entry.action !== 'decision.email.batch_sent' || entry.targetId !== id || !entry.detail) return false;
      try {
        return (JSON.parse(entry.detail) as { idempotencyKey?: string }).idempotencyKey === idempotencyKey;
      } catch {
        return false;
      }
    });
    if (replay?.detail) {
      try {
        const detail = JSON.parse(replay.detail) as { workIds?: string[] };
        return NextResponse.json({ sent: detail.workIds?.length ?? 0, workIds: detail.workIds ?? [], idempotent: true }, { headers });
      } catch {
        /* continue as a fresh request */
      }
    }
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return NextResponse.json({ error: 'Decision email sending is not configured yet. Set RESEND_API_KEY and RESEND_FROM.' }, { status: 503, headers });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'Durable message delivery is unavailable.' }, { status: 503, headers });
  const body = await request.json().catch(() => ({}));
  const candidateWorkIds: string[] = Array.isArray(body.workIds)
    ? body.workIds.filter((value: unknown): value is string => typeof value === 'string').map((value: string) => value.trim()).filter(Boolean)
    : [];
  const workIds: string[] = Array.from(new Set<string>(candidateWorkIds)).slice(0, 100);
  const subject = typeof body.subject === 'string' ? body.subject.trim() : 'Your Missa submission update';
  const template = typeof body.body === 'string' ? body.body : 'Hello,\n\n{{workTitle}} was {{outcome}}.\n\nThank you.';
  const templateVersion = createHash('sha256').update(`${subject}\u0000${template}`).digest('hex');
  const held = await checkLettersBeforeSending(result.access, id, workIds, subject, template, body.sendDespiteLetterCheck === true).catch((error) => {
    console.warn('[decisions] decision_email_check:', error);
    return null;
  });
  if (held) return NextResponse.json(held, { status: 422, headers });
  const sent: string[] = [];
  const failed: string[] = [];
  for (const workId of workIds) {
    const work = result.access.scope.work(workId);
    const decision = work && result.access.workspace.decisionForWork(id, workId);
    const submission = work && result.access.workspace.store.submissions.get(work.submissionId);
    const account = submission && result.access.radar.store.accounts.get(submission.submitterAccountId);
    if (!work || !decision || !submission || !account?.email) {
      failed.push(workId);
      continue;
    }
    const orgName = result.access.radar.store.organizations.get(id)?.name || 'Editorial Team';
    const emailSubject = render(subject, { workTitle: work.title, outcome: decision.outcome });
    const emailBody = render(template, { workTitle: work.title, outcome: decision.outcome });
    const isCustomTemplate = template !== 'Hello,\n\n{{workTitle}} was {{outcome}}.\n\nThank you.';

    const { html, text } = renderDecisionLetter({
      submitterName: account.displayName,
      organizationName: orgName,
      workTitle: work.title,
      outcome: decision.outcome,
      editorialNote: isCustomTemplate ? emailBody : undefined,
      submissionId: submission.id,
    });

    const report = await sendMail({
      recipientEmail: account.email,
      recipientAccountId: account.id,
      actorAccountId: result.access.session.account.id,
      organizationId: id,
      kind: 'decision-email',
      category: 'application_actionable',
      idempotencyKey: `decision-email:${batchKey}:${workId}`,
      subject: emailSubject,
      html,
      text,
      templateKey: 'organization-decision-email',
      templateVersion,
      metadata: { workId, decisionId: decision.id },
      connectionString: process.env.DATABASE_URL,
      retryFailed: false,
    });

    if (report.status === 'sent' || report.status === 'replayed') {
      sent.push(workId);
      if (report.status === 'sent') {
        result.access.radar.recordAudit(
          result.access.session.account.id,
          'decision.email.sent',
          'work_decision',
          decision.id,
          JSON.stringify({ effectId: report.effectId, providerAccepted: true })
        );
      }
    } else {
      failed.push(workId);
    }
  }
  failed.push(...reconcileRequestedWorkIds(workIds, sent, failed));
  await persistOrganizationMutation(result.access, {
    action: 'decision.email.batch_sent',
    targetType: 'organization',
    targetId: id,
    detail: { workIds: sent, failedWorkIds: failed, idempotencyKey },
  });
  await trackPlatformAnalytics({
    eventName: 'organization.decision_email_batch_sent',
    source: 'organization-api',
    accountId: result.access.session.account.id,
    organizationId: id,
    properties: { sent: sent.length, failed: failed.length },
  });
  return NextResponse.json({ sent: sent.length, workIds: sent, failedWorkIds: failed, idempotent: false }, { headers });
}

type OrganizationAccess = Extract<Awaited<ReturnType<typeof requireOrganizationAccess>>, { ok: true }>['access'];

/**
 * Scope `decision_email_check`: before anything is sent, check that each letter
 * with the organization's own words still tells the recipient the decision
 * recorded for that work. Only a live, confident mismatch holds the batch back,
 * and the organization can send anyway with `sendDespiteLetterCheck`. In
 * shadow mode, or when the check is unavailable, the check is only recorded,
 * after the response, and sending is unchanged. Letters built only from the
 * standard wording are never checked.
 */
async function checkLettersBeforeSending(
  access: OrganizationAccess,
  organizationId: string,
  workIds: string[],
  subject: string,
  template: string,
  sendDespiteLetterCheck: boolean,
): Promise<{ error: string; heldWorkIds: string[] } | null> {
  if (!process.env.JEV_API_KEY || template === 'Hello,\n\n{{workTitle}} was {{outcome}}.\n\nThank you.') return null;
  const orgName = access.radar.store.organizations.get(organizationId)?.name || 'Editorial Team';
  const letters: DecisionLetterCheckInput[] = [];
  for (const workId of workIds) {
    const work = access.scope.work(workId);
    const decision = work && access.workspace.decisionForWork(organizationId, workId);
    const submission = work && access.workspace.store.submissions.get(work.submissionId);
    const account = submission && access.radar.store.accounts.get(submission.submitterAccountId);
    if (!work || !decision || !submission || !account?.email) continue;
    const values = { workTitle: work.title, outcome: decision.outcome };
    const note = render(template, values);
    const { text } = renderDecisionLetter({ submitterName: account.displayName, organizationName: orgName, workTitle: work.title, outcome: decision.outcome, editorialNote: note, submissionId: submission.id });
    letters.push({ workId, decisionId: decision.id, label: work.title, recordedDecision: decision.outcome, subject: render(subject, values), letter: text, note });
  }
  if (letters.length === 0) return null;
  const scope = WORKSPACE_DECISION_SCOPES.decisionEmailCheck;
  const context = workspaceDecisionContext(scope, { interactive: true });
  if (context.mode !== 'live' || !context.client.available) {
    recordDecisionsAfterResponse(scope, () => checkDecisionLetters(workspaceDecisionContext(scope), letters));
    return null;
  }
  const check = await checkDecisionLetters(context, letters);
  if (check.errors.length) console.warn(`[decisions] ${scope}: ${check.errors[0]}`);
  if (check.blocked.length === 0 || sendDespiteLetterCheck) return null;
  const titles = check.blocked.map((letter) => `"${letter.label}"`).join(', ');
  return {
    error: `Nothing was sent. The letter for ${titles} may tell the recipient a different decision from the one recorded. Check the wording or the recorded decision, then send again.`,
    heldWorkIds: check.blocked.map((letter) => letter.workId),
  };
}
