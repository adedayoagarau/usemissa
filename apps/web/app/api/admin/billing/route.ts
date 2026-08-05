import { NextResponse } from 'next/server';
import { getPlatformAdminBilling } from '@/lib/platformAdminFoundations';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;
  return NextResponse.json(await getPlatformAdminBilling(), { headers: { 'cache-control': 'private, no-store' } });
}
