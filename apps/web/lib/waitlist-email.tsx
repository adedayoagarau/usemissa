import { Resend } from 'resend';
import { beginPlatformMessageEffect, completePlatformMessageEffect } from '@missa/radar-adapters';
import { renderWaitlistConfirmationEmail, WAITLIST_CONFIRMATION_SUBJECT, waitlistConfirmationText } from '@/emails/waitlist-confirmation';
import { absoluteUrl } from '@/lib/seo';

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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return { status: 'skipped', reason: 'RESEND_API_KEY/RESEND_FROM not configured' };

  const idempotencyKey = `waitlist-confirmation:${input.signupId}`;
  let effect: Awaited<ReturnType<typeof beginPlatformMessageEffect>> | undefined;
  try {
    effect = await beginPlatformMessageEffect(input.connectionString, {
      idempotencyKey,
      kind: 'waitlist-confirmation',
      provider: 'resend',
      metadata: { signupId: input.signupId },
      retryFailed: true,
    });
    if (!effect.shouldDeliver) return { status: 'sent' };

    const content = buildWaitlistConfirmationEmail();
    const result = await new Resend(apiKey).emails.send(
      {
        from,
        to: input.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        tags: [{ name: 'email_type', value: 'waitlist_confirmation' }],
      },
      { idempotencyKey },
    );
    if (result.error) throw new Error(result.error.message);

    await completePlatformMessageEffect({
      connectionString: input.connectionString,
      effectId: effect.effectId,
      attemptNumber: effect.attemptNumber,
      status: 'sent',
      providerMessageId: result.data?.id,
    });
    return { status: 'sent', providerMessageId: result.data?.id };
  } catch (error) {
    if (effect)
      await completePlatformMessageEffect({
        connectionString: input.connectionString,
        effectId: effect.effectId,
        attemptNumber: effect.attemptNumber,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Provider send failed',
      }).catch(() => undefined);
    return { status: 'failed', reason: error instanceof Error ? error.message : 'Provider send failed' };
  }
}
