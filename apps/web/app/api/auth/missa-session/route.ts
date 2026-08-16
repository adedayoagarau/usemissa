import { NextResponse } from 'next/server';

import {
  issueSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from '@/lib/auth';
import {
  NeonAuthAccountError,
  provisionNeonAuthAccount,
} from '@/lib/neon-auth/account';
import { isNeonAuthConfigured } from '@/lib/neon-auth/server';
import { trackPlatformAnalytics } from '@/lib/platformAnalytics';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isNeonAuthConfigured()) {
    return NextResponse.json(
      { error: 'Neon Auth is not configured for this environment.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const mode =
    body && typeof body === 'object' && 'mode' in body && body.mode === 'signup'
      ? 'signup'
      : 'login';

  try {
    const { account, created } = await provisionNeonAuthAccount();
    const token = issueSessionToken(account.id, account.sessionVersion ?? 0);
    await trackPlatformAnalytics({
      eventName: mode === 'signup' ? 'auth.signup_succeeded' : 'auth.login_succeeded',
      source: 'neon-auth-bridge',
      accountId: account.id,
      properties: { method: 'neon-auth', linked: !created },
    });

    const response = NextResponse.json(
      {
        account: { id: account.id, email: account.email },
        created,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof NeonAuthAccountError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return NextResponse.json(
      { error: 'We could not connect your Missa account. Try again.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
