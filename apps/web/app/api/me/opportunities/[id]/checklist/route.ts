import { NextResponse } from 'next/server';
import { creatorCommandEnvelope, CreatorCommandValidationError, CreatorConflictError, CreatorIdempotencyConflictError } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorTrackerRepository } from '@/lib/creatorRepositories';

const headers = { 'Cache-Control': 'private, no-store' };

async function userId(request: Request): Promise<string | undefined> {
  const session = await getSessionAccount(request.headers.get('cookie'));
  return session?.account.userId;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id } = await params;
  const repository = getCreatorTrackerRepository();
  if (repository) {
    const result = await repository.checklist(session.account.id, session.account.userId ?? session.account.id, id);
    return result ? NextResponse.json(result, { headers }) : NextResponse.json({ error: 'Track this opportunity before preparing it.' }, { status: 404, headers });
  }
  const currentUserId = session.account.userId;
  if (!currentUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine();
    const result = engine.opportunityChecklist(currentUserId, id);
    await persistRadar();
    return NextResponse.json(result, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Checklist unavailable' }, { status: 404, headers });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session=await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error:'Not authenticated' },{ status:401,headers });
  const { id }=await params;
  const repository=getCreatorTrackerRepository();
  if (repository) {
    try {
      const receipt=await repository.refreshChecklist(creatorCommandEnvelope(session.account.id,'tracker-checklist.refresh',request.headers.get('Idempotency-Key')?.trim() ?? '',{ opportunityId:id },Number(request.headers.get('If-Match'))),id);
      return NextResponse.json({ ok:true,revision:receipt.revision,idempotent:receipt.replayed },{ headers });
    } catch (error) {
      if (error instanceof CreatorCommandValidationError) return NextResponse.json({ error:error.message },{ status:400,headers });
      if (error instanceof CreatorConflictError || error instanceof CreatorIdempotencyConflictError) return NextResponse.json({ error:error.message },{ status:409,headers });
      return NextResponse.json({ error:'Checklist refresh failed. Your saved preparation is unchanged.' },{ status:500,headers });
    }
  }
  const currentUserId = await userId(request);
  if (!currentUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine();
    const result = engine.refreshOpportunityChecklist(currentUserId, id);
    await persistRadar();
    return NextResponse.json(result, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Checklist refresh failed' }, { status: 400, headers });
  }
}
