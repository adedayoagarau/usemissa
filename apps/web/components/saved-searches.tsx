'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { MISSA_TAXONOMY, taxonomyLabelFor } from '@missa/taxonomy';
import { TaxonomyBrowsePicker } from '@/components/taxonomy-browse-picker';
import { captureProductEvent } from '@/components/analytics-provider';
import { cn } from '@/lib/utils';

/**
 * Story 3.3: RadarProfile (saved search) creation/edit UI -- this is the
 * "discovery" half of the Opportunities page (FR15): what a submitter
 * actually gets matched against, distinct from just browsing the raw feed.
 */
type SavedSearchView = RadarProfile & { revision?: number };

export function SavedSearches({ userId, profiles }: { userId: string; profiles: SavedSearchView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [taxonomyTermIds, setTaxonomyTermIds] = useState<string[]>([]);
  const [noFeeOnly, setNoFeeOnly] = useState(false);
  const [deadlineWithinDays, setDeadlineWithinDays] = useState('');
  const [isPending, startTransition] = useTransition();

  const createProfile = () => {
    startTransition(async () => {
      const res = await fetch(`/api/users/${userId}/profiles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          name: name.trim() || 'Saved search',
          criteria: {
            taxonomyTermIds: taxonomyTermIds.length ? taxonomyTermIds : undefined,
            taxonomySchemeVersion: MISSA_TAXONOMY.scheme.version,
            taxonomyIncludeDescendants: true,
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
      setTaxonomyTermIds([]);
      setNoFeeOnly(false);
      setDeadlineWithinDays('');
      setOpen(false);
      toast.success('Saved search created');
      captureProductEvent('opportunity_search_saved', { taxonomyTermCount: taxonomyTermIds.length });
      router.refresh();
    });
  };

  const deleteProfile = (profileId: string) => {
    startTransition(async () => {
      const profile = profiles.find((item) => item.id === profileId);
      const response = await fetch(`/api/users/${userId}/profiles/${profileId}`, {
        method: 'DELETE',
        headers: profile?.revision ? { 'Idempotency-Key': crypto.randomUUID(), 'If-Match': String(profile.revision) } : undefined,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        toast.error(body.error ?? 'We could not delete that saved search.');
        return;
      }
      toast.success('Saved search deleted');
      router.refresh();
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-base font-semibold text-foreground">Saved searches</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Keep a named, repeatable Opportunity query. Saved searches can be narrower than your broad private Profile preferences.</p></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>New saved search</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New saved search</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <Field>
                  <FieldLabel>Fields</FieldLabel>
                  <TaxonomyBrowsePicker
                    idPrefix="saved-search-practice"
                    selectedTermIds={taxonomyTermIds}
                    onSelectedTermIdsChange={setTaxonomyTermIds}
                    description="Use the same canonical browse path as Opportunities. Missa includes narrower terms when matching this saved search."
                  />
                </Field>
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
        {profiles.length === 0 ? <div className="rounded-lg border border-dashed border-border bg-muted/40 p-5"><p className="font-medium text-foreground">No saved searches yet</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Create one here, or begin from the filters on Opportunities. No current matches means only that Missa has no matching published records right now.</p><Link href="/opportunities" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>Open Opportunities</Link></div> : <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
              <span>
                {p.name}
                {p.criteria.taxonomyTermIds?.length ? <span className="text-muted-foreground"> · {p.criteria.taxonomyTermIds.map((termId) => taxonomyLabelFor(termId)).join(', ')}</span> : null}
                {p.criteria.genres?.length ? <span className="text-muted-foreground"> · {p.criteria.genres.join(', ')}</span> : null}
                {p.criteria.noFeeOnly ? <span className="text-muted-foreground"> · no fee</span> : null}
                {p.criteria.deadlineWithinDays ? <span className="text-muted-foreground"> · within {p.criteria.deadlineWithinDays}d</span> : null}
              </span>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => deleteProfile(p.id)}>
                Delete
              </Button>
            </div>
          ))}
        </div>}
      </CardContent>
    </Card>
  );
}
