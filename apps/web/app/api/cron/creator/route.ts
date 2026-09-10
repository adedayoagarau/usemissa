import { NextResponse } from 'next/server';
import { tickCreatorReminders } from '@/lib/creator-reminders';
import { tickGoals } from '@/lib/goal-engine';
import { tickCreatorFollowing } from '@/lib/creator-following';
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'Creator scheduling is not configured.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const reminders = await tickCreatorReminders();
  const goals = await tickGoals();
  const following = await tickCreatorFollowing();
  return NextResponse.json({ reminders, goals, following }, { headers: { 'Cache-Control': 'no-store' } });
}
