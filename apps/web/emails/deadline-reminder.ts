import { calendarDate, dayMonth, daysLeftLabel, numberWord, capitalise } from './components/call-facts';
import { deadlineMomentText, renderDeadlineMoment } from './components/deadline-moment';
import { renderDeadlineMomentEmail } from './deadline-moments';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';
import { sendMail, type SendMailReport } from '../lib/mail-service';

export interface DeadlineReminderOpportunity {
  id: string;
  title: string;
  organizationName: string;
  /** "YYYY-MM-DD", or a written date such as "October 15, 2026". */
  deadlineFormatted: string;
  daysRemaining: number;
  categoryLabel?: string;
}

export interface DeadlineReminderEmailProps {
  accountId: string;
  email: string;
  opportunities: DeadlineReminderOpportunity[];
  givenName?: string | null;
  /** Render time; defaults to now. */
  now?: Date;
}

/** A written date as "YYYY-MM-DD" so the letter can count days and name the weekday. */
function isoDeadline(value: string): string | null {
  if (calendarDate(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

/**
 * Deadline reminder for one or more calls. One call is the Forest-band
 * countdown letter; several share one letter that lists each call and its date.
 */
export function renderDeadlineReminderEmail(props: DeadlineReminderEmailProps): { subject: string; html: string; text: string } {
  const now = props.now ?? new Date();
  const [first] = props.opportunities;
  if (props.opportunities.length === 1 && first) {
    return renderDeadlineMomentEmail({
      accountId: props.accountId,
      email: props.email,
      now,
      notice: {
        kind: 'deadline-reminder',
        noticedAt: now.toISOString(),
        opportunityId: first.id,
        title: first.title,
        organizationName: first.organizationName,
        deadline: isoDeadline(first.deadlineFormatted) ?? first.deadlineFormatted,
        givenName: props.givenName,
      },
    });
  }

  const count = props.opportunities.length;
  const url = (path: string) => new URL(path, `${siteUrl()}/`).toString();
  const letter = {
    subject: `${capitalise(numberWord(count))} of your deadlines are close`,
    preheader: props.opportunities.map((opp) => opp.title).join(', '),
    context: 'Reminder you set',
    hero: { kind: 'statement' as const, text: `${capitalise(numberWord(count))} deadlines are close.` },
    lede: 'These calls in your Tracker close soon. Each one has its page on Missa, with the official source.',
    panel: {
      tone: 'ochre' as const,
      heading: 'In your Tracker',
      facts: props.opportunities.map((opp) => {
        const date = calendarDate(isoDeadline(opp.deadlineFormatted));
        return {
          label: `${opp.title}, ${opp.organizationName}`,
          value: `${date ? dayMonth(date, now) : opp.deadlineFormatted} · ${daysLeftLabel(opp.daysRemaining)}`,
        };
      }),
    },
    action: { label: 'Open your Tracker', url: url('/tracker') },
    note: 'Check the guidelines on each official page before you send. Word limits, formats and fees can change after a call opens.',
    footer: {
      reason: 'You get this because you set reminders for these calls.',
      preferencesUrl: url('/inbox'),
      preferencesLabel: 'Change reminders',
      unsubscribeUrl: buildUnsubscribeUrl({ accountId: props.accountId, email: props.email, category: 'deadline_reminder' }),
    },
  };
  const links = props.opportunities.map((opp) => `${opp.title}: ${url(`/opportunities/${encodeURIComponent(opp.id)}`)}`);
  return {
    subject: letter.subject,
    html: renderDeadlineMoment(letter),
    text: `${deadlineMomentText(letter)}\n\n${links.join('\n')}`,
  };
}

/**
 * Dispatches the deadline reminder email to a creator.
 */
export async function deliverDeadlineReminderEmail(
  props: DeadlineReminderEmailProps,
  connectionString?: string
): Promise<SendMailReport> {
  const { subject, html, text } = renderDeadlineReminderEmail(props);
  const idsHash = props.opportunities.map((o) => o.id).sort().join('|');

  return sendMail({
    recipientEmail: props.email,
    recipientAccountId: props.accountId,
    kind: 'deadline-reminder',
    category: 'notification_digest',
    idempotencyKey: `deadline-reminder:${props.accountId}:${idsHash}`,
    subject,
    html,
    text,
    templateKey: 'deadline-reminder',
    templateVersion: 'deadline-moment.v1',
    metadata: { opportunityCount: props.opportunities.length },
    connectionString,
    retryFailed: true,
  });
}
