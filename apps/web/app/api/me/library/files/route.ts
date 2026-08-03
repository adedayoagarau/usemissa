import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { LibraryValidationError } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };
const MAX_FILE_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) return NextResponse.json({ error: 'File storage is not configured yet.' }, { status: 503, headers });
  try {
    const form = await request.formData(); const value = form.get('file');
    if (!value || typeof value !== 'object' || !('arrayBuffer' in value)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400, headers });
    const file = value as File;
    if (!file.size || file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'Files must be between 1 byte and 100 MiB.' }, { status: 400, headers });
    const filename = file.name.replace(/[/\\]/g, '_').replace(/\.\.+/g, '.').slice(0, 180) || 'file';
    const blob = await put(`missa/${session.account.userId}/${crypto.randomUUID()}-${filename}`, Buffer.from(await file.arrayBuffer()), { access: 'private', contentType: file.type || 'application/octet-stream', addRandomSuffix: false, ...(process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {}) });
    const engine = await getEngine();
    const saved = engine.createLibraryFile(session.account.userId, { filename, contentType: file.type || 'application/octet-stream', byteLength: file.size, storageKey: blob.pathname });
    engine.recordAudit(session.account.id, 'library.file_created', 'library_file', saved.id, JSON.stringify({ byteLength: saved.byteLength, contentType: saved.contentType }));
    await persistRadar();
    return NextResponse.json(saved, { status: 201, headers });
  } catch (error) {
    if (error instanceof LibraryValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers });
    console.error('Library file upload failed', error);
    return NextResponse.json({ error: 'We could not upload that file.' }, { status: 500, headers });
  }
}
