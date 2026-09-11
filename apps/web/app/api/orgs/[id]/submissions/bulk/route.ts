import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const body = await request.json().catch(() => ({}));
  if (body.operation !== 'mark-in-review' && body.operation !== 'archive') return NextResponse.json({ error: 'Choose a supported bulk operation' }, { status: 400 });
  if (!Array.isArray(body.submissionIds) || body.submissionIds.length < 1 || body.submissionIds.length > 500 || body.submissionIds.some((value: unknown) => typeof value !== 'string' || !value.trim())) return NextResponse.json({ error: 'Provide between 1 and 500 submission IDs' }, { status: 400 });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Bulk previews are not available yet' }, { status: 503 });
  const submissions = await (await getRelationalWorkspace()).submissionsForOrganization(id);
  const requestedIds = [...new Set(body.submissionIds.map((value: string) => value.trim()))];
  const matched = submissions.filter((submission) => requestedIds.includes(submission.id));
  return NextResponse.json({ operation: body.operation, organizationId: id, requestedCount: requestedIds.length, matchedCount: matched.length, missingIds: requestedIds.filter((submissionId) => !matched.some((submission) => submission.id === submissionId)), affected: matched.map((submission) => ({ id: submission.id, status: submission.status, openCallId: submission.openCallId })), execution: 'preview-only' });
}
