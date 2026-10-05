import { renderEmailChoiceConfirmationEmail } from '../emails/email-choice-confirmation';
import { renderSubmissionReceiptEmail, type SubmissionReceiptEmailProps } from '../emails/submission-receipt';
import { sendMail, type SendMailReport } from './mail-service';

/**
 * Sent once per account when the creator says yes to reminder emails and The
 * Sunday List. A failure never undoes the choice; the ledger key keeps a retry
 * or a second "yes" from sending it twice.
 */
export async function deliverEmailChoiceConfirmation(input: { accountId: string; email: string }): Promise<SendMailReport> {
  const { subject, html, text } = renderEmailChoiceConfirmationEmail();
  return sendMail({
    recipientEmail: input.email,
    recipientAccountId: input.accountId,
    kind: 'email-choice-confirmation',
    category: 'notification_digest',
    idempotencyKey: `email-choice-confirmation:${input.accountId}`,
    subject,
    html,
    text,
    templateKey: 'email-choice-confirmation',
    templateVersion: 'email-choice-confirmation.v1',
    retryFailed: true,
  });
}

/**
 * The organisation's receipt for a submission made through its Missa-hosted
 * form. Actionable mail: it is the applicant's record, so it is not skipped by
 * digest preferences. One per submission.
 */
export async function deliverSubmissionReceipt(
  input: SubmissionReceiptEmailProps & { submissionId: string; accountId: string; email: string; organizationId?: string },
): Promise<SendMailReport> {
  const { subject, html, text } = renderSubmissionReceiptEmail(input);
  return sendMail({
    recipientEmail: input.email,
    recipientAccountId: input.accountId,
    ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    kind: 'submission-receipt',
    category: 'application_actionable',
    idempotencyKey: `submission-receipt:${input.submissionId}`,
    subject,
    html,
    text,
    templateKey: 'submission-receipt',
    templateVersion: 'submission-receipt.v1',
    metadata: { submissionId: input.submissionId },
    retryFailed: true,
  });
}
