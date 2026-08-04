import { NextResponse } from 'next/server';
import { createTaxonomyChangeProposal, readTaxonomyAdminDashboard } from '@missa/radar-adapters';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (!auth.ok) return platformAdminAuthResponse(auth)!;
  if (!process.env.DATABASE_URL) return NextResponse.json({ status: 'unavailable', reason: 'DATABASE_URL is not configured' }, { status: 503 });
  return NextResponse.json(await readTaxonomyAdminDashboard(process.env.DATABASE_URL));
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (!auth.ok) return platformAdminAuthResponse(auth)!;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'JSON object required' }, { status: 400 });
  const value = body as Record<string, unknown>;
  if (typeof value.schemeId !== 'string' || typeof value.kind !== 'string' || !value.payload || typeof value.payload !== 'object') {
    return NextResponse.json({ error: 'schemeId, kind, and payload are required' }, { status: 400 });
  }
  const evidenceUrls = Array.isArray(value.evidenceUrls) ? value.evidenceUrls.filter((url): url is string => typeof url === 'string').slice(0, 20) : [];
  try {
    const proposal = await createTaxonomyChangeProposal({
      connectionString: process.env.DATABASE_URL,
      schemeId: value.schemeId,
      accountId: auth.session.account.id,
      kind: value.kind,
      termId: typeof value.termId === 'string' ? value.termId : undefined,
      payload: value.payload as Record<string, unknown>,
      evidenceUrls,
    });
    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create proposal' }, { status: 400 });
  }
}
