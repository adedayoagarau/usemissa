import { Resend } from 'resend';
import { beginPlatformMessageEffect, completePlatformMessageEffect } from '@missa/radar-adapters';
import { renderWaitlistConfirmationEmail, WAITLIST_CONFIRMATION_SUBJECT, waitlistConfirmationText } from '@/emails/waitlist-confirmation';
import { absoluteUrl } from '@/lib/seo';
import { runDurableProviderDelivery } from '@/lib/durableMessageDelivery';

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
      recipientAccountId: input.signupId,
      kind: 'waitlist-confirmation',
      provider: 'resend',
      templateKey: 'waitlist-confirmation',
      templateVersion: 'waitlist-confirmation.v1',
      metadata: { signupId: input.signupId },
      retryFailed: true,
    });
    if (!effect) throw new Error('Durable message ledger did not return an effect');
    const activeEffect = effect;
    const content = buildWaitlistConfirmationEmail();
    const delivery = await runDurableProviderDelivery({
      shouldDeliver: activeEffect.shouldDeliver,
      currentStatus: activeEffect.currentStatus,
      send: async () => {
        const result = await new Resend(apiKey).emails.send({
        from,
        to: input.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        tags: [{ name: 'email_type', value: 'waitlist_confirmation' }],
        }, { idempotencyKey });
        if (result.error) throw new Error(result.error.message);
        return result;
      },
      recordAccepted: async (result) => completePlatformMessageEffect({ connectionString: input.connectionString, effectId: activeEffect.effectId, attemptNumber: activeEffect.attemptNumber, status: 'accepted', providerMessageId: result.data?.id }).then(() => undefined),
      recordFailed: async (error) => completePlatformMessageEffect({ connectionString: input.connectionString, effectId: activeEffect.effectId, attemptNumber: activeEffect.attemptNumber, status: 'failed', error: error instanceof Error ? error.message : 'Provider send failed' }).then(() => undefined),
    });
    if (delivery.outcome === 'accepted') return { status: 'sent', providerMessageId: delivery.providerResult.data?.id };
    if (delivery.outcome === 'replayed-accepted') return { status: 'sent' };
    return { status: 'failed', reason: delivery.outcome === 'unavailable' ? 'Durable message delivery status is unavailable' : delivery.error instanceof Error ? delivery.error.message : 'Provider send failed' };
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : 'Provider send failed' };
  }
}
