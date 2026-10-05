import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Database, Minus } from 'lucide-react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Shared, server-rendered building blocks for the admin analytics pages. One hue for data, neutral for comparison. */

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (Math.abs(value) >= 10_000) return new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  return value.toLocaleString('en-GB', { maximumFractionDigits: 1 });
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(value > 0 && value < 0.1 ? Math.max(digits, 1) : digits).replace(/\.0$/u, '')}%`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  return minutes < 60 ? `${minutes}m ${total % 60}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function AnalyticsHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-border pb-6">
      <div className="min-w-0">
        <h1 className="font-heading text-4xl font-medium tracking-[-0.02em] text-balance text-foreground sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
      </div>
      {children}
    </header>
  );
}

export function PeriodPicker({ basePath, days, options = [7, 30, 90, 365] }: { basePath: string; days: number; options?: readonly number[] }) {
  const label = (value: number) => (value === 365 ? '12 months' : `${value} days`);
  return (
    <nav aria-label="Time period" className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {options.map((value) => (
        <Link
          key={value}
          href={`${basePath}?days=${value}`}
          aria-current={value === days ? 'page' : undefined}
          className={`inline-flex min-h-8 items-center rounded-md px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${value === days ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          {label(value)}
        </Link>
      ))}
    </nav>
  );
}

export function NotConnected({ reason }: { reason?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-5">
      <Database className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-foreground">No data yet</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{reason ?? 'Nothing has been recorded for this period.'}</p>
      </div>
    </div>
  );
}

/**
 * A headline number with its change against the previous period.
 * `higherIsBetter` decides whether a rise is shown as good (bounce rate, for example, is not).
 */
/** "+12% vs prev." with direction and good/bad colour. `higherIsBetter` is false for things like bounce rate. */
export function ChangeLine({ current, previous, higherIsBetter = true, hint }: { current?: number | null; previous?: number | null; higherIsBetter?: boolean; hint?: string }) {
  const change = current !== null && current !== undefined && previous ? (current - previous) / previous : null;
  if (change === null) return <span className="text-xs text-muted-foreground">{hint ?? 'No earlier period to compare'}</span>;
  const flat = Math.abs(change) < 0.005;
  const good = !flat && (change > 0) === higherIsBetter;
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = flat ? 'text-muted-foreground' : good ? 'text-success' : 'text-destructive';
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Icon className={`size-3.5 ${tone}`} aria-hidden="true" />
      <span className={`font-medium ${tone}`}>
        {change > 0 ? '+' : ''}
        {formatPercent(change)}
      </span>
      <span className="text-muted-foreground">
        <span aria-hidden="true">vs prev.</span>
        <span className="sr-only">compared with the previous period</span>
      </span>
    </span>
  );
}

/** A headline number with its change against the previous period. */
export function StatTile({ label, value, current, previous, higherIsBetter = true, hint }: { label: string; value: string; current?: number | null; previous?: number | null; higherIsBetter?: boolean; hint?: string }) {
  return (
    <div className="min-w-0 bg-card px-5 py-5">
      <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-3 font-mono text-3xl tracking-[-0.02em] tabular-nums text-foreground">{value}</p>
      <p className="mt-2 flex items-center">
        <ChangeLine current={current} previous={previous} higherIsBetter={higherIsBetter} hint={hint} />
      </p>
    </div>
  );
}

/** A connected strip of figures: one bordered block with hairline dividers instead of separate cards. */
export function StatGroup({ label, columns = 4, children }: { label: string; columns?: 3 | 4 | 5 | 6; children: ReactNode }) {
  const grid = { 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-3 xl:grid-cols-6' }[columns];
  return (
    <section aria-label={label} className={`grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1 ${grid}`}>
      {children}
    </section>
  );
}

export function Panel({ title, description, action, children, className }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Ranked horizontal bars: the label sits on a proportional tint, the value is right-aligned. */
export function BarList({ rows, valueLabel = 'Visitors', secondaryLabel, empty = 'Nothing recorded yet.' }: { rows: Array<{ label: string; value: number; secondary?: number | string }>; valueLabel?: string; secondaryLabel?: string; empty?: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th scope="col" className="pb-2 text-left font-medium">Name</th>
          {secondaryLabel && <th scope="col" className="w-20 pb-2 text-right font-medium">{secondaryLabel}</th>}
          <th scope="col" className="w-20 pb-2 text-right font-medium">{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td className="py-0.5 pr-3">
              <span className="relative block min-w-0">
                <span className="absolute inset-y-0 left-0 rounded bg-primary/10" style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} aria-hidden="true" />
                <span className="relative block truncate px-2 py-1 text-foreground" title={row.label}>{row.label}</span>
              </span>
            </td>
            {secondaryLabel && <td className="py-0.5 text-right font-mono text-xs tabular-nums text-muted-foreground">{typeof row.secondary === 'number' ? formatCount(row.secondary) : row.secondary ?? '—'}</td>}
            <td className="py-0.5 text-right font-mono text-xs tabular-nums text-foreground">{formatCount(row.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Funnel as stepped bars, each showing who reached it, the step conversion, and how many dropped off. */
export function FunnelBars({ steps }: { steps: Array<{ label: string; count: number; conversionFromPrevious: number | null }> }) {
  const first = steps[0]?.count ?? 0;
  if (!first) return <p className="py-6 text-center text-sm text-muted-foreground">No one has entered this funnel in the selected period.</p>;
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const previous = index > 0 ? steps[index - 1]!.count : null;
        const dropped = previous !== null ? previous - step.count : 0;
        return (
          <li key={step.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-foreground">
                <span className="mr-2 font-mono text-xs text-muted-foreground">{index + 1}</span>
                {step.label}
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-foreground">
                {formatCount(step.count)}
                <span className="ml-2 text-muted-foreground">{formatPercent(step.count / first)} of start</span>
              </span>
            </div>
            <div className="mt-1.5 h-6 overflow-hidden rounded-md bg-muted" role="img" aria-label={`${step.label}: ${step.count} (${formatPercent(step.count / first)} of the first step)`}>
              <div className="h-full rounded-md bg-primary" style={{ width: `${Math.max(1, (step.count / first) * 100)}%` }} />
            </div>
            {index > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatPercent(step.conversionFromPrevious)} continued from the step before
                {dropped > 0 && <span> · <span className="text-destructive">{formatCount(dropped)} dropped off</span></span>}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Weekly retention grid. Cell shade is a single-hue ramp of the share of the cohort that came back. */
export function CohortGrid({ rows }: { rows: Array<{ cohortWeek: string; size: number; weeks: Array<number | null> }> }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">No sign-up cohorts in this window yet.</p>;
  const columns = rows[0]?.weeks.length ?? 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-0.5 text-xs">
        <caption className="sr-only">Share of each weekly sign-up cohort that was active in each following week</caption>
        <thead>
          <tr className="text-muted-foreground">
            <th scope="col" className="px-2 pb-1 text-left font-medium">Signed up week of</th>
            <th scope="col" className="px-2 pb-1 text-right font-medium">Users</th>
            {Array.from({ length: columns }, (_, index) => <th key={index} scope="col" className="px-1 pb-1 text-center font-medium">{index === 0 ? 'Week 0' : `+${index}`}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohortWeek}>
              <th scope="row" className="whitespace-nowrap px-2 py-1 text-left font-mono font-normal text-foreground">{row.cohortWeek}</th>
              <td className="px-2 py-1 text-right font-mono tabular-nums text-foreground">{row.size}</td>
              {row.weeks.map((value, index) => (
                <td
                  key={index}
                  className={`rounded px-1 py-1.5 text-center font-mono tabular-nums ${value === null ? 'text-muted-foreground' : value >= 0.5 ? 'text-primary-foreground' : 'text-foreground'}`}
                  style={value === null ? undefined : { background: `color-mix(in oklch, var(--chart-1) ${Math.round(8 + value * 92)}%, transparent)` }}
                >
                  {value === null ? '' : formatPercent(value, 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const regionNames = new Intl.DisplayNames(['en-GB'], { type: 'region' });

export function countryName(code: string): string {
  if (!/^[A-Z]{2}$/u.test(code)) return code;
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function capitalise(value: string): string {
  return value ? value[0]!.toUpperCase() + value.slice(1) : value;
}

/** Change badge used in compact lists. */
export function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous) return null;
  const change = (current - previous) / previous;
  const up = change >= 0;
  return <span className={`font-mono text-xs ${up ? 'text-success' : 'text-destructive'}`}>{up ? '+' : ''}{formatPercent(change)}</span>;
}
