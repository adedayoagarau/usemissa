'use client';

import { FormEvent, useState, useTransition } from 'react';
import { LoaderCircle, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputGroupInput } from '@/components/ui/input-group';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { captureProductEvent } from '@/components/analytics-provider';
import styles from './opportunity-search.module.css';
import { useSp } from "@/components/missa/spelling";

export function OpportunitySearch({ category, initialQuery }: { category: string; initialQuery?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery ?? '');
  const [pending, startTransition] = useTransition();
  const sp = useSp();

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
    <form onSubmit={submit} role="search" className={styles.form}>
      <Search className={styles.leadingIcon} aria-hidden="true" />
      <InputGroupInput
        value={value}
        onChange={(event) => setValue(event.target.value)}
        name="q"
        placeholder={sp("Search by opportunity, organization, or discipline")}
        aria-label={sp("Search opportunities or organizations")}
        className={styles.input}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => setValue('')}
          aria-label="Clear search"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
      <Button type="submit" disabled={pending} className={styles.submit} aria-label="Search opportunities">
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
        <span className="hidden sm:inline">Search</span>
        {pending ? <span className="sr-only" role="status">Updating results</span> : null}
      </Button>
    </form>
  );
}
