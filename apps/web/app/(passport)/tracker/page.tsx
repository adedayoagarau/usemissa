import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { StatusPipelineBoard } from '@/components/status-pipeline-board';

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
      <h1 className="text-2xl font-semibold text-foreground">Tracker</h1>
      <div className="mt-4 flex gap-6 text-sm">
        <div>
          <b className="block text-lg text-foreground">{stats.tracked}</b>tracked
        </div>
        <div>
          <b className="block text-lg text-foreground">{stats.planning}</b>planning
        </div>
        <div>
          <b className="block text-lg text-foreground">{stats.awaitingResponse}</b>awaiting response
        </div>
        <div>
          <b className="block text-lg text-foreground">{stats.accepted}</b>accepted
        </div>
        <div>
          <b className="block text-lg text-foreground">
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
