import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { recordPlatformMessageProviderEvent } from '@missa/radar-adapters';
import { resendProviderEventRecord } from '@/lib/resendWebhook';

const responseHeaders = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const connectionString = process.env.DATABASE_URL;
  if (!webhookSecret || !connectionString) {
    return NextResponse.json({ error: 'Resend webhook reconciliation is not configured.' }, { status: 503, headers: responseHeaders });
  }
  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: 'Missing webhook signature.' }, { status: 400, headers: responseHeaders });
  }
  const payload = await request.text();
  let event;
  try {
    event = new Resend('re_webhook_verification_only').webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400, headers: responseHeaders });
  }
  const record = resendProviderEventRecord(event);
  if (!record) return NextResponse.json({ received: true, ignored: true }, { headers: responseHeaders });
  try {
    const result = await recordPlatformMessageProviderEvent(connectionString, {
      provider: 'resend',
      providerEventId: id,
      ...record,
    });
    return NextResponse.json({ received: true, ...result }, { headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'Webhook reconciliation failed.' }, { status: 500, headers: responseHeaders });
  }
}
