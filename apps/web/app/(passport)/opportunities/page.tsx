import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { opportunityView } from '@/lib/opportunityView';
import { FitScoreBadge, TrustBadge } from '@/components/explained-score';
import { TrackButton } from '@/components/track-button';

export default async function OpportunitiesPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) redirect('/login');
  const userId = session.account.userId;

  const engine = await getEngine();
  const list = [...engine.store.opportunities.values()]
    .filter((o) => !o.duplicateOfId && !['archived', 'closed', 'duplicate'].includes(o.status))
    .map((o) => opportunityView(engine, o, userId))
    .sort((x, y) => (x.deadline ?? '9999').localeCompare(y.deadline ?? '9999'));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Open opportunities</h1>
      <div className="mt-4 space-y-3">
        {list.map((o) => (
          <div key={o.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-foreground">{o.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {o.organizationName ?? 'Unknown organization'} · {o.type} · deadline: {o.deadline ?? o.deadlineKind}
                </p>
                <div className="mt-1">
                  <TrustBadge trust={o.trust} />
                </div>
                {o.fit && (
                  <div className="mt-2">
                    <FitScoreBadge fit={o.fit} />
                  </div>
                )}
              </div>
              {!o.tracked && <TrackButton userId={userId} opportunityId={o.id} />}
              {o.tracked && <span className="text-xs text-muted-foreground">Tracked</span>}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-muted-foreground">Nothing open right now — check back soon.</p>}
      </div>
    </div>
  );
}
