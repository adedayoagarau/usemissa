'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

export interface SeriesSpec {
  key: string;
  label: string;
  /** primary = the brand data hue; comparison = dashed neutral; secondary = lighter tint of the same hue (stacked bars only). */
  tone?: 'primary' | 'comparison' | 'secondary';
}

export interface ChartNoteMark {
  day: string;
  label: string;
}

const TONE_COLOR = {
  primary: 'var(--chart-1)',
  comparison: 'var(--muted-foreground)',
  secondary: 'color-mix(in oklch, var(--chart-1) 45%, var(--card))',
} as const;

function shortDay(day: string): string {
  if (/^\d{4}-\d{2}$/u.test(day)) {
    const date = new Date(`${day}-01T00:00:00Z`);
    return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  }
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? day : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/**
 * One-axis time series. Line/area for trends, bars for discrete daily counts;
 * stacked bars only for parts of a whole (new vs returning). Notes appear as
 * labelled vertical markers. A table view is always available.
 */
export default function TimeSeriesChart({
  data,
  series,
  xKey = 'day',
  kind = 'area',
  stacked = false,
  notes = [],
  height = 240,
  valueSuffix = '',
  caption,
}: {
  data: Array<Record<string, string | number | null>>;
  series: SeriesSpec[];
  xKey?: string;
  kind?: 'area' | 'line' | 'bar';
  stacked?: boolean;
  notes?: ChartNoteMark[];
  height?: number;
  valueSuffix?: string;
  caption: string;
}) {
  const config = Object.fromEntries(series.map((item) => [item.key, { label: item.label, color: TONE_COLOR[item.tone ?? 'primary'] }])) satisfies ChartConfig;
  const rows = data.map((row) => ({ ...row, __label: shortDay(String(row[xKey])) }));
  const noteDays = new Map(notes.map((note) => [shortDay(note.day), note.label]));
  const axis = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey="__label" tickLine={false} axisLine={false} minTickGap={28} />
      <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} tickFormatter={(value: number) => `${new Intl.NumberFormat('en-GB', { notation: 'compact' }).format(value)}${valueSuffix}`} />
      <ChartTooltip cursor={kind === 'bar' ? { fill: 'var(--muted)', opacity: 0.5 } : true} content={<ChartTooltipContent indicator="line" />} />
      {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
      {[...noteDays.entries()].map(([day, label]) => (
        <ReferenceLine key={day} x={day} stroke="var(--muted-foreground)" strokeDasharray="2 3" label={{ value: label, position: 'insideTopLeft', fontSize: 10, fill: 'var(--muted-foreground)' }} />
      ))}
    </>
  );

  return (
    <div>
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        {kind === 'bar' ? (
          <BarChart accessibilityLayer data={rows} margin={{ left: -12, right: 4, top: 12, bottom: 0 }} barCategoryGap={2}>
            {axis}
            {series.map((item, index) => (
              <Bar key={item.key} dataKey={item.key} stackId={stacked ? 'stack' : undefined} fill={`var(--color-${item.key})`} radius={stacked && index < series.length - 1 ? [0, 0, 0, 0] : [4, 4, 0, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        ) : kind === 'line' ? (
          <LineChart accessibilityLayer data={rows} margin={{ left: -12, right: 4, top: 12, bottom: 0 }}>
            {axis}
            {series.map((item) => (
              <Line key={item.key} dataKey={item.key} type="monotone" stroke={`var(--color-${item.key})`} strokeWidth={2} strokeDasharray={item.tone === 'comparison' ? '4 4' : undefined} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        ) : (
          <AreaChart accessibilityLayer data={rows} margin={{ left: -12, right: 4, top: 12, bottom: 0 }}>
            {axis}
            {series.map((item) => (
              <Area key={item.key} dataKey={item.key} type="monotone" stroke={`var(--color-${item.key})`} fill={`var(--color-${item.key})`} fillOpacity={item.tone === 'comparison' ? 0 : 0.12} strokeWidth={2} strokeDasharray={item.tone === 'comparison' ? '4 4' : undefined} isAnimationActive={false} />
            ))}
          </AreaChart>
        )}
      </ChartContainer>
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer">View as table</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                <th scope="col" className="py-1 font-medium">{xKey === 'month' ? 'Month' : 'Day'}</th>
                {series.map((item) => <th key={item.key} scope="col" className="py-1 text-right font-medium">{item.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={String(row[xKey])} className="border-t border-border">
                  <td className="py-1 font-mono">{String(row[xKey])}</td>
                  {series.map((item) => <td key={item.key} className="py-1 text-right font-mono tabular-nums">{row[item.key] ?? '—'}{row[item.key] !== null && row[item.key] !== undefined ? valueSuffix : ''}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
