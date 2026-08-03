import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

/** Story 6.3: Form Builder v1. The UI never shows "Submission Path" -- users
 * see "form" and "categories" (docs/missa-naming-decisions.md). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!result.access.scope.openCall(openCallId)) {
    return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404 });
  }

  const body = await request.json();
  if (!Array.isArray(body.categories) || !Array.isArray(body.fields)) {
    return NextResponse.json({ error: 'categories and fields arrays are required' }, { status: 400 });
  }

  const engine = result.access.workspace;
  try {
    const path = engine.createSubmissionPath(openCallId, body.categories, body.fields, body.feeCents);
    await persistOrganizationMutation(result.access, {
      action: 'submission-form.create',
      targetType: 'submission-path',
      targetId: path.id,
      detail: { opportunityId: openCallId },
    });
    return NextResponse.json(path, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!result.access.scope.openCall(openCallId)) return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404 });
  const body = await request.json();
  if (typeof body.pathId !== 'string' || !Array.isArray(body.categories) || !Array.isArray(body.fields)) return NextResponse.json({ error: 'pathId, categories, and fields arrays are required' }, { status: 400 });
  const path = result.access.workspace.store.submissionPaths.get(body.pathId);
  if (!path || path.openCallId !== openCallId) return NextResponse.json({ error: 'Unknown form for this opportunity' }, { status: 404 });
  try {
    const updated = result.access.workspace.updateSubmissionPath(path.id, { categories: body.categories, fields: body.fields, feeCents: typeof body.feeCents === 'number' ? body.feeCents : undefined });
    await persistOrganizationMutation(result.access, { action: 'submission-form.update', targetType: 'submission-path', targetId: updated.id, detail: { opportunityId: openCallId } });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 400 });
  }
}
