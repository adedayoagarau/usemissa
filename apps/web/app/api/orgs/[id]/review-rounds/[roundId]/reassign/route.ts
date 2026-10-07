import { NextResponse } from 'next/server';
import { planDistribution } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { compatibilityDistributionInputs, roundDueDateFor } from '@/lib/readerOperationsData';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * Moves every open read a reader holds in this round to other readers. The
 * plan treats the departing reader as recused from those submissions, keeps
 * each submission at the reader count it had, and runs the same conflict and
 * capacity checks as distribution. `dryRun` previews; the commit withdraws
 * the open reads and applies exactly that plan.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Use the per-assignment reassign command while relational authority is enabled.' }, { status: 503, headers });
  const body = await request.json().catch(() => ({}));
  const from = typeof body.fromReviewerAccountId === 'string' ? body.fromReviewerAccountId.trim() : '';
  if (!from) return NextResponse.json({ error: 'fromReviewerAccountId is required' }, { status: 400, headers });
  const readerAccountIds: string[] = Array.isArray(body.readerAccountIds) ? [...new Set<string>((body.readerAccountIds as unknown[]).filter((value): value is string => typeof value === 'string' && value !== from))] : [];
  if (readerAccountIds.length === 0) return NextResponse.json({ error: 'Choose at least one other reader' }, { status: 400, headers });
  const capacity = body.capacity === undefined || body.capacity === null || body.capacity === '' ? undefined : Number(body.capacity);
  if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1 || capacity > 500)) return NextResponse.json({ error: 'capacity must be a whole number from 1 to 500' }, { status: 400, headers });
  const dryRun = body.dryRun !== false;
  const policy = { sharedEmailDomain: body.policy?.sharedEmailDomain !== false, nameMatch: body.policy?.nameMatch !== false };
  const workspace = result.access.workspace;
  if (!result.access.scope.reviewRound(roundId)) return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404, headers });

  const open = [...workspace.store.reviewAssignments.values()].filter((assignment) => assignment.reviewRoundId === roundId && assignment.reviewerAccountId === from && !assignment.completedAt && !assignment.recusedAt);
  if (open.length === 0) return NextResponse.json({ error: 'That reader has no open reads in this round' }, { status: 409, headers });
  const affected = new Set(open.map((assignment) => assignment.submissionId));
  const inputs = compatibilityDistributionInputs({ radar: result.access.radar, workspace, organizationId: id, roundId, readerAccountIds, submissionIds: [...affected], capacity });
  if (!inputs) return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404, headers });
  // Treat the departing reader as gone: their slot must be refilled and they are never chosen again.
  const submissions = inputs.submissions.map((submission) => ({
    ...submission,
    existingReviewerAccountIds: submission.existingReviewerAccountIds.filter((accountId) => accountId !== from),
    recusedReviewerAccountIds: [...(submission.recusedReviewerAccountIds ?? []), from],
  }));
  // Keep each submission at the count it had: group by that target and plan each group.
  const targets = new Map<number, typeof submissions>();
  for (const submission of submissions) {
    const target = submission.existingReviewerAccountIds.length + 1;
    targets.set(target, [...(targets.get(target) ?? []), submission]);
  }
  const assignments: Array<{ submissionId: string; reviewerAccountId: string }> = [];
  const conflicts: ReturnType<typeof planDistribution>['conflicts'] = [];
  const underCovered: ReturnType<typeof planDistribution>['underCovered'] = [];
  const readers = inputs.readers.map((reader) => ({ ...reader }));
  for (const [target, group] of [...targets.entries()].sort(([left], [right]) => left - right)) {
    const plan = planDistribution({ submissions: group, readers, readersPerSubmission: target, policy });
    assignments.push(...plan.assignments);
    conflicts.push(...plan.conflicts);
    underCovered.push(...plan.underCovered);
    for (const pair of plan.assignments) { const reader = readers.find((item) => item.accountId === pair.reviewerAccountId); if (reader) reader.openAssignments += 1; }
  }
  const load = readers.map((reader) => { const before = inputs.readers.find((item) => item.accountId === reader.accountId)!.openAssignments; return { reviewerAccountId: reader.accountId, label: reader.label, before, added: reader.openAssignments - before, after: reader.openAssignments }; }).sort((left, right) => right.after - left.after);
  const plan = { assignments, conflicts, underCovered, load, withdrawing: open.length };
  if (dryRun) return NextResponse.json({ dryRun: true, plan }, { headers });

  const actor = result.access.session.account.id;
  const dueAt = roundDueDateFor(workspace, result.access.radar.store.organizations.get(id), roundId);
  workspace.withdrawOpenReads(id, roundId, from, 'Moved to another reader by the organization', actor);
  const applied = workspace.applyDistribution(roundId, assignments, actor, { expiresAt: dueAt });
  await persistOrganizationMutation(result.access, { action: 'review-assignment.reassigned', targetType: 'review_round', targetId: roundId, detail: { fromReviewerAccountId: from, withdrawn: open.length, created: applied.created.length, underCovered: underCovered.length } });
  return NextResponse.json({ dryRun: false, plan, withdrawn: open.length, created: applied.created.length, skipped: applied.skipped }, { status: 201, headers });
}
