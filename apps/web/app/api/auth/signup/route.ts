import { NextResponse } from 'next/server';
import { AuthError } from '@missa/radar-engine';
import { getEngine, persistRadar } from '@/lib/engine';
import { issueSessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  const { email, password, displayName } = await request.json();
  if (typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string') {
    return NextResponse.json({ error: 'email, password, and displayName are required' }, { status: 400 });
  }

  const engine = await getEngine();
  let account;
  try {
    ({ account } = engine.signUp(email, password, displayName));
  } catch (err) {
    const message = err instanceof AuthError ? err.message : 'Sign up failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
  await persistRadar();

  const token = issueSessionToken(account.id);
  const response = NextResponse.json({ account: { id: account.id, email: account.email } }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 3600,
  });
  return response;
}
