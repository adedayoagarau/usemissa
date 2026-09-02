import { NextResponse } from 'next/server';
import { getCreatorCalendarRepository } from '@/lib/creatorRepositories';
import { relationalCalendarFeed } from '@/lib/creator-calendar';

const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const repository = getCreatorCalendarRepository();
  if (!repository || !token) return NextResponse.json({ error: 'Invalid or missing calendar feed token' }, { status: 401, headers: noStore });
  const items = await repository.itemsForToken(id, token);
  if (!items) return NextResponse.json({ error: 'Invalid or missing calendar feed token' }, { status: 401, headers: noStore });
  return new NextResponse(relationalCalendarFeed(items), { headers: { ...noStore, 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="missa-deadlines.ics"' } });
}
