import { NextResponse } from 'next/server';
import { creatorBillingAccount, creatorPoolFor } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { startPlusCheckout, type PlusInterval } from '@/lib/creatorBilling';

const headers = { 'Cache-Control': 'private, no-store' };

/** Starts Stripe Checkout for Plus and returns the page to send the creator to. */
export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const body = (await request.json().catch(() => ({}))) as { interval?: unknown };
  const interval = body.interval === 'year' ? 'year' : body.interval === 'month' ? 'month' : null;
  if (!interval) return NextResponse.json({ error: 'Choose monthly or yearly.' }, { status: 400, headers });
  const billing = process.env.DATABASE_URL ? await creatorBillingAccount(creatorPoolFor(process.env.DATABASE_URL), session.account.id) : undefined;
  if (billing?.source === 'billing' && billing.plan === 'plus') return NextResponse.json({ error: 'You are already on Plus.' }, { status: 409, headers });
  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  try {
    const url = await startPlusCheckout({
      accountId: session.account.id,
      email: session.account.email,
      customerId: billing?.customerId,
      interval: interval as PlusInterval,
      origin,
      idempotencyKey: request.headers.get('Idempotency-Key')?.trim().slice(0, 200) || undefined,
    });
    return NextResponse.json({ url }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Checkout could not start.' }, { status: 503, headers });
  }
}
