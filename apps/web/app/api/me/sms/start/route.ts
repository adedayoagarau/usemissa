import { NextResponse } from 'next/server';
import { createSmsVerification, expireSmsVerification, recentSmsVerificationCount } from '@missa/radar-adapters';
import {
  hashVerificationCode,
  newVerificationCode,
  sendSms,
  smsSender,
  SMS_CODE_TTL_MINUTES,
  SMS_CODES_PER_HOUR,
} from '@/lib/sms';
import { maskPhoneNumber, normalisePhoneNumber } from '@/lib/sms-phone';
import { smsJson, smsRouteContext, smsUnavailable } from '@/lib/sms-routes';

/**
 * Sends a six-digit code to the number a Plus creator wants texts on. At most
 * three codes an hour per account; each new code replaces the previous one.
 * The number is stored only after the code is confirmed.
 */
export async function POST(request: Request) {
  const context = await smsRouteContext(request);
  if (context instanceof NextResponse) return context;
  const refused = smsUnavailable(context);
  if (refused) return refused;

  const body = (await request.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = normalisePhoneNumber(body?.phone);
  if (!phone) return smsJson({ error: 'Enter your number with its country code, starting with +.' }, 400);
  if (!smsSender(phone, context.config ?? {})) return smsJson({ error: 'Missa cannot text US or Canadian numbers yet.' }, 400);
  if ((await recentSmsVerificationCount(context.pool, context.accountId)) >= SMS_CODES_PER_HOUR) {
    return smsJson({ error: 'You have asked for three codes in the last hour. Try again later.' }, 429);
  }

  const code = newVerificationCode();
  const verificationId = await createSmsVerification(context.pool, {
    accountId: context.accountId,
    phone,
    codeHash: hashVerificationCode(context.accountId, phone, code),
    ttlMinutes: SMS_CODE_TTL_MINUTES,
  });
  const report = await sendSms({
    accountId: context.accountId,
    to: phone,
    text: `Missa: Your code is ${code}. It expires in ${SMS_CODE_TTL_MINUTES} minutes. Reply STOP to end.`,
    kind: 'verification',
    idempotencyKey: `sms-verification:${verificationId}`,
  });
  if (report.status !== 'sent') {
    await expireSmsVerification(context.pool, verificationId);
    return report.status === 'skipped'
      ? smsJson({ error: 'Missa cannot send texts right now. Try again later.' }, 503)
      : smsJson({ error: 'We could not send a code to that number. Check it and try again.' }, 502);
  }
  return smsJson({ sent: true, phone: maskPhoneNumber(phone), expiresInMinutes: SMS_CODE_TTL_MINUTES });
}
