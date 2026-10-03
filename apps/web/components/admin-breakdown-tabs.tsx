'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarList } from './admin-observability-ui';

export interface BreakdownView {
  key: string;
  label: string;
  rows: Array<{ label: string; value: number; secondary?: number | string }>;
  valueLabel?: string;
  secondaryLabel?: string;
  empty?: string;
}

/** One card, several related breakdowns behind tabs (Pages · Landing · Exit), instead of a wall of panels. */
export default function BreakdownTabs({ title, views }: { title: string; views: BreakdownView[] }) {
  const [active, setActive] = useState(views[0]?.key ?? '');
  const view = views.find((candidate) => candidate.key === active) ?? views[0];
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          {views.length > 1 && (
            <div role="tablist" aria-label={`${title} views`} className="inline-flex rounded-lg bg-muted p-0.5">
              {views.map((candidate) => (
                <button
                  key={candidate.key}
                  type="button"
                  role="tab"
                  aria-selected={candidate.key === view?.key}
                  onClick={() => setActive(candidate.key)}
                  className={`min-h-7 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${candidate.key === view?.key ? 'bg-card text-foreground shadow-[0_1px_2px_rgba(28,24,21,0.08)]' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent role="tabpanel" aria-label={view?.label}>
        {view && <BarList rows={view.rows} valueLabel={view.valueLabel} secondaryLabel={view.secondaryLabel} empty={view.empty} />}
      </CardContent>
    </Card>
  );
}
