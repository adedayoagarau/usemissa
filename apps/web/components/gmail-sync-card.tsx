'use client';

import { useEffect, useState } from 'react';
import { Check, ExternalLink, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type GmailView = { connected: boolean; accountEmailMasked?: string; mode: 'review' | 'autopilot'; status: 'active' | 'syncing' | 'error' | 'revoked' | 'disconnected'; scanWindowDays: 30 | 60 | 90; lastSyncAt?: string; nextSyncAt?: string; lastErrorCode?: string; pendingCandidates: number };
type SyncPayload = { gmail: GmailView };

function key() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not yet'; }

export function GmailSyncCard() {
  const [gmail, setGmail] = useState<GmailView>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [autopilotConfirmed, setAutopilotConfirmed] = useState(false);

  async function load(signal?: AbortSignal) {
    const response = await fetch('/api/me/email-sync', { cache: 'no-store', signal });
    if (!response.ok) throw new Error('We could not load Gmail Sync.');
    const body = await response.json() as SyncPayload;
    setGmail(body.gmail);
  }
  useEffect(() => { const controller = new AbortController(); fetch('/api/me/email-sync', { cache: 'no-store', signal: controller.signal }).then((response) => response.ok ? response.json() as Promise<SyncPayload> : undefined).then((body) => { if (body) setGmail(body.gmail); }).catch(() => undefined); return () => controller.abort(); }, []);

  async function post(path: string, body?: Record<string, unknown>) {
    setBusy(true); setMessage(undefined); setError(undefined);
    try {
      const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'We could not update Gmail Sync.');
      setMessage(data.mode === 'autopilot' ? 'Autopilot enabled' : data.jobId ? 'Gmail Sync queued' : 'Gmail Sync updated');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not update Gmail Sync.'); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    if (!window.confirm('Disconnect Gmail? Missa will stop syncing and remove the stored Gmail credential. Confirmed Tracker history stays.')) return;
    setBusy(true); setMessage(undefined); setError(undefined);
    try {
      const response = await fetch('/api/me/email-sync/gmail', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmation: true, deletePendingCandidates: true, idempotencyKey: key() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'We could not disconnect Gmail.');
      setGmail({ connected: false, mode: 'review', status: 'disconnected', scanWindowDays: 30, pendingCandidates: 0 }); setMessage('Gmail disconnected');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not disconnect Gmail.'); }
    finally { setBusy(false); }
  }
  if (!gmail) return <Card id="gmail-sync"><CardContent className="p-6 text-sm text-muted-foreground">Loading Gmail Sync…</CardContent></Card>;
  return <Card id="gmail-sync" className="bg-white"><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>Gmail Sync</CardTitle><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Missa scans likely submission emails. You review updates before they reach your Tracker.</p></div><ShieldCheck className="size-5 text-green" aria-label="Review-first privacy control" /></div></CardHeader><CardContent className="space-y-5">
    {!gmail.connected ? <div className="space-y-4"><div className="rounded-lg border border-border bg-white p-4"><p className="font-medium text-foreground">Review before import</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Missa reads only the window and labels you choose, stores sanitized excerpts for 30 days, and never shares your mail history with organizations. Attachments and raw messages are not stored.</p></div><a className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/api/me/email-sync/gmail/start">Connect Gmail <ExternalLink className="ml-2 size-4" aria-hidden="true" /></a><p className="text-xs leading-5 text-muted-foreground">Google may describe Gmail read access as sensitive or restricted. You can disconnect at any time.</p></div> : <>
      <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-border bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Connected account</p><p className="mt-2 font-mono text-sm text-foreground">{gmail.accountEmailMasked}</p><p className="mt-1 text-sm text-muted-foreground">{gmail.status === 'error' || gmail.status === 'revoked' ? 'Reconnect required' : gmail.status === 'syncing' ? 'Syncing now' : 'Active'}</p></div><div className="rounded-lg border border-border bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mode</p><p className="mt-2 font-medium text-foreground">{gmail.mode === 'autopilot' ? 'Autopilot' : 'Review before import'}</p><p className="mt-1 text-sm text-muted-foreground">{gmail.pendingCandidates ? `${gmail.pendingCandidates} update${gmail.pendingCandidates === 1 ? '' : 's'} to review` : 'No pending updates'}</p></div></div>
      <div className="space-y-2 text-sm text-muted-foreground"><p>Last sync: <span className="font-mono text-xs text-foreground">{formatDate(gmail.lastSyncAt)}</span></p><p>Scan window: <span className="font-mono text-xs text-foreground">{gmail.scanWindowDays} days</span></p>{gmail.lastErrorCode && <p role="alert" className="text-destructive">Gmail needs attention. Reconnect to resume syncing.</p>}</div>
      <div className="flex flex-wrap gap-2"><Button className="min-h-11" disabled={busy} onClick={() => void post('/api/me/email-sync/gmail/sync')}><RefreshCw className="mr-2 size-4" aria-hidden="true" />Sync now</Button>{gmail.mode === 'review' ? <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => { setAutopilotConfirmed(false); setAutopilotOpen(true); }}>Enable Autopilot</Button> : <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void post('/api/me/email-sync/gmail/mode', { mode: 'review', confirmation: true, idempotencyKey: key() })}>Disable Autopilot</Button>}<Button variant="ghost" className="min-h-11" disabled={busy} onClick={() => void disconnect()}><Unplug className="mr-2 size-4" aria-hidden="true" />Disconnect Gmail</Button></div>
      {gmail.mode === 'autopilot' && <div className="rounded-lg border border-green/30 bg-green/5 p-4 text-sm leading-6 text-foreground"><p className="font-medium">Autopilot is on</p><p className="mt-1 text-muted-foreground"><Check className="mr-1 inline size-4 text-green" aria-hidden="true" />Only exact, high-confidence receipt and in-review updates can move into your Tracker. Everything else stays in Inbox for review.</p></div>}
      <Dialog open={autopilotOpen} onOpenChange={(open) => { setAutopilotOpen(open); if (!open) setAutopilotConfirmed(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Autopilot?</DialogTitle>
            <DialogDescription>Autopilot is narrow and reversible. Missa will still keep uncertain or sensitive messages in Inbox for you to review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-6 text-foreground">
            <p>It can update a tracked opportunity only when the match is exact, confidence is high, and the message says <span className="font-medium">received</span> or <span className="font-medium">in review</span>.</p>
            <p>It never changes accepted, declined, shortlisted, finalist, deadline, fee, work, or organization details automatically. You can turn it off immediately.</p>
            <label className="flex min-h-11 items-start gap-3 rounded-lg border border-border bg-white p-3">
              <Checkbox id="gmail-autopilot-confirm" checked={autopilotConfirmed} onCheckedChange={(checked) => setAutopilotConfirmed(checked === true)} className="mt-1 size-5" />
              <span>I understand what Autopilot can change and that everything else stays in Inbox.</span>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAutopilotOpen(false)}>Cancel</Button>
            <Button type="button" disabled={!autopilotConfirmed || busy} onClick={() => { setAutopilotOpen(false); void post('/api/me/email-sync/gmail/mode', { mode: 'autopilot', confirmation: true, idempotencyKey: key() }); }}>Enable Autopilot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>}
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}{message && <p role="status" aria-live="polite" className="text-sm text-green">{message}</p>}
  </CardContent></Card>;
}
