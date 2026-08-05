import { NextResponse } from 'next/server';
import { createTaxonomyChangeProposal, readTaxonomyAdminDashboard, reviewTaxonomyChangeProposal } from '@missa/radar-adapters';
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
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();
  if (value.action === 'approve' || value.action === 'reject') {
    const proposalId = typeof value.proposalId === 'string' ? value.proposalId.trim() : '';
    if (!proposalId || !idempotencyKey) return NextResponse.json({ error: 'proposalId and Idempotency-Key are required for review.' }, { status: 400 });
    try {
      const result = await reviewTaxonomyChangeProposal({
        connectionString: process.env.DATABASE_URL,
        proposalId,
        reviewerAccountId: auth.session.account.id,
        status: value.action === 'approve' ? 'approved' : 'rejected',
        decisionNote: typeof value.decisionNote === 'string' ? value.decisionNote.trim() : undefined,
        idempotencyKey,
      });
      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to review proposal';
      const status = error instanceof Error && error.name === 'NotFoundError' ? 404 : error instanceof Error && error.name === 'ConflictError' ? 409 : error instanceof Error && error.name === 'UnavailableError' ? 503 : message.startsWith('Invalid') || message.includes('too long') ? 400 : 503;
      return NextResponse.json({ error: status === 503 ? 'Taxonomy governance is unavailable.' : message }, { status });
    }
  }
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
      idempotencyKey,
    });
    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create proposal' }, { status: 400 });
  }
}
