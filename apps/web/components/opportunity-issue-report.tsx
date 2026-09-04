'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const REASONS = [
  ['incorrect-details', 'Details are incorrect'],
  ['closed-or-expired', 'Closed or expired'],
  ['unsafe-or-suspicious', 'Unsafe or suspicious'],
  ['other', 'Other'],
] as const;

export function OpportunityIssueReport({ opportunityId }: { opportunityId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number][0]>('incorrect-details');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setError('');
    try {
      const response = await fetch(`/api/me/opportunities/${encodeURIComponent(opportunityId)}/report`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ opportunityId, reason, note: note.trim() || undefined, idempotencyKey: crypto.randomUUID() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'We could not save that report.');
      setState('sent');
      setNote('');
    } catch (cause) {
      setState('error');
      setError(cause instanceof Error ? cause.message : 'We could not save that report.');
    }
  }

  if (state === 'sent') return <div className="border-t border-border pt-4"><p className="text-sm font-medium text-foreground">Thanks for flagging this.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Your report is in Missa’s support queue for review.</p></div>;
  return <div className="border-t border-border pt-4">
    <button type="button" onClick={() => setOpen((value) => !value)} className="text-left text-sm text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{open ? 'Close issue report' : 'Report incorrect information'}</button>
    {open && <form onSubmit={submit} className="mt-4 space-y-3"><div><label htmlFor="issue-report-reason" className="text-xs font-medium text-foreground">What is wrong?</label><select id="issue-report-reason" value={reason} onChange={(event) => setReason(event.target.value as typeof reason)} className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">{REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label htmlFor="issue-report-note" className="text-xs font-medium text-foreground">Optional note</label><textarea id="issue-report-note" value={note} onChange={(event) => setNote(event.target.value.slice(0, 1000))} rows={3} placeholder="Tell us what you noticed" className="mt-1 w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" /></div>{state === 'error' && <p role="alert" className="text-xs text-red-700">{error}</p>}<Button type="submit" disabled={state === 'sending'} className="w-full">{state === 'sending' ? 'Saving report…' : 'Send report'}</Button></form>}
  </div>;
}
