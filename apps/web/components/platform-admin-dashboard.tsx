import Link from 'next/link';
import { ArrowRight, CheckCircle2, CircleAlert, CircleDashed, CircleX, Clock3, Inbox, RefreshCw } from 'lucide-react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardHealth, PlatformAdminDashboardData } from '@/lib/platformAdminDashboard';
import PlatformAdminActivityChart, { Sparkline } from './platform-admin-activity-chart';
import PlatformAdminQuickActions from './platform-admin-quick-actions';

const healthIcon = { ok: CheckCircle2, warn: CircleAlert, down: CircleX, unknown: CircleDashed } as const;
const healthText: Record<DashboardHealth, string> = { ok: 'text-success', warn: 'text-warning', down: 'text-destructive', unknown: 'text-muted-foreground' };
const healthLabel: Record<DashboardHealth, string> = { ok: 'Healthy', warn: 'Needs a look', down: 'Down', unknown: 'Unknown' };

function headline(data: PlatformAdminDashboardData): { title: string; detail: string } {
  if (data.overall === 'down') return { title: 'Something is down', detail: 'At least one core system is not working. Start with the red item below.' };
  if (data.attentionTotal > 0) return { title: `${data.attentionTotal} thing${data.attentionTotal === 1 ? ' needs' : 's need'} your attention`, detail: 'The most urgent items are listed first. Everything else is running.' };
  if (data.overall === 'warn') return { title: 'Mostly healthy', detail: 'A few systems need a look, but nothing is blocking people.' };
  return { title: 'Everything is running', detail: 'No urgent work right now. Here is how Missa is doing.' };
}

function formatNumber(value: number | null): string {
  return value === null ? '—' : value.toLocaleString('en-GB');
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

export default function PlatformAdminDashboard({ data }: { data: PlatformAdminDashboardData }) {
  const summary = headline(data);
  const OverallIcon = healthIcon[data.overall];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xs font-medium text-muted-foreground">Dashboard</h1>
          <p role="status" className="mt-1 flex items-center gap-2 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <OverallIcon className={`size-6 shrink-0 ${healthText[data.overall]}`} aria-hidden="true" />
            {summary.title}
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{summary.detail}</p>
        </div>
        <Link href="/admin" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Refresh
        </Link>
      </header>

      <section aria-label="System health" className={`grid gap-3 sm:grid-cols-2 ${data.health.length > 4 ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
        {data.health.map((check) => {
          const Icon = healthIcon[check.status];
          return (
            <Link key={check.key} href={check.href} className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3 hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <Icon className={`mt-0.5 size-4 shrink-0 ${healthText[check.status]}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground">{check.label}</span>
                  <span className={`text-xs ${healthText[check.status]}`}>{healthLabel[check.status]}</span>
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{check.detail}</span>
              </span>
            </Link>
          );
        })}
      </section>

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        {data.kpis.map((kpi) => (
          <Link key={kpi.key} href={kpi.href} className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <p className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
              {kpi.label}
              <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            </p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="font-mono text-2xl tabular-nums text-foreground">{formatNumber(kpi.value)}</p>
              <Sparkline values={kpi.series} label={`${kpi.label}, daily trend over 30 days`} />
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{kpi.value === null ? 'Not connected' : kpi.detail}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Daily product usage and waitlist growth.</CardDescription>
              <CardAction>
                <Link href="/admin/analytics" className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4">
                  Full analytics
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {data.activity.available ? (
                <PlatformAdminActivityChart daily={data.activity.daily} />
              ) : (
                <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Activity tracking is not connected yet. Set <code className="font-mono text-xs">MISSA_ANALYTICS_DATABASE_URL</code> to see daily usage here.
                </p>
              )}
              {data.topEvents.length > 0 && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground">Most common actions</p>
                  <ul className="mt-2 space-y-1.5">
                    {data.topEvents.map((event) => {
                      const max = data.topEvents[0]?.count || 1;
                      return (
                        <li key={event.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
                          <span className="relative min-w-0">
                            <span className="absolute inset-y-0 left-0 rounded bg-primary/10" style={{ width: `${Math.max(4, (event.count / max) * 100)}%` }} aria-hidden="true" />
                            <span className="relative block truncate px-2 py-0.5 text-foreground">{event.name}</span>
                          </span>
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">{event.count.toLocaleString('en-GB')}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Needs your attention</CardTitle>
              <CardDescription>Most urgent first. Click an item to see what happened and fix it.</CardDescription>
              <CardAction>
                <Link href="/admin/operations" className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4">
                  See all {data.attentionTotal > 0 ? data.attentionTotal : ''}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </CardAction>
            </CardHeader>
            {data.attention.length ? (
              <ul className="divide-y divide-border border-t border-border">
                {data.attention.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary">
                      <CircleAlert className={`mt-0.5 size-4 ${item.urgent ? 'text-destructive' : 'text-warning'}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                        <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          <span className="font-medium text-foreground/80">{item.area}</span> · {item.reason}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        <Clock3 className="size-3" aria-hidden="true" />
                        {item.age}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <CardContent className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-foreground">You are all caught up</p>
                <p className="mt-1 text-xs text-muted-foreground">Nothing urgent in the queues right now.</p>
              </CardContent>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>One click. Results appear as a notification.</CardDescription>
            </CardHeader>
            <div className="border-t border-border">
              <PlatformAdminQuickActions {...data.controls} />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent admin activity</CardTitle>
              <CardAction>
                <Link href="/admin/audit" className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4">
                  Full log
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </CardAction>
            </CardHeader>
            {data.recent.length ? (
              <ol className="divide-y divide-border border-t border-border">
                {data.recent.map((entry) => (
                  <li key={entry.id} className="px-4 py-2.5">
                    <p className="truncate text-sm text-foreground">{entry.action}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      <time dateTime={entry.at}>{formatTime(entry.at)}</time> · {entry.actor} · {entry.target}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <CardContent className="flex flex-col items-center py-6 text-center">
                <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted-foreground">No admin actions recorded yet.</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">Updated {formatTime(data.generatedAt)} UTC</p>
    </div>
  );
}
