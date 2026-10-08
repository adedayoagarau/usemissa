'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarList } from './admin-observability-ui';
import { Button } from "@/components/ui/button";

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
            <div role="group" aria-label={`${title} views`} className="inline-flex rounded-lg bg-muted p-0.5">
              {views.map((candidate) => (
                <Button variant={candidate.key === view?.key ? "secondary" : "ghost"} size="xs"
                  key={candidate.key}
                  type="button"
                  aria-pressed={candidate.key === view?.key}
                  onClick={() => setActive(candidate.key)}
                >
                  {candidate.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {view && <BarList rows={view.rows} valueLabel={view.valueLabel} secondaryLabel={view.secondaryLabel} empty={view.empty} />}
      </CardContent>
    </Card>
  );
}
