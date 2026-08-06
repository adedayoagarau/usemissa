import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { trackPlatformAnalytics } from '@/lib/platformAnalytics';

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send a valid JSON body.' }, { status: 400 });
  }

  const value = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const eventName = typeof value.eventName === 'string' ? value.eventName : '';
  const path = typeof value.path === 'string' ? value.path : undefined;
  const idempotencyKey = typeof value.idempotencyKey === 'string' ? value.idempotencyKey : undefined;
  const properties = value.properties && typeof value.properties === 'object' && !Array.isArray(value.properties)
    ? value.properties as Record<string, unknown>
    : undefined;

  if (!/^[A-Za-z0-9_.:-]{2,120}$/.test(eventName)) {
    return NextResponse.json({ error: 'eventName must contain only letters, numbers, dots, underscores, colons, or hyphens.' }, { status: 400 });
  }
  if (path && path.length > 500) return NextResponse.json({ error: 'path is too long.' }, { status: 400 });
  await trackPlatformAnalytics({
    eventName,
    source: 'web-client',
    accountId: session.account.id,
    path,
    properties,
    idempotencyKey,
  });
  return NextResponse.json({ accepted: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
}
