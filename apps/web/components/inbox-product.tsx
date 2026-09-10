'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  CheckCheck,
  CircleCheck,
  FileCheck2,
  Inbox,
  MailCheck,
  SearchCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmailReviewQueue } from '@/components/email-review-queue';
import { NotificationPreferencesPanel } from '@/components/notification-preferences-panel';
import type { CreatorNotificationPreferences } from '@missa/radar-adapters';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ApplicationReminders } from '@/components/missa/application-reminders';

export type InboxProductGroup = 'attention' | 'changes' | 'submissions' | 'discovery';

export type InboxProductItem = {
  id: string;
  kind: string;
  group: InboxProductGroup;
  category: string;
  title: string;
  summary: string;
  reason: string;
  createdAt: string;
  unread: boolean;
  revision?: number;
  reminderId?: string;
  actionHref: string;
  actionLabel: string;
};

type InboxView = 'briefing' | 'email' | 'reminders';

const groups: Array<{ id: InboxProductGroup; title: string; description: string }> = [
  { id: 'attention', title: 'Needs your attention', description: 'Decisions, reminders, and submission actions that deserve a closer look.' },
  { id: 'changes', title: 'Changed in your Tracker', description: 'Material changes to Opportunities you are already considering.' },
  { id: 'submissions', title: 'Submission record', description: 'Receipts and decisions remain attached to your private submission history.' },
  { id: 'discovery', title: 'Saved searches and following', description: 'Quieter discovery from preferences and Organizations you chose to follow.' },
];

