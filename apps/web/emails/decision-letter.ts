import { renderBaseEmailLayout, escapeHtml, EMAIL_COLORS } from './components/base-layout';
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

  const outcomeBadge =
    outcomeKey === 'accepted'
      ? `<span style="display:inline-block;padding:4px 10px;background-color:#edf3f0;color:#1d4037;border-radius:6px;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Accepted</span>`
      : outcomeKey === 'waitlisted' || outcomeKey === 'shortlisted'
      ? `<span style="display:inline-block;padding:4px 10px;background-color:#f5ecd9;color:#78551e;border-radius:6px;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(props.outcome)}</span>`
      : `<span style="display:inline-block;padding:4px 10px;background-color:#f7f7f7;color:#45413d;border-radius:6px;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Decision</span>`;

  const subject = `Update regarding "${props.workTitle}" — ${props.organizationName}`;

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

  const editorialNoteHtml = props.editorialNote
    ? `<div style="margin:20px 0;padding:16px 18px;background-color:#ffffff;border:1px solid ${EMAIL_COLORS.border};border-left:3px solid ${EMAIL_COLORS.forest600};border-radius:4px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${EMAIL_COLORS.forest600};margin-bottom:6px;">Note from the editors:</div>
        <div style="font-size:14px;line-height:22px;color:${EMAIL_COLORS.inkSecondary};white-space:pre-wrap;">${escapeHtml(props.editorialNote)}</div>
      </div>`
    : '';

  const nextStepsHtml = props.nextSteps
    ? `<div style="margin:16px 0;font-size:14px;line-height:22px;color:${EMAIL_COLORS.ink};">
        <strong>Next Steps:</strong> ${escapeHtml(props.nextSteps)}
      </div>`
    : '';

  const bodyHtml = `
    <div style="margin-bottom:18px;">${outcomeBadge}</div>
    <p style="margin:0 0 16px;font-size:15px;line-height:24px;">${greeting}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:24px;">${outcomeStatement}</p>
    ${editorialNoteHtml}
    ${nextStepsHtml}
    <p style="margin:16px 0 0;font-size:14px;line-height:22px;color:${EMAIL_COLORS.inkMuted};">
      Thank you for your time, trust, and creative contribution.
    </p>
  `;

  const submissionUrl = props.submissionId
    ? new URL(`/tracker`, `${siteUrl()}/`).toString()
    : `${siteUrl()}/tracker`;

  const html = renderBaseEmailLayout({
    subject,
    preheader: `Decision update on your submission to ${props.organizationName}.`,
    eyebrow: props.organizationName,
    title: 'Submission Decision',
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
