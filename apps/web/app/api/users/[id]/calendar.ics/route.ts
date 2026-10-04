import { NextResponse } from 'next/server';
import { calendarFeedForToken, creatorPoolFor } from '@missa/radar-adapters';
import { getCreatorCalendarRepository } from '@/lib/creatorRepositories';
import { calendarFeed, parseCalendarFeedOptions } from '@/lib/creator-calendar';
import { siteUrl } from '@/lib/siteUrl';

const noStore = { 'Cache-Control': 'private, no-store' };
const unauthorized = () => NextResponse.json({ error: 'Invalid or missing calendar feed token' }, { status: 401, headers: noStore });

/**
 * The private calendar feed. `?types=deadline,stage,tier,obligation,target,forecast,opens,response`
 * narrows what is shown (every type by default); `?alarms=0` leaves out the
 * reminders built from the creator's default reminder offsets.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  if (!token || !getCreatorCalendarRepository() || !process.env.DATABASE_URL) return unauthorized();
  const feed = await calendarFeedForToken(creatorPoolFor(process.env.DATABASE_URL), id, token);
  if (!feed) return unauthorized();
  return new NextResponse(calendarFeed(feed, parseCalendarFeedOptions(url.searchParams), new Date(), siteUrl()), {
    headers: { ...noStore, 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="missa-deadlines.ics"' },
  });
}
