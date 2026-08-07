import { NextResponse } from 'next/server';
import { getPlatformAdminAnalytics } from '@/lib/platformAdminViews';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;
  const payload = await getPlatformAdminAnalytics();
  return NextResponse.json(payload, { headers: { 'cache-control': 'private, no-store' } });
}
