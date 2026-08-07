'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { captureProductEvent } from '@/components/analytics-provider';

export function SaveSearchButton({ userId, criteria, defaultName }: { userId: string; criteria: Record<string, unknown>; defaultName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const response = await fetch(`/api/users/${userId}/profiles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || defaultName, criteria }),
      });
      if (!response.ok) {
        toast.error('Could not save this search');
        return;
      }
      setSaved(true);
      setOpen(false);
      toast.success('Search saved');
      captureProductEvent('opportunity_search_saved', { taxonomyTermCount: Array.isArray(criteria.taxonomyTermIds) ? criteria.taxonomyTermIds.length : 0 });
      router.refresh();
    });
  }

  if (saved) return <span className="inline-flex h-8 items-center gap-1.5 text-xs font-medium text-green"><Check className="size-3.5" />Search saved</span>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" className="gap-1.5" />}><Bookmark className="size-3.5" />Save search</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Save this search</DialogTitle></DialogHeader>
        <div className="space-y-2"><label htmlFor="search-name" className="text-sm font-medium">Name</label><Input id="search-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Poetry residencies" /></div>
        <DialogFooter><Button type="button" disabled={isPending} onClick={save}>{isPending ? 'Saving…' : 'Save search'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
