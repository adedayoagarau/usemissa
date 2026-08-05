import { NextResponse } from 'next/server';
import { createPlatformCrmNote } from '@missa/radar-adapters';
import { getPlatformAdminCrm } from '@/lib/platformAdminFoundations';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';

const headers = { 'cache-control': 'private, no-store' };

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;
  return NextResponse.json(await getPlatformAdminCrm(), { headers });
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'A database-backed CRM is required for notes.' }, { status: 503, headers });
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();
  if (!idempotencyKey) return NextResponse.json({ error: 'Idempotency-Key is required.' }, { status: 400, headers });
  const body = await request.json().catch(() => ({}));
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid CRM note.' }, { status: 400, headers });
  const value = body as Record<string, unknown>;
  const organizationId = typeof value.organizationId === 'string' ? value.organizationId.trim() : '';
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const noteBody = typeof value.body === 'string' ? value.body.trim() : '';
  if (!organizationId || !title || !noteBody) return NextResponse.json({ error: 'organizationId, title, and body are required.' }, { status: 400, headers });
  try {
    const result = await createPlatformCrmNote({ connectionString: process.env.DATABASE_URL, actorAccountId: auth.session.account.id, subjectType: 'organization', subjectId: organizationId, title, body: noteBody, idempotencyKey });
    return NextResponse.json(result, { headers, status: result.idempotent ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CRM note unavailable';
    return NextResponse.json({ error: message === 'Invalid idempotency key' || message.startsWith('Invalid CRM') ? message : 'CRM note unavailable.' }, { status: message === 'Invalid idempotency key' || message.startsWith('Invalid CRM') ? 400 : 503, headers });
  }
}
