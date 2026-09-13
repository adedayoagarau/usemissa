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
        Missa gathers the calls worth your work — magazines, grants, residencies — and shows you the entry fee, the word limit, and a link to the original page, so you can decide quickly whether it is worth your time.
      </p>
      <p style="margin:0;">
        Then it keeps track of what you saved and tells you before the deadline.
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
    'Missa gathers the calls worth your work—magazines, grants, residencies—and shows you the entry fee, the word limit, and a link to the original page, so you can decide quickly whether it is worth your time.',
    '',
    'Then it keeps track of what you saved and tells you before the deadline.',
    '',
    'Questions? Reply to this email—we read every response.',
    '',
    'You received this message because you joined the Missa waitlist at usemissa.com. If you didn’t join, you can ignore it.',
  ].join('\n');
}
