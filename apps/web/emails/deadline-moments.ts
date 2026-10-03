import type { CreatorNoticeEmailKind } from '@missa/radar-adapters';
import {
  calendarDate,
  capitalise,
  closingMoment,
  dayMonth,
  daysUntil,
  feeLabel,
  longDate,
  prizeLabel,
  trackerStatusLabel,
  typeLabel,
} from './components/call-facts';
import { deadlineMomentText, renderDeadlineMoment, type DeadlineMomentProps, type MomentFact } from './components/deadline-moment';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';

/** What a deadline-moment email needs to know about one Tracker notice. */
export type DeadlineMomentNotice = {
  kind: CreatorNoticeEmailKind;
  noticedAt: string;
  opportunityId: string;
  title: string;
  organizationName: string;
  deadline: string | null;
  deadlineTime?: string | null;
  deadlineTimezone?: string | null;
  recipientTimezone?: string | null;
  givenName?: string | null;
  trackedStatus?: string | null;
  type?: string | null;
  feeStatus?: string | null;
  feeCents?: number | null;
  feeCurrency?: string | null;
  prize?: string | null;
  previousDeadline?: string | null;
  listedDeadline?: string | null;
  submittedAt?: string | null;
  responseTimeDays?: number | null;
};

export type DeadlineMomentEmailProps = {
  accountId: string;
  email: string;
  notice: DeadlineMomentNotice;
  /** Render time; defaults to now. */
  now?: Date;
};

const url = (path: string) => new URL(path, `${siteUrl()}/`).toString();
const DAY = 86_400_000;

/** "Wed 7 October" for compact fact rows. */
const shortDate = (date: Date, now: Date) => `${longDate(date, now).slice(0, 3)} ${dayMonth(date, now)}`;
const dateOf = (iso: string | null | undefined) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime()) ? calendarDate(date.toISOString().slice(0, 10)) : null;
};
const statusPanelHeading = (status: string | null | undefined, fallback: string) => {
  const label = trackerStatusLabel(status) ?? (status === 'submitted' ? 'submitted' : null);
  return label ? `In your Tracker: ${label}` : fallback;
};
const facts = (rows: Array<[string, string | null | undefined]>): MomentFact[] =>
  rows.flatMap(([label, value]) => (value ? [{ label, value }] : []));
const named = (props: DeadlineMomentEmailProps) => props.notice.givenName?.trim() || null;

function reminder(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const date = calendarDate(n.deadline);
  const days = date ? daysUntil(date, now) : null;
  const name = named(props);
  const moment = closingMoment(n.deadlineTime, n.deadlineTimezone, n.recipientTimezone);
  const when = moment
    ? `${moment.official}.${moment.local ? ` That's ${moment.local}.` : ''}`
    : date
      ? `${longDate(date, now)}.`
      : `${n.deadline ?? 'soon'}.`;
  const opener = `${n.title} from ${n.organizationName} closes on ${when}`;
  const hero: DeadlineMomentProps['hero'] =
    days === null
      ? { kind: 'statement', text: name ? `It closes soon, ${name}.` : 'It closes soon.' }
      : days === 0
        ? { kind: 'statement', text: name ? `It closes today, ${name}.` : 'It closes today.' }
        : { kind: 'count', figure: String(days), words: `${days === 1 ? 'day' : 'days'} left${name ? `, ${name}.` : '.'}` };
  const closes = moment ? moment.official.replace(/ at /, ', ').replace(/ time$/, '') : date ? longDate(date, now) : n.deadline;
  return {
    subject:
      days === 0
        ? `${n.title} closes today`
        : days === 1
          ? `${n.title} closes tomorrow`
          : `${n.title} closes in ${days ?? 'a few'} days`,
    preheader: opener,
    context: 'Reminder you set',
    hero,
    lede: opener,
    panel: {
      tone: 'ochre',
      heading: statusPanelHeading(n.trackedStatus, n.title),
      facts: facts([
        ['Type', typeLabel(n.type)],
        ['Entry fee', feeLabel(n.feeStatus, n.feeCents, n.feeCurrency)?.replace(/ to enter$/, '').replace(/^Entry fee$/, 'Paid')],
        ['Award', prizeLabel(n.prize)],
        ['Closes', closes],
      ]),
    },
    action: { label: 'View Opportunity', url: url(`/opportunities/${encodeURIComponent(n.opportunityId)}`) },
    secondary: { label: 'Update your Tracker', url: url(`/tracker?view=saved&application=${encodeURIComponent(n.opportunityId)}`) },
    note: 'Check the guidelines on the official page before you send. Word limits, formats and fees can change after a call opens.',
    footer: {
      reason: 'You get this because you set a reminder for this call.',
      preferencesUrl: url('/inbox'),
      preferencesLabel: 'Change reminders',
    },
  };
}

