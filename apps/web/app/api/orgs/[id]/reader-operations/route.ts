import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { compatibilityRoundOperationsView, relationalRoundOperationsView, roundScoresCsv } from '@/lib/readerOperationsData';
import { getRelationalWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * One round's reader operations: progress, calibration, ranking and the
 * reader pool. `?format=csv` returns every assignment with its score for
 * juries that deliberate outside the product.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'reviews.read' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const url = new URL(request.url);
  const roundId = url.searchParams.get('roundId')?.trim();
  if (!roundId) return NextResponse.json({ error: 'roundId is required' }, { status: 400, headers });

  if (workspaceRelationalAuthorityEnabled()) {
    const view = await relationalRoundOperationsView({ radar: result.access.radar, relational: await getRelationalWorkspace(), organizationId: id, roundId });
    if (!view) return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404, headers });
    return NextResponse.json(view, { headers });
  }

  const workspace = result.access.workspace;
  const view = compatibilityRoundOperationsView({ radar: result.access.radar, workspace, organizationId: id, roundId });
  if (!view) return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404, headers });
  if (url.searchParams.get('format') === 'csv') {
    const assignments = [...workspace.store.reviewAssignments.values()]
      .filter((assignment) => assignment.reviewRoundId === roundId && result.access.scope.submission(assignment.submissionId))
      .map((assignment) => { const recommendation = workspace.recommendationForAssignment(assignment.id); const criterion = workspace.criterionScoresForAssignment(assignment.id); return { submissionId: assignment.submissionId, reviewerAccountId: assignment.reviewerAccountId, completedAt: assignment.completedAt, recusedAt: (assignment as { recusedAt?: string }).recusedAt, score: recommendation?.score, recordedAt: recommendation?.recordedAt, rubricVersion: criterion?.rubricVersion, criterionScores: criterion?.scores }; });
    const filename = `${view.round.openCallTitle} - ${view.round.name} - scores.csv`.replace(/[^\w .-]+/g, '_');
    return new Response(roundScoresCsv(view, assignments), { headers: { ...headers, 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${filename}"` } });
  }
  return NextResponse.json(view, { headers });
}
