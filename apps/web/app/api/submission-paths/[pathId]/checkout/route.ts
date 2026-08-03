import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine, persistWorkspace } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params;
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'Payments are not configured' }, { status: 503 });
  const workspace = await getWorkspaceEngine();
  const path = workspace.store.submissionPaths.get(pathId);
  if (!path) return NextResponse.json({ error: 'Unknown submission form' }, { status: 404 });
  if (!path.feeCents || path.feeCents <= 0) return NextResponse.json({ error: 'This form does not require payment' }, { status: 400 });
  const openCall = workspace.store.openCalls.get(path.openCallId);
  if (!openCall || openCall.status !== 'published') return NextResponse.json({ error: 'This submission form is not open' }, { status: 409 });
  const entity = [...workspace.store.entities.values()].find((candidate) => workspace.programsForEntity(candidate.id).some((program) => workspace.openCallsForProgram(program.id).some((call) => call.id === openCall.id)));
  const organizationId = entity?.organizationId;
  if (!organizationId) return NextResponse.json({ error: 'This submission form has no owning organization' }, { status: 409 });
  const radar = await getEngine();
  const organization = organizationId ? radar.store.organizations.get(organizationId) : undefined;
  if (!organization?.stripeConnectAccountId || organization.stripeConnectStatus !== 'connected') return NextResponse.json({ error: 'This organization has not finished payment setup' }, { status: 409 });
  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const applicationFee = Math.min(Math.round(path.feeCents * 0.015), 150);
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': openCall.title,
    'line_items[0][price_data][unit_amount]': String(path.feeCents),
    'line_items[0][quantity]': '1',
    success_url: `${origin}/org/${organizationId}/${openCall.id}?checkout_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/org/${organizationId}/${openCall.id}?checkout_cancelled=1`,
    'payment_intent_data[application_fee_amount]': String(applicationFee),
    'payment_intent_data[transfer_data][destination]': organization.stripeConnectAccountId,
    'metadata[path_id]': pathId,
    'metadata[account_id]': session.account.id,
    'metadata[organization_id]': organizationId,
  });
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim().slice(0, 200);
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) }, body: form });
  const data = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !data.id || !data.url) return NextResponse.json({ error: data.error?.message ?? 'Unable to start payment' }, { status: 502 });
  const draft = workspace.submissionDraftFor(pathId, session.account.id);
  if (draft) {
    workspace.saveSubmissionDraft(pathId, session.account.id, { answers: draft.answers, category: draft.category, workTitles: draft.workTitles, idempotencyKey: draft.idempotencyKey, paymentSessionId: data.id });
    await persistWorkspace();
  }
  return NextResponse.json({ id: data.id, url: data.url, feeCents: path.feeCents });
}
