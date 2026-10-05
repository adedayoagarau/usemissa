import { NextResponse } from 'next/server';
import { allowSiteHit, recordSiteEvent, scrubErrorMessage, siteRequestContext } from '@/lib/siteTracking';

const VITALS = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);
const noStore = { 'Cache-Control': 'no-store' };

function text(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
}

function hostOf(value: unknown): string | undefined {
  const raw = text(value, 500);
  if (!raw) return undefined;
  try {
    return new URL(raw).hostname.replace(/^www\./u, '').toLowerCase() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Cookieless page analytics. Accepts pageviews, Core Web Vitals, and client
 * errors from any visitor; stores only a daily-rotating salted hash, never the
 * IP or user agent. Conversion goals are recorded server-side elsewhere.
 */
export async function POST(request: Request) {
  if (request.headers.get('sec-gpc') === '1') return new NextResponse(null, { status: 204, headers: noStore });
  const raw = await request.text().catch(() => '');
  if (!raw || raw.length > 4_000) return new NextResponse(null, { status: 400, headers: noStore });
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
    body = parsed as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 400, headers: noStore });
  }

  const context = siteRequestContext(request.headers);
  if (!allowSiteHit(context.ip)) return new NextResponse(null, { status: 429, headers: noStore });
  const path = text(body.path, 500);
  if (!path?.startsWith('/')) return new NextResponse(null, { status: 400, headers: noStore });
  const kind = body.kind;
  const ownHost = context.host.replace(/^www\./u, '').split(':')[0];

  if (kind === 'pageview') {
    const referrerHost = hostOf(body.referrer);
    await recordSiteEvent(context, {
      kind: 'pageview',
      name: 'pageview',
      path,
      ...(referrerHost && referrerHost !== ownHost ? { referrerHost } : {}),
      ...(text(body.utmSource, 120) ? { utmSource: text(body.utmSource, 120)!.toLowerCase() } : {}),
      ...(text(body.utmMedium, 120) ? { utmMedium: text(body.utmMedium, 120)!.toLowerCase() } : {}),
      ...(text(body.utmCampaign, 120) ? { utmCampaign: text(body.utmCampaign, 120) } : {}),
    });
  } else if (kind === 'vital') {
    const name = text(body.name, 10);
    const value = typeof body.value === 'number' && Number.isFinite(body.value) && body.value >= 0 && body.value < 120_000 ? body.value : undefined;
    if (!name || !VITALS.has(name) || value === undefined) return new NextResponse(null, { status: 400, headers: noStore });
    await recordSiteEvent(context, { kind: 'vital', name, path, value });
  } else if (kind === 'error') {
    const message = text(body.message, 300);
    if (!message) return new NextResponse(null, { status: 400, headers: noStore });
    await recordSiteEvent(context, { kind: 'error', name: 'client-error', path, detail: scrubErrorMessage(message) });
  } else {
    return new NextResponse(null, { status: 400, headers: noStore });
  }
  return new NextResponse(null, { status: 204, headers: noStore });
}
