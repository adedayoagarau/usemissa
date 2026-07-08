import { NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth';
import { getWorkspaceEngine, persistWorkspace } from '@/lib/workspaceEngine';

/** Story 6.3: Form Builder v1. The UI never shows "Submission Path" -- users
 * see "form" and "categories" (docs/missa-naming-decisions.md). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!Array.isArray(body.categories) || !Array.isArray(body.fields)) {
    return NextResponse.json({ error: 'categories and fields arrays are required' }, { status: 400 });
  }

  const engine = await getWorkspaceEngine();
  try {
    const path = engine.createSubmissionPath(openCallId, body.categories, body.fields, body.feeCents);
    await persistWorkspace();
    return NextResponse.json(path, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}
