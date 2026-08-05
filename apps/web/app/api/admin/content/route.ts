import { NextResponse } from 'next/server';
import { getPlatformAdminContent } from '@/lib/platformAdminViews';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;
  const payload = await getPlatformAdminContent();
  return NextResponse.json(payload, { headers: { 'cache-control': 'private, no-store' } });
}
