'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RadarProfile } from '@missa/radar-engine';

/**
 * Story 3.3: RadarProfile (saved search) creation/edit UI -- this is the
 * "discovery" half of the Opportunities page (FR15): what a submitter
 * actually gets matched against, distinct from just browsing the raw feed.
 */
export function SavedSearches({ userId, profiles }: { userId: string; profiles: RadarProfile[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [genres, setGenres] = useState('');
  const [noFeeOnly, setNoFeeOnly] = useState(false);
  const [deadlineWithinDays, setDeadlineWithinDays] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const createProfile = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/users/${userId}/profiles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Saved search',
          criteria: {
            genres: genres.split(',').map((g) => g.trim()).filter(Boolean),
            noFeeOnly,
            deadlineWithinDays: deadlineWithinDays ? Number(deadlineWithinDays) : undefined,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to save');
        return;
      }
      setName('');
      setGenres('');
      setNoFeeOnly(false);
      setDeadlineWithinDays('');
      router.refresh();
    });
  };

  const deleteProfile = (profileId: string) => {
    startTransition(async () => {
      await fetch(`/api/users/${userId}/profiles/${profileId}`, { method: 'DELETE' });
      router.refresh();
    });
  };

  return (
    <div className="mt-6 rounded-lg border border-dashed border-border p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved searches</h2>
      <div className="mt-2 space-y-2">
        {profiles.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
            <span>
              {p.name}
              {p.criteria.genres?.length ? <span className="text-muted-foreground"> · {p.criteria.genres.join(', ')}</span> : null}
              {p.criteria.noFeeOnly ? <span className="text-muted-foreground"> · no fee</span> : null}
              {p.criteria.deadlineWithinDays ? <span className="text-muted-foreground"> · within {p.criteria.deadlineWithinDays}d</span> : null}
            </span>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => deleteProfile(p.id)}>
              Delete
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Input placeholder="Name (e.g. Poetry, no fee)" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
        <Input placeholder="Genres (comma-separated)" value={genres} onChange={(e) => setGenres(e.target.value)} className="w-48" />
        <Input
          placeholder="Deadline within (days)"
          type="number"
          value={deadlineWithinDays}
          onChange={(e) => setDeadlineWithinDays(e.target.value)}
          className="w-40"
        />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input type="checkbox" checked={noFeeOnly} onChange={(e) => setNoFeeOnly(e.target.checked)} />
          no fee only
        </label>
        <Button size="sm" disabled={isPending} onClick={createProfile}>
          Save search
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  );
}
