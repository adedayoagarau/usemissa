import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getCreatorLibraryRepository } from '@/lib/creatorRepositories';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const repository = getCreatorLibraryRepository();
  return NextResponse.json(repository ? await repository.library(session.account.id, session.account.userId) : (await getEngine()).library(session.account.userId), { headers });
}
