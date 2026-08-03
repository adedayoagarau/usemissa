import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { LibraryValidationError } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine(); const id = (await context.params).id; const file = engine.library(session.account.userId).files.find((item) => item.id === id);
    if (!file) throw new LibraryValidationError('File not found.');
    if (process.env.BLOB_READ_WRITE_TOKEN) await del(file.storageKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
    engine.deleteLibraryFile(session.account.userId, id); engine.recordAudit(session.account.id, 'library.file_deleted', 'library_file', id); await persistRadar(); return NextResponse.json({ deleted: true }, { headers });
  } catch (error) {
    if (error instanceof LibraryValidationError) return NextResponse.json({ error: error.message }, { status: 404, headers });
    return NextResponse.json({ error: 'We could not delete that file.' }, { status: 500, headers });
  }
}
