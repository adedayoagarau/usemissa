'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import styles from '@/app/(passport)/opportunities/opportunities.module.css';

const CATEGORIES = [['all', 'All'], ['magazines', 'Magazines'], ['grants', 'Grants'], ['awards', 'Awards'], ['residencies', 'Residencies'], ['fellowships', 'Fellowships'], ['contests', 'Contests']] as const;

function hrefWith(params: URLSearchParams, changes: Record<string, string | undefined>): string {
  const next = new URLSearchParams(params.toString());
  next.delete('cursor');
  next.delete('selected');
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === '') next.delete(key); else next.set(key, value);
  }
  return `${next.toString() ? `?${next.toString()}` : ''}`;
}

export function OpportunityCategoryNav({ category }: { category: string }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const base = new URLSearchParams(params.toString());
  return <nav aria-label="Opportunity categories" className="flex gap-7 overflow-x-auto border-b border-border px-6 lg:px-8">
    {CATEGORIES.map(([value, label]) => <Link key={value} href={`${pathname}${hrefWith(base, { category: value })}`} className={`${styles.categoryLink} ${category === value ? styles.categoryLinkActive : ''}`} aria-current={category === value ? 'page' : undefined}>{label}</Link>)}
    <Popover><PopoverTrigger render={<Button type="button" variant="ghost" className={`${styles.categoryLink} gap-1 px-0 font-normal ${category === 'more' ? styles.categoryLinkActive : ''}`} />} aria-label="More opportunity filters">More <ChevronDown className="size-3.5" /></PopoverTrigger><PopoverContent align="start" className="w-52 p-2"><div className="grid gap-1"><Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" href={`${pathname}${hrefWith(base, { openNow: '1', category: 'all' })}`}>Open now</Link><Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" href={`${pathname}${hrefWith(base, { feeToggle: '1', fee: undefined, category: 'all' })}`}>No-fee calls</Link><Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" href={`${pathname}${hrefWith(base, { deadlineWithinDays: '7', category: 'all' })}`}>Closing within 7 days</Link></div></PopoverContent></Popover>
  </nav>;
}
