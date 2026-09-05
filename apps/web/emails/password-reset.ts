import { renderBaseEmailLayout, escapeHtml } from './components/base-layout';
import { siteUrl } from '../lib/siteUrl';
import { sendMail, type SendMailReport } from '../lib/mail-service';

export interface PasswordResetEmailProps {
  accountId: string;
  email: string;
  resetToken: string;
  displayName?: string;
}

export function renderPasswordResetEmail(props: PasswordResetEmailProps): { subject: string; html: string; text: string } {
  const subject = 'Reset your Missa password';
  const name = props.displayName?.trim() || '';
  const greeting = name ? `Hello ${escapeHtml(name)},` : 'Hello,';
  const resetUrl = new URL(`/reset-password?token=${encodeURIComponent(props.resetToken)}`, `${siteUrl()}/`).toString();

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:24px;">${greeting}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:24px;">
      We received a request to reset the password for your Missa account (<strong>${escapeHtml(props.email)}</strong>).
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:24px;">
      This password reset link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.
    </p>
  `;

  const noteHtml = `
    <strong>Security reminder:</strong> Missa will never ask for your password or verification codes over email or chat.
  `;

  const html = renderBaseEmailLayout({
    subject,
    preheader: 'Reset your password for your Missa account.',
    eyebrow: 'Account security',
    title: 'Reset your password',
    bodyHtml,
    noteHtml,
    callToAction: {
      label: 'Reset password',
      url: resetUrl,
    },
  });

  const text = `Reset your Missa password\n\n${name ? `Hello ${name},\n\n` : ''}We received a request to reset the password for your Missa account (${props.email}).\n\nTo reset your password, visit the following link within 1 hour:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email. Your password will remain unchanged.`;

  return { subject, html, text };
}

export async function deliverPasswordResetEmail(
  props: PasswordResetEmailProps,
  connectionString?: string
): Promise<SendMailReport> {
  const { subject, html, text } = renderPasswordResetEmail(props);

  return sendMail({
    recipientEmail: props.email,
    recipientAccountId: props.accountId,
    kind: 'password-reset',
    category: 'security_critical',
    idempotencyKey: `password-reset:${props.accountId}:${Math.floor(Date.now() / 60000)}`,
    subject,
    html,
    text,
    templateKey: 'password-reset',
    templateVersion: 'password-reset.v1',
    metadata: { email: props.email },
    connectionString,
    retryFailed: true,
  });
}
