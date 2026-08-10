import { NextResponse } from 'next/server';
import { LibraryConflictError, LibraryValidationError } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const body = await request.json().catch(() => undefined);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Request body must be an object.' }, { status: 400, headers });
  try {
    const engine = await getEngine(); const work = engine.updateLibraryWork(session.account.userId, (await context.params).id, body as { title?: unknown; description?: unknown; fileId?: unknown | null; taxonomyTermIds?: unknown });
    engine.recordAudit(session.account.id, 'library.work_updated', 'library_work', work.id); await persistRadar();
    return NextResponse.json(work, { headers });
  } catch (error) {
    if (error instanceof LibraryValidationError) return NextResponse.json({ error: error.message }, { status: error.message === 'Work not found.' ? 404 : 400, headers });
    return NextResponse.json({ error: 'We could not update that Work.' }, { status: 500, headers });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine(); const id = (await context.params).id; engine.deleteLibraryWork(session.account.userId, id); engine.recordAudit(session.account.id, 'library.work_deleted', 'library_work', id); await persistRadar(); return NextResponse.json({ deleted: true }, { headers });
  } catch (error) {
    // Next can evaluate workspace packages in separate route chunks during dev.
    // Keep the domain name check so a genuine conflict is not misreported as a
    // server failure when the Error constructor came from another chunk.
    if (error instanceof LibraryConflictError || error instanceof Error && error.name === 'LibraryConflictError') return NextResponse.json({ error: error.message }, { status: 409, headers });
    if (error instanceof LibraryValidationError || error instanceof Error && error.name === 'LibraryValidationError') return NextResponse.json({ error: error.message }, { status: 404, headers });
    return NextResponse.json({ error: 'We could not delete that Work.' }, { status: 500, headers });
  }
}
