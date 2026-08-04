import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { scanSubmissionFile } from '@/lib/malwareScanner';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const BLOCKED_TYPES = new Set(['application/x-msdownload', 'application/x-dosexec', 'application/x-sh', 'text/x-shellscript', 'application/x-httpd-php']);

export async function POST(request: Request, { params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params;
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const workspace = await getWorkspaceEngine();
  const path = workspace.store.submissionPaths.get(pathId);
  if (!path) return NextResponse.json({ error: 'Unknown submission form' }, { status: 404 });
  const openCall = workspace.store.openCalls.get(path.openCallId);
  if (!openCall || openCall.status !== 'published') return NextResponse.json({ error: 'This submission form is not open' }, { status: 409 });
  const form = await request.formData();
  const value = form.get('file');
  if (!(value instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  if (value.size === 0 || value.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'Files must be between 1 byte and 25 MB' }, { status: 400 });
  const contentType = (value.type || 'application/octet-stream').toLowerCase();
  if (BLOCKED_TYPES.has(contentType) || contentType === 'application/octet-stream' && /\.(exe|dll|bat|cmd|sh|php|js|msi)$/i.test(value.name)) return NextResponse.json({ error: 'This file type is not accepted' }, { status: 415 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'File storage is not configured' }, { status: 503 });
  const bytes = Buffer.from(await value.arrayBuffer());
  const scan = await scanSubmissionFile({ bytes, filename: value.name, contentType });
  if (scan.status === 'blocked') return NextResponse.json({ error: scan.reason }, { status: 422 });
  if (scan.status === 'unavailable') return NextResponse.json({ error: scan.reason }, { status: 503 });
  const safeName = value.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120) || 'submission-file';
  const blob = await put(`missa/submissions/${session.account.id}/${crypto.randomUUID()}-${safeName}`, bytes, {
    access: 'private',
    contentType,
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return NextResponse.json({ url: blob.url, pathname: blob.pathname, size: value.size, contentType, scan: { status: scan.status, engine: scan.engine } }, { status: 201 });
}
