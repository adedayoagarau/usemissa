'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function OpportunitiesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 text-center"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Profile</p><h1 className="mt-3 text-2xl font-semibold">Opportunities are taking a moment</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">We could not load the browse page. Try again, or come back after the next source refresh.</p><Button className="mt-6" onClick={() => reset()}>Try again</Button></div>;
}
