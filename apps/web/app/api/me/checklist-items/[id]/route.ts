import { NextResponse } from 'next/server';
import { creatorCommandEnvelope, CreatorCommandValidationError, CreatorConflictError, CreatorIdempotencyConflictError } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorTrackerRepository } from '@/lib/creatorRepositories';

const headers = { 'Cache-Control': 'private, no-store' };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const repository = getCreatorTrackerRepository();
  if (repository) {
    const input = { ...(typeof body.state === 'string' ? { state:body.state } : {}), ...(body.note === null || typeof body.note === 'string' ? { note:body.note === null ? null : body.note.trim() } : {}), ...(body.libraryWorkId === null || typeof body.libraryWorkId === 'string' ? { libraryWorkId:body.libraryWorkId } : {}), ...(body.libraryFileId === null || typeof body.libraryFileId === 'string' ? { libraryFileId:body.libraryFileId } : {}), ...(body.savedAnswerId === null || typeof body.savedAnswerId === 'string' ? { savedAnswerId:body.savedAnswerId } : {}) };
    if (input.state !== undefined && !['missing','ready','complete','not-applicable'].includes(input.state)) return NextResponse.json({ error:'Checklist state is invalid.' },{ status:400,headers });
    try {
      const receipt=await repository.updateChecklistItem(creatorCommandEnvelope(session.account.id,'tracker-checklist-item.update',request.headers.get('Idempotency-Key')?.trim() ?? '',input,Number(request.headers.get('If-Match'))),id,input as Parameters<typeof repository.updateChecklistItem>[2]);
      return NextResponse.json({ id, ...input, revision:receipt.revision,idempotent:receipt.replayed },{ headers });
    } catch (error) { return relationalError(error,'Unable to update requirement'); }
  }
  if (!session.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine();
    const item = engine.updateChecklistItem(session.account.userId, id, body);
    await persistRadar();
    return NextResponse.json(item, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update requirement' }, { status: 400, headers });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id } = await params;
  const repository=getCreatorTrackerRepository();
  if (repository) {
    try {
      const receipt=await repository.deleteChecklistItem(creatorCommandEnvelope(session.account.id,'tracker-checklist-item.delete',request.headers.get('Idempotency-Key')?.trim() ?? '',{id},Number(request.headers.get('If-Match'))),id);
      return NextResponse.json({ ok:true,removed:true,revision:receipt.revision,idempotent:receipt.replayed },{ headers });
    } catch (error) { return relationalError(error,'Unable to remove requirement'); }
  }
  if (!session.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine();
    engine.deleteChecklistItem(session.account.userId, id);
    await persistRadar();
    return new NextResponse(null, { status: 204, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to remove requirement' }, { status: 400, headers });
  }
}

function relationalError(error: unknown, fallback: string) {
  if (error instanceof CreatorCommandValidationError) return NextResponse.json({ error:error.message },{ status:400,headers });
  if (error instanceof CreatorConflictError || error instanceof CreatorIdempotencyConflictError) return NextResponse.json({ error:error.message },{ status:409,headers });
  return NextResponse.json({ error:fallback },{ status:500,headers });
}
