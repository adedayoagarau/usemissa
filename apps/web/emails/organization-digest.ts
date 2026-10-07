import { letterText, renderLetter, type LetterBlock, type LetterProps } from './components/letter';
import { siteUrl } from '../lib/siteUrl';
import { sendMail, type SendMailReport } from '../lib/mail-service';
import type { OrganizationDigestFacts } from '../lib/organizationDigest';

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** The morning summary an organization admin receives through Missa. */
export function renderOrganizationDigestEmail(input: { organizationName: string; recipientName?: string; facts: OrganizationDigestFacts }): { subject: string; html: string; text: string } {
  const { facts } = input;
  const base = `${siteUrl()}/organization/${encodeURIComponent(facts.organizationId)}`;
  const waiting = facts.lettersAwaitingApproval + facts.lettersNeedingAttention + facts.overdueReads.length + facts.questionsWaiting;
  const subject = waiting > 0 ? `${input.organizationName}: ${plural(waiting, 'thing needs', 'things need')} you today` : `${input.organizationName}: yesterday in Missa`;
  const blocks: LetterBlock[] = [
    { kind: 'paragraph', text: input.recipientName ? `Good morning, ${input.recipientName}.` : 'Good morning.' },
    { kind: 'facts', facts: [
      { label: 'New submissions in the last day', value: String(facts.newSubmissions) },
      { label: 'Reads completed in the last day', value: String(facts.readsCompleted) },
      { label: 'Reads still open', value: String(facts.openReads) },
      { label: 'Decisions recorded in the last day', value: String(facts.decisionsRecorded) },
      { label: 'Letters awaiting approval', value: String(facts.lettersAwaitingApproval) },
      { label: 'Letters scheduled in the next day', value: String(facts.lettersScheduledSoon) },
      { label: 'Questions from submitters waiting', value: String(facts.questionsWaiting) },
    ] },
  ];
  if (facts.overdueReads.length) blocks.push({ kind: 'paragraph', text: `Past the due date: ${facts.overdueReads.slice(0, 5).map((reader) => `${reader.label} (${reader.count})`).join(', ')}${facts.overdueReads.length > 5 ? `, and ${facts.overdueReads.length - 5} more` : ''}. You can nudge them or move their reads from Reviews.` });
  if (facts.lettersNeedingAttention) blocks.push({ kind: 'paragraph', text: `${plural(facts.lettersNeedingAttention, 'letter has', 'letters have')} recipients that were not sent. Open Messages to retry them.` });
  blocks.push({ kind: 'action', label: waiting > 0 ? 'Open what needs you' : 'Open your organization', url: facts.lettersAwaitingApproval || facts.lettersNeedingAttention || facts.questionsWaiting ? `${base}/messages` : facts.overdueReads.length ? `${base}/reviews` : `${base}/overview` });
  const letter: LetterProps = {
    subject,
    preheader: `${plural(facts.newSubmissions, 'new submission', 'new submissions')}, ${plural(facts.readsCompleted, 'read', 'reads')} completed, ${plural(facts.lettersAwaitingApproval, 'letter', 'letters')} awaiting approval.`,
    from: { kind: 'organisation', name: input.organizationName },
    headline: 'Your day in Missa',
    blocks,
    footer: {
      reason: `You receive this because you are an owner or admin of ${input.organizationName}. Any admin can turn the daily summary off in Settings, under Communications.`,
      preferencesUrl: `${base}/settings?section=communications`,
      preferencesLabel: 'Communication settings',
      senderLine: 'Sent by Missa',
    },
  };
  return { subject, html: renderLetter(letter), text: letterText(letter) };
}

export function deliverOrganizationDigest(input: { organizationName: string; recipientName?: string; recipientEmail: string; recipientAccountId: string; facts: OrganizationDigestFacts; day: string }, connectionString?: string): Promise<SendMailReport> {
  const rendered = renderOrganizationDigestEmail(input);
  return sendMail({
    recipientEmail: input.recipientEmail,
    recipientAccountId: input.recipientAccountId,
    organizationId: input.facts.organizationId,
    kind: 'organization-digest',
    category: 'notification_digest',
    idempotencyKey: `organization-digest:${input.facts.organizationId}:${input.recipientAccountId}:${input.day}`,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    templateKey: 'organization-digest',
    templateVersion: 'organization-digest.v1',
    metadata: { day: input.day },
    connectionString,
    retryFailed: false,
  });
}
