import { NextResponse } from 'next/server';
import { creatorPoolFor } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { requestCountry } from '@/lib/creatorBilling';
import { SPELLING_COOKIE, resolveSpelling } from '@/lib/spelling';

export const dynamic = 'force-dynamic';

/**
 * The reader's spelling: UK for UK accounts, otherwise by IP country, US by
 * default. Remembered in a cookie for a day so pages served from the CDN can
 * switch without asking again.
 */
export async function GET(request: Request) {
  let accountCountry: string | null = null;
  try {
    const session = await getSessionAccount(request.headers.get('cookie'));
    if (session && process.env.DATABASE_URL) {
      const { rows } = await creatorPoolFor(process.env.DATABASE_URL).query<{ country_code: string | null }>(
        'select country_code from creator_profiles where account_id = $1',
        [session.account.id],
      );
      accountCountry = rows[0]?.country_code ?? null;
    }
  } catch {
    // Fall back to the IP country.
  }
  const spelling = resolveSpelling({ accountCountry, ipCountry: requestCountry(request.headers) });
  const response = NextResponse.json({ spelling }, { headers: { 'Cache-Control': 'private, no-store' } });
  response.cookies.set(SPELLING_COOKIE, spelling, { path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax' });
  return response;
}
