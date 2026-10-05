import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { CalendarWorkspace } from '@/components/calendar-workspace';
import { parseCalendarView } from '@/lib/calendar-planning';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CalendarPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const store = await cookies();
  const session = await getSessionAccountFromToken(store.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) redirect('/login?next=/calendar');
  const raw = searchParams ? await searchParams : {};
  const view = Array.isArray(raw.view) ? raw.view[0] : raw.view;
  return <CalendarWorkspace userId={session.account.userId} initialView={parseCalendarView(view)} />;
}
