import { NextResponse } from 'next/server';
import { LibraryConflictError, LibraryValidationError } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorLibraryRepository } from '@/lib/creatorRepositories';
import { creatorLibraryError, creatorLibraryJson, libraryEnvelope } from '@/lib/creatorLibraryRoute';

const headers = { 'Cache-Control': 'private, no-store' };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const body = await request.json().catch(() => undefined);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Request body must be an object.' }, { status: 400, headers });
  const repository = getCreatorLibraryRepository();
  if (repository) {
    const id = (await context.params).id;
    const input = body as { name?: unknown; body?: unknown; expectedRevision?: unknown };
    const envelope = libraryEnvelope(request, session.account.id, 'saved-answer.update', { id, ...input }, input.expectedRevision);
    if (!envelope) return creatorLibraryJson({ error: 'Refresh this Saved Answer before saving again.' }, 400);
    try {
      const receipt = await repository.updateAnswer(envelope, id, input);
      const answer = (await repository.library(session.account.id, session.account.userId)).savedAnswers.find((item) => item.id === id)!;
      return creatorLibraryJson({ ...answer, receipt });
    } catch (error) { return creatorLibraryError(error); }
  }
  try {
    const engine = await getEngine(); const answer = engine.updateSavedAnswer(session.account.userId, (await context.params).id, body as { name?: unknown; body?: unknown }); engine.recordAudit(session.account.id, 'library.saved_answer_updated', 'saved_answer', answer.id); await persistRadar(); return NextResponse.json(answer, { headers });
  } catch (error) {
    if (error instanceof LibraryValidationError) return NextResponse.json({ error: error.message }, { status: error.message === 'Saved Answer not found.' ? 404 : 400, headers });
    return NextResponse.json({ error: 'We could not update that answer.' }, { status: 500, headers });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const repository = getCreatorLibraryRepository();
  if (repository) {
    const id = (await context.params).id;
    const body = await request.json().catch(() => ({})) as { expectedRevision?: unknown };
    const envelope = libraryEnvelope(request, session.account.id, 'saved-answer.delete', { id }, body.expectedRevision);
    if (!envelope) return creatorLibraryJson({ error: 'Refresh this Saved Answer before deleting it.' }, 400);
    try { return creatorLibraryJson({ deleted: true, receipt: await repository.deleteAnswer(envelope, id) }); }
    catch (error) { return creatorLibraryError(error); }
  }
  try {
    const engine = await getEngine(); const id = (await context.params).id; engine.deleteSavedAnswer(session.account.userId, id); engine.recordAudit(session.account.id, 'library.saved_answer_deleted', 'saved_answer', id); await persistRadar(); return NextResponse.json({ deleted: true }, { headers });
  } catch (error) {
    if (error instanceof LibraryConflictError) return NextResponse.json({ error: error.message }, { status: 409, headers });
    if (error instanceof LibraryValidationError) return NextResponse.json({ error: error.message }, { status: 404, headers });
    return NextResponse.json({ error: 'We could not delete that answer.' }, { status: 500, headers });
  }
}
