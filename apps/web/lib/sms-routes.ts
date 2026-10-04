import { NextResponse } from 'next/server';
import { creatorPoolFor, smsLedgerReady } from '@missa/radar-adapters';
import type { Pool } from 'pg';
import { getSessionAccount } from './auth';
import { smsConfig, type SmsConfig } from './sms';
import { notificationPreferencesView, smsPlanEligible } from './sms-preferences';

const headers = { 'Cache-Control': 'private, no-store' };
export const smsJson = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });

export type SmsRouteContext = Readonly<{ accountId: string; pool: Pool; config: SmsConfig | null; eligible: boolean }>;

/**
 * The shared checks for /api/me/sms routes: a signed-in creator and a
 * database with the SMS ledger. Plan and provider checks are left to each
 * route, because turning texts off or removing a number never needs them.
 */
export async function smsRouteContext(request: Request): Promise<SmsRouteContext | NextResponse> {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return smsJson({ error: 'Not authenticated' }, 401);
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return smsJson({ error: 'Text reminders are not available yet.' }, 503);
  const pool = creatorPoolFor(connectionString);
  if (!(await smsLedgerReady(pool).catch(() => false))) return smsJson({ error: 'Text reminders are not available yet.' }, 503);
  const eligible = await smsPlanEligible(session.account.id);
  return { accountId: session.account.id, pool, config: smsConfig(), eligible };
}

/** Refuses a route that starts or turns on texts when Telnyx or the plan does not allow it. */
export function smsUnavailable(context: SmsRouteContext): NextResponse | null {
  if (!context.config) return smsJson({ error: 'Text reminders are not available yet.' }, 503);
  if (!context.eligible) return smsJson({ error: 'Text reminders come with Plus.', code: 'plus-required' }, 403);
  return null;
}

export async function smsPreferencesResponse(accountId: string, extra: Record<string, unknown> = {}) {
  return smsJson({ ...(await notificationPreferencesView(accountId)), ...extra });
}
