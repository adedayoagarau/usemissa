'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      <Tabs value={view?.key ?? ''} onValueChange={(value) => setActive(String(value))} className="gap-(--card-spacing)">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{title}</CardTitle>
            {views.length > 1 && (
              <TabsList aria-label={`${title} views`}>
                {views.map((candidate) => (
                  <TabsTrigger key={candidate.key} value={candidate.key}>
                    {candidate.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            )}
          </div>
        </CardHeader>
        {view && (
          <TabsContent value={view.key} aria-label={view.label}>
            <CardContent>
              <BarList rows={view.rows} valueLabel={view.valueLabel} secondaryLabel={view.secondaryLabel} empty={view.empty} />
            </CardContent>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
}
