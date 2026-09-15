'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type Queue = 'review' | 'enrichment' | 'outbox';

export function AdminOperationButton({
  action,
  queue,
  id,
  label,
  tone = 'secondary',
}: {
  action: 'retry' | 'release-stale' | 'run-radar-tick';
  queue?: Queue;
  id?: string;
  label: string;
  tone?: 'primary' | 'secondary';
}) {
  const [state, setState] = useState<'idle' | 'working' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function run(): Promise<void> {
    setState('working');
    setMessage('');
    try {
      const response = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...(queue ? { queue } : {}), ...(id ? { id } : {}) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Operation failed');
      setState('success');
      setMessage(
        payload.status === 'skipped'
          ? 'Request skipped; another tick is running.'
          : action === 'retry'
            ? 'Retry request accepted. Refreshing queue state…'
            : action === 'release-stale'
              ? 'Release request accepted. Refreshing queue state…'
              : 'Source-check request accepted. Refreshing operational state…',
      );
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Operation failed');
    }
  }

  return <span className="inline-flex flex-col items-start gap-1"><button type="button" onClick={run} disabled={state === 'working'} className={`min-h-9 rounded-md border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 ${tone === 'primary' ? 'border-primary bg-primary text-white hover:bg-primary-hover' : 'border-border bg-card text-foreground hover:bg-muted'}`}>{state === 'working' ? 'Working…' : label}</button>{message && <span role="status" className={`max-w-[240px] text-[11px] leading-4 ${state === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</span>}</span>;
}

export function AdminConfirmationAction({
  label,
  title,
  description,
  confirmLabel,
  evidence = [],
  disabled = false,
  working = false,
  workingLabel = 'Working…',
  destructive = false,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  evidence?: Array<{ label: string; value: string }>;
  disabled?: boolean;
  working?: boolean;
  workingLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button type="button" variant="outline" size="sm" disabled={disabled || working} />}
      >
        {working ? workingLabel : label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {evidence.length > 0 && (
          <dl className="grid gap-2 border border-border bg-muted/30 p-3 text-xs">
            {evidence.map((item) => (
              <div key={item.label} className="grid gap-0.5">
                <dt className="font-medium text-muted-foreground">{item.label}</dt>
                <dd className="break-words text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={working}
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
