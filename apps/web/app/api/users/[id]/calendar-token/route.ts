import { NextResponse } from 'next/server';
import { creatorCommandEnvelope, CreatorCalendarError, CreatorCommandValidationError, CreatorIdempotencyConflictError } from '@missa/radar-adapters';
import { requireSelf } from '@/lib/auth';
import { getCreatorCalendarRepository } from '@/lib/creatorRepositories';

const headers = { 'Cache-Control': 'private, no-store' };
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });
const failure = (error: unknown) => error instanceof CreatorCalendarError || error instanceof CreatorCommandValidationError || error instanceof CreatorIdempotencyConflictError
  ? json({ error: error.message }, 409)
  : json({ error: 'Calendar feed update failed.' }, 500);

async function context(request: Request, params: Promise<{ id: string }>) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return { response: json({ error: auth.error }, auth.status) };
  const repository = getCreatorCalendarRepository();
  if (!repository) return { response: json({ error: 'Calendar feed controls are unavailable.' }, 503) };
  return { repository, accountId: auth.session.account.id };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const value = await context(request, params);
  if ('response' in value) return value.response;
  return json({ state: await value.repository.state(value.accountId) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const value = await context(request, params);
  if ('response' in value) return value.response;
  const body = await request.json().catch(() => ({})) as { action?: string; expectedRevision?: number };
  const action = body.action === 'rotate' ? 'rotate' : body.action === 'issue' ? 'issue' : undefined;
  const key = request.headers.get('Idempotency-Key')?.trim();
  if (!action || !key) return json({ error: 'Action and Idempotency-Key are required.' }, 400);
  try {
    const envelope = creatorCommandEnvelope(value.accountId, `calendar-token.${action}`, key, { action }, action === 'issue' ? 1 : Number(body.expectedRevision));
    const result = action === 'issue' ? await value.repository.issue(envelope) : await value.repository.rotate(envelope);
    return json(result, action === 'issue' ? 201 : 200);
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const value = await context(request, params);
  if ('response' in value) return value.response;
  const body = await request.json().catch(() => ({})) as { expectedRevision?: number };
  const key = request.headers.get('Idempotency-Key')?.trim();
  if (!key) return json({ error: 'Idempotency-Key is required.' }, 400);
  try {
    const envelope = creatorCommandEnvelope(value.accountId, 'calendar-token.revoke', key, {}, Number(body.expectedRevision));
    const receipt = await value.repository.revoke(envelope);
    return json({ state: { active: false }, receipt });
  } catch (error) { return failure(error); }
}
