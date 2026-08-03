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
    const engine = await getEngine();
    const work = engine.createLibraryWork(session.account.userId, body as { title: unknown; description?: unknown; fileId?: unknown });
    engine.recordAudit(session.account.id, 'library.work_created', 'library_work', work.id);
    await persistRadar();
    return NextResponse.json(work, { status: 201, headers });
  } catch (error) {
    if (error instanceof LibraryValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers });
    console.error('Library work create failed', error);
    return NextResponse.json({ error: 'We could not save that Work.' }, { status: 500, headers });
  }
}
