import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getWorkspaceEngine, persistWorkspace } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request, { params }: { params: Promise<{ pathId: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { pathId } = await params;
  const workspace = await getWorkspaceEngine();
  if (!workspace.store.submissionPaths.has(pathId)) return NextResponse.json({ error: 'Unknown submission form' }, { status: 404, headers });
  return NextResponse.json({ draft: workspace.submissionDraftFor(pathId, session.account.id) ?? null }, { headers });
}

export async function PUT(request: Request, { params }: { params: Promise<{ pathId: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { pathId } = await params;
  const workspace = await getWorkspaceEngine();
  if (!workspace.store.submissionPaths.has(pathId)) return NextResponse.json({ error: 'Unknown submission form' }, { status: 404, headers });
  const body = await request.json().catch(() => ({}));
  const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers as Record<string, string | string[]> : {};
  const workTitles = Array.isArray(body.workTitles) ? body.workTitles.filter((value: unknown): value is string => typeof value === 'string').map((value: string) => value.trim()).filter(Boolean).slice(0, 100) : [];
  try {
    const draft = workspace.saveSubmissionDraft(pathId, session.account.id, { answers, category: typeof body.category === 'string' ? body.category.trim() || undefined : undefined, workTitles, idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey.slice(0, 200) : undefined, paymentSessionId: typeof body.paymentSessionId === 'string' ? body.paymentSessionId.slice(0, 200) : undefined });
    await persistWorkspace();
    return NextResponse.json({ draft }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save draft' }, { status: 400, headers });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ pathId: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { pathId } = await params;
  const workspace = await getWorkspaceEngine();
  workspace.deleteSubmissionDraft(pathId, session.account.id);
  await persistWorkspace();
  return NextResponse.json({ deleted: true }, { headers });
}
