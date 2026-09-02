'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function SaveOpportunityButton({ opportunityId }: { userId: string; opportunityId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const journeyId = useRef<string | undefined>(undefined);

  function save() {
    startTransition(async () => {
      const response = await fetch('/api/me/tracker', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          opportunityId,
          journeyId: journeyId.current ?? (journeyId.current = crypto.randomUUID()),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        toast.error(body.error ?? 'Could not save this opportunity');
        return;
      }
      toast.success('Saved to Tracker');
      router.refresh();
    });
  }

  return (
    <Button type="button" size="icon-sm" variant="outline" aria-label="Save opportunity" title="Save to Tracker" disabled={pending} onClick={save}>
      <Bookmark className="size-3.5" aria-hidden="true" />
    </Button>
  );
}
