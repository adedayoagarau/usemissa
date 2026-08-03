import { requireOrganizationAccess } from '@/lib/organizationAccess';

function csv(value: unknown): string { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return new Response(JSON.stringify({ error: result.error }), { status: result.status, headers: { 'content-type': 'application/json' } });
  const engine = result.access.workspace;
  const rows = ['submission_id,work_id,work_title,submitted_at,decision,decided_at'];
  for (const submission of engine.submissionsForOrganization(id)) for (const work of engine.worksForSubmission(submission.id)) { const decision = engine.decisionForWork(id, work.id); rows.push([submission.id, work.id, work.title, submission.submittedAt, decision?.outcome ?? '', decision?.decidedAt ?? ''].map(csv).join(',')); }
  return new Response(`${rows.join('\n')}\n`, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="missa-submissions.csv"', 'cache-control': 'private, no-store' } });
}
