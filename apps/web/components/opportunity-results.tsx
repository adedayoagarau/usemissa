'use client';

import { useEffect, useState } from 'react';
import type { OpportunityBrowseProjection } from '@missa/radar-engine';
import { ChevronDown, LoaderCircle } from 'lucide-react';
import { OpportunityCatalogueCard } from '@/components/opportunity-catalogue-card';
import { OpportunityCard } from '@/components/opportunity-disclosure/opportunity-disclosure';
import { SaveToTrackerButton } from '@/components/save-to-tracker-button';
import type { OpportunityPresentation } from '@/lib/opportunityPresentation';
import styles from '@/app/opportunities/opportunities.module.css';

type BrowseResponse = {
  items: OpportunityBrowseProjection[];
  nextCursor: string | null;
};

type Snapshot = {
  items: OpportunityBrowseProjection[];
  nextCursor: string | null;
};

export function OpportunityResults({
  initialItems,
  initialNextCursor,
  baseQuery,
  signedIn,
  presentation,
}: {
  initialItems: OpportunityBrowseProjection[];
  initialNextCursor: string | null;
  baseQuery: string;
  signedIn: boolean;
  presentation: OpportunityPresentation;
}) {
  const [snapshots] = useState(() => new Map<string, Snapshot>([['first', { items: initialItems, nextCursor: initialNextCursor }]]));
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const current = new URL(window.location.href);
    if (!current.searchParams.get('cursor')) {
      window.history.replaceState({ missaOpportunityPage: 'first' }, '', current.href);
    }
    const onPopState = (event: PopStateEvent) => {
      const key = event.state?.missaOpportunityPage ?? (new URL(window.location.href).searchParams.get('cursor') || 'first');
      const snapshot = snapshots.get(key);
      if (snapshot) {
        setItems(snapshot.items);
        setNextCursor(snapshot.nextCursor);
      } else {
        // A direct browser navigation to an uncached cursor is handled by the
        // server-rendered route rather than pretending the current list is it.
        window.location.reload();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [snapshots]);

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams(baseQuery);
      params.set('cursor', nextCursor);
      const response = await fetch(`/api/opportunities?${params.toString()}`, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Opportunity page failed: ${response.status}`);
      const page = (await response.json()) as BrowseResponse;
      const merged = [...items, ...page.items];
      const pageKey = nextCursor;
      const snapshot = { items: merged, nextCursor: page.nextCursor };
      snapshots.set(pageKey, snapshot);
      setItems(merged);
      setNextCursor(page.nextCursor);
      const url = new URL(window.location.href);
      url.searchParams.set('cursor', pageKey);
      window.history.pushState({ missaOpportunityPage: pageKey }, '', url.href);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={styles.grid}>
        {items.map((item) => presentation === 'disclosure-v2' ? (
          <OpportunityCard
            key={item.id}
            opportunity={item}
            href={`/opportunities/${item.slug}`}
            action={
              <SaveToTrackerButton
                opportunityId={item.id}
                tracked={item.personal?.tracked}
                compact
                signedIn={signedIn}
                returnTo={`/opportunities/${item.slug}`}
                opportunityTitle={item.title}
              />
            }
          />
        ) : <OpportunityCatalogueCard key={item.id} item={item} signedIn={signedIn} />)}
      </div>
      {nextCursor ? (
        <div className={styles.loadMore}>
          <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60" onClick={() => void loadMore()} disabled={loading}>
            {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
            {loading ? 'Loading opportunities…' : 'Load more opportunities'}
          </button>
          {error ? <p role="alert" className="mt-2 text-sm text-destructive">We could not load more opportunities. Try again.</p> : null}
        </div>
      ) : null}
    </>
  );
}
