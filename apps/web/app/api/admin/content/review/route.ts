import { resolveContentReview } from '@missa/radar-adapters';
import { NextResponse } from 'next/server';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';

function errorResponse(error: unknown): NextResponse {
  if (error instanceof Error && error.name === 'NotFoundError') return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof Error && error.name === 'ConflictError') return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof Error && error.message.startsWith('Invalid content review')) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ error: 'The content review action is unavailable.' }, { status: 503 });
}
export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'A database-backed content review queue is required.' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid content review action' }, { status: 400 });
  const value = body as Record<string, unknown>;
  const jobId = typeof value.jobId === 'string' ? value.jobId.trim() : '';
  const decision = value.decision === 'approved' || value.decision === 'blocked' ? value.decision : undefined;
  const note = typeof value.note === 'string' ? value.note.trim().slice(0, 500) : undefined;
  if (!jobId || !decision) return NextResponse.json({ error: 'jobId and decision are required' }, { status: 400 });

  try {
    const result = await resolveContentReview(process.env.DATABASE_URL, auth.session.account.id, { jobId, decision, note });
    return NextResponse.json(result, { headers: { 'cache-control': 'private, no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
