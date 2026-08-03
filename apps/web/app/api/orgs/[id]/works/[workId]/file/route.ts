import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';

/** Streams a private submission file only after the organization scope check. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; workId: string }> }) {
  const { id, workId } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const work = result.access.scope.work(workId);
  if (!work?.fileUrl) return NextResponse.json({ error: 'File not found' }, { status: 404 });
  if (work.fileUrl.startsWith('data:')) {
    const match = work.fileUrl.match(/^data:([^;,]+)?;base64,(.+)$/);
    if (!match) return NextResponse.json({ error: 'File is not readable' }, { status: 415 });
    return new NextResponse(Buffer.from(match[2], 'base64'), { headers: { 'content-type': match[1] ?? 'application/octet-stream', 'content-disposition': 'inline' } });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'File storage is not configured' }, { status: 503 });
  try {
    const blob = await get(work.fileUrl, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN, useCache: true });
    if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    return new NextResponse(blob.stream, { headers: { 'content-type': blob.blob.contentType, 'content-length': String(blob.blob.size), 'content-disposition': blob.blob.contentDisposition || 'inline', 'cache-control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'File unavailable' }, { status: 502 });
  }
}
