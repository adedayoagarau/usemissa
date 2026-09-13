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
    { title: 'Look through the calls', detail: 'Magazines, grants, and residencies. We show you the entry fee and the word limit up front, and we link to the original page so you can check it yourself.' },
    { title: 'Save the ones you want', detail: 'Anything you save goes to your Tracker, along with the deadline and where your draft stands.' },
    { title: 'Tell us when to write', detail: 'Pick how often you hear from us, and how early you want the warning before a deadline.' },
  ];

  const stepsHtml = steps
    .map((step, index) => renderRecordRow({ title: step.title, meta: escapeHtml(step.detail), last: index === steps.length - 1 }))
    .join('');

  const bodyHtml = `
    <p style="margin:0 0 18px;">${greeting}</p>
    <p style="margin:0 0 26px;">
      Here is how to get started.
    </p>
    ${stepsHtml}
  `;

  const html = renderBaseEmailLayout({
    subject,
    register: 'expressive',
    preheader: 'Find the calls worth your work, and keep track of them.',
    title: 'Now you can stop hunting.',
    titleHighlight: 'stop hunting',
    lede: 'Open calls are scattered across a few hundred websites, and most of them close quietly. Missa keeps them in one place and tells you before the deadline, not after.',
    bodyHtml,
    callToAction: {
      label: 'See what’s open',
      url: new URL('/opportunities', `${siteUrl()}/`).toString(),
    },
    secondaryAction: {
      label: 'Choose how often we write',
      url: new URL('/profile', `${siteUrl()}/`).toString(),
    },
    unsubscribeUrl: buildUnsubscribeUrl({
      accountId: props.accountId,
      email: props.email,
      category: 'marketing',
    }),
  });

  const text = [
    'Now you can stop hunting.',
    '',
    name ? `Hello ${name},` : 'Hello,',
    '',
    'Open calls are scattered across a few hundred websites, and most of them close quietly. Missa keeps them in one place and tells you before the deadline, not after.',
    '',
    'Here is how to get started.',
    '',
    ...steps.map((step) => `- ${step.title}: ${step.detail}`),
    '',
    `See what's open: ${siteUrl()}/opportunities`,
    `Choose how often we write: ${siteUrl()}/profile`,
  ].join('\n');

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
