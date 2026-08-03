'use client';

import { useEffect, useState, useTransition } from 'react';
import { Bookmark, BookmarkPlus, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';

type List = { id: string; name: string };
type Membership = { listId: string; opportunityId: string };

export function ListPicker({ opportunityId, enabled, compact = false }: { opportunityId: string; enabled: boolean; compact?: boolean }) {
  const [lists, setLists] = useState<List[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [pending, startTransition] = useTransition();
  useEffect(() => { if (enabled) void fetch('/api/me/lists', { cache: 'no-store' }).then((res) => res.ok ? res.json() : null).then((data) => { if (data) { setLists(data.lists); setMemberships(data.memberships); } }); }, [enabled]);
  if (!enabled) return null;
  const has = (listId: string) => memberships.some((membership) => membership.listId === listId && membership.opportunityId === opportunityId);
  const toggle = (list: List) => startTransition(async () => { const method = has(list.id) ? 'DELETE' : 'POST'; const res = await fetch(`/api/me/lists/${list.id}/opportunities/${opportunityId}`, { method }); if (!res.ok) { const data = await res.json().catch(() => ({})); toast.error(data.error ?? 'Could not update List'); return; } setMemberships((current) => has(list.id) ? current.filter((membership) => !(membership.listId === list.id && membership.opportunityId === opportunityId)) : [...current, { listId: list.id, opportunityId }]); toast.success(has(list.id) ? `Removed from ${list.name}` : `Added to ${list.name}`); });
  const create = () => { const name = window.prompt('Name this List'); if (!name?.trim()) return; startTransition(async () => { const res = await fetch('/api/me/lists', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }); const list = await res.json().catch(() => null); if (!res.ok || !list?.id) { toast.error(list?.error ?? 'Could not create List'); return; } setLists((current) => [list, ...current]); }); };
  return <Popover><PopoverTrigger render={<Button variant="outline" size={compact ? 'icon-sm' : 'default'} className={compact ? undefined : 'w-full justify-between'} aria-label={compact ? 'Organize opportunity in a List' : undefined} title={compact ? 'Organize in a List' : undefined} disabled={pending} />}>{compact ? <Bookmark className="size-3.5" aria-hidden="true" /> : <><span className="inline-flex items-center gap-2"><BookmarkPlus className="size-4" />Add to List</span><span className="text-xs text-muted-foreground">{memberships.filter((membership) => membership.opportunityId === opportunityId).length || ''}</span></>}</PopoverTrigger><PopoverContent align="end"><PopoverHeader><PopoverTitle>Organize this opportunity</PopoverTitle></PopoverHeader><div className="space-y-1">{lists.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">Create a List for a season, project, or priority.</p>}{lists.map((list) => <button type="button" key={list.id} onClick={() => toggle(list)} className="flex min-h-11 w-full items-center justify-between rounded-md px-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>{list.name}</span>{has(list.id) && <Check className="size-4 text-primary" />}</button>)}<Button variant="ghost" className="mt-1 w-full justify-start" onClick={create}><Plus className="mr-2 size-4" />Create List</Button></div></PopoverContent></Popover>;
}
