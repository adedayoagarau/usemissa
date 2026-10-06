import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { planDistribution, workspaceRequestHash, type DistributionReader, type DistributionSubmission } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { compatibilityDistributionInputs } from '@/lib/readerOperationsData';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * One-click multi-reader distribution for a round. `dryRun: true` returns
 * the plan (assignments, conflicts, under-covered submissions, load after)
 * without writing; the same body with `dryRun: false` applies exactly that
 * plan. Conflict-of-interest checks run on both passes and are never bypassed
 * by the commit, so what the admin previewed is what is written.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const body = await request.json().catch(() => ({}));
  const readersPerSubmission = Number(body.readersPerSubmission);
  if (!Number.isInteger(readersPerSubmission) || readersPerSubmission < 1 || readersPerSubmission > 10) {
    return NextResponse.json({ error: 'readersPerSubmission must be a whole number from 1 to 10' }, { status: 400, headers });
  }
  const readerAccountIds: string[] = Array.isArray(body.readerAccountIds) ? [...new Set<string>((body.readerAccountIds as unknown[]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0))] : [];
  if (readerAccountIds.length === 0) return NextResponse.json({ error: 'Choose at least one reader' }, { status: 400, headers });
  const submissionIds: string[] | undefined = Array.isArray(body.submissionIds) ? body.submissionIds.filter((value: unknown): value is string => typeof value === 'string') : undefined;
  const capacity = body.capacity === undefined || body.capacity === null || body.capacity === '' ? undefined : Number(body.capacity);
  if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1 || capacity > 500)) return NextResponse.json({ error: 'capacity must be a whole number from 1 to 500' }, { status: 400, headers });
  const dryRun = body.dryRun !== false;
  const policy = { sharedEmailDomain: body.policy?.sharedEmailDomain !== false, nameMatch: body.policy?.nameMatch !== false };

  if (workspaceRelationalAuthorityEnabled()) {
    return distributeRelational({ request, id, roundId, readersPerSubmission, readerAccountIds, submissionIds, capacity, dryRun, policy, radar: result.access.radar, actorAccountId: result.access.session.account.id });
  }

  const inputs = compatibilityDistributionInputs({ radar: result.access.radar, workspace: result.access.workspace, organizationId: id, roundId, readerAccountIds, submissionIds, capacity });
  if (!inputs) return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404, headers });
  if (inputs.readers.length === 0) return NextResponse.json({ error: 'None of the chosen readers is a member of this organization' }, { status: 400, headers });
  const plan = planDistribution({ submissions: inputs.submissions, readers: inputs.readers, readersPerSubmission, policy });
  if (dryRun) return NextResponse.json({ dryRun: true, plan }, { headers });

  const applied = result.access.workspace.applyDistribution(roundId, plan.assignments, result.access.session.account.id);
  await persistOrganizationMutation(result.access, {
    action: 'review-assignment.distributed',
    targetType: 'review_round',
    targetId: roundId,
    detail: { readersPerSubmission, readers: inputs.readers.length, created: applied.created.length, skipped: applied.skipped.length, conflicts: plan.conflicts.length, underCovered: plan.underCovered.length },
  });
  return NextResponse.json({ dryRun: false, plan, created: applied.created.length, skipped: applied.skipped }, { status: 201, headers });
}

async function distributeRelational(input: {
  request: Request;
  id: string;
  roundId: string;
  readersPerSubmission: number;
  readerAccountIds: string[];
  submissionIds?: string[];
  capacity?: number;
  dryRun: boolean;
  policy: { sharedEmailDomain: boolean; nameMatch: boolean };
  radar: Awaited<ReturnType<typeof requireOrganizationAccess>> extends infer R ? (R extends { ok: true; access: { radar: infer Radar } } ? Radar : never) : never;
  actorAccountId: string;
}) {
  const { request, id, roundId, radar } = input;
  const relational = await getRelationalWorkspace();
  const calls = await relational.openCallsForOrganization(id);
  const rounds = (await Promise.all(calls.map((call) => relational.reviewRoundsForOpenCall(id, call.id)))).flat();
  const round = rounds.find((item) => item.id === roundId);
  if (!round) return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404, headers });
  const all = await relational.submissionsForOrganization(id);
  const wanted = input.submissionIds ? new Set(input.submissionIds) : undefined;
  const submissions: DistributionSubmission[] = all.filter((submission) => submission.openCallId === round.openCallId && submission.status !== 'withdrawn' && (!wanted || wanted.has(submission.id))).map((submission) => {
    const mine = submission.assignments.filter((assignment) => assignment.reviewRoundId === roundId && assignment.reviewerAccountId);
    const submitter = radar.store.accounts.get(submission.submitterAccountId);
    return { id: submission.id, submitterAccountId: submission.submitterAccountId, submitterName: submitter?.displayName, submitterEmailDomain: submitter?.email.split('@')[1], existingReviewerAccountIds: mine.filter((assignment) => !assignment.recusedAt).map((assignment) => assignment.reviewerAccountId!), recusedReviewerAccountIds: mine.filter((assignment) => assignment.recusedAt).map((assignment) => assignment.reviewerAccountId!) };
  });
  const members = new Set(radar.store.memberships.filter((membership) => membership.organizationId === id).map((membership) => membership.accountId));
  const readers: DistributionReader[] = input.readerAccountIds.filter((accountId) => members.has(accountId)).map((accountId) => {
    const account = radar.store.accounts.get(accountId);
    const open = all.reduce((count, submission) => count + submission.assignments.filter((assignment) => assignment.reviewerAccountId === accountId && !assignment.completedAt && !assignment.recusedAt).length, 0);
    return { accountId, label: account?.displayName || account?.email || accountId, name: account?.displayName, emailDomain: account?.email.split('@')[1], openAssignments: open, capacity: input.capacity };
  });
  if (readers.length === 0) return NextResponse.json({ error: 'None of the chosen readers is a member of this organization' }, { status: 400, headers });
  const plan = planDistribution({ submissions, readers, readersPerSubmission: input.readersPerSubmission, policy: input.policy });
  if (input.dryRun) return NextResponse.json({ dryRun: true, plan }, { headers });
  const base = request.headers.get('Idempotency-Key')?.trim() || randomUUID();
  let created = 0;
  const skipped: Array<{ submissionId: string; reviewerAccountId: string; reason: string }> = [];
  for (const [index, pair] of plan.assignments.entries()) {
    const payload = { reviewRoundId: roundId, submissionId: pair.submissionId, reviewerAccountId: pair.reviewerAccountId };
    try {
      const envelope = workspaceCommandEnvelope(new Request(request.url, { headers: { 'Idempotency-Key': `${base}:${index}` } }), { actorAccountId: input.actorAccountId, organizationId: id, commandType: 'review_assignment.create', payload });
      const outcome = await relational.assignReviewer({ ...envelope, requestHash: workspaceRequestHash({ commandType: 'review_assignment.create', payload, expectedRevision: undefined }) }, payload);
      if (!outcome.replayed) created += 1;
    } catch (error) {
      const mapped = workspaceMutationError(error);
      skipped.push({ ...pair, reason: mapped?.body.error ?? (error instanceof Error ? error.message : 'could not assign') });
    }
  }
  return NextResponse.json({ dryRun: false, plan, created, skipped }, { status: 201, headers });
}
