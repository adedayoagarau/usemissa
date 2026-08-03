import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

const headers = { 'Cache-Control': 'private, no-store' };
function render(template: string, values: Record<string, string>): string { return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => values[key] ?? ''); }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return NextResponse.json({ error: 'Decision email sending is not configured yet. Set RESEND_API_KEY and RESEND_FROM.' }, { status: 503, headers });
  const body = await request.json().catch(() => ({}));
  const workIds: string[] = Array.isArray(body.workIds) ? body.workIds.filter((value: unknown): value is string => typeof value === 'string') : [];
  const subject = typeof body.subject === 'string' ? body.subject.trim() : 'Your Missa submission update';
  const template = typeof body.body === 'string' ? body.body : 'Hello,\n\n{{workTitle}} was {{outcome}}.\n\nThank you.';
  const resend = new Resend(apiKey);
  const sent: string[] = [];
  for (const workId of workIds) {
    const work = result.access.scope.work(workId); const decision = work && result.access.workspace.decisionForWork(id, workId); const submission = work && result.access.workspace.store.submissions.get(work.submissionId); const account = submission && result.access.radar.store.accounts.get(submission.submitterAccountId); if (!work || !decision || !account?.email) continue;
    const emailSubject = render(subject, { workTitle: work.title, outcome: decision.outcome });
    const emailBody = render(template, { workTitle: work.title, outcome: decision.outcome });
    await resend.emails.send({ from, to: account.email, subject: emailSubject, text: emailBody });
    sent.push(workId);
    result.access.radar.recordAudit(result.access.session.account.id, 'decision.email.sent', 'work_decision', decision.id, JSON.stringify({ recipient: account.email, subject: emailSubject }));
  }
  await persistOrganizationMutation(result.access, { action: 'decision.email.batch_sent', targetType: 'organization', targetId: id, detail: { workIds: sent } });
  return NextResponse.json({ sent: sent.length, workIds: sent }, { headers });
}
