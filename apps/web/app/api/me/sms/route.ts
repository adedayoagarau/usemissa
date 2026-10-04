import { NextResponse } from 'next/server';
import { removeSmsPhone, setSmsEnabled } from '@missa/radar-adapters';
import { smsJson, smsPreferencesResponse, smsRouteContext, smsUnavailable } from '@/lib/sms-routes';

/**
 * Turns texts on or off for the verified number. Turning on needs Plus and a
 * configured provider; turning off never does.
 */
export async function PATCH(request: Request) {
  const context = await smsRouteContext(request);
  if (context instanceof NextResponse) return context;
  const body = (await request.json().catch(() => null)) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== 'boolean') return smsJson({ error: 'Choose whether to get texts.' }, 400);
  if (body.enabled) {
    const refused = smsUnavailable(context);
    if (refused) return refused;
  }
  if (!(await setSmsEnabled(context.pool, context.accountId, body.enabled))) {
    return smsJson({ error: 'Verify a phone number first.' }, 409);
  }
  return smsPreferencesResponse(context.accountId);
}

/** Forgets the number and stops texts. Always allowed, whatever the plan. */
export async function DELETE(request: Request) {
  const context = await smsRouteContext(request);
  if (context instanceof NextResponse) return context;
  await removeSmsPhone(context.pool, context.accountId);
  return smsPreferencesResponse(context.accountId);
}
