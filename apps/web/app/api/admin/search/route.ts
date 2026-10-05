import { NextResponse } from 'next/server';
import { searchAdminRecords } from '@missa/radar-adapters';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';
import { platformAnalyticsDatabaseUrl } from '@/lib/platformAnalyticsDatabase';

const headers = { 'cache-control': 'private, no-store' };

/** Users and organizations matching a query, for the admin command palette. */
export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  const query = new URL(request.url).searchParams.get('q') ?? '';
  const connectionString = platformAnalyticsDatabaseUrl();
  if (!connectionString) return NextResponse.json({ results: [] }, { headers });
  const results = await searchAdminRecords(connectionString, query).catch(() => []);
  return NextResponse.json({ results }, { headers });
}
