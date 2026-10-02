import { renderBaseEmailLayout } from './components/base-layout';
import { calendarDate, daysLeftLabel, longDate, renderOpportunitySection } from './components/opportunity-row';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';
import { sendMail, type SendMailReport } from '../lib/mail-service';

export interface DeadlineReminderOpportunity {
  id: string;
  title: string;
  organizationName: string;
  deadlineFormatted: string;
  daysRemaining: number;
  categoryLabel?: string;
}

export interface DeadlineReminderEmailProps {
  accountId: string;
  email: string;
  opportunities: DeadlineReminderOpportunity[];
  /** Render time; defaults to now. */
  now?: Date;
}

export function renderDeadlineReminderEmail(props: DeadlineReminderEmailProps): { subject: string; html: string; text: string } {
  const now = props.now ?? new Date();
  const count = props.opportunities.length;
  const single = count === 1 ? props.opportunities[0] : undefined;
  const left = (days: number) => daysLeftLabel(days).toLowerCase();

  const subject = single
    ? `Deadline approaching: ${single.title} (${single.daysRemaining} days left)`
    : `Missa: ${count} submission deadlines approaching`;

  const singleDate = single ? calendarDate(single.deadlineFormatted) : null;
  const words = ['no', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const title = single
    ? single.daysRemaining === 0
      ? 'It closes today.'
      : single.daysRemaining === 1
        ? 'One day left.'
        : `${words[single.daysRemaining] ?? single.daysRemaining} days left.`
    : `${count} of your deadlines are close`;
  const lede = single
    ? `${single.title} from ${single.organizationName} closes on ${singleDate ? longDate(singleDate, now) : single.deadlineFormatted}. You asked Missa to remind you.`
    : 'These calls in your Tracker close soon. Each one links to its page on Missa, with the official source.';
  const preheader = single
    ? `${single.title} closes in ${single.daysRemaining} days.`
    : `You have ${count} opportunities closing soon.`;

  const rows = props.opportunities.map((opp) => ({
    url: new URL(`/opportunities/${encodeURIComponent(opp.id)}`, `${siteUrl()}/`).toString(),
    title: opp.title,
    organizationName: opp.organizationName,
    deadline: opp.deadlineFormatted,
    daysRemaining: opp.daysRemaining,
    reason: opp.categoryLabel,
  }));
  const bodyHtml = renderOpportunitySection(single ? 'Your reminder' : 'Closing soon', rows, { now });

  const html = renderBaseEmailLayout({
    subject,
    preheader,
    eyebrow: 'Deadline reminder',
    dateline: `${now.getUTCDate()} ${now.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })} ${now.getUTCFullYear()}`,
    title,
    lede,
    bodyHtml,
    noteHtml: 'Check the official guidelines one more time before you send: word limits, file formats and any fee can change after a call opens.',
    callToAction: {
      label: single ? 'Open the call' : 'Open Tracker',
      url: single ? rows[0]!.url : new URL('/tracker', `${siteUrl()}/`).toString(),
    },
    secondaryAction: single ? { label: 'Update it in your Tracker', url: new URL('/tracker', `${siteUrl()}/`).toString() } : undefined,
    footerReason: 'You get this because you set a reminder for this call.',
    unsubscribeUrl: buildUnsubscribeUrl({
      accountId: props.accountId,
      email: props.email,
      category: 'deadline_reminder',
    }),
  });

  const textLines = props.opportunities
    .map((opp) => {
      const date = calendarDate(opp.deadlineFormatted);
      return `- ${opp.title}, ${opp.organizationName}\n  Closes ${date ? longDate(date, now) : opp.deadlineFormatted} (${left(opp.daysRemaining)}).`;
    })
    .join('\n');

  const text = `${title}\n\n${lede}\n\n${textLines}\n\nOpen your Tracker: ${siteUrl()}/tracker\nEmail settings: ${siteUrl()}/inbox`;

  return { subject, html, text };
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
    templateVersion: 'deadline.v2',
    metadata: { opportunityCount: props.opportunities.length },
    connectionString,
    retryFailed: true,
  });
}
