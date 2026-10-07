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
import { buildUnsubscribeUrl, type EmailCategory } from '../lib/email-tokens';
import { noticeChange, readableNoticeText } from '../lib/notice-change';
import { siteUrl } from '../lib/siteUrl';
import { sp, type Spelling } from '../lib/spelling';

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
  /** The Inbox notice's own headline and body; change notices carry their was/now values here. */
  noticeTitle?: string | null;
  noticeBody?: string | null;
  /** Where the Inbox notice points. */
  actionHref?: string | null;
};

export type DeadlineMomentEmailProps = {
  accountId: string;
  email: string;
  notice: DeadlineMomentNotice;
  /** Render time; defaults to now. */
  now?: Date;
  /** UK readers get UK spelling (lib/spelling.ts). */
  spelling?: Spelling;
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
    action: { label: 'View opportunity', url: url(`/opportunities/${encodeURIComponent(n.opportunityId)}`) },
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
    action: { label: 'View opportunity', url: url(`/opportunities/${encodeURIComponent(n.opportunityId)}`) },
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
    secondary: { label: 'View opportunity', url: url(`/opportunities/${encodeURIComponent(n.opportunityId)}`) },
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
    secondary: { label: 'View opportunity', url: url(`/opportunities/${encodeURIComponent(n.opportunityId)}`) },
    note: sp('A short, polite follow-up after the stated reply time is normal. You write and send it yourself; Missa never contacts an organization for you.', props.spelling),
    footer: {
      reason: 'You get this because you set a response check-in for this call.',
      preferencesUrl: url('/inbox'),
      preferencesLabel: 'Change reminders',
    },
  };
}

const opportunityLink = (n: DeadlineMomentNotice) => url(`/opportunities/${encodeURIComponent(n.opportunityId)}`);
const trackerLink = (n: DeadlineMomentNotice, view = 'saved') =>
  url(`/tracker?view=${view}&application=${encodeURIComponent(n.opportunityId)}`);
/** The notice's own link when it stays on Missa, otherwise the fallback. */
const noticeLink = (n: DeadlineMomentNotice, fallback: string) =>
  n.actionHref && n.actionHref.startsWith('/') && !n.actionHref.startsWith('//') ? url(n.actionHref) : fallback;
const noticeText = (n: DeadlineMomentNotice, now: Date, fallback: string) =>
  n.noticeBody?.trim() ? readableNoticeText(n.noticeBody.trim(), now) : fallback;
const noticeSubject = (n: DeadlineMomentNotice, now: Date, fallback: string) =>
  n.noticeTitle?.trim() ? readableNoticeText(n.noticeTitle.trim(), now) : fallback;
const feeFact = (n: DeadlineMomentNotice) =>
  feeLabel(n.feeStatus, n.feeCents, n.feeCurrency)?.replace(/ to enter$/, '').replace(/^Entry fee$/, 'Paid');
const closesFact = (n: DeadlineMomentNotice, now: Date) => {
  const moment = closingMoment(n.deadlineTime, n.deadlineTimezone, n.recipientTimezone);
  const date = calendarDate(n.deadline);
  return moment ? moment.official.replace(/ at /, ', ').replace(/ time$/, '') : date ? longDate(date, now) : n.deadline;
};
const preferencesUrl = () => url('/inbox#notification-preferences-title');
const reminderFooter = (reason: string): DeadlineMomentProps['footer'] => ({
  reason,
  preferencesUrl: preferencesUrl(),
  preferencesLabel: 'Change reminders',
});
const openingFooter = (spelling?: Spelling): DeadlineMomentProps['footer'] => ({
  reason: sp('You get this because you saved this call or follow its organization.', spelling),
  preferencesUrl: preferencesUrl(),
  preferencesLabel: 'Change opening alerts',
});
const trackedReason = (n: DeadlineMomentNotice) => `You get this because ${n.title} is in your Tracker.`;

