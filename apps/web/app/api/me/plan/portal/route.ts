import { NextResponse } from 'next/server';
import { creatorBillingAccount, creatorPoolFor } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { openBillingPortal } from '@/lib/creatorBilling';

const headers = { 'Cache-Control': 'private, no-store' };

/** Opens Stripe's billing page for the creator's Plus subscription. */
export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'Billing is unavailable.' }, { status: 503, headers });
  const billing = await creatorBillingAccount(creatorPoolFor(process.env.DATABASE_URL), session.account.id);
  if (!billing.customerId) return NextResponse.json({ error: 'There is no subscription to manage.' }, { status: 404, headers });
  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  try {
    return NextResponse.json({ url: await openBillingPortal(billing.customerId, origin) }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Billing could not open.' }, { status: 503, headers });
  }
}
