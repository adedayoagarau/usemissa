import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Organization exports are not available yet' }, { status: 503 });
  const submissions = await (await getRelationalWorkspace()).submissionsForOrganization(id);
  const payload = { exportVersion: 1, organizationId: id, generatedAt: new Date().toISOString(), source: 'relational-submissions', records: submissions.map((submission) => ({ ...submission, answers: submission.answers ?? {}, works: submission.works.map((work) => ({ id: work.id, title: work.title, order: work.order })), assignments: submission.assignments.map((assignment) => ({ id: assignment.id, completedAt: assignment.completedAt })), decisions: submission.decisions })) };
  return new NextResponse(JSON.stringify(payload, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="missa-organization-${id}-submissions.json"`, 'Cache-Control': 'no-store' } });
}
