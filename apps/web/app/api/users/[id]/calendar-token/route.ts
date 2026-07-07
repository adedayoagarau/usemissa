import { NextResponse } from 'next/server';
import { createFeedToken } from '@missa/radar-engine';
import { requireSelf, sessionSecret } from '@/lib/auth';

/** Issues a long-lived, purpose-scoped token for the personal calendar feed
 * (FR25) -- calendar apps subscribe to a URL and can't log in with a
 * session cookie, so this is a separate signed token, not the session
 * cookie. Mirrors packages/radar-engine/src/server/server.ts's existing
 * calendar-token route. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return NextResponse.json({ token: createFeedToken(id, sessionSecret()) });
}