function deadlineChanged(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const next = calendarDate(n.deadline);
  const previous = calendarDate(n.previousDeadline);
  const noticed = dateOf(n.noticedAt);
  const nextText = next ? shortDate(next, now) : (n.deadline ?? 'Not confirmed');
  const lede = `${n.organizationName} changed the deadline for ${n.title} on its official page. Your reminders and Calendar now follow the new date.`;
  return {
    subject: `New deadline for ${n.title}: ${next ? longDate(next, now) : nextText}`,
    preheader: lede,
    context: 'Deadline update',
    hero: { kind: 'statement', text: 'The deadline moved.' },
    lede,
    panel: {
      tone: 'ochre',
      heading: n.title,
      change: previous ? { was: shortDate(previous, now), now: nextText } : undefined,
      facts: facts([
        ['New deadline', previous ? null : nextText],
        ['Changed on the official page', noticed ? dayMonth(noticed, now) : null],
        ['Your reminders', 'Moved to the new date'],
        ['In your Tracker', capitalise(trackerStatusLabel(n.trackedStatus) ?? '') || null],
      ]),
    },
    action: { label: 'View Opportunity', url: url(`/opportunities/${encodeURIComponent(n.opportunityId)}`) },
    secondary: { label: 'Open your Tracker', url: url(`/tracker?view=saved&application=${encodeURIComponent(n.opportunityId)}`) },
    note: 'Missa checks the official page for changes and tells you when a date moves. Nothing else about your Tracker has changed.',
    footer: {
      reason: `You get this because ${n.title} is in your Tracker.`,
      preferencesUrl: url('/inbox'),
      preferencesLabel: 'Change reminders',
    },
  };
}

function callClosed(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const listed = calendarDate(n.listedDeadline ?? n.deadline);
  const noticed = dateOf(n.noticedAt);
  const closedOn = noticed ? dayMonth(noticed, now) : null;
  const lede = `${n.organizationName} stopped taking applications for ${n.title}${
    listed ? ` before the ${dayMonth(listed, now)} deadline it listed` : ' before its deadline'
  }. It stays in your Tracker until you decide.`;
  return {
    subject: `${n.title} closed early`,
    preheader: lede,
    context: 'Deadline update',
    hero: { kind: 'statement', text: 'This call closed early.' },
    lede,
    panel: {
      tone: 'mineral',
      heading: statusPanelHeading(n.trackedStatus, n.title),
      facts: facts([
        ['Listed deadline', listed ? dayMonth(listed, now) : null],
        ['Seen closed on the official page', closedOn],
      ]),
    },
    action: { label: 'Open your Tracker', url: url(`/tracker?view=saved&application=${encodeURIComponent(n.opportunityId)}`) },
    secondary: { label: 'View Opportunity', url: url(`/opportunities/${encodeURIComponent(n.opportunityId)}`) },
    note: `You can keep this call in your Tracker for next year or remove it. Following ${n.organizationName} tells you when its next call opens.`,
    footer: {
      reason: `You get this because ${n.title} is in your Tracker.`,
      preferencesUrl: url('/inbox'),
      preferencesLabel: 'Change reminders',
    },
  };
}

function responseOverdue(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const name = named(props);
  const submitted = dateOf(n.submittedAt);
  const since = n.submittedAt ? Math.max(0, Math.floor((now.getTime() - Date.parse(n.submittedAt)) / DAY)) : null;
  const replies = n.responseTimeDays ? ` ${n.organizationName} says it replies within ${n.responseTimeDays} days.` : '';
  const lede = submitted
    ? `You sent your work to ${n.organizationName} for ${n.title} on ${dayMonth(submitted, now)}.${replies}`
    : `You are waiting to hear from ${n.organizationName} about ${n.title}.${replies}`;
  return {
    subject: since !== null ? `${since} days since you submitted to ${n.organizationName}` : `Still waiting on ${n.organizationName}?`,
    preheader: lede,
    context: 'Tracker check-in',
    hero:
      since !== null && since > 0
        ? { kind: 'count', figure: String(since), words: `${since === 1 ? 'day' : 'days'} since you submitted${name ? `, ${name}.` : '.'}` }
        : { kind: 'statement', text: name ? `Still waiting, ${name}?` : 'Still waiting to hear back?' },
    lede,
    panel: {
      tone: 'ochre',
      heading: 'In your Tracker: submitted',
      facts: facts([
        ['Submitted', submitted ? dayMonth(submitted, now) : null],
        ['Stated reply time', n.responseTimeDays ? `${n.responseTimeDays} days` : null],
        ['Response logged', 'Not yet'],
      ]),
    },
    action: { label: 'Log a response', url: url(`/tracker?view=awaiting&application=${encodeURIComponent(n.opportunityId)}`) },
    secondary: { label: 'View Opportunity', url: url(`/opportunities/${encodeURIComponent(n.opportunityId)}`) },
    note: 'A short, polite follow-up after the stated reply time is normal. You write and send it yourself; Missa never contacts an organisation for you.',
    footer: {
      reason: 'You get this because you set a response check-in for this call.',
      preferencesUrl: url('/inbox'),
      preferencesLabel: 'Change reminders',
    },
  };
}

const BUILDERS: Record<CreatorNoticeEmailKind, (props: DeadlineMomentEmailProps, now: Date) => DeadlineMomentProps> = {
  'deadline-reminder': reminder,
  'deadline-changed': deadlineChanged,
  'call-closed': callClosed,
  'response-overdue': responseOverdue,
};

/** Template version recorded in the mail ledger for each notice kind. */
export const DEADLINE_MOMENT_TEMPLATE_VERSION = 'deadline-moment.v1';

/**
 * One Tracker notice as a deadline-moment letter: a reminder, a moved
 * deadline, an early closure or a response check-in.
 */
export function renderDeadlineMomentEmail(props: DeadlineMomentEmailProps): { subject: string; html: string; text: string } {
  const now = props.now ?? new Date();
  const letter = BUILDERS[props.notice.kind](props, now);
  letter.footer.unsubscribeUrl = buildUnsubscribeUrl({ accountId: props.accountId, email: props.email, category: 'deadline_reminder' });
  return { subject: letter.subject, html: renderDeadlineMoment(letter), text: deadlineMomentText(letter) };
}
