import { renderWaitlistConfirmationEmail, WAITLIST_CONFIRMATION_SUBJECT, waitlistConfirmationText } from '@/emails/waitlist-confirmation';
import { absoluteUrl } from '@/lib/seo';
import { sendMail } from '@/lib/mail-service';

export interface WaitlistConfirmationEmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface WaitlistConfirmationDeliveryInput {
  connectionString: string;
  email: string;
  signupId: string;
}

export interface WaitlistConfirmationDeliveryReport {
  status: 'sent' | 'skipped' | 'failed';
  providerMessageId?: string;
  reason?: string;
}

export function buildWaitlistConfirmationEmail(): WaitlistConfirmationEmailContent {
  const logoUrl = absoluteUrl('/brand/missa-wordmark-240.svg');
  return {
    subject: WAITLIST_CONFIRMATION_SUBJECT,
    html: `<!DOCTYPE html>${renderWaitlistConfirmationEmail({ logoUrl })}`,
    text: waitlistConfirmationText(),
  };
}

/**
 * Sends the relationship email after a waitlist write. The signup itself is
 * already durable; a provider failure is recorded and can be retried when the
 * same address submits again without turning a successful signup into a 5xx.
 */
export async function deliverWaitlistConfirmationEmail(
  input: WaitlistConfirmationDeliveryInput,
): Promise<WaitlistConfirmationDeliveryReport> {
  const content = buildWaitlistConfirmationEmail();
  const report = await sendMail({
    recipientEmail: input.email,
    recipientAccountId: input.signupId,
    kind: 'waitlist-confirmation',
    category: 'notification_digest',
    idempotencyKey: `waitlist-confirmation:${input.signupId}`,
    subject: content.subject,
    html: content.html,
    text: content.text,
    templateKey: 'waitlist-confirmation',
    templateVersion: 'waitlist-confirmation.v1',
    metadata: { signupId: input.signupId },
    connectionString: input.connectionString,
    retryFailed: true,
  });

  if (report.status === 'sent' || report.status === 'replayed') {
    return { status: 'sent', providerMessageId: report.providerMessageId };
  }
  if (report.status === 'skipped') {
    return { status: 'skipped', reason: report.reason };
  }
  return { status: 'failed', reason: report.reason || 'Provider send failed' };
}
