import { letterText, renderLetter, type LetterProps } from './components/letter';
import { siteUrl } from '../lib/siteUrl';

export const WAITLIST_CONFIRMATION_SUBJECT = 'You are on the Missa waitlist';
export const WAITLIST_CONFIRMATION_PREHEADER = 'We will email you when your place opens.';

function waitlistLetter(): LetterProps {
  return {
    subject: WAITLIST_CONFIRMATION_SUBJECT,
    preheader: WAITLIST_CONFIRMATION_PREHEADER,
    from: { kind: 'missa' },
    headline: 'You are on the list.',
    blocks: [
      {
        kind: 'paragraph',
        text: 'Thank you for joining the Missa waitlist. We will email you when your place opens, with one link to set up your account.',
      },
      {
        kind: 'paragraph',
        text: 'Until then, every Opportunity on Missa is open to browse, with its official source and deadline.',
      },
      { kind: 'action', label: 'Browse Opportunities', url: new URL('/opportunities', `${siteUrl()}/`).toString() },
    ],
    footer: { reason: 'You get this because you joined the Missa waitlist with this email address.' },
  };
}

export function renderWaitlistConfirmationEmail(): string {
  return renderLetter(waitlistLetter());
}

export function waitlistConfirmationText(): string {
  return letterText(waitlistLetter());
}
