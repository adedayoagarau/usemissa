import { NextResponse } from 'next/server';
import { createMetricShare, listMetricShares, revokeMetricShare } from '@missa/radar-adapters';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';
import { platformAnalyticsDatabaseUrl } from '@/lib/platformAnalyticsDatabase';
import { isShareableMetricKey } from '@/lib/shareableMetrics';

const headers = { 'cache-control': 'private, no-store' };

async function guard(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return { denied: denied! };
  const connectionString = platformAnalyticsDatabaseUrl();
  if (!connectionString) return { denied: NextResponse.json({ error: 'A database is required for share links.' }, { status: 503, headers }) };
  return { connectionString, accountId: auth.session.account.id };
}

export async function GET(request: Request) {
  const result = await guard(request);
  if ('denied' in result) return result.denied;
  return NextResponse.json({ shares: await listMetricShares(result.connectionString) }, { headers });
}

/** Creates a public, read-only link showing only the chosen metrics. */
export async function POST(request: Request) {
  const result = await guard(request);
  if ('denied' in result) return result.denied;
  const body = (await request.json().catch(() => ({}))) as { title?: unknown; metrics?: unknown };
  const metrics = Array.isArray(body.metrics) ? body.metrics.filter((metric): metric is string => typeof metric === 'string' && isShareableMetricKey(metric)) : [];
  if (!metrics.length) return NextResponse.json({ error: 'Choose at least one metric to share.' }, { status: 400, headers });
  const share = await createMetricShare(result.connectionString, { title: typeof body.title === 'string' ? body.title : '', metrics, createdBy: result.accountId });
  return NextResponse.json({ share }, { status: 201, headers });
}

export async function DELETE(request: Request) {
  const result = await guard(request);
  if ('denied' in result) return result.denied;
  const token = new URL(request.url).searchParams.get('token') ?? '';
  return (await revokeMetricShare(result.connectionString, token)) ? new NextResponse(null, { status: 204, headers }) : NextResponse.json({ error: 'Unknown link.' }, { status: 404, headers });
}
