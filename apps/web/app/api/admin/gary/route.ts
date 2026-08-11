import { NextResponse } from 'next/server';
import {
  GARY_QUEUE_ACTIONS,
  mutateGaryQueue,
  type GaryQueueAction,
} from '@missa/radar-adapters';
import { getPlatformAdminGary } from '@/lib/platformAdminGary';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';

const headers = { 'cache-control': 'private, no-store' };

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;
  return NextResponse.json(await getPlatformAdminGary(), { headers });
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'Gary needs a durable database queue.' }, { status: 503, headers });
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();
  if (!idempotencyKey) return NextResponse.json({ error: 'Idempotency-Key is required.' }, { status: 400, headers });
  const body = await request.json().catch(() => ({}));
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid Gary operation.' }, { status: 400, headers });
  const value = body as Record<string, unknown>;
  const jobId = typeof value.jobId === 'string' ? value.jobId.trim() : '';
  const action = typeof value.action === 'string' && GARY_QUEUE_ACTIONS.includes(value.action as GaryQueueAction)
    ? value.action as GaryQueueAction : undefined;
  const note = typeof value.note === 'string' ? value.note.trim() : undefined;
  if (!jobId || !action) return NextResponse.json({ error: 'jobId and a supported action are required.' }, { status: 400, headers });
  try {
    const result = await mutateGaryQueue(process.env.DATABASE_URL, {
      jobId, action, note, idempotencyKey, actorAccountId: auth.session.account.id,
    });
    return NextResponse.json(result, { headers, status: result.idempotent ? 200 : 202 });
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundError') return NextResponse.json({ error: error.message }, { status: 404, headers });
    if (error instanceof Error && error.message.startsWith('Invalid ')) return NextResponse.json({ error: error.message }, { status: 400, headers });
    return NextResponse.json({ error: 'Gary could not apply that operation.' }, { status: 503, headers });
  }
}
