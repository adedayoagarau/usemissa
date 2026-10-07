import { letterText, renderLetter, type LetterProps } from './components/letter';
import { siteUrl } from '../lib/siteUrl';
import { sendMail, type SendMailReport } from '../lib/mail-service';

export interface ReaderReminderProps {
  readerName?: string;
  organizationName: string;
  opportunityTitle: string;
  roundName: string;
  openAssignments: number;
  overdueAssignments: number;
  note?: string;
}

/** A plain nudge from the organization to a reader with open assignments. */
export function renderReaderReminderEmail(props: ReaderReminderProps): { subject: string; html: string; text: string } {
  const count = props.openAssignments;
  const noun = count === 1 ? 'submission' : 'submissions';
  const subject = `${count} ${noun} waiting for your read: ${props.opportunityTitle}`;
  const overdue = props.overdueAssignments > 0 ? ` ${props.overdueAssignments} of them ${props.overdueAssignments === 1 ? 'is' : 'are'} past the date the round asked for.` : '';
  const letter: LetterProps = {
    subject,
    preheader: `${props.roundName} for ${props.opportunityTitle} is waiting on ${count} ${noun}.`,
    from: { kind: 'organisation', name: props.organizationName },
    headline: 'Your reading queue',
    blocks: [
      { kind: 'paragraph', text: props.readerName ? `Dear ${props.readerName},` : 'Hello,' },
      { kind: 'paragraph', text: `You have ${count} ${noun} still to read in ${props.roundName} for ${props.opportunityTitle}.${overdue}` },
      ...(props.note?.trim() ? [{ kind: 'paragraph' as const, text: props.note.trim() }] : []),
      { kind: 'paragraph', text: 'Open your queue to pick up where you left off. Each recommendation saves on its own, so you can read in any order.' },
      { kind: 'signoff', text: props.organizationName },
      { kind: 'action', label: 'Open your reading queue', url: new URL('/reviews', `${siteUrl()}/`).toString() },
    ],
    footer: {
      reason: `${props.organizationName} asked Missa to send this reminder because you hold open review assignments for ${props.opportunityTitle}.`,
      senderLine: `${props.organizationName} sent this through Missa`,
    },
  };
  return { subject, html: renderLetter(letter), text: letterText(letter) };
}

export async function deliverReaderReminder(
  input: ReaderReminderProps & {
    recipientEmail: string;
    recipientAccountId: string;
    organizationId: string;
    actorAccountId: string;
    reviewRoundId: string;
    /** Day stamp so one nudge per reader per round per day is idempotent. */
    day: string;
    replyTo?: string;
  },
  connectionString?: string,
): Promise<SendMailReport> {
  const rendered = renderReaderReminderEmail(input);
  return sendMail({
    recipientEmail: input.recipientEmail,
    recipientAccountId: input.recipientAccountId,
    actorAccountId: input.actorAccountId,
    organizationId: input.organizationId,
    kind: 'reader-reminder',
    category: 'application_actionable',
    idempotencyKey: `reader-reminder:${input.reviewRoundId}:${input.recipientAccountId}:${input.day}`,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo: input.replyTo,
    templateKey: 'reader-reminder',
    templateVersion: 'reader-reminder.v1',
    metadata: { reviewRoundId: input.reviewRoundId, openAssignments: input.openAssignments },
    connectionString,
    retryFailed: false,
  });
}
