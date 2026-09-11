import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionAccount } from '@/lib/auth';
import { getRelationalWorkspace, getWorkspaceEngine, persistWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };
const draftSchema = z.object({
  answers: z.record(z.union([z.string(), z.array(z.string())])),
  workTitles: z.array(z.string().max(300).transform((title) => title.trim())).max(100),
  sectionProgress: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  category: z.string().trim().min(1).max(160).optional(),
  paymentSessionId: z.string().trim().min(1).max(200).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
  expectedRevision: z.number().int().positive().optional(),
}).strict();

export async function GET(request: Request, { params }: { params: Promise<{ pathId: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { pathId } = await params;
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ draft: await (await getRelationalWorkspace()).submissionDraftForOwner(pathId, session.account.id) ?? null }, { headers });
  const workspace = await getWorkspaceEngine();
  if (!workspace.store.submissionPaths.has(pathId)) return NextResponse.json({ error: 'Unknown submission form' }, { status: 404, headers });
  return NextResponse.json({ draft: workspace.submissionDraftFor(pathId, session.account.id) ?? null }, { headers });
}

export async function PUT(request: Request, { params }: { params: Promise<{ pathId: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { pathId } = await params;
  const body = await request.json();
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Application draft is invalid', issues: parsed.error.flatten() }, { status: 400, headers });
  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const payload = { submissionPathId: pathId, answers: parsed.data.answers, workTitles: parsed.data.workTitles, sectionProgress: parsed.data.sectionProgress, ...(parsed.data.category ? { category: parsed.data.category } : {}), ...(parsed.data.paymentSessionId ? { paymentSessionId: parsed.data.paymentSessionId } : {}) };
      const command = workspaceCommandEnvelope(request, { actorAccountId: session.account.id, ownerAccountId: session.account.id, commandType: 'submission_draft.save', payload, expectedRevision: parsed.data.expectedRevision });
      const saved = await workspace.saveSubmissionDraft(command, payload);
      return NextResponse.json({ draft: await workspace.submissionDraftForOwner(pathId, session.account.id), receiptId: saved.receiptId, idempotent: saved.replayed }, { headers });
    } catch (error) {
      const mapped = workspaceMutationError(error)!;
      return NextResponse.json(mapped.body, { status: mapped.status, headers });
    }
  }
  const workspace = await getWorkspaceEngine();
  if (!workspace.store.submissionPaths.has(pathId)) return NextResponse.json({ error: 'Unknown submission form' }, { status: 404, headers });
  try {
    const draft = workspace.saveSubmissionDraft(pathId, session.account.id, { answers: parsed.data.answers, category: parsed.data.category, workTitles: parsed.data.workTitles, idempotencyKey: parsed.data.idempotencyKey, paymentSessionId: parsed.data.paymentSessionId });
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
  if (workspaceRelationalAuthorityEnabled()) {
    const body = await request.json();
    const expectedRevision = z.number().int().positive().safeParse(body.expectedRevision);
    if (!expectedRevision.success) return NextResponse.json({ error: 'A valid expectedRevision is required' }, { status: 400, headers });
    try {
      const workspace = await getRelationalWorkspace();
      const command = workspaceCommandEnvelope(request, { actorAccountId: session.account.id, ownerAccountId: session.account.id, commandType: 'submission_draft.delete', payload: { pathId }, expectedRevision: expectedRevision.data });
      await workspace.deleteSubmissionDraft(command, pathId);
      return NextResponse.json({ deleted: true }, { headers });
    } catch (error) {
      const mapped = workspaceMutationError(error)!;
      return NextResponse.json(mapped.body, { status: mapped.status, headers });
    }
  }
  const workspace = await getWorkspaceEngine();
  workspace.deleteSubmissionDraft(pathId, session.account.id);
  await persistWorkspace();
  return NextResponse.json({ deleted: true }, { headers });
}
