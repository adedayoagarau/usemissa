import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getRelationalWorkspace, getWorkspaceEngine, persistWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import { getEngine, persistRadar } from '@/lib/engine';
import { checkOpportunitySubmissionCap, recordSubmissionAgainstCap } from '@/lib/submission-caps';
import { trackPlatformAnalytics } from '@/lib/platformAnalytics';

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
  const relational = workspaceRelationalAuthorityEnabled();
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() || undefined;
  if (relational && !idempotencyKey) return NextResponse.json({ error: 'Idempotency-Key is required' }, { status: 400 });
  if (idempotencyKey && idempotencyKey.length > 200) return NextResponse.json({ error: 'Idempotency-Key must be 200 characters or fewer' }, { status: 400 });
  const relationalWorkspace = relational ? await getRelationalWorkspace() : undefined;
  const workspace = relational ? undefined : await getWorkspaceEngine();
  const relationalPath = relationalWorkspace ? await relationalWorkspace.publicSubmissionPath(pathId) : undefined;
  const compatibilityPath = workspace?.store.submissionPaths.get(pathId);
  const path = relationalPath ?? compatibilityPath;
  if (!path) return NextResponse.json({ error: 'Unknown submission form' }, { status: 404 });
  const openCall = relationalPath ? { title: relationalPath.openCallTitle, radarOpportunityId: relationalPath.radarOpportunityId } : workspace!.store.openCalls.get(path.openCallId);
  if (!openCall) return NextResponse.json({ error: 'This submission form is not open' }, { status: 409 });

  if (relationalPath) {
    const publishedConfiguration = (await relationalWorkspace!.opportunityConfigurationVersionsForOpenCall(relationalPath.organizationId, relationalPath.openCallId)).find((version) => version.status === 'published');
    if (publishedConfiguration) {
      const now = Date.now();
      const opensAt = publishedConfiguration.configuration.opensAt ? Date.parse(publishedConfiguration.configuration.opensAt) : undefined;
      const closesAt = publishedConfiguration.configuration.closesAt ? Date.parse(publishedConfiguration.configuration.closesAt) : undefined;
      const gracePeriod = publishedConfiguration.configuration.gracePeriodMinutes * 60_000;
      if (opensAt !== undefined && now < opensAt) return NextResponse.json({ error: 'This application is not open yet', code: 'application_not_open' }, { status: 409 });
      if (closesAt !== undefined && now > closesAt + gracePeriod) return NextResponse.json({ error: 'The application deadline has passed', code: 'application_closed' }, { status: 409 });
    }
  }

  if (openCall.radarOpportunityId) {
    const capCheck = await checkOpportunitySubmissionCap(openCall.radarOpportunityId, false);
    if (!capCheck.allowed) {
      return NextResponse.json({ error: capCheck.reason || 'This submission call has reached its capacity.' }, { status: 409 });
    }
  }
  const ownedFileUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' && parsed.pathname.includes(`/missa/submissions/${session.account.id}/`);
    } catch { return false; }
  };
  if (!relational && idempotencyKey) {
    const existing = [...workspace!.store.submissions.values()].find((candidate) => candidate.submissionPathId === pathId && candidate.submitterAccountId === session.account.id && candidate.idempotencyKey === idempotencyKey);
    if (existing) return NextResponse.json({ submission: existing, works: workspace!.worksForSubmission(existing.id), trackerLinked: false, idempotent: true }, { status: 200 });
  }
  interface WorkInput {
    title?: string;
    fileUrl?: string;
    fileUrls?: string[];
  }

  const works = body.works as WorkInput[];
  for (const work of works) {
    if (!work || typeof work.title !== 'string' || !work.title.trim()) {
      return NextResponse.json({ error: 'Each work needs a title' }, { status: 400 });
    }
    const urls = [
      ...(typeof work.fileUrl === 'string' ? [work.fileUrl] : []),
      ...(Array.isArray(work.fileUrls) ? work.fileUrls.filter((u): u is string => typeof u === 'string') : []),
    ];
    if (urls.some((url) => !ownedFileUrl(url))) {
      return NextResponse.json({ error: 'Work contains an invalid upload' }, { status: 400 });
    }
  }


  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const categories = path.categories as string[];
  if (category && !categories.includes(category)) return NextResponse.json({ error: 'Choose a valid category' }, { status: 400 });
  const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers as Record<string, unknown> : {};
  const normalizedAnswers: Record<string, string | string[]> = {};
  for (const field of path.fields as Array<{ id: string; type: string; label: string; required: boolean; visibleWhen?: { fieldId: string; equals: string } }>) {
    if (field.visibleWhen && answers[field.visibleWhen.fieldId] !== field.visibleWhen.equals) continue;
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
  const feeCents = typeof path.feeCents === 'number' ? path.feeCents : undefined;
  if (feeCents && feeCents > 0) {
    const paymentSessionId = typeof body.paymentSessionId === 'string' ? body.paymentSessionId : '';
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret || !paymentSessionId) return NextResponse.json({ error: 'Complete payment before submitting' }, { status: 402 });
    const paymentResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(paymentSessionId)}`, { headers: { Authorization: `Bearer ${secret}` } });
    const checkout = await paymentResponse.json() as { payment_status?: string; amount_total?: number; currency?: string; metadata?: Record<string, string> };
    if (!paymentResponse.ok || checkout.payment_status !== 'paid' || checkout.amount_total !== feeCents || checkout.currency?.toLowerCase() !== 'usd' || checkout.metadata?.path_id !== pathId || checkout.metadata?.account_id !== session.account.id) return NextResponse.json({ error: 'Payment could not be verified' }, { status: 402 });
    payment = { status: 'paid', sessionId: paymentSessionId, feeCents };
  }

  if (relational) {
    try {
      const payload = {
        submissionPathId: pathId,
        works: body.works.map((work: { title: string; fileUrl?: string; fileUrls?: string[] }) => ({
          title: work.title.trim(),
          ...(work.fileUrl ? { fileUrl: work.fileUrl } : {}),
          ...(work.fileUrls ? { fileUrls: work.fileUrls } : {}),
        })),
        answers: normalizedAnswers,
        ...(category ? { category } : {}),
        paymentStatus: payment.status,
        ...(payment.sessionId ? { paymentSessionId: payment.sessionId } : {}),
        ...(payment.feeCents !== undefined ? { feeCents: payment.feeCents } : {}),
      };
      const command = workspaceCommandEnvelope(request, { actorAccountId: session.account.id, ownerAccountId: session.account.id, commandType: 'submission.finalize', payload });
      const created = await relationalWorkspace!.finalizeSubmission(command, payload);
      const userId = session.account.userId;
      const linkedOpportunityId = openCall.radarOpportunityId;
      const radar = await getEngine();
      let radarDirty = false;
      const projectionKey = `submission:receipt:${created.resourceId}`;
      const projectionAlreadyApplied = radar.store.emittedAlertKeys.has(projectionKey);
      if (userId) {
        radar.addUserAlert({ dedupKey: projectionKey, userId, kind: 'submission-receipt', title: `Submission sent: ${openCall.title}`, body: 'Your receipt is ready in Tracker.', reason: 'you submitted through a Missa-hosted form', ...(linkedOpportunityId ? { opportunityId: linkedOpportunityId } : {}) });
        radarDirty = true;
      }
      if (userId && linkedOpportunityId && radar.store.opportunities.has(linkedOpportunityId)) {
        const projectionNote = `Missa submission ${created.resourceId}`;
        const tracked = radar.store.tracked.find((item) => item.userId === userId && item.opportunityId === linkedOpportunityId);
        if (!created.replayed || (!projectionAlreadyApplied && !tracked?.events.some((event) => event.note === projectionNote))) {
          radar.setMyStatus(userId, linkedOpportunityId, 'submitted', { source: 'user', note: projectionNote });
        }
        radarDirty = true;
      }
      if (radarDirty) await persistRadar();
      if (!created.replayed && openCall.radarOpportunityId) {
        await recordSubmissionAgainstCap(openCall.radarOpportunityId);
      }
      await trackPlatformAnalytics({
        eventName: 'application.provider_receipt_recorded',
        source: 'hosted-submission-api',
        accountId: session.account.id,
        properties: {
          submission_id: created.resourceId,
          provider: 'missa-hosted',
          ...(linkedOpportunityId ? { opportunity_id: linkedOpportunityId } : {}),
        },
        idempotencyKey: `hosted-submission:${created.resourceId}:analytics`,
      });
      return NextResponse.json({ submission: { id: created.resourceId, submissionPathId: pathId, submitterAccountId: session.account.id, status: 'submitted', revision: created.revision, receiptId: created.receiptId }, works: created.data?.works ?? [], trackerLinked: Boolean(userId && linkedOpportunityId), idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'failed' }, { status: mapped?.status ?? 404 });
    }
  }

  const engine = workspace!;
  try {
    const submission = engine.createSubmission(pathId, session.account.id, body.works, payment, { answers: normalizedAnswers, category: category || undefined, idempotencyKey });
    engine.deleteSubmissionDraft(pathId, session.account.id);
    await persistWorkspace();
    const radar = await getEngine();
    const userId = session.account.userId;
    const linkedOpportunityId = openCall.radarOpportunityId;
    let radarDirty = false;
    if (userId) {
      radar.addUserAlert({
        dedupKey: `submission:receipt:${submission.id}`,
        userId,
        kind: 'submission-receipt',
        title: `Submission sent: ${openCall.title}`,
        body: 'Your receipt is ready in Tracker.',
        reason: 'you submitted through a Missa-hosted form',
        ...(linkedOpportunityId ? { opportunityId: linkedOpportunityId } : {}),
      });
      radarDirty = true;
    }
    if (userId && linkedOpportunityId && radar.store.opportunities.has(linkedOpportunityId)) {
      radar.setMyStatus(userId, linkedOpportunityId, 'submitted', { source: 'user', note: `Missa submission ${submission.id}` });
      radarDirty = true;
    }
    if (radarDirty) await persistRadar();
    if (linkedOpportunityId) {
      await recordSubmissionAgainstCap(linkedOpportunityId);
    }
    await trackPlatformAnalytics({
      eventName: 'application.provider_receipt_recorded',
      source: 'hosted-submission-api',
      accountId: session.account.id,
      properties: {
        submission_id: submission.id,
        provider: 'missa-hosted',
        ...(linkedOpportunityId ? { opportunity_id: linkedOpportunityId } : {}),
      },
      idempotencyKey: `hosted-submission:${submission.id}:analytics`,
    });
    return NextResponse.json({ submission, works: engine.worksForSubmission(submission.id), trackerLinked: Boolean(userId && linkedOpportunityId), idempotent: false }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}
