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
  const greeting = name ? `Dear ${escapeHtml(name)},` : 'Dear Submitter,';
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
    outcomeStatement = `We are delighted to inform you that <strong>"${workTitle}"</strong> has been accepted for publication with <strong>${orgName}</strong>.`;
  } else if (outcomeKey === 'declined') {
    outcomeStatement = `Thank you for giving us the opportunity to consider <strong>"${workTitle}"</strong>. While we gave your work careful thought, it is not the right fit for <strong>${orgName}</strong> at this time.`;
  } else if (outcomeKey === 'waitlisted') {
    outcomeStatement = `Thank you for submitting <strong>"${workTitle}"</strong> to <strong>${orgName}</strong>. We would like to place your piece on our waitlist as we finalize our selections.`;
  } else {
    outcomeStatement = `We have completed our review of <strong>"${workTitle}"</strong> for <strong>${orgName}</strong>.`;
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
    lede: isAcceptance ? `“${props.workTitle}” has been taken for publication.` : undefined,
    bodyHtml,
    callToAction: {
      label: 'View in Tracker',
      url: submissionUrl,
    },
  });

  const text = `Decision: ${props.workTitle} — ${props.organizationName}\n\n${name ? `Dear ${name},\n\n` : 'Dear Submitter,\n\n'}${outcomeKey === 'accepted' ? `We are delighted to inform you that "${props.workTitle}" has been accepted with ${props.organizationName}.` : `Thank you for submitting "${props.workTitle}" to ${props.organizationName}.`}\n\n${props.editorialNote ? `Note from editors:\n${props.editorialNote}\n\n` : ''}${props.nextSteps ? `Next steps:\n${props.nextSteps}\n\n` : ''}View your submission record: ${submissionUrl}`;

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
    templateVersion: 'decision-letter.v1',
    metadata: { workId: props.workId, decisionId: props.decisionId },
    connectionString,
    retryFailed: false,
  });
}
