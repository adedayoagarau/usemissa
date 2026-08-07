'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

export function OpportunityResultsRefresh({ queryKey, children }: { queryKey: string; children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState<string | null>(null);

  useEffect(() => {
    const start = () => setRefreshKey(queryKey);
    window.addEventListener('missa:opportunities-refresh', start);
    return () => window.removeEventListener('missa:opportunities-refresh', start);
  }, [queryKey]);

  const refreshing = refreshKey === queryKey;

  return (
    <div className="relative">
      {refreshing && <div role="status" className="absolute inset-x-6 top-2 z-10 flex items-center justify-center gap-2 rounded-md border border-border bg-card/95 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm lg:inset-x-8"><RefreshCw className="size-3.5 animate-spin text-primary" />Refreshing opportunities…</div>}
      <div className={refreshing ? 'opacity-55 transition-opacity duration-150' : 'transition-opacity duration-180'}>{children}</div>
    </div>
  );
}
