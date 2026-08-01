'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function BookmarkButton({ userId, opportunityId, initialBookmarked = false }: { userId: string; opportunityId: string; initialBookmarked?: boolean }) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const res = await fetch(`/api/users/${userId}/bookmarks`, {
        method: next ? 'POST' : 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ opportunityId }),
      });
      if (!res.ok) {
        setBookmarked(!next);
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'Could not update bookmark');
        return;
      }
      toast.success(next ? 'Saved to your bookmarks' : 'Removed from bookmarks');
      router.refresh();
    });
  }

  return (
    <Button type="button" size="icon-sm" variant="outline" disabled={isPending} aria-pressed={bookmarked} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark opportunity'} title={bookmarked ? 'Remove bookmark' : 'Bookmark opportunity'} onClick={toggle}>
      <Bookmark className={bookmarked ? 'size-3.5 fill-current text-primary' : 'size-3.5'} />
    </Button>
  );
}
