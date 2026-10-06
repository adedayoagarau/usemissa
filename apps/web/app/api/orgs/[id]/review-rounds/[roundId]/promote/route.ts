import { NextResponse } from 'next/server';
import { z } from 'zod';
import { communicationTemplate } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { compatibilityRoundOperationsView } from '@/lib/readerOperationsData';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  /** Explicit selection wins; otherwise the top N by average score. */
  submissionIds: z.array(z.string()).max(2_000).optional(),
  top: z.number().int().min(1).max(2_000).optional(),
  /** Optionally draft the matching stage letter for the promoted submissions. */
  letterKind: z.enum(['longlist', 'shortlist', 'finalists']).optional(),
  dryRun: z.boolean().optional(),
});

/**
 * Promotes submissions from one round to a new round on the same
 * opportunity (for example readers to jury). Selection is the top N by
 * recorded average or an explicit list; unscored and withdrawn submissions
 * are never promoted by rank. Nothing is assigned yet: the new round opens
 * empty so it can be distributed with its own readers. Optionally drafts
 * the stage letter, which still has to pass approval before anyone is told.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Promotion needs recommendation scores, which the relational projection does not expose yet.' }, { status: 503, headers });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Check the promotion details', issues: parsed.error.flatten().fieldErrors }, { status: 400, headers });
  const input = parsed.data;
  const workspace = result.access.workspace;
  const view = compatibilityRoundOperationsView({ radar: result.access.radar, workspace, organizationId: id, roundId });
  if (!view) return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404, headers });
  const eligible = view.ranking.filter((row) => row.status !== 'withdrawn');
  const chosen = input.submissionIds
    ? eligible.filter((row) => input.submissionIds!.includes(row.submissionId))
    : eligible.filter((row) => row.averageScore !== undefined).slice(0, input.top ?? 10);
  if (chosen.length === 0) return NextResponse.json({ error: input.submissionIds ? 'None of the chosen submissions can be promoted' : 'No scored submissions to promote yet' }, { status: 409, headers });
  const cutoff = chosen.at(-1)?.averageScore;
  const tiedOut = input.submissionIds || cutoff === undefined ? [] : eligible.filter((row) => !chosen.includes(row) && row.averageScore === cutoff);
  const summary = { name: input.name, promoted: chosen.map((row) => ({ submissionId: row.submissionId, submitterLabel: row.submitterLabel, averageScore: row.averageScore })), cutoff, tiedOut: tiedOut.map((row) => ({ submissionId: row.submissionId, submitterLabel: row.submitterLabel, averageScore: row.averageScore })) };
  if (input.dryRun) return NextResponse.json({ dryRun: true, ...summary }, { headers });

  const actor = result.access.session.account.id;
  const round = workspace.createReviewRound(view.round.openCallId, input.name);
  let letterId: string | undefined;
  if (input.letterKind) {
    const template = communicationTemplate(input.letterKind);
    const batch = workspace.createCommunicationBatch(id, {
      openCallId: view.round.openCallId,
      kind: input.letterKind,
      subject: template.defaultSubject,
      body: template.defaultBody,
      recipients: chosen.map((row) => ({ submissionId: row.submissionId, submitterAccountId: workspace.store.submissions.get(row.submissionId)!.submitterAccountId, workIds: row.works.map((work) => work.id) })),
      createdByAccountId: actor,
    });
    letterId = batch.id;
  }
  await persistOrganizationMutation(result.access, { action: 'review-round.promoted', targetType: 'review_round', targetId: round.id, detail: { fromRoundId: roundId, promoted: chosen.length, letterId: letterId ?? null } });
  return NextResponse.json({ dryRun: false, ...summary, round: { id: round.id, name: round.name }, promotedSubmissionIds: chosen.map((row) => row.submissionId), letterId }, { status: 201, headers });
}
