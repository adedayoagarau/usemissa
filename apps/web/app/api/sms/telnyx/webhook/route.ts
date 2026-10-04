import { after, NextResponse } from 'next/server';
import { applySmsDeliveryReport, creatorPoolFor, optInSmsPhone, optOutSmsPhone, smsLedgerReady } from '@missa/radar-adapters';
import { creatorDecisionContext, decideSmsReply } from '@/lib/creator-decisions';
import { smsConfig } from '@/lib/sms';
import { handleInboundReply, handleTelnyxEvent, parseInboundReply, parseTelnyxEvent, verifyTelnyxSignature } from '@/lib/sms-webhook';

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
    const body = JSON.parse(rawBody);
    const event = parseTelnyxEvent(body);
    const reply = event.type === 'ignored' ? parseInboundReply(body) : null;
    const decisions = reply ? creatorDecisionContext('sms_intent') : null;
    if (reply && decisions && connectionString) {
      // Recorded after the response. Live, a reply that confidently reads as
      // an opt-out in other words is treated as STOP; nothing is sent back,
      // and keywords are never routed here.
      const pool = creatorPoolFor(connectionString);
      after(() => handleInboundReply(reply, {
        decide: (item) => decideSmsReply(decisions, item),
        optOut: async (phone) => (await smsLedgerReady(pool)) ? optOutSmsPhone(pool, phone) : undefined,
      }).then(() => undefined, (error: unknown) => console.error('Telnyx reply decision failed', error instanceof Error ? error.message : error)));
    }
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
