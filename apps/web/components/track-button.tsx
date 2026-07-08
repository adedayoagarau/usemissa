'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function TrackButton({ userId, opportunityId }: { userId: string; opportunityId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const res = await fetch(`/api/users/${userId}/track`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ opportunityId }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            toast.error(body.error ?? 'Failed to track');
            return;
          }
          toast.success('Tracking this opportunity');
          router.refresh();
        });
      }}
    >
      {isPending ? 'Tracking…' : 'Track'}
    </Button>
  );
}
