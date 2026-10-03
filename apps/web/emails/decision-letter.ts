import { letterText, renderLetter, type LetterProps } from './components/letter';
import { siteUrl } from '../lib/siteUrl';
import { sendMail, type SendMailReport } from '../lib/mail-service';

export interface DecisionLetterProps {
  submitterName?: string;
  organizationName: string;
  workTitle: string;
  outcome: 'accepted' | 'declined' | 'waitlisted' | 'shortlisted' | string;
  editorialNote?: string;
  nextSteps?: string;
  submissionId?: string;
}

/**
 * A decision letter the organisation writes and sends through Missa. The
 * organisation's name leads; Missa appears only as the carrier. A custom note
 * from the organisation replaces the standard outcome paragraph's follow-up.
 */
export function renderDecisionLetter(props: DecisionLetterProps): { subject: string; html: string; text: string } {
  const name = props.submitterName?.trim() || '';
  const org = props.organizationName;
  const work = props.workTitle;
  const outcome = props.outcome.toLowerCase();
  const statement =
    outcome === 'accepted'
      ? `We are delighted to tell you that we have accepted ${work}.`
      : outcome === 'declined'
        ? `Thank you for letting us read ${work}. We gave it careful thought, and it is not the right fit for ${org} at this time.`
        : outcome === 'waitlisted'
          ? `Thank you for sending ${work}. We would like to keep it on our waitlist while we finish our selections.`
          : outcome === 'shortlisted'
            ? `${work} is on our shortlist. We will write again when we have made our final selections.`
            : `We have finished reviewing ${work}.`;
  const subject = `About ${work}, from ${org}`;
  const letter: LetterProps = {
    subject,
    preheader: statement,
    from: { kind: 'organisation', name: org },
    headline: 'About your application',
    blocks: [
      { kind: 'paragraph', text: name ? `Dear ${name},` : 'Hello,' },
      { kind: 'paragraph', text: statement },
      ...(props.editorialNote ? props.editorialNote.split(/\n{2,}/).map((text) => ({ kind: 'paragraph' as const, text: text.trim() })).filter((block) => block.text) : []),
      ...(props.nextSteps ? [{ kind: 'paragraph' as const, text: props.nextSteps }] : []),
      { kind: 'signoff', text: org },
      { kind: 'action', label: 'See it in your Tracker', url: new URL('/tracker', `${siteUrl()}/`).toString() },
    ],
    footer: {
      reason: `${org} wrote this letter and sent it through Missa. Your Tracker shows the decision and keeps your submission record.`,
      preferencesUrl: new URL('/inbox', `${siteUrl()}/`).toString(),
      senderLine: `${org} sent this through Missa`,
    },
  };
  return { subject, html: renderLetter(letter), text: letterText(letter) };
}

export async function deliverDecisionEmail(
  props: DecisionLetterProps & {
    recipientEmail: string;
    recipientAccountId: string;
    organizationId: string;
    actorAccountId: string;
    workId: string;
    decisionId: string;
    batchKey?: string;
  },
  connectionString?: string
): Promise<SendMailReport> {
  const { subject, html, text } = renderDecisionLetter(props);
  const idempotencyKey = `decision-email:${props.batchKey || 'single'}:${props.workId}`;

  return sendMail({
    recipientEmail: props.recipientEmail,
    recipientAccountId: props.recipientAccountId,
    actorAccountId: props.actorAccountId,
    organizationId: props.organizationId,
    kind: 'decision-email',
    category: 'application_actionable',
    idempotencyKey,
    subject,
    html,
    text,
    templateKey: 'decision-letter',
    templateVersion: 'decision-letter.v1',
    metadata: { workId: props.workId, decisionId: props.decisionId },
    connectionString,
    retryFailed: false,
  });
}
