import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { StatusPipelineBoard } from '@/components/status-pipeline-board';
import { CalendarFeedButton } from '@/components/calendar-feed-button';

export default async function TrackerPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) redirect('/login');
  const userId = session.account.userId;

  const engine = await getEngine();
  const view = engine.getTracker(userId);
  const { stats } = view;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-medium text-foreground">Tracker</h1>
        <CalendarFeedButton userId={userId} />
      </div>
      <div className="mt-6 flex flex-wrap gap-6 rounded-lg border border-border bg-card p-4 text-sm shadow-sm">
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
      </div>
      {view.deadlines.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          Next deadlines: {view.deadlines.map((d) => `${d.title} — ${d.daysToDeadline}d`).join(' · ')}
        </div>
      )}
      {stats.tracked === 0 ? (
        <p className="mt-6 text-muted-foreground">Nothing tracked yet — find something in Opportunities.</p>
      ) : (
        <StatusPipelineBoard userId={userId} pipeline={view.pipeline} />
      )}
    </div>
  );
}
