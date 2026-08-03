import { NextResponse } from 'next/server';
import { verifyStripeSignature } from '@/lib/billing';
import { getEngine, persistRadar } from '@/lib/engine';
import { getWorkspaceEngine, persistWorkspace } from '@/lib/workspaceEngine';

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret || !verifyStripeSignature(payload, signature, secret)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }
  const event = JSON.parse(payload) as { id?: string; type: string; data?: { object?: Record<string, unknown> } };
  const object = event.data?.object ?? {};
  const metadata = (object.metadata ?? {}) as Record<string, string>;
  const organizationId = metadata.organization_id ?? (object.client_reference_id as string | undefined);
  if (event.type === 'account.updated') {
    const accountId = object.id as string | undefined;
    const radar = await getEngine();
    const organization = [...radar.store.organizations.values()].find((candidate) => candidate.stripeConnectAccountId === accountId);
    if (organization) {
      organization.stripeConnectStatus = object.charges_enabled === true && object.payouts_enabled === true ? 'connected' : 'pending';
      radar.recordAudit(undefined, 'billing.account_updated', 'organization', organization.id);
      await persistRadar();
    }
    return NextResponse.json({ received: true });
  }
  const paymentEvent = event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded';
  if (paymentEvent && metadata.path_id && metadata.account_id && object.payment_status === 'paid') {
    const radar = await getEngine();
    const eventId = event.id ?? `${event.type}:${String(object.id ?? '')}`;
    const alreadyProcessed = radar.store.auditLog.some((entry) => {
      if (entry.action !== 'submission.payment.processed' || !entry.detail) return false;
      try { return (JSON.parse(entry.detail) as { eventId?: string }).eventId === eventId; } catch { return false; }
    });
    if (alreadyProcessed) return NextResponse.json({ received: true, idempotent: true });
    const workspace = await getWorkspaceEngine();
    const path = workspace.store.submissionPaths.get(metadata.path_id);
    const sessionAccountId = metadata.account_id;
    const existing = [...workspace.store.submissions.values()].find((submission) => submission.submissionPathId === metadata.path_id && submission.submitterAccountId === sessionAccountId && submission.paymentSessionId === object.id);
    if (existing) {
      radar.recordAudit(undefined, 'submission.payment.processed', 'submission', existing.id, JSON.stringify({ eventId, paymentSessionId: object.id }));
      await persistRadar();
      return NextResponse.json({ received: true, submissionId: existing.id, idempotent: true });
    }
    const draft = path ? workspace.submissionDraftFor(path.id, sessionAccountId) : undefined;
    if (!path || !draft) return NextResponse.json({ error: 'Submission draft is not available yet' }, { status: 409 });
    if (draft.paymentSessionId && draft.paymentSessionId !== object.id) return NextResponse.json({ error: 'Payment does not match the saved draft' }, { status: 409 });
    const fileUrl = Object.values(draft.answers).flatMap((value) => Array.isArray(value) ? value : [value]).find((value) => {
      if (typeof value !== 'string') return false;
      try { const parsed = new URL(value); return parsed.protocol === 'https:' && parsed.pathname.includes(`/missa/submissions/${sessionAccountId}/`); } catch { return false; }
    });
    const works = draft.workTitles.filter(Boolean).map((title, index) => {
      const saved = draft.answers[`__work_files_${index}`];
      const attachments = (Array.isArray(saved) ? saved : saved ? [saved] : []).filter((value): value is string => typeof value === 'string' && value.startsWith('https://'));
      const resolved = attachments.length ? attachments : (index === 0 && fileUrl ? [fileUrl] : []);
      return { title, ...(resolved.length ? { fileUrl: resolved[0], fileUrls: resolved } : {}) };
    });
    if (works.length === 0) return NextResponse.json({ error: 'Submission draft has no works' }, { status: 409 });
    const submission = workspace.createSubmission(path.id, sessionAccountId, works, { status: 'paid', sessionId: String(object.id ?? ''), feeCents: path.feeCents }, { answers: draft.answers, category: draft.category, idempotencyKey: draft.idempotencyKey });
    workspace.deleteSubmissionDraft(path.id, sessionAccountId);
    await persistWorkspace();
    const openCall = workspace.store.openCalls.get(path.openCallId);
    const account = radar.store.accounts.get(sessionAccountId);
    if (account?.userId) {
      radar.addUserAlert({
        dedupKey: `submission:receipt:${submission.id}`,
        userId: account.userId,
        kind: 'submission-receipt',
        title: `Submission sent: ${openCall?.title ?? 'Missa submission'}`,
        body: 'Your receipt is ready in My submissions.',
        reason: 'you submitted through a Missa-hosted form',
        ...(openCall?.radarOpportunityId ? { opportunityId: openCall.radarOpportunityId } : {}),
      });
    }
    if (account?.userId && openCall?.radarOpportunityId && radar.store.opportunities.has(openCall.radarOpportunityId)) {
      radar.setMyStatus(account.userId, openCall.radarOpportunityId, 'submitted', { source: 'user', note: `Missa submission ${submission.id}` });
    }
    radar.recordAudit(undefined, 'submission.payment.processed', 'submission', submission.id, JSON.stringify({ eventId, paymentSessionId: object.id }));
    await persistRadar();
    return NextResponse.json({ received: true, submissionId: submission.id });
  }
  if (!organizationId) return NextResponse.json({ received: true });
  const radar = await getEngine();
  const organization = radar.store.organizations.get(organizationId);
  if (!organization) return NextResponse.json({ received: true });
  if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.updated') {
    organization.billingTier = (metadata.plan as typeof organization.billingTier) ?? organization.billingTier;
    organization.billingStatus = event.type === 'checkout.session.completed' ? 'active' : (object.status as typeof organization.billingStatus) ?? 'active';
    organization.billingCustomerId = (object.customer as string | undefined) ?? organization.billingCustomerId;
    organization.billingSubscriptionId = (object.subscription as string | undefined) ?? (object.id as string | undefined) ?? organization.billingSubscriptionId;
    organization.billingCancelAtPeriodEnd = object.cancel_at_period_end === true;
  } else if (event.type === 'customer.subscription.deleted') {
    organization.billingStatus = 'canceled';
    organization.billingCancelAtPeriodEnd = false;
  }
  radar.recordAudit(undefined, `billing.${event.type}`, 'organization', organizationId);
  await persistRadar();
  return NextResponse.json({ received: true });
}
