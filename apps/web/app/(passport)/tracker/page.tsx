import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { TrackerViewSwitcher } from '@/components/tracker-view-switcher';
import { CalendarFeedButton } from '@/components/calendar-feed-button';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Empty, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';

export default async function TrackerPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) redirect('/login');
  const userId = session.account.userId;

  const engine = await getEngine();
  const view = engine.getTracker(userId);
  const { stats } = view;
  const allItems = Object.values(view.pipeline).flat();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-medium text-foreground">Tracker</h1>
        <CalendarFeedButton userId={userId} />
      </div>
      <Card className="mt-6">
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            <b className="block font-mono text-2xl text-foreground">{stats.tracked}</b>tracked
          </div>
          <div>
            <b className="block font-mono text-2xl text-foreground">{stats.planning}</b>planning
          </div>
          <div>
            <b className="block font-mono text-2xl text-foreground">{stats.awaitingResponse}</b>awaiting response
          </div>
          <div>
            <b className="block font-mono text-2xl text-foreground">{stats.accepted}</b>accepted
          </div>
          <div>
            <b className="block font-mono text-2xl text-foreground">
              {stats.acceptanceRate != null ? `${Math.round(stats.acceptanceRate * 100)}%` : '—'}
            </b>
            acceptance
          </div>
        </CardContent>
      </Card>
      {view.deadlines.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          Next deadlines: {view.deadlines.map((d) => `${d.title} — ${d.daysToDeadline}d`).join(' · ')}
        </div>
      )}
      {stats.tracked === 0 ? (
        <Empty className="mt-6">
          <EmptyTitle>Nothing tracked yet</EmptyTitle>
          <EmptyDescription>Find something in Opportunities.</EmptyDescription>
          <EmptyContent>
            <Button render={<Link href="/opportunities" />}>Browse opportunities</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="mt-6">
          <TrackerViewSwitcher userId={userId} pipeline={view.pipeline} allItems={allItems} />
        </div>
      )}
    </div>
  );
}
