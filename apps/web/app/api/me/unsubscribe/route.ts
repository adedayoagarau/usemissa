import { NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/email-tokens';
import { applyUnsubscribe, type UnsubscribeOutcome } from '@/lib/unsubscribe';

const headers = { 'Cache-Control': 'no-store' };

type PostedFields = { token?: string; source?: string };

async function postedFields(request: Request): Promise<PostedFields> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as PostedFields | null;
    return { token: body?.token, source: body?.source };
  }
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    const token = form?.get('token');
    const source = form?.get('source');
    return {
      token: typeof token === 'string' ? token : undefined,
      source: typeof source === 'string' ? source : undefined,
    };
  }
  return {};
}

function pageRedirect(request: Request, params: Record<string, string>): NextResponse {
  const target = new URL('/unsubscribe', request.url);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  return NextResponse.redirect(target, { status: 303, headers });
}

const OUTCOME_STATUS: Record<UnsubscribeOutcome, number> = {
  updated: 200,
  'account-not-found': 404,
  unavailable: 503,
};

const OUTCOME_ERROR: Record<Exclude<UnsubscribeOutcome, 'updated'>, string> = {
  'account-not-found': 'We could not find the account for this link.',
  unavailable: 'Email settings are unavailable right now. Try again later.',
};

/**
 * Applies an unsubscribe. Two callers:
 *  - Mail providers sending RFC 8058 one-click requests: POST to the URL from
 *    List-Unsubscribe (token in the query, body `List-Unsubscribe=One-Click`).
 *    They get JSON.
 *  - The /unsubscribe confirmation form (`source=page`). It gets a redirect
 *    back to the page with the result.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const fields = await postedFields(request);
  const token = url.searchParams.get('token') || fields.token;
  const fromPage = fields.source === 'page';

  if (!token) {
    if (fromPage) return pageRedirect(request, { result: 'invalid' });
    return NextResponse.json({ ok: false, error: 'Missing unsubscribe token.' }, { status: 400, headers });
  }

  const verification = verifyUnsubscribeToken(token);
  if (!verification.valid) {
    if (fromPage) return pageRedirect(request, { result: 'invalid' });
    return NextResponse.json(
      { ok: false, error: `Invalid or expired unsubscribe link (${verification.reason}).` },
      { status: 400, headers },
    );
  }

  const outcome = await applyUnsubscribe(verification.accountId, verification.category);

  if (fromPage) return pageRedirect(request, { result: outcome, category: verification.category });

  if (outcome !== 'updated') {
    return NextResponse.json(
      { ok: false, unsubscribed: false, error: OUTCOME_ERROR[outcome] },
      { status: OUTCOME_STATUS[outcome], headers },
    );
  }
  return NextResponse.json(
    { ok: true, unsubscribed: true, category: verification.category },
    { status: 200, headers },
  );
}

/**
 * GET never changes settings: link scanners and mail previews follow links.
 * It sends the person to the confirmation page, which posts back here.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  return pageRedirect(request, token ? { token } : {});
}
