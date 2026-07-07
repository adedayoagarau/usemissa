import { NextResponse } from 'next/server';
import { verifyFeedToken } from '@missa/radar-engine';
import { sessionSecret } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

/** No session-cookie auth here on purpose (see calendar-token/route.ts's
 * comment) -- verified via the token query param instead. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const payload = verifyFeedToken(token, sessionSecret());
  if (!payload || payload.userId !== id) {
    return NextResponse.json({ error: 'Invalid or missing calendar feed token' }, { status: 401 });
  }

  const engine = await getEngine();
  const ics = engine.calendarFeed(id);
  return new NextResponse(ics, { headers: { 'content-type': 'text/calendar; charset=utf-8' } });
}
