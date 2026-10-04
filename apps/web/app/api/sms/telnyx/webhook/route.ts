import { NextResponse } from 'next/server';
import { applySmsDeliveryReport, creatorPoolFor, optInSmsPhone, optOutSmsPhone, smsLedgerReady } from '@missa/radar-adapters';
import { smsConfig } from '@/lib/sms';
import { handleTelnyxEvent, parseTelnyxEvent, verifyTelnyxSignature } from '@/lib/sms-webhook';

const headers = { 'Cache-Control': 'no-store' };

/**
 * Telnyx messaging webhook: delivery reports update the SMS ledger and its
 * cost, and STOP or START replies sync the phone's text setting. Only signed
 * requests are read. A verified request is always answered 200 so Telnyx
 * does not retry on Missa's own errors, and no error detail is returned.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const publicKey = smsConfig()?.publicKey;
  if (!publicKey || !verifyTelnyxSignature(rawBody, request.headers, publicKey)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401, headers });
  }
  const connectionString = process.env.DATABASE_URL;
  try {
    const event = parseTelnyxEvent(JSON.parse(rawBody));
    if (event.type !== 'ignored' && connectionString) {
      const pool = creatorPoolFor(connectionString);
      if (await smsLedgerReady(pool)) {
        await handleTelnyxEvent(event, {
          applyDelivery: (report) => applySmsDeliveryReport(pool, report),
          optOut: (phone) => optOutSmsPhone(pool, phone),
          optIn: (phone) => optInSmsPhone(pool, phone),
        });
      }
    }
  } catch (error) {
    console.error('Telnyx webhook handling failed', error instanceof Error ? error.message : error);
  }
  return NextResponse.json({ received: true }, { headers });
}
