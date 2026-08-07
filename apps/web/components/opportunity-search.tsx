'use client';

import { FormEvent, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { captureProductEvent } from '@/components/analytics-provider';

export function OpportunitySearch({ category, initialQuery }: { category: string; initialQuery?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery ?? '');
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) next.set('q', trimmed);
    else next.delete('q');
    next.set('category', category);
    next.delete('cursor');
    captureProductEvent('opportunity_search_submitted', { hasQuery: Boolean(trimmed), category });
    window.dispatchEvent(new CustomEvent('missa:opportunities-refresh'));
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  return (
    <form onSubmit={submit} role="search" className="flex items-center rounded-md border border-input bg-background px-3">
      <Search className="mr-2 size-4 text-muted-foreground" aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        name="q"
        placeholder="Search opportunities or organizations"
        aria-label="Search opportunities or organizations"
        className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {value && <button type="button" onClick={() => setValue('')} aria-label="Clear search" className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>}
      {pending && <span role="status" className="ml-2 text-xs text-muted-foreground">Updating…</span>}
    </form>
  );
}
