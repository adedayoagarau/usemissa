import { letterText, renderLetter, type LetterBlock, type LetterProps } from './components/letter';
import { siteUrl } from '../lib/siteUrl';
import { sendMail, type SendMailReport } from '../lib/mail-service';
import { communicationTemplate, renderMergeFields, type CommunicationKind, type CommunicationMergeField } from '@missa/workspace-engine';

export interface OrganizationCommunicationProps {
  kind: CommunicationKind;
  organizationName: string;
  /** Already-rendered subject and body (merge fields replaced). */
  subject: string;
  body: string;
  signoff: string;
  submissionId?: string;
}

/**
 * The organization letter the Communications Manager sends: the organization's
 * name leads, the body is the organization's own words split into paragraphs,
 * and Missa appears only as the carrier. Plain text in, escaped on render.
 */
export function renderOrganizationCommunication(props: OrganizationCommunicationProps): { subject: string; html: string; text: string } {
  const template = communicationTemplate(props.kind);
  const paragraphs = props.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
  const trackerUrl = props.submissionId
    ? new URL(`/tracker/submissions/${encodeURIComponent(props.submissionId)}`, `${siteUrl()}/`).toString()
    : new URL('/tracker?view=submissions', `${siteUrl()}/`).toString();
  const blocks: LetterBlock[] = [
    ...paragraphs.map((text) => ({ kind: 'paragraph' as const, text })),
    { kind: 'signoff', text: props.signoff },
    { kind: 'action', label: 'See it in your Tracker', url: trackerUrl },
  ];
  const letter: LetterProps = {
    subject: props.subject,
    preheader: paragraphs[0] ?? props.subject,
    from: { kind: 'organisation', name: props.organizationName },
    headline: template.headline,
    blocks,
    footer: {
      reason: `${props.organizationName} wrote this letter and sent it through Missa. Your Tracker keeps your submission record and every letter about it.`,
      preferencesUrl: new URL('/inbox', `${siteUrl()}/`).toString(),
      senderLine: `${props.organizationName} sent this through Missa`,
    },
  };
  return { subject: props.subject, html: renderLetter(letter), text: letterText(letter) };
}

export type CommunicationMergeValues = Partial<Record<CommunicationMergeField, string>>;

/** Renders subject and body templates for one recipient, then the letter. */
export function renderCommunicationForRecipient(input: {
  kind: CommunicationKind;
  organizationName: string;
  subjectTemplate: string;
  bodyTemplate: string;
  signoff: string;
  values: CommunicationMergeValues;
  submissionId?: string;
}): { subject: string; html: string; text: string } {
  return renderOrganizationCommunication({
    kind: input.kind,
    organizationName: input.organizationName,
    subject: renderMergeFields(input.subjectTemplate, input.values),
    body: renderMergeFields(input.bodyTemplate, input.values),
    signoff: input.signoff,
    submissionId: input.submissionId,
  });
}

export async function deliverOrganizationCommunication(
  input: {
    rendered: { subject: string; html: string; text: string };
    recipientEmail: string;
    recipientAccountId: string;
    organizationId: string;
    actorAccountId: string;
    batchId: string;
    submissionId: string;
    kind: CommunicationKind;
    replyTo?: string;
    templateVersion: string;
    /** Marks test sends so they never count as a delivered letter. */
    test?: boolean;
  },
  connectionString?: string,
): Promise<SendMailReport> {
  return sendMail({
    recipientEmail: input.recipientEmail,
    recipientAccountId: input.recipientAccountId,
    actorAccountId: input.actorAccountId,
    organizationId: input.organizationId,
    kind: input.test ? 'organization-letter-test' : 'organization-letter',
    category: 'application_actionable',
    idempotencyKey: input.test ? `organization-letter-test:${input.batchId}:${input.actorAccountId}:${Date.now()}` : `organization-letter:${input.batchId}:${input.submissionId}`,
    subject: input.test ? `[Test] ${input.rendered.subject}` : input.rendered.subject,
    html: input.rendered.html,
    text: input.rendered.text,
    replyTo: input.replyTo,
    templateKey: `organization-communication:${input.kind}`,
    templateVersion: input.templateVersion,
    metadata: { batchId: input.batchId, submissionId: input.submissionId, kind: input.kind, test: input.test === true },
    connectionString,
    retryFailed: true,
  });
}
