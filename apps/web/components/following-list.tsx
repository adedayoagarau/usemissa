'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Followed {
  organizationId: string;
  organizationName: string;
  followedAt: string;
}

/** Story 3.6: see and manage which organizations a submitter follows. */
export function FollowingList({ userId, following }: { userId: string; following: Followed[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (following.length === 0) return null;

  return (
    <div className="mt-6 rounded-lg border border-dashed border-border p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Following</h2>
      <div className="mt-2 space-y-2">
        {following.map((f) => (
          <div key={f.organizationId} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
            <span>{f.organizationName}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await fetch(`/api/users/${userId}/following/${f.organizationId}`, { method: 'DELETE' });
                  router.refresh();
                })
              }
            >
              Unfollow
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
