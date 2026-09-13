import { renderBaseEmailLayout } from './components/base-layout';

export const WAITLIST_CONFIRMATION_SUBJECT = 'You’re on the Missa waitlist';
export const WAITLIST_CONFIRMATION_PREHEADER = 'We’ll send you an invite when Missa is ready.';

export interface WaitlistConfirmationEmailProps {
  logoUrl: string;
}

/**
 * Returns the full waitlist confirmation document. Previously this template
 * carried its own colour and type scale; it now shares the base layout so the
 * first email a person ever receives from Missa looks like the rest of them.
 */
export function renderWaitlistConfirmationEmail({ logoUrl }: WaitlistConfirmationEmailProps): string {
  return renderBaseEmailLayout({
    subject: WAITLIST_CONFIRMATION_SUBJECT,
    register: 'expressive',
    preheader: WAITLIST_CONFIRMATION_PREHEADER,
    title: 'You’re on the waitlist.',
    titleHighlight: 'on the waitlist',
    lede: 'We’ll send you an invite when Missa is ready.',
    logoUrl,
    bodyHtml: `
      <p style="margin:0 0 18px;">
        Missa helps you find the calls that fit your work, prepare what you need, and stay on top of every deadline — with the original source close at hand.
      </p>
      <p style="margin:0;">
        We’re building a clearer way to move from finding an opportunity to being ready for it.
      </p>
    `,
    noteHtml: '<strong>Questions?</strong> Reply to this email — we read every response.',
  });
}

export function waitlistConfirmationText(): string {
  return [
    'You’re on the waitlist.',
    '',
    'We’ll send you an invite when Missa is ready.',
    '',
    'Missa helps you find the calls that fit your work, prepare what you need, and stay on top of every deadline—with the original source close at hand.',
    '',
    'We’re building a clearer way to move from finding an opportunity to being ready for it.',
    '',
    'Questions? Reply to this email—we read every response.',
    '',
    'You received this message because you joined the Missa waitlist at usemissa.com. If you didn’t join, you can ignore it.',
  ].join('\n');
}
