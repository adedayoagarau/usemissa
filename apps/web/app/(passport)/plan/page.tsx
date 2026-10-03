import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { creatorBillingAccount, creatorEntitlements, creatorPoolFor } from '@missa/radar-adapters';

import { PlanProduct } from '@/components/missa/plan-product';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { plusOffers, pricingRegion, requestCountry } from '@/lib/creatorBilling';

export const metadata: Metadata = { title: 'Your plan', robots: { index: false } };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PlanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login?next=/plan');
  const checkout = (await searchParams).checkout;
  const region = pricingRegion(requestCountry(await headers()));
  const connectionString = process.env.DATABASE_URL;
  const pool = connectionString ? creatorPoolFor(connectionString) : undefined;
  const client = pool ? await pool.connect() : undefined;
  try {
    const [entitlements, billing, offers] = await Promise.all([
      client ? creatorEntitlements(client, session.account.id) : Promise.resolve({ plan: 'free' as const, activeTracked: 0, activeTrackedLimit: 10 }),
      pool ? creatorBillingAccount(pool, session.account.id) : Promise.resolve(undefined),
      plusOffers(region),
    ]);
    return (
      <PlanProduct
        plan={entitlements.plan}
        activeTracked={entitlements.activeTracked}
        activeTrackedLimit={entitlements.activeTrackedLimit}
        paid={billing?.source === 'billing' && billing.plan !== 'free'}
        canManage={Boolean(billing?.customerId)}
        endsAt={billing?.cancelAtPeriodEnd ? billing.expiresAt : null}
        offers={offers.map(({ interval, label }) => ({ interval, label }))}
        regional={region !== 'standard'}
        checkout={checkout === 'success' || checkout === 'cancelled' ? checkout : null}
      />
    );
  } finally {
    client?.release();
  }
}
