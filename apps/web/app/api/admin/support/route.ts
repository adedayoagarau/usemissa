import { NextResponse } from 'next/server';
import {
  PLATFORM_SUPPORT_STATUSES,
  updateProfileIssueReport,
  updatePlatformAdminSupportCase,
  type PlatformSupportStatus,
} from '@missa/radar-adapters';
import { getPlatformAdminSupport } from '@/lib/platformAdminSupport';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';

const headers = { 'cache-control': 'private, no-store' };

function errorResponse(error: unknown): NextResponse {
  if (error instanceof Error && error.name === 'NotFoundError') return NextResponse.json({ error: error.message }, { status: 404, headers });
  if (error instanceof Error && error.name === 'ConflictError') return NextResponse.json({ error: error.message }, { status: 409, headers });
  if (error instanceof Error && error.message === 'Invalid support case id') return NextResponse.json({ error: error.message }, { status: 400, headers });
  if (error instanceof Error && error.message === 'Invalid idempotency key') return NextResponse.json({ error: error.message }, { status: 400, headers });
  if (error instanceof Error && error.message === 'Invalid support case status') return NextResponse.json({ error: error.message }, { status: 400, headers });
  if (error instanceof Error && (error.message === 'A resolved correction requires the verified detail and official source URL' || error.message === 'Evidence URL must use http or https' || error.message === 'That correction field is not supported' || error.message === 'A correction value is required' || error.message === 'Fee correction must be a non-negative whole number')) return NextResponse.json({ error: error.message }, { status: 400, headers });
  return NextResponse.json({ error: 'The support case operation is unavailable.' }, { status: 503, headers });
}

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;
  return NextResponse.json(await getPlatformAdminSupport(), { headers });
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'A database-backed support queue is required for status changes.' }, { status: 503, headers });

  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();
  if (!idempotencyKey) return NextResponse.json({ error: 'Idempotency-Key is required.' }, { status: 400, headers });
  const body = await request.json().catch(() => ({}));
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid support case operation.' }, { status: 400, headers });
  const value = body as Record<string, unknown>;
  const caseId = typeof value.caseId === 'string' ? value.caseId.trim() : '';
  const kind = value.kind === 'profile' ? 'profile' : value.kind === 'opportunity' ? 'opportunity' : undefined;
  const status = typeof value.status === 'string' && PLATFORM_SUPPORT_STATUSES.includes(value.status as PlatformSupportStatus)
    ? value.status as PlatformSupportStatus
    : undefined;
  if (!caseId || !status) return NextResponse.json({ error: 'caseId and a supported status are required.' }, { status: 400, headers });
  const correction = typeof value.correction === 'string' ? value.correction.trim().slice(0, 2_000) : undefined;
  const evidenceUrl = typeof value.evidenceUrl === 'string' ? value.evidenceUrl.trim().slice(0, 1_000) : undefined;
  const correctedField = typeof value.correctedField === 'string' ? value.correctedField.trim() : undefined;
  const correctedValue = typeof value.correctedValue === 'string' ? value.correctedValue.trim().slice(0, 500) : undefined;

  try {
    const result = await updatePlatformAdminSupportCase(process.env.DATABASE_URL, {
      caseId,
      status,
      actorAccountId: auth.session.account.id,
      idempotencyKey,
      ...(correction ? { correction } : {}),
      ...(evidenceUrl ? { evidenceUrl } : {}),
      ...(correctedField ? { correctedField } : {}),
      ...(correctedValue ? { correctedValue } : {}),
    });
    return NextResponse.json(result, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
