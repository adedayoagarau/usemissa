'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const chartConfig = {
  events: { label: 'Product events', color: 'var(--chart-1)' },
  signups: { label: 'Waitlist signups', color: 'var(--chart-4)' },
} satisfies ChartConfig;

type Series = keyof typeof chartConfig;

function shortDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? day : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function Sparkline({ values, label, className = 'text-primary' }: { values: number[]; label: string; className?: string }) {
  if (values.length < 2 || values.every((value) => value === 0)) return null;
  const max = Math.max(...values, 1);
  const width = 96;
  const height = 28;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => `${(index * step).toFixed(1)},${(height - (value / max) * (height - 2) - 1).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label} className={className}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function PlatformAdminActivityChart({ daily }: { daily: Array<{ day: string; events: number; signups: number }> }) {
  const [series, setSeries] = useState<Series>('events');
  const total = daily.reduce((sum, row) => sum + row[series], 0);
  const data = daily.map((row) => ({ ...row, label: shortDay(row.day) }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-2xl tabular-nums text-foreground">{total.toLocaleString('en-GB')}</span>
          <span className="ml-2">{chartConfig[series].label.toLowerCase()} in the last 30 days</span>
        </p>
        <ToggleGroup
          value={[series]}
          onValueChange={(value: unknown[]) => {
            const next = value[0];
            if (next === 'events' || next === 'signups') setSeries(next);
          }}
          variant="outline"
          size="sm"
          spacing={0}
          aria-label="Chart series"
        >
          <ToggleGroupItem value="events">Events</ToggleGroupItem>
          <ToggleGroupItem value="signups">Signups</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
        <AreaChart accessibilityLayer data={data} margin={{ left: -18, right: 4, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          <Area dataKey={series} type="monotone" stroke={`var(--color-${series})`} fill={`var(--color-${series})`} fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ChartContainer>
      <Collapsible>
        <CollapsibleTrigger render={<Button variant="disclosure" size="sm" />}>View as table</CollapsibleTrigger>
<CollapsibleContent>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Daily product events and waitlist signups</caption>
            <thead><tr><th scope="col" className="py-1 font-medium">Day</th><th scope="col" className="py-1 text-right font-medium">Events</th><th scope="col" className="py-1 text-right font-medium">Signups</th></tr></thead>
            <tbody>{daily.map((row) => <tr key={row.day} className="border-t border-border"><td className="py-1 font-mono">{row.day}</td><td className="py-1 text-right font-mono tabular-nums">{row.events}</td><td className="py-1 text-right font-mono tabular-nums">{row.signups}</td></tr>)}</tbody>
          </table>
        </div>
      </CollapsibleContent>
</Collapsible>
    </div>
  );
}
