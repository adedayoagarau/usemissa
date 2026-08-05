import { NextResponse } from 'next/server';
import { createOpportunityIssueReport } from '@missa/radar-adapters';
import { opportunityIssueReportInputSchema } from '@missa/contracts';
import { getSessionAccount } from '@/lib/auth';

const headers = { 'cache-control': 'private, no-store' };

function errorResponse(error: unknown): NextResponse {
  if (error instanceof Error && error.name === 'NotFoundError') return NextResponse.json({ error: error.message }, { status: 404, headers });
  if (error instanceof Error && error.name === 'ConflictError') return NextResponse.json({ error: error.message }, { status: 409, headers });
  if (error instanceof Error && error.message === 'Invalid idempotency key') return NextResponse.json({ error: error.message }, { status: 400, headers });
  return NextResponse.json({ error: 'The issue report could not be saved.' }, { status: 503, headers });
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'A database-backed issue-report queue is required.' }, { status: 503, headers });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = opportunityIssueReportInputSchema.safeParse({ ...(body && typeof body === 'object' ? body : {}), opportunityId: id });
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid issue reason and idempotency key.' }, { status: 400, headers });

  try {
    const result = await createOpportunityIssueReport(process.env.DATABASE_URL, {
      accountId: session.account.id,
      opportunityId: parsed.data.opportunityId,
      reason: parsed.data.reason,
      ...(parsed.data.note ? { note: parsed.data.note } : {}),
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return NextResponse.json({ status: result.status, idempotent: result.idempotent, reportId: result.report.id }, { status: result.status === 'created' ? 201 : 200, headers });
  } catch (error) {
    return errorResponse(error);
  }
}
