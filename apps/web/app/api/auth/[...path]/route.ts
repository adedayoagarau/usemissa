import { NextResponse } from 'next/server';

import { getNeonAuth } from '@/lib/neon-auth/server';

type AuthRouteContext = { params: Promise<{ path: string[] }> };

export const dynamic = 'force-dynamic';

function unavailable(): NextResponse {
  return NextResponse.json(
    { error: 'Neon Auth is not configured for this environment.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(request: Request, context: AuthRouteContext) {
  const auth = getNeonAuth();
  return auth ? auth.handler().GET(request, context) : unavailable();
}

export async function POST(request: Request, context: AuthRouteContext) {
  const auth = getNeonAuth();
  return auth ? auth.handler().POST(request, context) : unavailable();
}

export async function PUT(request: Request, context: AuthRouteContext) {
  const auth = getNeonAuth();
  return auth ? auth.handler().PUT(request, context) : unavailable();
}

export async function PATCH(request: Request, context: AuthRouteContext) {
  const auth = getNeonAuth();
  return auth ? auth.handler().PATCH(request, context) : unavailable();
}

export async function DELETE(request: Request, context: AuthRouteContext) {
  const auth = getNeonAuth();
  return auth ? auth.handler().DELETE(request, context) : unavailable();
}
