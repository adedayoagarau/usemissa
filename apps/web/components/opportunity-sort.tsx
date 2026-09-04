'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dropdownStyles from '@/components/opportunity-dropdown.module.css';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function OpportunitySort({ className, signedIn = false }: { className?: string; signedIn?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const value = searchParams.get('sort') ?? 'soonest-deadline';

  const labels: Record<string, string> = {
    'soonest-deadline': 'Soonest deadline',
    'recently-added': 'Recently added',
    recommended: 'Recommended for you',
    'no-fee-first': 'Free to apply first',
    alphabetical: 'Alphabetical (A–Z)',
  };

  return (
    <div className={className}>
      <Select
        value={value}
        disabled={pending}
        onValueChange={(nextValue) => {
          if (!nextValue) return;
          const next = new URLSearchParams(searchParams.toString());
          next.set('sort', nextValue);
          next.delete('cursor');
          next.delete('trail');
          startTransition(() => router.push(`${pathname}?${next.toString()}`));
        }}
      >
        <SelectTrigger aria-label="Sort opportunities" className="min-h-9 border-transparent bg-transparent px-2 shadow-none hover:bg-muted">
          <SelectValue>{(selected: string) => labels[selected] ?? selected}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false} sideOffset={4} className="w-52 p-1">
          <SelectGroup className={dropdownStyles.list}>
          <SelectItem className={dropdownStyles.option} value="soonest-deadline">Soonest deadline</SelectItem>
          <SelectItem className={dropdownStyles.option} value="recently-added">Recently added</SelectItem>
          <SelectItem className={dropdownStyles.option} value="no-fee-first">Free to apply first</SelectItem>
          <SelectItem className={dropdownStyles.option} value="alphabetical">Alphabetical (A–Z)</SelectItem>
          {signedIn ? <SelectItem className={dropdownStyles.option} value="recommended">Recommended for you</SelectItem> : null}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
