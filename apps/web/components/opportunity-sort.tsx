'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function OpportunitySort({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const value = searchParams.get('sort') ?? 'soonest-deadline';

  return (
    <label className={className}>
      <span>Sort by</span>
      <select
        aria-label="Sort opportunities"
        data-testid="opportunity-sort"
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = new URLSearchParams(searchParams.toString());
          next.set('sort', event.target.value);
          next.delete('cursor');
          startTransition(() => router.push(`${pathname}?${next.toString()}`));
        }}
      >
        <option value="soonest-deadline">Soonest deadline</option>
        <option value="recently-added">Recently added</option>
        <option value="recommended">Recommended for you</option>
      </select>
      {pending ? <span role="status" aria-live="polite">Updating…</span> : null}
    </label>
  );
}
