'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function SaveOpportunityButton({ opportunityId, className }: { userId?: string; opportunityId: string; className?: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const journeyId = useRef<string | undefined>(undefined);

  function save() {
    startTransition(async () => {
      try {
      const response = await fetch('/api/me/tracker', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          opportunityId,
          journeyId: journeyId.current ?? (journeyId.current = crypto.randomUUID()),
        }),
      });
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/opportunities/${opportunityId}`)}`);
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        toast.error(body.error ?? 'Could not save this opportunity');
        return;
      }
      setSaved(true);
      toast.success('Saved to Tracker');
      router.refresh();
      } catch {
        toast.error("Could not save this opportunity. Please try again.");
      }
    });
  }

  return (
    <Button type="button" size={className ? "icon" : "icon-sm"} className={className} variant="outline" aria-label={saved ? "Saved to Tracker" : pending ? "Saving opportunity" : "Save opportunity"} title={saved ? "Saved to Tracker" : "Save to Tracker"} disabled={pending || saved} onClick={save}>
      {saved ? <Check aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
    </Button>
  );
}
