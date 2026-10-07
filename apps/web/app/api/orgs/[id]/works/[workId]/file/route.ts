import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import {
  callerReviewAssignmentsForSubmission,
  organizationAccessCan,
  ORGANIZATION_ROLE_FORBIDDEN,
  requireOrganizationAccess,
} from '@/lib/organizationAccess';
import { privateFileHeaders } from '@/lib/privateFileHeaders';
import { getRelationalWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

/** Streams a private submission file only after the organization scope and
 * role check: `submissions.read` holders, or the Work's assigned reviewer. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; workId: string }> }) {
  const { id, workId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.read' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!organizationAccessCan(result.access, 'submissions.read')) {
    // Without the Organization-wide capability, only a reviewer assigned to
    // this Work's Submission may open its private file.
    const assignedWork = workspaceRelationalAuthorityEnabled() ? undefined : result.access.scope.work(workId);
    if (!assignedWork || callerReviewAssignmentsForSubmission(result.access, assignedWork.submissionId).length === 0) {
      return NextResponse.json({ error: ORGANIZATION_ROLE_FORBIDDEN }, { status: 403 });
    }
  }
  const work = workspaceRelationalAuthorityEnabled()
    ? (await (await getRelationalWorkspace()).submissionsForOrganization(id)).flatMap((submission) => submission.works).find((candidate) => candidate.id === workId)
    : result.access.scope.work(workId);
  const requestedIndex = Number(new URL(request.url).searchParams.get('index') ?? '0');
  const fileUrl = Number.isInteger(requestedIndex) && requestedIndex >= 0 ? work?.fileUrls?.[requestedIndex] ?? (requestedIndex === 0 ? work?.fileUrl : undefined) : undefined;
  if (!fileUrl) return NextResponse.json({ error: 'File not found' }, { status: 404 });
  if (fileUrl.startsWith('data:')) {
    const match = fileUrl.match(/^data:([^;,]+)?;base64,(.+)$/);
    if (!match) return NextResponse.json({ error: 'File is not readable' }, { status: 415 });
    const bytes = Buffer.from(match[2], 'base64');
    return new NextResponse(bytes, { headers: privateFileHeaders({ contentType: match[1], contentLength: bytes.length }) });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'File storage is not configured' }, { status: 503 });
  try {
    const blob = await get(fileUrl, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN, useCache: true });
    if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    return new NextResponse(blob.stream, { headers: privateFileHeaders({ contentType: blob.blob.contentType, contentDisposition: blob.blob.contentDisposition, contentLength: blob.blob.size }) });
  } catch {
    return NextResponse.json({ error: 'File unavailable' }, { status: 502 });
  }
}
