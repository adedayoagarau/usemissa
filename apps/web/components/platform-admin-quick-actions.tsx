'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ComponentType } from 'react';
import { ArrowRight, Download, Mail, RefreshCw, RotateCcw, Unplug, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { DashboardFailedJob } from '@/lib/platformAdminDashboard';

type ActionKey = 'check-sources' | 'unstick' | 'retry';

async function postOperation(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch('/api/admin/operations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'The action failed.');
  return payload;
}

function ActionRow({
  icon: Icon,
  title,
  description,
  label,
  working,
  disabled,
  disabledReason,
  onRun,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  label: string;
  working: boolean;
  disabled: boolean;
  disabledReason?: string;
  onRun: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-5 text-muted-foreground">{disabled && disabledReason ? disabledReason : description}</p>
      </div>
      <Button type="button" size="sm" variant="outline" disabled={disabled || working} onClick={onRun} aria-busy={working}>
        {working ? <Spinner className="size-3.5" /> : null}
        {working ? 'Working…' : label}
      </Button>
    </li>
  );
}

function LinkRow({ href, icon: Icon, title, description }: { href: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; title: string; description: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{title}</span>
          <span className="block text-xs leading-5 text-muted-foreground">{description}</span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

export default function PlatformAdminQuickActions({
  databaseConnected,
  failedJobs,
  stuckJobs,
}: {
  databaseConnected: boolean;
  failedJobs: DashboardFailedJob[];
  stuckJobs: number;
}) {
  const router = useRouter();
  const [working, setWorking] = useState<ActionKey | null>(null);
  const noDatabase = 'Needs a connected database.';

  async function run(key: ActionKey, task: () => Promise<string>) {
    setWorking(key);
    try {
      toast.success(await task());
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The action failed.');
    } finally {
      setWorking(null);
    }
  }

  const checkSources = () => run('check-sources', async () => {
    const result = await postOperation({ action: 'run-radar-tick' });
    if (result.status === 'skipped') return 'A source check is already running. Try again in a minute.';
    return `Checked ${Number(result.sourcesChecked ?? 0)} sources · ${Number(result.changes ?? 0)} changes · ${Number(result.sourcesFailed ?? 0)} failed`;
  });

  const unstick = () => run('unstick', async () => {
    const results = await Promise.all((['review', 'enrichment', 'outbox'] as const).map((queue) => postOperation({ action: 'release-stale', queue })));
    const released = results.reduce((total, result) => total + Number(result.affected ?? 0), 0);
    return released ? `Released ${released} stuck job${released === 1 ? '' : 's'} back to the queue.` : 'No stuck jobs found.';
  });

  const retryFailed = () => run('retry', async () => {
    const outcomes = await Promise.allSettled(failedJobs.map((job) => postOperation({ action: 'retry', queue: job.queue, id: job.id })));
    const retried = outcomes.filter((outcome) => outcome.status === 'fulfilled').length;
    const failed = outcomes.length - retried;
    if (retried === 0) throw new Error('None of the failed jobs could be retried.');
    return `Retried ${retried} job${retried === 1 ? '' : 's'}${failed ? ` · ${failed} could not be retried` : ''}.`;
  });

  return (
    <ul className="divide-y divide-border">
      <ActionRow
        icon={RefreshCw}
        title="Check sources now"
        description="Fetch the next batch of opportunity sources right away."
        label="Run check"
        working={working === 'check-sources'}
        disabled={!databaseConnected || working !== null}
        disabledReason={!databaseConnected ? noDatabase : undefined}
        onRun={checkSources}
      />
      <ActionRow
        icon={RotateCcw}
        title={failedJobs.length ? `Retry ${failedJobs.length} failed job${failedJobs.length === 1 ? '' : 's'}` : 'Retry failed jobs'}
        description={failedJobs.length ? 'Put every failed review, enrichment, and event job back in the queue.' : 'Nothing has failed. You are all caught up.'}
        label="Retry all"
        working={working === 'retry'}
        disabled={!databaseConnected || failedJobs.length === 0 || working !== null}
        disabledReason={!databaseConnected ? noDatabase : undefined}
        onRun={retryFailed}
      />
      <ActionRow
        icon={Unplug}
        title="Unstick jobs"
        description={stuckJobs ? `${stuckJobs} job${stuckJobs === 1 ? ' is' : 's are'} processing. Release any that have timed out.` : 'Release jobs whose worker stopped responding.'}
        label="Release"
        working={working === 'unstick'}
        disabled={!databaseConnected || working !== null}
        disabledReason={!databaseConnected ? noDatabase : undefined}
        onRun={unstick}
      />
      <LinkRow href="/admin/data" icon={Download} title="Export data" description="Browse any table and download it as CSV." />
      <LinkRow href="/admin/waitlist" icon={Users} title="Waitlist" description="See new signups and send invites." />
      <LinkRow href="/admin/email-previews" icon={Mail} title="Send a test email" description="Preview each email template and send it to yourself." />
    </ul>
  );
}
