import { NextResponse } from 'next/server';
import { buildInboxDigest } from '@missa/radar-engine';
import { requireSelf } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = await getEngine();
  const digest = buildInboxDigest(engine.store, id);
  const alerts = [...engine.store.alerts.values()].filter((a) => a.userId === id);
  const reminders = alerts.filter((a) => a.kind === 'deadline-reminder');
  const overdue = alerts.filter((a) => a.kind === 'response-overdue');
  const withdrawalSuggestions = alerts.filter((a) => a.kind === 'withdrawal-suggested');

  return NextResponse.json({ ...digest, reminders, overdue, withdrawalSuggestions });
}
