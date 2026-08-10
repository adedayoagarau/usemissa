'use client';

import { useMemo, useState } from 'react';
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

import styles from './inbox-product.module.css';

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
  actionHref: string;
  actionLabel: string;
};

type InboxView = 'briefing' | 'email';

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

export function InboxProduct({ initialItems, initialView = 'briefing' }: { initialItems: InboxProductItem[]; initialView?: InboxView }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<InboxView>(initialView);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const unreadCount = items.filter((item) => item.unread).length;
  const attentionCount = items.filter((item) => item.group === 'attention').length;

  const grouped = useMemo(
    () => groups.map((group) => ({ ...group, items: items.filter((item) => item.group === group.id) })),
    [items],
  );

  function changeView(next: InboxView) {
    setView(next);
    setStatus('');
    const query = next === 'email' ? '?view=email' : '';
    window.history.replaceState(null, '', `/inbox${query}`);
  }

  async function markRead(ids?: string[]) {
    const affected = ids ? new Set(ids) : new Set(items.filter((item) => item.unread).map((item) => item.id));
    if (!affected.size) return true;
    const previous = items;
    setItems((current) => current.map((item) => affected.has(item.id) ? { ...item, unread: false } : item));
    setBusy(true);
    try {
      const response = await fetch('/api/me/inbox/read', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(ids ? { ids } : { all: true }),
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

  return (
    <div className={styles.shell}>
      <header className={styles.heading}>
        <div>
          <p>Private updates</p>
          <h1>Inbox</h1>
          <span>Decisions, Tracker changes, submission records, and email updates—grouped by what they mean for you.</span>
        </div>
        <Button type="button" variant="outline" disabled={!unreadCount || busy} onClick={() => void markRead()}>
          <CheckCheck aria-hidden="true" />
          {unreadCount ? `Mark all read (${unreadCount})` : 'All read'}
        </Button>
      </header>

      <nav className={styles.views} aria-label="Inbox views">
        <button type="button" aria-current={view === 'briefing' ? 'page' : undefined} onClick={() => changeView('briefing')}>
          Briefing <span>{items.length}</span>
        </button>
        <button type="button" aria-current={view === 'email' ? 'page' : undefined} onClick={() => changeView('email')}>
          Email review <MailCheck aria-hidden="true" />
        </button>
      </nav>

      {view === 'email' ? (
        <EmailReviewQueue mode="desk" />
      ) : (
        <div className={styles.briefing}>
          <section className={styles.briefingIntro} aria-labelledby="briefing-title">
            <div>
              <p>Your Missa briefing</p>
              <h2 id="briefing-title">{attentionCount ? `${attentionCount} ${attentionCount === 1 ? 'update needs' : 'updates need'} your attention` : 'A calm view of what changed'}</h2>
              <span>Everything else stays grouped with the part of Missa where you can act on it.</span>
            </div>
            <EmailReviewQueue mode="summary" onOpenDesk={() => changeView('email')} />
          </section>

          {!items.length ? (
            <section className={styles.empty}>
              <Check aria-hidden="true" />
              <p>Caught up</p>
              <h2>Nothing else needs your attention</h2>
              <span>New decisions, material Opportunity changes, reminders, and submission records will appear here.</span>
            </section>
          ) : (
            grouped.map((group) => group.items.length ? (
              <section className={styles.group} key={group.id} aria-labelledby={`inbox-${group.id}`}>
                <header>
                  <div><h2 id={`inbox-${group.id}`}>{group.title}</h2><p>{group.description}</p></div>
                  <span>{group.items.length}</span>
                </header>
                <div className={styles.rows}>
                  {group.items.map((item) => (
                    <article key={item.id} data-unread={item.unread}>
                      <span className={styles.itemIcon}>{iconFor(item)}</span>
                      <div className={styles.itemCopy}>
                        <div><span>{item.category}</span><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time></div>
                        <h3>{item.title}</h3>
                        <p>{item.summary}</p>
                        <small><strong>Why this is here</strong>{item.reason}</small>
                      </div>
                      <button type="button" onClick={() => void openItem(item)} aria-label={`${item.actionLabel}: ${item.title}`}>
                        <span>{item.actionLabel}</span><ArrowRight aria-hidden="true" />
                      </button>
                      {item.unread ? <span className={styles.unread}>Unread</span> : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null)
          )}
        </div>
      )}

      <p className={styles.liveStatus} role="status" aria-live="polite">{status}</p>
    </div>
  );
}
