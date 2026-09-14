import { renderBaseEmailLayout, escapeHtml, EMAIL_COLORS, EMAIL_FONTS } from './components/base-layout';
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

export function renderDecisionLetter(props: DecisionLetterProps): { subject: string; html: string; text: string } {
  const name = props.submitterName?.trim() || '';
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hello,';
  const orgName = escapeHtml(props.organizationName);
  const workTitle = escapeHtml(props.workTitle);
  const outcomeKey = props.outcome.toLowerCase();

  const subject = `Update regarding "${props.workTitle}" — ${props.organizationName}`;

  // An acceptance is the one moment in this product that earns the loud
  // register. A rejection gets the quiet one — no citron, no celebration.
  const isAcceptance = outcomeKey === 'accepted';
  const isHold = outcomeKey === 'waitlisted' || outcomeKey === 'shortlisted';

  const statusWord = isAcceptance
    ? 'Accepted'
    : isHold
      ? `${props.outcome.charAt(0).toUpperCase()}${props.outcome.slice(1).toLowerCase()}`
      : '';

  const title = isAcceptance
    ? `Accepted by ${props.organizationName}.`
    : isHold
      ? `${statusWord} at ${props.organizationName}.`
      : `A decision from ${props.organizationName}.`;

  let outcomeStatement = '';
  if (outcomeKey === 'accepted') {
    outcomeStatement = `<strong>${orgName}</strong> wants to publish <strong>“${workTitle}”</strong>.`;
  } else if (outcomeKey === 'declined') {
    outcomeStatement = `<strong>${orgName}</strong> read <strong>“${workTitle}”</strong> and decided not to take it this time. They thanked you for sending it.`;
  } else if (outcomeKey === 'waitlisted') {
    outcomeStatement = `<strong>${orgName}</strong> has put <strong>“${workTitle}”</strong> on the waitlist while they finish choosing.`;
  } else {
    outcomeStatement = `<strong>${orgName}</strong> has finished reading <strong>“${workTitle}”</strong>.`;
  }

  // The editors' own words are the most valuable thing in this email, so they
  // are set in Newsreader as a quotation rather than boxed as a notice.
  const editorialNoteHtml = props.editorialNote
    ? `<blockquote style="margin:26px 0;padding:0 0 0 20px;border-left:2px solid ${EMAIL_COLORS.forest600};">
        <div class="m-text" style="font-family:${EMAIL_FONTS.editorial};font-size:19px;font-weight:400;line-height:30px;letter-spacing:-0.01em;color:${EMAIL_COLORS.ink};white-space:pre-wrap;">${escapeHtml(props.editorialNote)}</div>
        <div class="m-muted" style="margin-top:10px;font-family:${EMAIL_FONTS.interface};font-size:13px;line-height:19px;color:${EMAIL_COLORS.inkMuted};">The editors at ${orgName}</div>
      </blockquote>`
    : '';

  const nextStepsHtml = props.nextSteps
    ? `<p style="margin:0 0 18px;"><strong>What happens next.</strong> ${escapeHtml(props.nextSteps)}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 18px;">${greeting}</p>
    <p style="margin:0 0 18px;">${outcomeStatement}</p>
    ${editorialNoteHtml}
    ${nextStepsHtml}
  `;

  const submissionUrl = props.submissionId
    ? new URL(`/tracker`, `${siteUrl()}/`).toString()
    : `${siteUrl()}/tracker`;

  const html = renderBaseEmailLayout({
    subject,
    register: isAcceptance ? 'expressive' : 'operational',
    preheader: `Decision update on your submission to ${props.organizationName}.`,
    title,
    titleHighlight: statusWord || undefined,
    lede: isAcceptance ? `They are taking “${props.workTitle}”.` : undefined,
    bodyHtml,
    callToAction: {
      label: 'Open your Tracker',
      url: submissionUrl,
    },
  });

  // Same words as the HTML, without the markup.
  const plainStatement = outcomeStatement.replace(/<[^>]+>/g, '');

  const text = [
    title,
    '',
    name ? `Hi ${name},` : 'Hello,',
    '',
    plainStatement,
    ...(props.editorialNote ? ['', `From the editors at ${props.organizationName}:`, props.editorialNote] : []),
    ...(props.nextSteps ? ['', `What happens next. ${props.nextSteps}`] : []),
    '',
    `Open your Tracker: ${submissionUrl}`,
  ].join('\n');

  return { subject, html, text };
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
    templateVersion: 'decision-letter.v2',
    metadata: { workId: props.workId, decisionId: props.decisionId },
    connectionString,
    retryFailed: false,
  });
}
