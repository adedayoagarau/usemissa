'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function TrackButton({ userId, opportunityId }: { userId: string; opportunityId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await fetch(`/api/users/${userId}/track`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ opportunityId }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              setError(body.error ?? 'Failed to track');
              return;
            }
            router.refresh();
          });
        }}
      >
        {isPending ? 'Tracking…' : 'Track'}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
