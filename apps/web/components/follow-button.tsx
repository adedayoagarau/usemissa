'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function FollowButton({ userId, organizationId }: { userId: string; organizationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [followed, setFollowed] = useState(false);

  if (followed) return <span className="text-xs text-muted-foreground">Following</span>;

  return (
    <button
      type="button"
      disabled={isPending}
      className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50"
      onClick={() =>
        startTransition(async () => {
          const res = await fetch(`/api/users/${userId}/following`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ organizationId }),
          });
          if (res.ok) {
            setFollowed(true);
            router.refresh();
          }
        })
      }
    >
      Follow organization
    </button>
  );
}
