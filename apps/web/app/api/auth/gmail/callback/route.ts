import { NextResponse } from 'next/server';
import { GoogleGmailProvider } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

function redirect(request: Request, result: string) {
  return NextResponse.redirect(new URL(`/profile?gmail=${encodeURIComponent(result)}`, request.url));
}

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return redirect(request, 'error&reason=not-authenticated');
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (url.searchParams.get('error') || !code || !state) return redirect(request, 'error&reason=cancelled');
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri) return redirect(request, 'error&reason=not-configured');
  try {
    const engine = await getEngine();
    const consumed = engine.consumeGmailOAuthState(state, session.account.userId, redirectUri);
    const exchange = await new GoogleGmailProvider().exchangeCode({ code, redirectUri: consumed.redirectUri, codeVerifier: consumed.codeVerifier });
    const connection = engine.connectGmail(session.account.userId, exchange);
    engine.queueGmailSync(session.account.userId, 'initial', `initial:${connection.id}:${connection.scanWindowDays}`);
    engine.recordAudit(session.account.id, 'email.gmail_connected', 'gmail_connection', connection.id, JSON.stringify({ userId: session.account.userId, scopeClass: 'gmail-readonly', mode: 'review' }));
    await persistRadar();
    return redirect(request, 'connected');
  } catch (error) {
    const reason = error instanceof Error && /already connected/.test(error.message) ? 'conflict' : 'error';
    return redirect(request, `${reason}&reason=callback-failed`);
  }
}
