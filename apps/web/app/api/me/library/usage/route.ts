import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { LibraryMaterialUsageRepository, type MaterialKind } from '@/lib/library-material-usage';

const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Sign in to view your Library.' }, { status: 401, headers });
  const params = new URL(request.url).searchParams, kind = params.get('kind'), id = params.get('id');
  if (!['work', 'file', 'answer'].includes(kind ?? '') || !id || id.length > 200) return NextResponse.json({ error: 'Choose a Library material.' }, { status: 400, headers });
  try {
    const result = await new LibraryMaterialUsageRepository().usage(session.account.id, kind as MaterialKind, id);
    return NextResponse.json(result ?? { error: 'Material not found.' }, { status: result ? 200 : 404, headers });
  } catch { return NextResponse.json({ error: 'Your material connections could not load. Try again.' }, { status: 503, headers }); }
}