function deadlineDay(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const name = named(props);
  const moment = closingMoment(n.deadlineTime, n.deadlineTimezone, n.recipientTimezone);
  const lede = noticeText(
    n,
    now,
    moment
      ? `${n.title} from ${n.organizationName} closes on ${moment.official}.${moment.local ? ` That's ${moment.local}.` : ''}`
      : `${n.title} from ${n.organizationName} closes today.`,
  );
  return {
    subject: noticeSubject(n, now, `${n.title} closes today`),
    preheader: lede,
    context: 'Deadline day',
    hero: { kind: 'statement', text: name ? `It closes today, ${name}.` : 'It closes today.' },
    lede,
    panel: {
      tone: 'ochre',
      heading: statusPanelHeading(n.trackedStatus, n.title),
      facts: facts([
        ['Closes', closesFact(n, now)],
        ['Entry fee', feeFact(n)],
      ]),
    },
    action: { label: 'Open your Tracker', url: noticeLink(n, trackerLink(n)) },
    secondary: { label: 'View opportunity', url: opportunityLink(n) },
    note: 'If you have already sent it, mark it submitted in your Tracker and Missa stops reminding you.',
    footer: reminderFooter('You get this because the deadline-day reminder is on for calls in your Tracker.'),
  };
}

function tierEnding(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const lede = noticeText(n, now, `A lower entry fee for ${n.title} ends soon. The final deadline stays the same.`);
  return {
    subject: noticeSubject(n, now, `The lower entry fee for ${n.title} ends soon`),
    preheader: lede,
    context: 'Entry fee',
    hero: { kind: 'statement', text: 'A lower fee ends soon.' },
    lede,
    panel: {
      tone: 'ochre',
      heading: statusPanelHeading(n.trackedStatus, n.title),
      change: noticeChange(n.noticeBody, now) ?? undefined,
      facts: facts([['Final deadline', closesFact(n, now)]]),
    },
    action: { label: 'Open your Tracker', url: noticeLink(n, trackerLink(n)) },
    secondary: { label: 'View opportunity', url: opportunityLink(n) },
    note: sp('Fees come from the official page. Check it before you pay; organizations sometimes change them.', props.spelling),
    footer: reminderFooter(trackedReason(n)),
  };
}

function milestoneDue(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const lede = noticeText(n, now, `A step in your plan for ${n.title} is due.`);
  return {
    subject: noticeSubject(n, now, `A step for ${n.title} is due`),
    preheader: lede,
    context: 'Your plan',
    hero: { kind: 'statement', text: 'A step in your plan is due.' },
    lede,
    panel: {
      tone: 'ochre',
      heading: statusPanelHeading(n.trackedStatus, n.title),
      facts: facts([['Application deadline', closesFact(n, now)]]),
    },
    action: { label: 'Open your plan', url: noticeLink(n, trackerLink(n)) },
    secondary: { label: 'View opportunity', url: opportunityLink(n) },
    note: 'You can mark a step done, move it or skip it in your Tracker. The dates are yours to change.',
    footer: reminderFooter(trackedReason(n)),
  };
}

function goneQuiet(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const name = named(props);
  const lede = noticeText(n, now, `Nothing has changed on ${n.title} in your Tracker for a while.`);
  return {
    subject: noticeSubject(n, now, `Still working on ${n.title}?`),
    preheader: lede,
    context: 'Tracker check-in',
    hero: { kind: 'statement', text: name ? `Still working on this, ${name}?` : 'Still working on this?' },
    lede,
    panel: {
      tone: 'mineral',
      heading: statusPanelHeading(n.trackedStatus, n.title),
      facts: facts([['Application deadline', closesFact(n, now)]]),
    },
    action: { label: 'Open your Tracker', url: noticeLink(n, trackerLink(n)) },
    secondary: { label: 'View opportunity', url: opportunityLink(n) },
    note: 'If your plans changed, you can move it to later or remove it. Either way, Missa stops asking.',
    footer: reminderFooter('You get this because a call in your Tracker has been quiet for the period you chose.'),
  };
}

