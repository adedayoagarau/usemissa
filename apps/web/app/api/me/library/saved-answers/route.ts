import { NextResponse } from 'next/server';
import { LibraryValidationError } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const body = await request.json().catch(() => undefined);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Request body must be an object.' }, { status: 400, headers });
  try {
    const engine = await getEngine(); const answer = engine.createSavedAnswer(session.account.userId, body as { name: unknown; body: unknown }); engine.recordAudit(session.account.id, 'library.saved_answer_created', 'saved_answer', answer.id); await persistRadar(); return NextResponse.json(answer, { status: 201, headers });
  } catch (error) {
    if (error instanceof LibraryValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers });
    return NextResponse.json({ error: 'We could not save that answer.' }, { status: 500, headers });
  }
}
