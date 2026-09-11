import { NextResponse } from 'next/server';
import { billingEventType, recordPlatformBillingEvent } from '@missa/radar-adapters';
import { verifyStripeSignature } from '@/lib/billing';
import { stripeReceiptReferences } from '@/lib/governedOperationRoutes';

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret || !verifyStripeSignature(payload, signature, secret)) return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'Billing ledger unavailable; Stripe should retry this event.' }, { status: 503 });
  let event: { id?: string; type?: string; created?: number; data?: { object?: Record<string, unknown> } };
  try { event = JSON.parse(payload) as typeof event; } catch { return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 }); }
  if (!event.id || !event.type || !event.data?.object) return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  const object = event.data.object;
  const metadata = object.metadata && typeof object.metadata === 'object' ? object.metadata as Record<string, unknown> : {};
  const organizationId = typeof metadata.organization_id === 'string' ? metadata.organization_id : typeof object.client_reference_id === 'string' ? object.client_reference_id : undefined;
  const amount = [object.amount_total, object.amount_paid, object.amount, object.amount_refunded].find((candidate) => typeof candidate === 'number' && candidate >= 0) as number | undefined;
  const providerObjectType = typeof object.object === 'string' ? object.object : 'unknown';
  const references = stripeReceiptReferences(object);
  try {
    const receipt = await recordPlatformBillingEvent({
      connectionString: process.env.DATABASE_URL, providerEventId: event.id, eventType: event.type,
      entryType: billingEventType(event.type), status: organizationId ? 'received' : 'ignored',
      ...(organizationId ? { organizationId } : {}), ...(typeof object.id === 'string' ? { providerObjectId: object.id } : {}), providerObjectType,
      ...(amount !== undefined ? { amountCents: amount } : {}), ...(typeof object.currency === 'string' ? { currency: object.currency.toUpperCase() } : {}),
      ...references, ...(event.created ? { occurredAt: new Date(event.created * 1000).toISOString() } : {}), metadata: { objectType: providerObjectType },
    });
    if (receipt.status === 'conflict') return NextResponse.json({ error: 'Conflicting duplicate webhook receipt.' }, { status: 400 });
    return NextResponse.json({ received: true, queued: receipt.currentStatus === 'received', idempotent: receipt.status === 'replayed' });
  } catch { return NextResponse.json({ error: 'Billing ledger unavailable; Stripe should retry this event.' }, { status: 503 }); }
}
