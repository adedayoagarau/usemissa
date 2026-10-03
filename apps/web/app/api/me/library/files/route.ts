import { del, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { LibraryValidationError } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorLibraryRepository } from '@/lib/creatorRepositories';
import { creatorLibraryError, creatorLibraryJson, libraryEnvelope, libraryId } from '@/lib/creatorLibraryRoute';
import { creatorFileStorageReady, localCreatorFileStorageEnabled, writeLocalCreatorFile, deleteLocalCreatorFile } from '@/lib/creator-file-storage';
import { checkLibraryFile, checkLibraryFileSize } from '@/lib/library-file-policy';
import { scanSubmissionFile } from '@/lib/malwareScanner';
export const runtime='nodejs';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  if (!creatorFileStorageReady()) return NextResponse.json({ error: 'File storage is not configured yet.' }, { status: 503, headers });
  try {
    const form = await request.formData(); const value = form.get('file');
    if (!value || typeof value !== 'object' || !('arrayBuffer' in value)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400, headers });
    const file = value as File;
    const sizeProblem = checkLibraryFileSize(file.size);
    if (sizeProblem && !sizeProblem.ok) return NextResponse.json({ error: sizeProblem.error }, { status: sizeProblem.status, headers });
    const filename = file.name.replace(/[/\\]/g, '_').replace(/\.\.+/g, '.').slice(0, 180) || 'file';
    const bytes = Buffer.from(await file.arrayBuffer());
    // The stored type comes from the allowlist, never from the browser.
    const accepted = await checkLibraryFile(filename, bytes);
    if (!accepted.ok) return NextResponse.json({ error: accepted.error }, { status: accepted.status, headers });
    const contentType = accepted.contentType;
    // Same scanner and fail-closed policy as submission uploads.
    const scan = await scanSubmissionFile({ bytes, filename, contentType });
    if (scan.status === 'blocked') return NextResponse.json({ error: scan.reason }, { status: 422, headers });
    if (scan.status === 'unavailable') return NextResponse.json({ error: scan.reason, code: 'file_scan_unavailable', retryable: true }, { status: 503, headers: { ...headers, 'Retry-After': '30' } });
    const repository = getCreatorLibraryRepository();
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();
    if (repository && (!idempotencyKey || idempotencyKey.length > 200)) return creatorLibraryJson({ error: 'A valid Idempotency-Key is required.' }, 400);
    const id = libraryId('library_file', request.headers.get('Idempotency-Key'));
    const storageKey=`missa/${session.account.userId}/${id}-${filename}`;
    const blob=localCreatorFileStorageEnabled()
      ? (await writeLocalCreatorFile(storageKey, bytes), { pathname: storageKey })
      : await put(storageKey,bytes,{access:'private',contentType,addRandomSuffix:false,...(process.env.BLOB_READ_WRITE_TOKEN?{token:process.env.BLOB_READ_WRITE_TOKEN}:{})});
    if (repository) {
      const input = { id, filename, contentType, byteLength: file.size, storageKey: blob.pathname };
      const envelope = libraryEnvelope(request, session.account.id, 'library-file.create', input, 1, true)!;
      try {
        const receipt = await repository.createFile(envelope, session.account.userId, input);
        const saved = (await repository.library(session.account.id, session.account.userId)).files.find((item) => item.id === id)!;
        return creatorLibraryJson({ ...saved, receipt }, 201);
      } catch (error) {
        const committed = await repository.library(session.account.id, session.account.userId).then((library) => library.files.find((item) => item.id === id)).catch(() => undefined);
        if (committed) return creatorLibraryJson({ ...committed, error: 'The upload completed but its confirmation could not be replayed. Refresh before retrying.' }, 409);
        try { if(localCreatorFileStorageEnabled())await deleteLocalCreatorFile(blob.pathname);else await del(blob.pathname,{...(process.env.BLOB_READ_WRITE_TOKEN?{token:process.env.BLOB_READ_WRITE_TOKEN}:{})}); }
        catch (cleanupError) { await repository.queueFileCleanup(session.account.id, id, blob.pathname, cleanupError instanceof Error ? cleanupError.message : undefined).catch(() => undefined); }
        return creatorLibraryError(error);
      }
    }
    const engine = await getEngine();
    const saved = engine.createLibraryFile(session.account.userId, { filename, contentType, byteLength: file.size, storageKey: blob.pathname });
    engine.recordAudit(session.account.id, 'library.file_created', 'library_file', saved.id, JSON.stringify({ byteLength: saved.byteLength, contentType: saved.contentType }));
    await persistRadar();
    return NextResponse.json(saved, { status: 201, headers });
  } catch (error) {
    if (error instanceof LibraryValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers });
    console.error('Library file upload failed', error);
    return NextResponse.json({ error: 'We could not upload that file.' }, { status: 500, headers });
  }
}
