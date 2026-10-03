import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';
import { readMetricShare } from '@missa/radar-adapters';
import { CREATOR_EMAIL_COLORS as brand } from '@/emails/components/email-document';
import { getSessionAccount } from '@/lib/auth';
import { platformAnalyticsDatabaseUrl } from '@/lib/platformAnalyticsDatabase';
import { formatChange, getShareableMetrics, isShareableMetricKey } from '@/lib/shareableMetrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORMATS = {
  square: { width: 1080, height: 1080, number: 260, label: 52, pad: 88 },
  wide: { width: 1200, height: 630, number: 190, label: 40, pad: 72 },
  story: { width: 1080, height: 1920, number: 300, label: 60, pad: 96 },
} as const;

/**
 * A branded PNG card for one headline metric, sized for social posts or decks.
 * Admins can render any metric; a public share token renders only the metrics it includes.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('metric') ?? '';
  const format = FORMATS[(url.searchParams.get('format') ?? 'square') as keyof typeof FORMATS] ?? FORMATS.square;
  if (!isShareableMetricKey(key)) return NextResponse.json({ error: 'Unknown metric' }, { status: 400 });

  const token = url.searchParams.get('share');
  const session = await getSessionAccount(request.headers.get('cookie'));
  let allowed = Boolean(session?.account.isAdmin && session.account.active !== false);
  if (!allowed && token) {
    const connectionString = platformAnalyticsDatabaseUrl();
    const share = connectionString ? await readMetricShare(connectionString, token).catch(() => undefined) : undefined;
    allowed = Boolean(share?.metrics.includes(key));
  }
  if (!allowed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const metric = (await getShareableMetrics()).metrics.find((candidate) => candidate.key === key)!;
  const change = formatChange(metric.change);
  const today = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const wordmark = new URL('/brand/missa-wordmark-email-white.png', url.origin).toString();

  const image = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: brand.forest, color: brand.onForest, padding: format.pad }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders to PNG; next/image is not available there. */}
          <img src={wordmark} alt="Missa" height={Math.round(format.label * 1.1)} style={{ height: Math.round(format.label * 1.1) }} />
          <div style={{ display: 'flex', fontSize: Math.round(format.label * 0.6), color: brand.onForestMuted }}>{today}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: format.number, fontWeight: 700, letterSpacing: -Math.round(format.number * 0.04), lineHeight: 1 }}>{metric.formatted}</div>
          <div style={{ display: 'flex', marginTop: Math.round(format.label * 0.5), fontSize: format.label, fontWeight: 600 }}>{metric.label}</div>
          <div style={{ display: 'flex', marginTop: Math.round(format.label * 0.3), fontSize: Math.round(format.label * 0.62), color: brand.onForestSoft }}>{metric.caption}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `2px solid ${brand.forestRule}`, paddingTop: Math.round(format.label * 0.6) }}>
          <div style={{ display: 'flex', fontSize: Math.round(format.label * 0.62), color: change && metric.change! >= 0 ? brand.citron : brand.onForestSoft }}>{change ? `${change} in the last 30 days` : 'usemissa.com'}</div>
          {change && <div style={{ display: 'flex', fontSize: Math.round(format.label * 0.62), color: brand.onForestMuted }}>usemissa.com</div>}
        </div>
      </div>
    ),
    { width: format.width, height: format.height },
  );
  image.headers.set('Cache-Control', token ? 'public, max-age=600' : 'private, no-store');
  if (url.searchParams.get('download') === '1') image.headers.set('Content-Disposition', `attachment; filename="missa-${key}-${url.searchParams.get('format') ?? 'square'}.png"`);
  return image;
}
