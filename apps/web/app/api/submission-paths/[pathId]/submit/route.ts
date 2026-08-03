import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getWorkspaceEngine, persistWorkspace } from '@/lib/workspaceEngine';

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
  if (body.works.some((work: unknown) => !work || typeof work !== 'object' || typeof (work as { title?: unknown }).title !== 'string' || !(work as { title: string }).title.trim())) {
    return NextResponse.json({ error: 'Each work needs a title' }, { status: 400 });
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
    const submission = engine.createSubmission(pathId, session.account.id, body.works, payment);
    await persistWorkspace();
    return NextResponse.json({ submission, works: engine.worksForSubmission(submission.id) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}
