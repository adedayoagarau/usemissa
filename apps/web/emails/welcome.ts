import { renderBaseEmailLayout, renderRecordRow, escapeHtml } from './components/base-layout';
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

  const steps: Array<{ title: string; detail: string }> = [
    { title: 'Browse calls', detail: 'Vetted literary magazines, grants, and residencies — with the source and the entry limits kept visible.' },
    { title: 'Save to Tracker', detail: 'Keep drafts and deadlines organised through clear status stages.' },
    { title: 'Set preferences', detail: 'Choose when deadline alerts and digest updates reach you, and how often.' },
  ];

  const stepsHtml = steps
    .map((step, index) => renderRecordRow({ title: step.title, meta: escapeHtml(step.detail), last: index === steps.length - 1 }))
    .join('');

  const bodyHtml = `
    <p style="margin:0 0 18px;">${greeting}</p>
    <p style="margin:0 0 26px;">
      Missa keeps the calls worth your work in one place — so the deadline never arrives before you hear about it.
    </p>
    ${stepsHtml}
  `;

  const html = renderBaseEmailLayout({
    subject,
    register: 'expressive',
    preheader: 'Discover creative opportunities with source and limits kept visible.',
    title: 'Your creative calls, in view.',
    titleHighlight: 'in view',
    lede: 'Somewhere out there is a magazine still open, a grant still taking entries, and a residency that closes on Tuesday. Here is where they live now.',
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
