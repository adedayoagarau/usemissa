import { NextResponse } from 'next/server';
import { creatorCommandEnvelope, CreatorCommandValidationError, CreatorConflictError, CreatorIdempotencyConflictError } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorTrackerRepository } from '@/lib/creatorRepositories';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const repository = getCreatorTrackerRepository();
  if (repository) {
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (!label || label.length > 240) return NextResponse.json({ error: 'Requirement label must be between 1 and 240 characters.' }, { status: 400, headers });
    try {
      const receipt = await repository.addChecklistItem(
        creatorCommandEnvelope(session.account.id,'tracker-checklist-item.create',request.headers.get('Idempotency-Key')?.trim() ?? '',{ id,label,note:body.note },Number(request.headers.get('If-Match'))),
        id,{ label,...(typeof body.note === 'string' ? { note:body.note.trim() } : {}) },
      );
      return NextResponse.json({ id:receipt.resourceId,revision:receipt.revision,idempotent:receipt.replayed },{ status:receipt.replayed?200:201,headers });
    } catch (error) {
      if (error instanceof CreatorCommandValidationError) return NextResponse.json({ error:error.message },{ status:400,headers });
      if (error instanceof CreatorConflictError || error instanceof CreatorIdempotencyConflictError) return NextResponse.json({ error:error.message },{ status:409,headers });
      return NextResponse.json({ error:'Unable to add requirement' },{ status:500,headers });
    }
  }
  if (!session.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine();
    const item = engine.addChecklistItem(session.account.userId, id, { label: body.label, note: body.note });
    await persistRadar();
    return NextResponse.json(item, { status: 201, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to add requirement' }, { status: 400, headers });
  }
}
