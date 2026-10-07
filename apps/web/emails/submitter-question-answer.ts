import { letterText, renderLetter, type LetterProps } from './components/letter';
import { siteUrl } from '../lib/siteUrl';
import { sendMail, type SendMailReport } from '../lib/mail-service';

export interface SubmitterQuestionAnswerProps {
  organizationName: string;
  opportunityTitle: string;
  question: string;
  answer: string;
  submissionId: string;
  signoff?: string;
}

function paragraphs(value: string): string[] {
  return value.split(/\n{2,}/).map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
}

/** The organization's answer to a question a submitter asked from their receipt. */
export function renderSubmitterQuestionAnswerEmail(props: SubmitterQuestionAnswerProps): { subject: string; html: string; text: string } {
  const subject = `${props.organizationName} answered your question about ${props.opportunityTitle}`;
  const answer = paragraphs(props.answer);
  const letter: LetterProps = {
    subject,
    preheader: answer[0] ?? subject,
    from: { kind: 'organisation', name: props.organizationName },
    headline: 'An answer to your question',
    blocks: [
      { kind: 'small', text: `You asked: “${props.question.length > 280 ? `${props.question.slice(0, 277)}…` : props.question}”` },
      ...answer.map((text) => ({ kind: 'paragraph' as const, text })),
      { kind: 'signoff', text: props.signoff?.trim() || props.organizationName },
      { kind: 'action', label: 'See it on your receipt', url: new URL(`/tracker/submissions/${encodeURIComponent(props.submissionId)}`, `${siteUrl()}/`).toString() },
    ],
    footer: {
      reason: `${props.organizationName} answered a question you asked about your submission to ${props.opportunityTitle}. The question and answer stay on your submission receipt.`,
      senderLine: `${props.organizationName} sent this through Missa`,
    },
  };
  return { subject, html: renderLetter(letter), text: letterText(letter) };
}

export async function deliverSubmitterQuestionAnswer(
  input: SubmitterQuestionAnswerProps & {
    questionId: string;
    recipientEmail: string;
    recipientAccountId: string;
    organizationId: string;
    actorAccountId: string;
    /** The answer timestamp, so a re-answered question is a new message. */
    answeredAt: string;
    replyTo?: string;
  },
  connectionString?: string,
): Promise<SendMailReport> {
  const rendered = renderSubmitterQuestionAnswerEmail(input);
  return sendMail({
    recipientEmail: input.recipientEmail,
    recipientAccountId: input.recipientAccountId,
    actorAccountId: input.actorAccountId,
    organizationId: input.organizationId,
    kind: 'submitter-question-answer',
    category: 'application_actionable',
    idempotencyKey: `submitter-question-answer:${input.questionId}:${input.answeredAt}`,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo: input.replyTo,
    templateKey: 'submitter-question-answer',
    templateVersion: '1',
    metadata: { questionId: input.questionId, submissionId: input.submissionId },
    connectionString,
  });
}
