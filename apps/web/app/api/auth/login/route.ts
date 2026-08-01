import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/engine';
import { issueSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send a valid JSON body.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const { email, password } = (body && typeof body === 'object' ? body : {}) as { email?: unknown; password?: unknown };
  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!email.trim() || password.length > 200) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const engine = await getEngine();
  let account;
  try {
    account = engine.logIn(email, password);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid email or password.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const token = issueSessionToken(account.id);
  const response = NextResponse.json({ account: { id: account.id, email: account.email } }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
