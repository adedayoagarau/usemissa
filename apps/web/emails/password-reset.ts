import { letterText, renderLetter, type LetterProps } from './components/letter';
import { siteUrl } from '../lib/siteUrl';
import { sendMail, type SendMailReport } from '../lib/mail-service';

export interface PasswordResetEmailProps {
  accountId: string;
  email: string;
  resetToken: string;
  displayName?: string;
}

/** Password reset letter. Security email: no unsubscribe link. */
export function renderPasswordResetEmail(props: PasswordResetEmailProps): { subject: string; html: string; text: string } {
  const subject = 'Reset your Missa password';
  const name = props.displayName?.trim() || '';
  const resetUrl = new URL(`/reset-password?token=${encodeURIComponent(props.resetToken)}`, `${siteUrl()}/`).toString();
  const letter: LetterProps = {
    subject,
    preheader: 'Choose a new password for your Missa account. The link works once and expires in 60 minutes.',
    from: { kind: 'missa' },
    headline: 'Reset your password',
    blocks: [
      ...(name ? [{ kind: 'paragraph' as const, text: `Hello ${name},` }] : []),
      {
        kind: 'paragraph',
        text: `Choose a new password for your Missa account, ${props.email}. The link works once and expires in 60 minutes.`,
      },
      { kind: 'action', label: 'Choose a new password', url: resetUrl },
      { kind: 'small', text: 'If you did not ask for this, ignore this email. Your current password stays the same.' },
    ],
    footer: {
      reason: 'You get this because a password reset was requested for this email address.',
      preferencesUrl: new URL('/inbox', `${siteUrl()}/`).toString(),
    },
  };
  return { subject, html: renderLetter(letter), text: letterText(letter) };
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
