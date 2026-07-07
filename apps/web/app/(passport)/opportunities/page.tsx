import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { opportunityView } from '@/lib/opportunityView';
import { FitScoreBadge, TrustBadge } from '@/components/explained-score';
import { TrackButton } from '@/components/track-button';
import { SavedSearches } from '@/components/saved-searches';

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
  const profiles = [...engine.store.radarProfiles.values()].filter((p) => p.userId === userId);

  return (
    <div>
      <h1 className="font-heading text-3xl font-medium text-foreground">Open opportunities</h1>
      <SavedSearches userId={userId} profiles={profiles} />
      <div className="mt-6 space-y-3">
        {list.map((o) => (
          <div key={o.id} className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-lg font-medium text-foreground">{o.title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {o.organizationName ?? 'Unknown organization'} · {o.type} · deadline:{' '}
                  <span className="font-mono">{o.deadline ?? o.deadlineKind}</span>
                </p>
                <div className="mt-2">
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
