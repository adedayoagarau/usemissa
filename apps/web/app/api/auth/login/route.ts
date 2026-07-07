import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/engine';
import { issueSessionToken, SESSION_COOKIE } from '@/lib/auth';

/**
 * Minimal login endpoint, built ahead of Story 2.1 (the real sign-up/log-in
 * *form*) purely as test infrastructure -- Epic 3's pages need a real,
 * loggable-in session to develop and smoke-test against. Story 2.1 replaces
 * the /login page's placeholder content with a themed form that calls this
 * same endpoint; this route itself doesn't need to change for that.
 */
export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
  }

  const engine = await getEngine();
  let account;
  try {
    account = engine.logIn(email, password);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'login failed' }, { status: 401 });
  }

  const token = issueSessionToken(account.id);
  const response = NextResponse.json({ account: { id: account.id, email: account.email } });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 3600,
  });
  return response;
}
