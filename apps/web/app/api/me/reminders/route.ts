import { NextResponse } from 'next/server';
import { creatorCommandEnvelope, CreatorCommandValidationError } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { CreatorReminderRepository, ReminderValidationError, reminderInput } from '@/lib/creator-reminders';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Sign in to view reminders.' }, { status: 401, headers });
  try { return NextResponse.json({ reminders: await new CreatorReminderRepository().list(session.account.id, new URL(request.url).searchParams.get('application') ?? undefined) }, { headers }); }
  catch { return NextResponse.json({ error: 'Your reminders could not load. Try again.' }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Sign in to set a reminder.' }, { status: 401, headers });
  const input = reminderInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Check the reminder details and time.' }, { status: 400, headers });
  try {
    const envelope = creatorCommandEnvelope(session.account.id, 'reminder.create', request.headers.get('Idempotency-Key') ?? '', input.data, 1);
    return NextResponse.json({ receipt: await new CreatorReminderRepository().create(envelope, input.data) }, { status: 201, headers });
  } catch (e) {
    return NextResponse.json({ error: e instanceof ReminderValidationError || e instanceof CreatorCommandValidationError ? e.message : 'The reminder could not be saved. Try again.' }, { status: e instanceof ReminderValidationError || e instanceof CreatorCommandValidationError ? 400 : 503, headers });
  }
}
