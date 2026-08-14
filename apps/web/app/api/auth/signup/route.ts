import { NextResponse } from 'next/server';
import { AuthError } from '@missa/radar-engine';
import { getEngine, persistRadar } from '@/lib/engine';
import { issueSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';
import { trackPlatformAnalytics } from '@/lib/platformAnalytics';
import { getRateLimiter, readClientIp, SIGNUP_IP_LIMIT, tooManyRequests } from '@/lib/rate-limit';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send a valid JSON body.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const { email, password, displayName } = (body && typeof body === 'object' ? body : {}) as {
    email?: unknown;
    password?: unknown;
    displayName?: unknown;
  };
  if (typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string') {
    return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const normalizedName = displayName.trim();
  if (!normalizedName || normalizedName.length > 120) {
    return NextResponse.json({ error: 'Use a name between 1 and 120 characters.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: 'Use a password between 8 and 200 characters.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  /**
   * Charged only once the payload is well formed, so malformed noise stays cheap
   * to reject and cannot spend a real visitor's window on their behalf.
   */
  const limiter = await getRateLimiter();
  const decision = await limiter.consume(SIGNUP_IP_LIMIT, readClientIp(request));
  if (!decision.allowed) {
    return tooManyRequests(decision, 'Too many sign up attempts. Please wait before trying again.');
  }

  const engine = await getEngine();
  let account;
  try {
    ({ account } = engine.signUp(email, password, normalizedName));
  } catch (err) {
    const message = err instanceof AuthError ? err.message : 'Sign up failed';
    return NextResponse.json({ error: message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  await persistRadar();

  const token = issueSessionToken(account.id);
  await trackPlatformAnalytics({ eventName: 'auth.signup_succeeded', source: 'auth-api', accountId: account.id, properties: { method: 'password' } });
  const response = NextResponse.json({ account: { id: account.id, email: account.email } }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
