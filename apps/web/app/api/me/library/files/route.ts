import { del, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { LibraryValidationError } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorLibraryRepository } from '@/lib/creatorRepositories';
import { creatorLibraryError, creatorLibraryJson, libraryEnvelope, libraryId } from '@/lib/creatorLibraryRoute';

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
    const repository = getCreatorLibraryRepository();
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();
    if (repository && (!idempotencyKey || idempotencyKey.length > 200)) return creatorLibraryJson({ error: 'A valid Idempotency-Key is required.' }, 400);
    const id = libraryId('library_file', request.headers.get('Idempotency-Key'));
    const blob = await put(`missa/${session.account.userId}/${id}-${filename}`, Buffer.from(await file.arrayBuffer()), { access: 'private', contentType: file.type || 'application/octet-stream', addRandomSuffix: false, ...(process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {}) });
    if (repository) {
      const input = { id, filename, contentType: file.type || 'application/octet-stream', byteLength: file.size, storageKey: blob.pathname };
      const envelope = libraryEnvelope(request, session.account.id, 'library-file.create', input, 1, true)!;
      try {
        const receipt = await repository.createFile(envelope, session.account.userId, input);
        const saved = (await repository.library(session.account.id, session.account.userId)).files.find((item) => item.id === id)!;
        return creatorLibraryJson({ ...saved, receipt }, 201);
      } catch (error) {
        const committed = await repository.library(session.account.id, session.account.userId).then((library) => library.files.find((item) => item.id === id)).catch(() => undefined);
        if (committed) return creatorLibraryJson({ ...committed, error: 'The upload completed but its confirmation could not be replayed. Refresh before retrying.' }, 409);
        try { await del(blob.pathname, { ...(process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {}) }); }
        catch (cleanupError) { await repository.queueFileCleanup(session.account.id, id, blob.pathname, cleanupError instanceof Error ? cleanupError.message : undefined).catch(() => undefined); }
        return creatorLibraryError(error);
      }
    }
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
