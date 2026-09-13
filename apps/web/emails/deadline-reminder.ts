import { renderBaseEmailLayout, renderRecordRow, escapeHtml } from './components/base-layout';
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
}

export function renderDeadlineReminderEmail(props: DeadlineReminderEmailProps): { subject: string; html: string; text: string } {
  const count = props.opportunities.length;
  const single = count === 1 ? props.opportunities[0] : undefined;

  const subject = single
    ? `Deadline approaching: ${single.title} (${single.daysRemaining} days left)`
    : `Missa: ${count} submission deadlines approaching`;

  // The countdown carries the urgency, so it goes in the headline highlight and
  // is repeated per record as a Fragment Mono flag.
  const countdownPhrase = single
    ? single.daysRemaining <= 1
      ? 'within 24 hours'
      : `in ${single.daysRemaining} days`
    : `${count} calls`;

  const title = single
    ? `One call closes ${countdownPhrase}.`
    : `${countdownPhrase} are closing.`;

  const preheader = single
    ? `${single.title} closes in ${single.daysRemaining} days.`
    : `You have ${count} opportunities closing soon.`;

  const bodyHtml = props.opportunities
    .map((opp, index) => {
      const urgent = opp.daysRemaining <= 2;
      const flag =
        opp.daysRemaining <= 1
          ? '24 hours left'
          : `${opp.daysRemaining} days left`;

      const meta = [opp.deadlineFormatted, opp.categoryLabel]
        .filter(Boolean)
        .map((value) => escapeHtml(value as string))
        .join('&nbsp;&nbsp;·&nbsp;&nbsp;');

      return renderRecordRow({
        kicker: opp.organizationName,
        title: opp.title,
        flag,
        flagUrgent: urgent,
        meta,
        last: index === count - 1,
      });
    })
    .join('');

  const noteHtml = `
    <strong>Submit before the last day.</strong> Most magazines see their heaviest traffic in the closing hours, and a submission portal that times out at 11:58pm counts as a missed deadline.
  `;

  const html = renderBaseEmailLayout({
    subject,
    register: 'operational',
    preheader,
    title,
    titleHighlight: countdownPhrase,
    bodyHtml: `<p style="margin:0 0 4px;">From your saved list and tracker:</p>${bodyHtml}`,
    noteHtml,
    callToAction: {
      label: 'Open Tracker',
      url: new URL('/tracker', `${siteUrl()}/`).toString(),
    },
    unsubscribeUrl: buildUnsubscribeUrl({
      accountId: props.accountId,
      email: props.email,
      category: 'deadline_reminder',
    }),
  });

  const textLines = props.opportunities
    .map((opp) => `• ${opp.title} (${opp.organizationName}) — Deadline: ${opp.deadlineFormatted} (${opp.daysRemaining} days left)`)
    .join('\n');

  const text = `${title}\n\n${subject}\n\nOpportunities closing soon:\n${textLines}\n\nReview your Tracker: ${siteUrl()}/tracker\nManage notifications: ${siteUrl()}/profile`;

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
    templateVersion: 'deadline.v1',
    metadata: { opportunityCount: props.opportunities.length },
    connectionString,
    retryFailed: true,
  });
}
