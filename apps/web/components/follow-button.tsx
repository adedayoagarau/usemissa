'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function FollowButton({
  userId,
  organizationId,
  organizationName,
}: {
  userId: string;
  organizationId: string;
  organizationName?: string;
}) {
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
            toast.success(`Following ${organizationName ?? 'this organization'}`);
            router.refresh();
          } else {
            toast.error('Failed to follow');
          }
        })
      }
    >
      Follow organization
    </button>
  );
}
