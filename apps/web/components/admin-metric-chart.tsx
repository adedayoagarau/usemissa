'use client';

import { useState, type ReactNode } from 'react';
import TimeSeriesChart, { type ChartNoteMark } from './admin-time-series';
import { Button } from "@/components/ui/button";

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
  const columns = tabs.length >= 6 ? 'sm:grid-cols-3 xl:grid-cols-6' : tabs.length === 3 ? 'sm:grid-cols-3' : 'lg:grid-cols-4';

  return (
    <section aria-label={caption} className="overflow-hidden rounded-xl border border-border bg-card">
      <div role="group" aria-label="Choose a metric to chart" className={`grid grid-cols-2 gap-px border-b border-border bg-border [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1 ${columns}`}>
        {tabs.map((tab) => {
          const isActive = tab.key === current?.key;
          const body = (
            <>
              <span className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{tab.label}</span>
              <span className="mt-3 block font-mono text-3xl tracking-[-0.02em] tabular-nums text-foreground">{tab.value}</span>
              <span className="mt-2 block text-xs">{tab.delta ?? <span className="text-muted-foreground">&nbsp;</span>}</span>
              {isActive && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
            </>
          );
          return tab.seriesKey ? (
            <Button variant={isActive ? "secondary" : "ghost"} size="choice"
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(tab.key)}
            >
              {body}
            </Button>
          ) : (
            <div key={tab.key} className="relative min-w-0 bg-card px-5 py-5">{body}</div>
          );
        })}
      </div>
      {current?.seriesKey && (
        <div className="px-4 pt-5 pb-4 sm:px-6">
          <TimeSeriesChart data={data} kind={current.kind ?? 'area'} series={[{ key: current.seriesKey, label: current.label }]} notes={notes} height={280} caption={`${current.label} per day`} />
          {footer && <div className="mt-4 border-t border-border pt-4">{footer}</div>}
        </div>
      )}
    </section>
  );
}