function iconFor(item: InboxProductItem) {
  if (item.kind === 'submission-decision') return <CircleCheck aria-hidden="true" />;
  if (item.kind === 'submission-receipt') return <FileCheck2 aria-hidden="true" />;
  if (item.kind === 'deadline-reminder' || item.kind === 'closing-soon') return <CalendarClock aria-hidden="true" />;
  if (item.group === 'changes') return <BellRing aria-hidden="true" />;
  if (item.group === 'discovery') return <SearchCheck aria-hidden="true" />;
  return <Inbox aria-hidden="true" />;
}

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recorded update';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function InboxProduct({ initialItems, initialPreferences, initialView = 'briefing' }: { initialItems: InboxProductItem[]; initialPreferences?: CreatorNotificationPreferences; initialView?: InboxView }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<InboxView>(initialView);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    const revealSettings = () => { if (window.location.hash === '#notification-preferences-title') setSettingsOpen(true); };
    revealSettings(); window.addEventListener('hashchange', revealSettings);
    return () => window.removeEventListener('hashchange', revealSettings);
  }, []);
  useEffect(() => { setItems(initialItems); }, [initialItems]);
  useEffect(() => { setView(initialView); }, [initialView]);
  useEffect(() => { const timer=setInterval(()=>{if(document.visibilityState==='visible')router.refresh();},60000);return()=>clearInterval(timer); },[router]);
  const unreadCount = items.filter((item) => item.unread).length;
  const attentionCount = items.filter((item) => item.group === 'attention').length;

  const grouped = useMemo(
    () => groups.map((group) => ({ ...group, items: items.filter((item) => item.group === group.id) })),
    [items],
  );

  function changeView(next: InboxView) {
    setView(next);
    setStatus('');
    const query = next === 'briefing' ? '' : `?view=${next}`;
    router.replace(`/inbox${query}`, {scroll:false});
  }

  async function markRead(ids?: string[]) {
    const affected = ids ? new Set(ids) : new Set(items.filter((item) => item.unread).map((item) => item.id));
    if (!affected.size) return true;
    const previous = items;
    setItems((current) => current.map((item) => affected.has(item.id) ? { ...item, unread: false } : item));
    setBusy(true);
    try {
      const affectedItems = items.filter((item) => affected.has(item.id));
      const response = await fetch('/api/me/inbox/read', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(affectedItems.every((item) => item.revision) ? { 'Idempotency-Key': crypto.randomUUID() } : {}),
        },
        body: JSON.stringify(ids
          ? { ids, items: affectedItems.map(({ id, revision }) => ({ id, revision })) }
          : { all: true, items: affectedItems.map(({ id, revision }) => ({ id, revision })) }),
      });
      if (!response.ok) throw new Error('read-state-failed');
      setStatus(ids ? 'Update marked as read.' : 'All Inbox updates marked as read.');
      return true;
    } catch {
      setItems(previous);
      setStatus('We could not update the read state. Your Inbox is otherwise unchanged.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function openItem(item: InboxProductItem) {
    if (item.unread) await markRead([item.id]);
    router.push(item.actionHref);
  }

  return <div className="mx-auto max-w-6xl space-y-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-6"><div><h1 className="font-sans text-3xl font-semibold tracking-tight">Inbox</h1><p className="mt-2 text-muted-foreground">Updates from your applications, goals and people you follow.</p></div><Button variant="outline" disabled={!unreadCount || busy} onClick={()=>void markRead()}><CheckCheck/>{unreadCount ? `Mark all read (${unreadCount})` : 'All read'}</Button></header>
    <Tabs value={view} onValueChange={v=>changeView(v as InboxView)} className="gap-6">
      <TabsList variant="line" className="min-h-12 max-w-full gap-3 sm:gap-8"><TabsTrigger value="briefing" className="min-h-11 px-1">Updates<span className="text-xs tabular-nums text-muted-foreground">{unreadCount}</span></TabsTrigger><TabsTrigger value="reminders" className="min-h-11 px-1">Reminders</TabsTrigger><TabsTrigger value="email" className="min-h-11 px-1">Email review</TabsTrigger></TabsList>
      <TabsContent value={view}>
        {view==='email' ? <EmailReviewQueue mode="desk"/> : view==='reminders' ? <ApplicationReminders/> : <div className="space-y-10">
          {!items.length ? <section className="space-y-4 border-y border-border py-12"><Check className="size-8 text-primary"/><h2 className="font-sans text-xl font-semibold">You're all caught up.</h2><p className="text-sm text-muted-foreground">New decisions, opportunity updates and reminders will appear here.</p><Button variant="outline" onClick={()=>changeView('reminders')}>View upcoming reminders<ArrowRight/></Button></section> : grouped.map(group=>group.items.length ? <section key={group.id} aria-labelledby={`inbox-${group.id}`}><h2 id={`inbox-${group.id}`} className="mb-4 font-sans text-lg font-semibold">{group.title}</h2><div className="divide-y divide-border border-y border-border">{group.items.map(item=><article key={item.id} className={`flex items-start gap-4 px-3 py-5 sm:px-5 ${item.unread?'bg-secondary':''}`}>
            <span className="mt-1 shrink-0 text-primary">{iconFor(item)}</span><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{item.category}</span><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time></div><button className="text-start outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring" onClick={()=>void openItem(item)} aria-label={`${item.actionLabel}: ${item.title}`}><span className="block font-sans text-lg font-semibold">{item.title}</span><span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{item.summary}</span></button><div className="mt-3 flex flex-wrap items-center gap-3"><span className="text-xs text-muted-foreground">{item.reason}</span>{item.reminderId ? <Button size="sm" variant="ghost" onClick={()=>{setView('reminders');router.replace(`/inbox?view=reminders&reminder=${encodeURIComponent(item.reminderId!)}`,{scroll:false});}}>Remind me later</Button> : null}{item.unread ? <Button size="sm" variant="ghost" disabled={busy} onClick={()=>void markRead([item.id])}>Mark read</Button> : null}</div></div><Button size="icon" variant="ghost" aria-label={`${item.actionLabel}: ${item.title}`} onClick={()=>void openItem(item)}><ArrowRight/></Button>
          </article>)}</div></section> : null)}
        </div>}
      </TabsContent>
    </Tabs>
    {initialPreferences ? <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="border-t border-border pt-4"><CollapsibleTrigger render={<Button variant="ghost" className="w-full justify-between"/>}>Notification settings<BellRing/></CollapsibleTrigger><CollapsibleContent className="pt-4"><NotificationPreferencesPanel initial={initialPreferences}/></CollapsibleContent></Collapsible> : null}
    <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{status}</p>
  </div>;
}
