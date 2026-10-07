'use client';

import { useState, type ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TimeSeriesChart, { type ChartNoteMark } from './admin-time-series';

export interface MetricTab {
  key: string;
  label: string;
  value: string;
  /** Change line under the number; omit when there is no baseline. */
  delta?: ReactNode;
  /** Series key in `data`; metrics without one are shown but not selectable. */
  seriesKey?: string;
  kind?: 'area' | 'bar';
}

/**
 * Headline figures that double as the chart's tabs: pick a figure and the chart
 * below shows its daily history. One bordered block, so the numbers and their
 * trend read as a single object.
 */
export default function MetricChart({ tabs, data, notes = [], caption, footer }: { tabs: MetricTab[]; data: Array<Record<string, string | number | null>>; notes?: ChartNoteMark[]; caption: string; footer?: ReactNode }) {
  const selectable = tabs.filter((tab) => tab.seriesKey);
  const [active, setActive] = useState(selectable[0]?.key ?? '');
  const current = selectable.find((tab) => tab.key === active) ?? selectable[0];
  const columns = tabs.length >= 6 ? 'sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-6' : tabs.length === 3 ? 'sm:grid-cols-3 md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4';

  return (
    <section aria-label={caption} className="overflow-hidden rounded-xl border border-border bg-card">
      <Tabs value={current?.key ?? ''} onValueChange={(value) => setActive(String(value))} className="gap-0">
        <div className="border-b border-border p-3">
          <TabsList variant="tiles" size="auto" aria-label="Choose a metric to chart" className={`grid-cols-2 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1 ${columns}`}>
            {tabs.map((tab) => {
              const isActive = tab.key === current?.key;
              const body = (
                <>
                  <span className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{tab.label}</span>
                  <span className="block font-mono text-3xl font-normal tracking-[-0.02em] tabular-nums text-foreground">{tab.value}</span>
                  <span className="block text-xs font-normal">{tab.delta ?? <span className="text-muted-foreground">&nbsp;</span>}</span>
                </>
              );
              return tab.seriesKey ? (
                <TabsTrigger key={tab.key} value={tab.key} className="min-w-0">
                  {body}
                </TabsTrigger>
              ) : (
                <div key={tab.key} className="flex min-w-0 flex-col gap-2 rounded-xl border-2 border-transparent bg-muted/60 p-3 text-sm">{body}</div>
              );
            })}
          </TabsList>
        </div>
        {current?.seriesKey && (
          <TabsContent value={current.key} aria-label={current.label} className="px-4 pt-5 pb-4 sm:px-6">
            <TimeSeriesChart data={data} kind={current.kind ?? 'area'} series={[{ key: current.seriesKey, label: current.label }]} notes={notes} height={280} caption={`${current.label} per day`} />
            {footer && <div className="mt-4 border-t border-border pt-4">{footer}</div>}
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
}
