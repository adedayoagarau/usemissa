'use client';

import { useState } from 'react';

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
      setMessage(payload.status === 'skipped' ? 'Another tick is running.' : 'Done. Refreshing…');
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Operation failed');
    }
  }

  return <span className="inline-flex flex-col items-start gap-1"><button type="button" onClick={run} disabled={state === 'working'} className={`min-h-9 rounded-md border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 ${tone === 'primary' ? 'border-primary bg-primary text-white hover:bg-primary-hover' : 'border-border bg-white text-foreground hover:bg-muted'}`}>{state === 'working' ? 'Working…' : label}</button>{message && <span role="status" className={`max-w-[240px] text-[11px] leading-4 ${state === 'error' ? 'text-red-700' : 'text-muted-foreground'}`}>{message}</span>}</span>;
}
