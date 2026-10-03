import { NextResponse } from 'next/server';
import { creatorBillingAccount, creatorEntitlements, creatorPoolFor } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { plusOffers } from '@/lib/creatorBilling';

const headers = { 'Cache-Control': 'private, no-store' };

/** The creator's plan, how much of the Free allowance is in use, and the Plus prices on offer. */
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'Plans are unavailable.' }, { status: 503, headers });
  const pool = creatorPoolFor(process.env.DATABASE_URL);
  const client = await pool.connect();
  try {
    const [entitlements, billing, offers] = await Promise.all([creatorEntitlements(client, session.account.id), creatorBillingAccount(pool, session.account.id), plusOffers()]);
    return NextResponse.json(
      {
        plan: entitlements.plan,
        activeTracked: entitlements.activeTracked,
        activeTrackedLimit: entitlements.activeTrackedLimit,
        billing: { paid: billing.source === 'billing' && billing.plan !== 'free', canManage: Boolean(billing.customerId), cancelAtPeriodEnd: billing.cancelAtPeriodEnd, endsAt: billing.cancelAtPeriodEnd ? billing.expiresAt : null },
        offers: offers.map(({ interval, label }) => ({ interval, label })),
      },
      { headers },
    );
  } finally {
    client.release();
  }
}
