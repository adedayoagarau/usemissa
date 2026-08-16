import { NextResponse } from 'next/server';

import { getNeonAuth } from '@/lib/neon-auth/server';
import { getRateLimiter, LOGIN_EMAIL_LIMIT, LOGIN_IP_LIMIT, readClientIp, SIGNUP_IP_LIMIT, tooManyRequests } from '@/lib/rate-limit';

type AuthRouteContext = { params: Promise<{ path: string[] }> };

export const dynamic = 'force-dynamic';

async function authPath(context: AuthRouteContext): Promise<string[]> {
  return (await context.params).path ?? [];
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.clone().json().catch(() => ({}));
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

async function neonAuthThrottle(request: Request, context: AuthRouteContext): Promise<NextResponse | undefined> {
  const path = await authPath(context);
  const body = await readJson(request);
  const ip = readClientIp(request);
  const limiter = await getRateLimiter();
  const isSignIn = path[0] === 'sign-in' && path[1] === 'email';
  const isSignUp = path[0] === 'sign-up' && path[1] === 'email';
  if (!isSignIn && !isSignUp) return undefined;

  if (isSignUp) {
    const decision = await limiter.consume(SIGNUP_IP_LIMIT, ip);
    return decision.allowed ? undefined : tooManyRequests(decision, 'Too many sign up attempts. Please wait before trying again.');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) return undefined;
  const byEmail = await limiter.check(LOGIN_EMAIL_LIMIT, email);
  const gate = byEmail.allowed ? await limiter.check(LOGIN_IP_LIMIT, ip) : byEmail;
  if (!gate.allowed) return tooManyRequests(gate, 'Too many sign in attempts. Please wait before trying again.');
  return undefined;
}

function unavailable(): NextResponse {
  return NextResponse.json(
    { error: 'Neon Auth is not configured for this environment.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(request: Request, context: AuthRouteContext) {
  const auth = getNeonAuth();
  return auth ? auth.handler().GET(request, context) : unavailable();
}

export async function POST(request: Request, context: AuthRouteContext) {
  const auth = getNeonAuth();
  if (!auth) return unavailable();
  const path = await authPath(context);
  const throttle = await neonAuthThrottle(request, context);
  if (throttle instanceof NextResponse) return throttle;
  const response = await auth.handler().POST(request, context);
  if (path[0] === 'sign-in' && path[1] === 'email') {
    const body = await readJson(request);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (email) {
      const limiter = await getRateLimiter();
      if (response.ok) await limiter.reset(LOGIN_EMAIL_LIMIT, email);
      else await Promise.all([limiter.record(LOGIN_EMAIL_LIMIT, email), limiter.record(LOGIN_IP_LIMIT, readClientIp(request))]);
    }
  }
  return response;
}

export async function PUT(request: Request, context: AuthRouteContext) {
  const auth = getNeonAuth();
  return auth ? auth.handler().PUT(request, context) : unavailable();
}

export async function PATCH(request: Request, context: AuthRouteContext) {
  const auth = getNeonAuth();
  return auth ? auth.handler().PATCH(request, context) : unavailable();
}

export async function DELETE(request: Request, context: AuthRouteContext) {
  const auth = getNeonAuth();
  return auth ? auth.handler().DELETE(request, context) : unavailable();
}
