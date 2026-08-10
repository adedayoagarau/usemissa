import { del, get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { LibraryConflictError, LibraryValidationError, libraryFileReferences } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const engine = await getEngine();
  const id = (await context.params).id;
  const file = engine.library(session.account.userId).files.find((item) => item.id === id);
  if (!file) return NextResponse.json({ error: 'File not found.' }, { status: 404, headers });
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token && !(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) return NextResponse.json({ error: 'File storage is not configured.' }, { status: 503, headers });
  try {
    const blob = await get(file.storageKey, { access: 'private', useCache: true, ...(token ? { token } : {}) });
    if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: 'File bytes are unavailable.' }, { status: 404, headers });
    const disposition = `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`;
    return new NextResponse(blob.stream, { headers: { ...headers, 'content-type': blob.blob.contentType || file.contentType, 'content-length': String(blob.blob.size), 'content-disposition': disposition } });
  } catch {
    return NextResponse.json({ error: 'File bytes are unavailable.' }, { status: 502, headers });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine(); const id = (await context.params).id; const file = engine.library(session.account.userId).files.find((item) => item.id === id);
    if (!file) throw new LibraryValidationError('File not found.');
    const references = libraryFileReferences(engine.store, session.account.userId, id);
    if (references.works || references.checklists) engine.deleteLibraryFile(session.account.userId, id);
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) await del(file.storageKey, { ...(token ? { token } : {}) });
    engine.deleteLibraryFile(session.account.userId, id); engine.recordAudit(session.account.id, 'library.file_deleted', 'library_file', id); await persistRadar(); return NextResponse.json({ deleted: true }, { headers });
  } catch (error) {
    if (error instanceof LibraryConflictError) return NextResponse.json({ error: error.message }, { status: 409, headers });
    if (error instanceof LibraryValidationError) return NextResponse.json({ error: error.message }, { status: 404, headers });
    return NextResponse.json({ error: 'We could not delete that file.' }, { status: 500, headers });
  }
}