function timeToQuery(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const submitted = dateOf(n.submittedAt);
  const lede = noticeText(
    n,
    now,
    submitted
      ? `You sent your work to ${n.organizationName} for ${n.title} on ${dayMonth(submitted, now)}. It may be time for a short, polite note.`
      : `It may be time to check in with ${n.organizationName} about ${n.title}.`,
  );
  return {
    subject: noticeSubject(n, now, `Time to check in with ${n.organizationName}?`),
    preheader: lede,
    context: 'Tracker check-in',
    hero: { kind: 'statement', text: 'It may be time to check in.' },
    lede,
    panel: {
      tone: 'mineral',
      heading: 'In your Tracker: submitted',
      facts: facts([
        ['Submitted', submitted ? dayMonth(submitted, now) : null],
        ['Response logged', 'Not yet'],
      ]),
    },
    action: { label: 'Log a response', url: noticeLink(n, trackerLink(n, 'awaiting')) },
    secondary: { label: 'View opportunity', url: opportunityLink(n) },
    note: sp('You write and send any follow-up yourself; Missa never contacts an organization for you.', props.spelling),
    footer: reminderFooter('You get this because this submission is still waiting for a response.'),
  };
}

function opensSoon(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const lede = noticeText(n, now, `${n.title} from ${n.organizationName} may open soon.`);
  return {
    subject: noticeSubject(n, now, `${n.title} may open soon`),
    preheader: lede,
    context: 'Opening soon',
    hero: { kind: 'statement', text: 'It opens soon.' },
    lede,
    panel: {
      tone: 'mineral',
      heading: n.title,
      facts: facts([
        ['Type', typeLabel(n.type)],
        ['Award', prizeLabel(n.prize)],
      ]),
    },
    action: { label: 'View opportunity', url: noticeLink(n, opportunityLink(n)) },
    note: sp('Predicted dates come from past cycles. Missa tells you again when the organization confirms them.', props.spelling),
    footer: openingFooter(props.spelling),
  };
}

function forecastChanged(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const lede = noticeText(n, now, `${n.organizationName} confirmed new dates for ${n.title}.`);
  return {
    subject: noticeSubject(n, now, `${n.title} has confirmed dates`),
    preheader: lede,
    context: 'Dates confirmed',
    hero: { kind: 'statement', text: 'The dates are confirmed.' },
    lede,
    panel: {
      tone: 'mineral',
      heading: n.title,
      change: noticeChange(n.noticeBody, now) ?? undefined,
      facts: facts([['Deadline', calendarDate(n.deadline) ? closesFact(n, now) : null]]),
    },
    action: { label: 'View opportunity', url: noticeLink(n, opportunityLink(n)) },
    note: 'Your Tracker and Calendar use the confirmed dates from now on.',
    footer: openingFooter(props.spelling),
  };
}

function obligationsSuggested(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const name = named(props);
  const lede = noticeText(n, now, `Congratulations on ${n.title}. Add the usual next steps with dates you can change.`);
  return {
    subject: noticeSubject(n, now, `Plan what comes next: ${n.title}`),
    preheader: lede,
    context: 'Your plan',
    hero: { kind: 'statement', text: name ? `Congratulations, ${name}.` : 'Congratulations.' },
    lede,
    panel: {
      tone: 'mineral',
      heading: statusPanelHeading(n.trackedStatus, n.title),
      facts: facts([['From', n.organizationName]]),
    },
    action: { label: 'Add the next steps', url: noticeLink(n, trackerLink(n)) },
    note: 'Nothing is added until you choose. Check dates against your agreement or acceptance letter.',
    footer: reminderFooter(trackedReason(n)),
  };
}

