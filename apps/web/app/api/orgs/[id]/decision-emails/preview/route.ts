import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';

const headers = { 'Cache-Control': 'private, no-store' };
function render(template: string, values: Record<string, string>): string { return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => values[key] ?? ''); }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const body = await request.json().catch(() => ({}));
  const workIds: string[] = Array.isArray(body.workIds) ? body.workIds.filter((value: unknown): value is string => typeof value === 'string') : [];
  const subject = typeof body.subject === 'string' ? body.subject.trim() : 'Your Missa submission update';
  const template = typeof body.body === 'string' ? body.body : 'Hello,\n\n{{workTitle}} was {{outcome}}.\n\nThank you.';
  const previews = workIds.flatMap((workId) => { const work = result.access.scope.work(workId); const decision = work && result.access.workspace.decisionForWork(id, workId); if (!work || !decision) return []; const submission = result.access.workspace.store.submissions.get(work.submissionId); const account = submission && result.access.radar.store.accounts.get(submission.submitterAccountId); return [{ workId, to: account?.email ?? submission?.submitterAccountId ?? 'unknown', outcome: decision.outcome, subject: render(subject, { workTitle: work.title, outcome: decision.outcome }), body: render(template, { workTitle: work.title, outcome: decision.outcome }) }]; });
  return NextResponse.json({ previews }, { headers });
}
