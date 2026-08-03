'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Check, Circle, Plus, RefreshCw, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Item = { id: string; label: string; state: 'missing' | 'ready' | 'complete' | 'not-applicable'; source: string; note?: string };
type View = { items: Item[]; progress: { total: number; complete: number; ready: number; notApplicable: number; percent: number }; requirementsConfirmed: boolean };
const countsAsReady = (state: Item['state']): boolean => state === 'complete' || state === 'ready' || state === 'not-applicable';

export function PrepareChecklist({ opportunityId, enabled }: { opportunityId: string; enabled: boolean }) {
  const [view, setView] = useState<View | null>(null);
  const [pending, startTransition] = useTransition();
  const load = useCallback(() => fetch(`/api/me/opportunities/${opportunityId}/checklist`, { cache: 'no-store' }).then((res) => res.ok ? res.json() as Promise<View> : null).then(setView), [opportunityId]);
  useEffect(() => { if (enabled) void load(); }, [enabled, load]);
  if (!enabled || !view) return null;
  const toggle = (item: Item) => startTransition(async () => {
    // Widen the ternary before calculating progress: TypeScript otherwise
    // narrows `next` to only `missing | complete` and rejects the other
    // checklist states used by the readiness denominator.
    const next: Item['state'] = item.state === 'complete' ? 'missing' : 'complete';
    const res = await fetch(`/api/me/checklist-items/${item.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state: next }) });
    if (!res.ok) { toast.error('Could not update that requirement'); return; }
    setView((current) => current ? { ...current, items: current.items.map((row) => row.id === item.id ? { ...row, state: next } : row), progress: { ...current.progress, complete: current.items.filter((row) => row.id === item.id ? next === 'complete' : row.state === 'complete').length, percent: Math.round((current.items.filter((row) => row.id === item.id ? next === 'complete' : countsAsReady(row.state)).length / current.items.length) * 100) } } : current);
    toast.success(next === 'complete' ? 'Requirement marked complete' : 'Requirement reopened');
  });
  const add = () => { const label = window.prompt('What else do you need?')?.trim(); if (!label) return; startTransition(async () => { const res = await fetch(`/api/me/opportunities/${opportunityId}/checklist/items`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label }) }); if (!res.ok) { toast.error('Could not add requirement'); return; } await load(); }); };
  const refresh = () => startTransition(async () => { const res = await fetch(`/api/me/opportunities/${opportunityId}/checklist/refresh`, { method: 'POST' }); if (!res.ok) { toast.error('Could not refresh requirements'); return; } await load(); toast.success('Requirements reviewed'); });
  return <Card aria-live="polite"><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>Prepare to submit</CardTitle><p className="mt-1 text-sm text-muted-foreground">{view.requirementsConfirmed ? `${view.progress.complete + view.progress.ready + view.progress.notApplicable} of ${view.progress.total} ready` : 'Requirements are not confirmed yet.'}</p></div><Button variant="ghost" size="sm" disabled={pending} onClick={refresh}><RefreshCw className="mr-2 size-4" />Review changes</Button></CardHeader><CardContent className="space-y-2"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${view.progress.percent}%` }} /></div>{view.items.map((item) => <div key={item.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 py-2"><button type="button" aria-label={`${item.state === 'complete' ? 'Reopen' : 'Complete'} ${item.label}`} aria-pressed={item.state === 'complete'} disabled={pending} onClick={() => toggle(item)} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-primary outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">{item.state === 'complete' ? <Check className="size-4" /> : item.state === 'not-applicable' ? <span className="text-xs">—</span> : <Circle className="size-4 text-muted-foreground" />}</button><span className={item.state === 'complete' ? 'text-sm line-through text-muted-foreground' : 'text-sm'}>{item.label}</span>{item.source === 'user-added' && <span className="ml-auto text-xs text-muted-foreground">Added by you</span>}</div>)}<div className="flex flex-wrap gap-2 pt-2"><Button variant="outline" size="sm" onClick={add} disabled={pending}><Plus className="mr-2 size-4" />Add requirement</Button><Button variant="ghost" size="sm" disabled><Link2 className="mr-2 size-4" />Attach from Library</Button></div></CardContent></Card>;
}
