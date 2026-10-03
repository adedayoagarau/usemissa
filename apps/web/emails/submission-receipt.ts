import { letterText, renderLetter, type LetterProps } from './components/letter';
import { siteUrl } from '../lib/siteUrl';

export interface SubmissionReceiptEmailProps {
  organizationName: string;
  callTitle: string;
  givenName?: string | null;
  submittedAt: Date;
  /** Titles of the works sent, in order. */
  works: string[];
  fileCount: number;
  /** The organisation's receipt reference, shown in Fragment Mono. */
  reference: string;
  /** Entry fee paid, in the smallest currency unit. */
  feePaidCents?: number;
  feeCurrency?: string;
}

/** "Sunday 4 October 2026, 6:12pm UTC" */
function sentAt(date: Date): string {
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date).replace(',', '');
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(date).replace(/\s/g, '').toLowerCase();
  return `${day}, ${time} UTC`;
}

/**
 * The receipt an organisation sends through Missa when its hosted application
 * form accepts a submission. The organisation leads; Missa is the carrier.
 */
export function renderSubmissionReceiptEmail(props: SubmissionReceiptEmailProps): { subject: string; html: string; text: string } {
  const name = props.givenName?.trim();
  const subject = `We received your submission for ${props.callTitle}`;
  const files = `${props.fileCount} ${props.fileCount === 1 ? 'file' : 'files'}`;
  const fee =
    props.feePaidCents && props.feePaidCents > 0
      ? new Intl.NumberFormat('en', { style: 'currency', currency: props.feeCurrency || 'USD', minimumFractionDigits: props.feePaidCents % 100 ? 2 : 0 }).format(props.feePaidCents / 100)
      : null;
  const letter: LetterProps = {
    subject,
    preheader: `Your application for ${props.callTitle} arrived complete. Keep this email as your receipt.`,
    from: { kind: 'organisation', name: props.organizationName },
    headline: 'We received your submission.',
    blocks: [
      {
        kind: 'paragraph',
        text: `${name ? `Thank you, ${name}. ` : 'Thank you. '}Your application for ${props.callTitle} arrived complete. Keep this email as your receipt.`,
      },
      {
        kind: 'facts',
        facts: [
          { label: 'Opportunity', value: props.callTitle },
          ...(props.works.length === 1 ? [{ label: 'Work', value: props.works[0]! }] : props.works.length > 1 ? [{ label: 'Works', value: `${props.works.length} works` }] : []),
          { label: 'Submitted', value: sentAt(props.submittedAt) },
          { label: 'Files', value: files },
          ...(fee ? [{ label: 'Entry fee paid', value: fee }] : []),
          { label: 'Reference', value: props.reference, reference: true },
        ],
      },
      { kind: 'action', label: 'Track it in Missa', url: new URL('/tracker?view=awaiting', `${siteUrl()}/`).toString() },
    ],
    footer: {
      reason: `${props.organizationName} sent this because you submitted through its Missa application form. Your Tracker now shows this submission.`,
      preferencesUrl: new URL('/inbox', `${siteUrl()}/`).toString(),
      senderLine: `${props.organizationName} sent this through Missa`,
    },
  };
  return { subject, html: renderLetter(letter), text: letterText(letter) };
}
