import { NextResponse } from 'next/server';
import { LibraryValidationError } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorLibraryRepository } from '@/lib/creatorRepositories';
import { creatorLibraryError, creatorLibraryJson, libraryEnvelope, libraryId } from '@/lib/creatorLibraryRoute';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const body = await request.json().catch(() => undefined);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Request body must be an object.' }, { status: 400, headers });
  const repository = getCreatorLibraryRepository();
  if (repository) {
    const input = body as { title: unknown; description?: unknown; fileId?: unknown; taxonomyTermIds?: unknown };
    const id = libraryId('library_work', request.headers.get('Idempotency-Key'));
    const envelope = libraryEnvelope(request, session.account.id, 'library-work.create', { id, ...input }, 1, true);
    if (!envelope) return creatorLibraryJson({ error: 'A valid Idempotency-Key is required.' }, 400);
    try {
      const receipt = await repository.createWork(envelope, session.account.userId, { id, ...input });
      const work = (await repository.library(session.account.id, session.account.userId)).works.find((item) => item.id === id)!;
      return creatorLibraryJson({ ...work, receipt }, 201);
    } catch (error) { return creatorLibraryError(error); }
  }
  try {
    const engine = await getEngine();
    const work = engine.createLibraryWork(session.account.userId, body as { title: unknown; description?: unknown; fileId?: unknown; taxonomyTermIds?: unknown });
    engine.recordAudit(session.account.id, 'library.work_created', 'library_work', work.id);
    await persistRadar();
    return NextResponse.json(work, { status: 201, headers });
  } catch (error) {
    if (error instanceof LibraryValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers });
    console.error('Library work create failed', error);
    return NextResponse.json({ error: 'We could not save that Work.' }, { status: 500, headers });
  }
}