function obligationsMoved(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const lede = noticeText(n, now, `The deadline for ${n.title} moved, so the steps in your plan moved with it.`);
  return {
    subject: noticeSubject(n, now, `Your plan moved with the date: ${n.title}`),
    preheader: lede,
    context: 'Your plan',
    hero: { kind: 'statement', text: 'Your plan moved with the date.' },
    lede,
    panel: {
      tone: 'ochre',
      heading: statusPanelHeading(n.trackedStatus, n.title),
      change: noticeChange(n.noticeBody, now) ?? undefined,
      facts: facts([['Application deadline', closesFact(n, now)]]),
    },
    action: { label: 'Review your plan', url: noticeLink(n, trackerLink(n)) },
    secondary: { label: 'View opportunity', url: opportunityLink(n) },
    note: 'Steps you fixed to a date stayed where they were. You can move any step yourself.',
    footer: reminderFooter(trackedReason(n)),
  };
}

function cycleCarrySuggested(props: DeadlineMomentEmailProps, now: Date): DeadlineMomentProps {
  const n = props.notice;
  const lede = noticeText(n, now, `You can carry your checklist and plan for ${n.title} forward to the next cycle.`);
  return {
    subject: noticeSubject(n, now, `Carry ${n.title} to the next cycle`),
    preheader: lede,
    context: 'Next cycle',
    hero: { kind: 'statement', text: 'There is a next cycle.' },
    lede,
    panel: {
      tone: 'mineral',
      heading: statusPanelHeading(n.trackedStatus, n.title),
      facts: facts([
        ['From', n.organizationName],
        ['Type', typeLabel(n.type)],
      ]),
    },
    action: { label: 'Open your Tracker', url: noticeLink(n, trackerLink(n)) },
    secondary: { label: 'View opportunity', url: opportunityLink(n) },
    note: 'Carrying forward copies your notes and checklist to a new record. The original stays as it was.',
    footer: reminderFooter(trackedReason(n)),
  };
}

const BUILDERS: Record<CreatorNoticeEmailKind, (props: DeadlineMomentEmailProps, now: Date) => DeadlineMomentProps> = {
  'deadline-reminder': reminder,
  'deadline-changed': deadlineChanged,
  'call-closed': callClosed,
  'response-overdue': responseOverdue,
  'deadline-day': deadlineDay,
  'tier-ending': tierEnding,
  'milestone-due': milestoneDue,
  'gone-quiet': goneQuiet,
  'time-to-query': timeToQuery,
  'opens-soon': opensSoon,
  'forecast-changed': forecastChanged,
  'obligations-suggested': obligationsSuggested,
  'obligations-moved': obligationsMoved,
  'cycle-carry-suggested': cycleCarrySuggested,
};

/** Template version recorded in the mail ledger for each notice kind. */
export const DEADLINE_MOMENT_TEMPLATE_VERSION = 'deadline-moment.v1';

/**
 * The one-click unsubscribe category for a notice kind. Opening alerts follow
 * the "Organizations you follow" setting, which has no category of its own,
 * so their link turns off notification email rather than promising to stop
 * reminders and leaving the alert running.
 */
export function noticeUnsubscribeCategory(kind: CreatorNoticeEmailKind): EmailCategory {
  return kind === 'opens-soon' || kind === 'forecast-changed' ? 'notification_digest' : 'deadline_reminder';
}

/**
 * One Tracker notice as a deadline-moment letter: a reminder, a moved
 * deadline, an early closure, a response check-in, the deadline-day alarm, a
 * fee tier ending, a plan step or plan change, a gone-quiet nudge, an opening
 * alert or a suggestion to carry a call to its next cycle.
 */
export function renderDeadlineMomentEmail(props: DeadlineMomentEmailProps): { subject: string; html: string; text: string } {
  const now = props.now ?? new Date();
  const letter = BUILDERS[props.notice.kind](props, now);
  letter.footer.unsubscribeUrl = buildUnsubscribeUrl({
    accountId: props.accountId,
    email: props.email,
    category: noticeUnsubscribeCategory(props.notice.kind),
  });
  return { subject: letter.subject, html: renderDeadlineMoment(letter), text: deadlineMomentText(letter) };
}
