import { NextResponse } from 'next/server';
import { z } from 'zod';
import { creatorCommandEnvelope, CreatorConflictError, CreatorIdempotencyConflictError } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { CreatorReminderRepository, ReminderValidationError } from '@/lib/creator-reminders';
const headers = { 'Cache-Control': 'private, no-store' };
const schema = z.discriminatedUnion('action', [z.object({ action: z.literal('cancel') }), z.object({ action: z.literal('snooze'), days: z.union([z.literal(1), z.literal(7)]) })]);
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Sign in to change a reminder.' }, { status: 401, headers });
  const input = schema.safeParse(await request.json().catch(() => null)), revision = Number(request.headers.get('If-Match'));
  if (!input.success || !Number.isInteger(revision) || revision < 1) return NextResponse.json({ error: 'Refresh this reminder before changing it.' }, { status: 400, headers });
  try {
    const { id } = await params;
    const envelope = creatorCommandEnvelope(session.account.id, 'reminder.update', request.headers.get('Idempotency-Key') ?? '', { id, ...input.data }, revision);
    return NextResponse.json({ receipt: await new CreatorReminderRepository().change(envelope, id, input.data) }, { headers });
  } catch (e) {
    const conflict = e instanceof CreatorConflictError || e instanceof CreatorIdempotencyConflictError;
    return NextResponse.json({ error: conflict ? 'This reminder changed. Reload it before saving again.' : e instanceof ReminderValidationError ? e.message : 'The reminder could not be changed. Try again.' }, { status: conflict ? 409 : e instanceof ReminderValidationError ? 400 : 503, headers });
  }
}
