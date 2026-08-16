import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/engine';
import { issueSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';
import { trackPlatformAnalytics } from '@/lib/platformAnalytics';
import { getRateLimiter, LOGIN_EMAIL_LIMIT, LOGIN_IP_LIMIT, readClientIp, tooManyRequests } from '@/lib/rate-limit';

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
  if (!email.trim() || email.length > 320 || password.length > 200) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  /**
   * Only failed sign ins count against these windows, and a success clears the
   * email window, so someone who mistypes a password and then gets it right
   * never carries those failures forward.
   *
   * A per-account window still means a third party who knows an email address
   * can spend it deliberately and hold that account out for the rest of the
   * window. That is the accepted cost of throttling per account: without it,
   * credential stuffing against one known email is bounded only by the much
   * looser per-IP window. The window is kept short for that reason.
   */
  const subject = email.trim().toLowerCase();
  const ip = readClientIp(request);
  const limiter = await getRateLimiter();
  const byEmail = await limiter.check(LOGIN_EMAIL_LIMIT, subject);
  const gate = byEmail.allowed ? await limiter.check(LOGIN_IP_LIMIT, ip) : byEmail;
  if (!gate.allowed) {
    return tooManyRequests(gate, 'Too many sign in attempts. Please wait before trying again.');
  }

  const engine = await getEngine();
  let account;
  try {
    account = engine.logIn(email, password);
  } catch {
    await Promise.all([limiter.record(LOGIN_EMAIL_LIMIT, subject), limiter.record(LOGIN_IP_LIMIT, ip)]);
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  await limiter.reset(LOGIN_EMAIL_LIMIT, subject);

  const token = issueSessionToken(account.id);
  await trackPlatformAnalytics({ eventName: 'auth.login_succeeded', source: 'auth-api', accountId: account.id, properties: { method: 'password' } });
  const response = NextResponse.json({ account: { id: account.id, email: account.email } }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
