'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Followed {
  organizationId: string;
  organizationName: string;
  followedAt: string;
  revision?: number;
}

/** Story 3.6: see and manage which organizations a submitter follows. */
export function FollowingList({ userId, following }: { userId: string; following: Followed[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="space-y-4">
        <div><h2 className="text-base font-semibold text-foreground">Following</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Organizations you follow may appear in your Inbox. Following is reversible and is not an endorsement.</p></div>
        {following.length === 0 ? <div className="rounded-lg border border-dashed border-border bg-muted/40 p-5"><p className="font-medium text-foreground">You are not following any Organizations yet</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Open a public Organization Profile to review its current Opportunities before following.</p><Link href="/opportunities" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>Browse Opportunities</Link></div> : <div className="space-y-2">
          {following.map((f) => (
            <div key={f.organizationId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-3 text-sm">
              <span className="font-medium text-foreground">{f.organizationName}</span>
              <div className="flex flex-wrap gap-2"><Link href={`/org/${encodeURIComponent(f.organizationId)}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>View Organization</Link><Button size="sm" variant="ghost" disabled={isPending} onClick={() => startTransition(async () => { const response = await fetch(`/api/users/${userId}/following/${f.organizationId}`, { method: 'DELETE', headers: f.revision ? { 'Idempotency-Key': crypto.randomUUID(), 'If-Match': String(f.revision) } : undefined }); if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; toast.error(body.error ?? 'We could not unfollow that Organization.'); return; } toast.success('Unfollowed'); router.refresh(); })}>Unfollow</Button></div>
            </div>
          ))}
        </div>}
      </CardContent>
    </Card>
  );
}
