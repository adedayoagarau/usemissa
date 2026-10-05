import { NextResponse } from 'next/server';
import { confirmSmsVerification } from '@missa/radar-adapters';
import { SMS_CODE_MAX_ATTEMPTS, verificationCodeMatches } from '@/lib/sms';
import { smsJson, smsPreferencesResponse, smsRouteContext, smsUnavailable } from '@/lib/sms-routes';

/**
 * Confirms the code from /api/me/sms/start. Five tries per code and ten
 * minutes to use it; a match stores the number as verified and turns texts on.
 */
export async function POST(request: Request) {
  const context = await smsRouteContext(request);
  if (context instanceof NextResponse) return context;
  const refused = smsUnavailable(context);
  if (refused) return refused;

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!/^\d{6}$/.test(code)) return smsJson({ error: 'Enter the six digits from the text.' }, 400);

  const result = await confirmSmsVerification(
    context.pool,
    context.accountId,
    ({ phone, codeHash }) => verificationCodeMatches(codeHash, context.accountId, phone, code),
    SMS_CODE_MAX_ATTEMPTS,
  );
  switch (result.outcome) {
    case 'verified':
      return smsPreferencesResponse(context.accountId);
    case 'invalid':
      return smsJson({ error: `That code is not right. ${result.attemptsLeft === 1 ? 'One try' : `${result.attemptsLeft} tries`} left.` }, 400);
    case 'locked':
      return smsJson({ error: 'Too many wrong codes. Ask for a new one.' }, 429);
    case 'expired':
      return smsJson({ error: 'That code has expired. Ask for a new one.' }, 410);
    case 'none':
      return smsJson({ error: 'Ask for a code first.' }, 409);
  }
}
