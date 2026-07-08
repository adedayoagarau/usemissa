'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { RadarProfile } from '@missa/radar-engine';

/**
 * Story 3.3: RadarProfile (saved search) creation/edit UI -- this is the
 * "discovery" half of the Opportunities page (FR15): what a submitter
 * actually gets matched against, distinct from just browsing the raw feed.
 */
export function SavedSearches({ userId, profiles }: { userId: string; profiles: RadarProfile[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [genres, setGenres] = useState('');
  const [noFeeOnly, setNoFeeOnly] = useState(false);
  const [deadlineWithinDays, setDeadlineWithinDays] = useState('');
  const [isPending, startTransition] = useTransition();

  const createProfile = () => {
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
        toast.error(data.error ?? 'Failed to save');
        return;
      }
      setName('');
      setGenres('');
      setNoFeeOnly(false);
      setDeadlineWithinDays('');
      setOpen(false);
      toast.success('Saved search created');
      router.refresh();
    });
  };

  const deleteProfile = (profileId: string) => {
    startTransition(async () => {
      await fetch(`/api/users/${userId}/profiles/${profileId}`, { method: 'DELETE' });
      toast.success('Saved search deleted');
      router.refresh();
    });
  };

  return (
    <Card className="mt-6">
      <CardContent>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved searches</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>New saved search</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New saved search</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="saved-search-name">Name</FieldLabel>
                  <Input
                    id="saved-search-name"
                    placeholder="e.g. Poetry, no fee"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="saved-search-genres">Genres</FieldLabel>
                  <Input
                    id="saved-search-genres"
                    placeholder="Comma-separated"
                    value={genres}
                    onChange={(e) => setGenres(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="saved-search-deadline">Deadline within (days)</FieldLabel>
                  <Input
                    id="saved-search-deadline"
                    type="number"
                    value={deadlineWithinDays}
                    onChange={(e) => setDeadlineWithinDays(e.target.value)}
                  />
                </Field>
                <Field orientation="horizontal">
                  <Checkbox
                    id="saved-search-no-fee"
                    checked={noFeeOnly}
                    onCheckedChange={(checked) => setNoFeeOnly(checked === true)}
                  />
                  <FieldLabel htmlFor="saved-search-no-fee" className="font-normal">
                    No fee only
                  </FieldLabel>
                </Field>
              </div>
              <DialogFooter>
                <Button disabled={isPending} onClick={createProfile}>
                  Save search
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
      </CardContent>
    </Card>
  );
}
