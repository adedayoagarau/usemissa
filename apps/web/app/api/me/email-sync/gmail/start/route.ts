import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  const fallback = new URL('/profile?gmail=error&reason=not-authenticated', request.url);
  if (!session?.account.userId) return NextResponse.redirect(fallback);
  try {
    const engine = await getEngine();
    const result = engine.createGmailOAuthState(session.account.userId);
    engine.recordAudit(session.account.id, 'email.gmail_connect_started', 'gmail_connection', 'pending', JSON.stringify({ userId: session.account.userId, scopeClass: 'gmail-readonly' }));
    await persistRadar();
    return NextResponse.redirect(result.authorizationUrl);
  } catch {
    return NextResponse.redirect(new URL('/profile?gmail=error&reason=not-configured', request.url));
  }
}
