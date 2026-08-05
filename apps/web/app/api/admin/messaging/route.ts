import { NextResponse } from 'next/server';
import { getPlatformAdminMessaging } from '@/lib/platformAdminContinuation';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;
  return NextResponse.json(await getPlatformAdminMessaging(), { headers: { 'cache-control': 'private, no-store' } });
}
