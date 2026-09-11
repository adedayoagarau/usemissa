'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dropdownStyles from '@/components/opportunity-dropdown.module.css';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function DirectorySort({
  className,
  showScheduleSorts = false,
}: {
  className?: string;
  showScheduleSorts?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const value = searchParams.get('sort') ?? 'name_asc';

  const labels: Record<string, string> = {
    name_asc: 'Alphabetical (A–Z)',
    opening_soonest: 'Opening soonest',
    closing_soonest: 'Closing soonest',
    recently_updated: 'Recently updated',
  };

  return (
    <div className={className}>
      <Select
        value={value}
        disabled={pending}
        onValueChange={(nextValue) => {
          if (!nextValue) return;
          const next = new URLSearchParams(searchParams.toString());
          if (nextValue === 'name_asc') {
            next.delete('sort');
          } else {
            next.set('sort', nextValue);
          }
          next.delete('page');
          startTransition(() => router.push(`${pathname}?${next.toString()}`));
        }}
      >
        <SelectTrigger
          aria-label="Sort directory"
          className="min-h-9 border-transparent bg-transparent px-2 text-xs font-medium text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
        >
          <SelectValue>{(selected: string) => labels[selected] ?? selected}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false} sideOffset={4} className="w-52 p-1">
          <SelectGroup className={dropdownStyles.list}>
            <SelectItem className={dropdownStyles.option} value="name_asc">
              Alphabetical (A–Z)
            </SelectItem>
            {showScheduleSorts ? (
              <>
                <SelectItem className={dropdownStyles.option} value="opening_soonest">
                  Opening soonest
                </SelectItem>
                <SelectItem className={dropdownStyles.option} value="closing_soonest">
                  Closing soonest
                </SelectItem>
              </>
            ) : null}
            <SelectItem className={dropdownStyles.option} value="recently_updated">
              Recently updated
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
