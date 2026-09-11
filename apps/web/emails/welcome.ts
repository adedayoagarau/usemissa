import { renderBaseEmailLayout, escapeHtml } from './components/base-layout';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';
import { sendMail, type SendMailReport } from '../lib/mail-service';

export interface WelcomeEmailProps {
  accountId: string;
  email: string;
  displayName?: string;
}

export function renderWelcomeEmail(props: WelcomeEmailProps): { subject: string; html: string; text: string } {
  const subject = 'Welcome to Missa';
  const name = props.displayName?.trim() || '';
  const greeting = name ? `Hello ${escapeHtml(name)},` : 'Hello,';

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:24px;">${greeting}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:24px;">
      Welcome to Missa — a platform designed to help you discover creative opportunities, track submissions with confidence, and keep every deadline in view.
    </p>
    <div style="margin:20px 0;padding:16px 20px;background-color:#edf3f0;border-left:3px solid #285649;border-radius:6px;">
      <div style="font-weight:600;font-size:14px;color:#1d4037;margin-bottom:6px;">Here is how to get started:</div>
      <ul style="margin:0;padding-left:20px;font-size:14px;line-height:22px;color:#285649;">
        <li style="margin-bottom:6px;"><strong>Browse calls:</strong> Explore vetted literary magazines, grants, and residencies.</li>
        <li style="margin-bottom:6px;"><strong>Save to Tracker:</strong> Keep drafts and deadlines organized with clear status stages.</li>
        <li><strong>Set preferences:</strong> Choose when and how you want deadline alerts and digest updates delivered.</li>
      </ul>
    </div>
    <p style="margin:0 0 16px;font-size:15px;line-height:24px;">
      Whenever you are ready, browse the open calls or start by saving your first opportunity.
    </p>
  `;

  const html = renderBaseEmailLayout({
    subject,
    preheader: 'Discover creative opportunities with source and limits kept visible.',
    eyebrow: 'Getting started',
    title: 'Your creative calls, in view.',
    bodyHtml,
    callToAction: {
      label: 'Explore Opportunities',
      url: new URL('/opportunities', `${siteUrl()}/`).toString(),
    },
    secondaryAction: {
      label: 'Visit your profile',
      url: new URL('/profile', `${siteUrl()}/`).toString(),
    },
    unsubscribeUrl: buildUnsubscribeUrl({
      accountId: props.accountId,
      email: props.email,
      category: 'marketing',
    }),
  });

  const text = `Welcome to Missa\n\n${name ? `Hello ${name},\n\n` : ''}Welcome to Missa — a platform designed to help you discover creative opportunities, track submissions with confidence, and keep every deadline in view.\n\nHere is how to get started:\n• Browse calls: Explore vetted literary magazines, grants, and residencies.\n• Save to Tracker: Keep drafts and deadlines organized with clear status stages.\n• Set preferences: Choose when and how you want deadline alerts and digest updates delivered.\n\nExplore Opportunities: ${siteUrl()}/opportunities\nManage preferences: ${siteUrl()}/profile`;

  return { subject, html, text };
}

/**
 * Dispatches the welcome email after account creation.
 * Durable, idempotent per accountId.
 */
export async function deliverWelcomeEmail(
  props: WelcomeEmailProps,
  connectionString?: string
): Promise<SendMailReport> {
  const { subject, html, text } = renderWelcomeEmail(props);
  return sendMail({
    recipientEmail: props.email,
    recipientAccountId: props.accountId,
    kind: 'welcome-email',
    category: 'notification_digest',
    idempotencyKey: `welcome:${props.accountId}`,
    subject,
    html,
    text,
    templateKey: 'welcome-email',
    templateVersion: 'welcome.v1',
    metadata: { accountId: props.accountId },
    connectionString,
    retryFailed: true,
  });
}
