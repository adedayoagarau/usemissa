import { NextResponse } from 'next/server';
import { getPlatformAdminOverview, getPlatformAdminView, platformAdminAuthResponse, requirePlatformAdmin, type PlatformAdminView } from './platformAdmin';

export async function platformAdminJson(request: Request, view?: PlatformAdminView): Promise<NextResponse> {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;
  const payload = view ? await getPlatformAdminView(view) : await getPlatformAdminOverview();
  return NextResponse.json(payload, { headers: { 'cache-control': 'private, no-store' } });
}
