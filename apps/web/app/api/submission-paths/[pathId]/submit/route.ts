import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getWorkspaceEngine, persistWorkspace } from '@/lib/workspaceEngine';
import { getEngine, persistRadar } from '@/lib/engine';

/**
 * Story 6.5: submitter file upload against a Submission Path.
 *
 * File bytes are uploaded separately to private Blob storage. This endpoint
 * only receives opaque file URLs and creates the durable Submission/Work row.
 */
export async function POST(request: Request, { params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params;
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  if (!Array.isArray(body.works) || body.works.length === 0) {
    return NextResponse.json({ error: 'At least one work is required' }, { status: 400 });
  }
  const workspace = await getWorkspaceEngine();
  const path = workspace.store.submissionPaths.get(pathId);
  if (!path) return NextResponse.json({ error: 'Unknown submission form' }, { status: 404 });
  const openCall = workspace.store.openCalls.get(path.openCallId);
  if (!openCall || openCall.status !== 'published') return NextResponse.json({ error: 'This submission form is not open' }, { status: 409 });
  const ownedFileUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' && parsed.pathname.includes(`/missa/submissions/${session.account.id}/`);
    } catch { return false; }
  };
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim().slice(0, 200) || undefined;
  if (idempotencyKey) {
    const existing = [...workspace.store.submissions.values()].find((candidate) => candidate.submissionPathId === pathId && candidate.submitterAccountId === session.account.id && candidate.idempotencyKey === idempotencyKey);
    if (existing) return NextResponse.json({ submission: existing, works: workspace.worksForSubmission(existing.id), trackerLinked: false, idempotent: true }, { status: 200 });
  }
  if (body.works.some((work: unknown) => !work || typeof work !== 'object' || typeof (work as { title?: unknown }).title !== 'string' || !(work as { title: string }).title.trim())) {
    return NextResponse.json({ error: 'Each work needs a title' }, { status: 400 });
  }
  if (body.works.some((work: unknown) => typeof (work as { fileUrl?: unknown }).fileUrl === 'string' && !ownedFileUrl((work as { fileUrl: string }).fileUrl))) {
    return NextResponse.json({ error: 'Work contains an invalid upload' }, { status: 400 });
  }

  const category = typeof body.category === 'string' ? body.category.trim() : '';
  if (category && !path.categories.includes(category)) return NextResponse.json({ error: 'Choose a valid category' }, { status: 400 });
  const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers as Record<string, unknown> : {};
  const normalizedAnswers: Record<string, string | string[]> = {};
  for (const field of path.fields) {
    const value = answers[field.id];
    if (field.type === 'category-select') {
      if (field.required && !category) return NextResponse.json({ error: `${field.label} is required` }, { status: 400 });
      continue;
    }
    if (field.type === 'fee-toggle') continue;
    const normalized = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : typeof value === 'string' ? value.trim() : '';
    if (field.type === 'file-upload') {
      const fileValues = Array.isArray(normalized) ? normalized : normalized ? [normalized] : [];
      if (fileValues.some((fileUrl) => !ownedFileUrl(fileUrl))) return NextResponse.json({ error: `${field.label} contains an invalid upload` }, { status: 400 });
    }
    if (field.required && (!normalized || (Array.isArray(normalized) && normalized.length === 0))) return NextResponse.json({ error: `${field.label} is required` }, { status: 400 });
    if (normalized && (!Array.isArray(normalized) || normalized.length > 0)) normalizedAnswers[field.id] = normalized;
  }

  let payment: { status: 'not-required' | 'paid'; sessionId?: string; feeCents?: number } = { status: 'not-required' };
  if (path.feeCents && path.feeCents > 0) {
    const paymentSessionId = typeof body.paymentSessionId === 'string' ? body.paymentSessionId : '';
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret || !paymentSessionId) return NextResponse.json({ error: 'Complete payment before submitting' }, { status: 402 });
    const paymentResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(paymentSessionId)}`, { headers: { Authorization: `Bearer ${secret}` } });
    const checkout = await paymentResponse.json() as { payment_status?: string; metadata?: Record<string, string> };
    if (!paymentResponse.ok || checkout.payment_status !== 'paid' || checkout.metadata?.path_id !== pathId || checkout.metadata?.account_id !== session.account.id) return NextResponse.json({ error: 'Payment could not be verified' }, { status: 402 });
    payment = { status: 'paid', sessionId: paymentSessionId, feeCents: path.feeCents };
  }

  const engine = workspace;
  try {
    const submission = engine.createSubmission(pathId, session.account.id, body.works, payment, { answers: normalizedAnswers, category: category || undefined, idempotencyKey });
    engine.deleteSubmissionDraft(pathId, session.account.id);
    await persistWorkspace();
    const radar = await getEngine();
    const userId = session.account.userId;
    const linkedOpportunityId = openCall.radarOpportunityId;
    if (userId && linkedOpportunityId && radar.store.opportunities.has(linkedOpportunityId)) {
      radar.setMyStatus(userId, linkedOpportunityId, 'submitted', { source: 'user', note: `Missa submission ${submission.id}` });
      await persistRadar();
    }
    return NextResponse.json({ submission, works: engine.worksForSubmission(submission.id), trackerLinked: Boolean(userId && linkedOpportunityId), idempotent: false }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}
