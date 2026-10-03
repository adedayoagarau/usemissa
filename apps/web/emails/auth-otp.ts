import { letterText, renderLetter, type LetterProps } from './components/letter';
import { siteUrl } from '../lib/siteUrl';

export type AuthOtpType =
  | 'email-verification'
  | 'sign-in'
  | 'forget-password';

export interface AuthOtpEmailProps {
  email: string;
  code: string;
  type: AuthOtpType;
  expiresInMinutes: number;
}

const copyByType: Record<AuthOtpType, { subject: string; headline: string; instruction: string; reason: string }> = {
  'email-verification': {
    subject: 'Verify your email for Missa',
    headline: 'Verify your email',
    instruction: 'Enter this code on Missa to finish creating your account.',
    reason: 'You get this because someone started a Missa account with this email address.',
  },
  'sign-in': {
    subject: 'Your Missa sign-in code',
    headline: 'Your sign-in code',
    instruction: 'Enter this code on the Missa sign-in page.',
    reason: 'You get this because someone asked to sign in to Missa with this email address.',
  },
  'forget-password': {
    subject: 'Reset your Missa password',
    headline: 'Reset your password',
    instruction: 'Enter this code on Missa to choose a new password.',
    reason: 'You get this because a password reset was requested for this email address.',
  },
};

const minutes = (value: number) => `${value} minute${value === 1 ? '' : 's'}`;

/** A one-time code letter. Security email: no unsubscribe link, never skipped by preferences. */
export function renderAuthOtpEmail(props: AuthOtpEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  if (!/^\d{6}$/u.test(props.code)) {
    throw new Error('Authentication codes must contain exactly six digits.');
  }
  const copy = copyByType[props.type];
  const expiry = minutes(Math.max(1, Math.round(props.expiresInMinutes)));
  const email = props.email.trim().toLowerCase();
  const spaced = `${props.code.slice(0, 3)} ${props.code.slice(3)}`;
  const letter: LetterProps = {
    subject: copy.subject,
    preheader: `Your code is ${props.code}. It expires in ${expiry}.`,
    from: { kind: 'missa' },
    headline: copy.headline,
    blocks: [
      { kind: 'paragraph', text: copy.instruction },
      { kind: 'code', code: spaced, label: `Verification code ${props.code}` },
      {
        kind: 'small',
        text: `The code is for ${email} and expires in ${expiry}. If you did not ask for it, you can ignore this email; no one can use your account without the code. Missa will never ask you to send this code to anyone.`,
      },
    ],
    footer: { reason: copy.reason, preferencesUrl: new URL('/inbox', `${siteUrl()}/`).toString() },
  };
  return { subject: copy.subject, html: renderLetter(letter), text: letterText(letter).replace(spaced, props.code) };
}
