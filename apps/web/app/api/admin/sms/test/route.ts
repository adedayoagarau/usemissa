import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { recordPlatformAdminAudit } from '@missa/radar-adapters';
import { requirePlatformAdmin } from '@/lib/platformAdmin';
import { sendSms } from '@/lib/sms';
import { maskPhoneNumber, normalisePhoneNumber } from '@/lib/sms-phone';

const headers = { 'cache-control': 'private, no-store' };

/**
 * Sends one test text to a number a platform admin types. It skips the Plus
 * check and the monthly limit, but not the pause switch or the daily limit,
 * and it is written to the SMS ledger and the platform audit trail.
 */
export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers });
  const body = (await request.json().catch(() => ({}))) as { phone?: unknown };
  const phone = normalisePhoneNumber(body.phone);
  if (!phone) return NextResponse.json({ error: 'Enter the number with its country code, starting with +.' }, { status: 400, headers });
  const report = await sendSms({
    accountId: auth.session.account.id,
    to: phone,
    text: 'Missa test text: text reminders can reach this phone. Reply STOP to end.',
    kind: 'admin_test',
    idempotencyKey: `admin-test:${randomUUID()}`,
  });
  if (process.env.DATABASE_URL) {
    await recordPlatformAdminAudit(process.env.DATABASE_URL, auth.session.account.id, 'platform_admin.sms_test', 'sms_message', report.messageId ?? 'not-recorded', {
      to: maskPhoneNumber(phone),
      status: report.status,
      ...(report.reason ? { reason: report.reason } : {}),
    }).catch(() => undefined);
  }
  return NextResponse.json(
    { status: report.status, ...(report.reason ? { reason: report.reason } : {}), to: maskPhoneNumber(phone) },
    { status: report.status === 'sent' ? 200 : report.status === 'failed' ? 502 : 409, headers },
  );
}
