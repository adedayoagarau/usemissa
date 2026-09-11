import { renderBaseEmailLayout, escapeHtml, EMAIL_COLORS } from './components/base-layout';
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

  const title = single ? 'Deadline countdown' : 'Upcoming deadlines';
  const preheader = single
    ? `${single.title} closes in ${single.daysRemaining} days.`
    : `You have ${count} opportunities closing soon.`;

  const bodyHtml = props.opportunities
    .map((opp) => {
      const remainingLabel =
        opp.daysRemaining <= 1
          ? 'Closes in 24 hours'
          : `Closes in ${opp.daysRemaining} days`;

      return `
        <div style="margin-bottom:18px;padding:16px 18px;background-color:#ffffff;border:1px solid ${EMAIL_COLORS.border};border-radius:8px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${EMAIL_COLORS.forest600};">
              ${escapeHtml(opp.organizationName)}
            </span>
            <span style="font-size:12px;font-weight:600;background-color:#edf3f0;color:#1d4037;padding:3px 8px;border-radius:4px;">
              ${escapeHtml(remainingLabel)}
            </span>
          </div>
          <div style="font-size:16px;font-weight:600;color:${EMAIL_COLORS.ink};margin-bottom:6px;">
            ${escapeHtml(opp.title)}
          </div>
          <div style="font-size:13px;color:${EMAIL_COLORS.inkMuted};">
            Deadline: ${escapeHtml(opp.deadlineFormatted)} ${opp.categoryLabel ? `• ${escapeHtml(opp.categoryLabel)}` : ''}
          </div>
        </div>
      `;
    })
    .join('');

  const noteHtml = `
    <strong>Tip:</strong> Submissions often experience higher traffic during closing hours. We recommend submitting your work well in advance to avoid deadline-day technical issues.
  `;

  const html = renderBaseEmailLayout({
    subject,
    preheader,
    eyebrow: 'Deadline alert',
    title,
    bodyHtml: `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${EMAIL_COLORS.inkSecondary};">The following opportunities in your saved list or tracker are closing soon:</p>${bodyHtml}`,
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
