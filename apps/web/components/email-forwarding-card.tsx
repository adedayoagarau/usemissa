'use client';

import { useEffect, useState } from 'react';
import { Copy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ForwardingView = { configured: boolean; address?: string; addressId?: string; status?: 'active' | 'paused' | 'revoked'; createdAt?: string; acceptedCount?: number; retentionDays: number };
export function EmailForwardingCard() {
  const [view, setView] = useState<ForwardingView>(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string>(); const [error, setError] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/me/email-forwarding', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<ForwardingView> : undefined)
      .then((data) => { if (data) setView(data); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  async function mutate(path: string, init?: RequestInit) { setBusy(true); setMessage(undefined); setError(undefined); try { const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, ...init }); const body = await response.json().catch(() => ({})); if (!response.ok) { setError(body.error ?? 'We could not update Email Sync.'); return; } setView(body.view ?? body); setMessage('Email Sync updated'); } catch { setError('We could not update Email Sync. Check your connection and try again.'); } finally { setBusy(false); } }
  async function create() { setBusy(true); setError(undefined); try { const response = await fetch('/api/me/email-forwarding', { method: 'POST' }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setView(body.view); setMessage('Forwarding address ready'); } catch (e) { setError(e instanceof Error ? e.message : 'We could not create a forwarding address.'); } finally { setBusy(false); } }
  async function copy() { if (!view?.address) return; await navigator.clipboard?.writeText(view.address); setMessage('Address copied'); }
  async function remove() { if (!window.confirm('Delete this forwarding address? Pending email updates can also be deleted.')) return; await mutate('/api/me/email-forwarding', { method: 'DELETE', body: JSON.stringify({ confirmation: true, deletePendingCandidates: true }) }); setView({ configured: false, retentionDays: 30 }); }
  return <Card id="email-sync"><CardHeader><CardTitle>Email Sync</CardTitle><p className="text-sm text-muted-foreground">Forward submission emails to Missa for review. Nothing changes in your Tracker until you confirm it.</p></CardHeader><CardContent className="space-y-4">
    {!view ? <p className="text-sm text-muted-foreground">Loading Email Sync…</p> : !view.configured ? <><p className="text-sm text-muted-foreground">Mode: Forwarding address. Missa scans only forwarded messages and keeps a short excerpt for {view.retentionDays} days.</p><Button className="min-h-11" disabled={busy} onClick={create}>Create forwarding address</Button></> : <>
      <div className="rounded-lg border border-border bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Forwarding address · {view.status === 'paused' ? 'Paused' : 'Active'}</p><p className="mt-2 break-all font-mono text-sm text-foreground">{view.address}</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" onClick={copy}><Copy className="mr-2 size-4" aria-hidden="true" />Copy address</Button><Button variant="outline" className="min-h-11" disabled={busy} onClick={() => { if (window.confirm('Rotate this address? The old address stops working immediately.')) void mutate('/api/me/email-forwarding/rotate', { body: JSON.stringify({ confirmation: true }) }); }}><RotateCcw className="mr-2 size-4" aria-hidden="true" />Rotate</Button><Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void mutate(view.status === 'paused' ? '/api/me/email-forwarding/resume' : '/api/me/email-forwarding/pause')}>{view.status === 'paused' ? 'Resume forwarding' : 'Pause forwarding'}</Button><Button variant="ghost" className="min-h-11 text-muted-foreground" disabled={busy} onClick={() => void remove()}>Delete forwarding address</Button></div></div>
      <ul className="space-y-1 text-sm text-muted-foreground"><li>We store a sanitized excerpt and message metadata for {view.retentionDays} days.</li><li>Attachments are not imported, opened, or sent to an AI system.</li><li>Organizations never see your forwarded email history.</li></ul>
    </>}
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}{message && <p role="status" aria-live="polite" className="text-sm text-green">{message}</p>}
  </CardContent></Card>;
}
