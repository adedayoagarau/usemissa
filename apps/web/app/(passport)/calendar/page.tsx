import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { CalendarWorkspace } from '@/components/calendar-workspace';

export default async function CalendarPage(){const store=await cookies();const session=await getSessionAccountFromToken(store.get(SESSION_COOKIE)?.value);if(!session?.account.userId)redirect('/login?next=/calendar');return <CalendarWorkspace userId={session.account.userId}/>;}
