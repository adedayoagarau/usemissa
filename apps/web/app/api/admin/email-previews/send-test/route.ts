import { NextResponse } from 'next/server';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';
import { sendMail } from '@/lib/mail-service';
import type { MessageCategory } from '@/lib/email-preference-evaluator';
import { renderWelcomeEmail } from '@/emails/welcome';
import { renderDeadlineReminderEmail } from '@/emails/deadline-reminder';
import { renderDecisionLetter } from '@/emails/decision-letter';
import { renderAlertDigestEmail } from '@/emails/alert-digest';
import { renderPasswordResetEmail } from '@/emails/password-reset';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (!auth.ok) {
    return platformAdminAuthResponse(auth);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { templateKey, recipientEmail } = (body || {}) as {
    templateKey?: unknown;
    recipientEmail?: unknown;
  };

  if (typeof templateKey !== 'string' || !templateKey) {
    return NextResponse.json({ error: 'Template key is required.' }, { status: 400 });
  }

  if (typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
    return NextResponse.json({ error: 'Valid recipient email is required.' }, { status: 400 });
  }

  const targetEmail = recipientEmail.trim().toLowerCase();
  const testAccountId = 'admin_test_preview_acct';

  let subject = '';
  let html = '';
  let text = '';
  let category: MessageCategory = 'notification_digest';

  switch (templateKey) {
    case 'welcome': {
      const rendered = renderWelcomeEmail({
        accountId: testAccountId,
        email: targetEmail,
        displayName: 'Preview Admin',
      });
      subject = `[PREVIEW] ${rendered.subject}`;
      html = rendered.html;
      text = rendered.text;
      category = 'notification_digest';
      break;
    }
    case 'deadline-single': {
      const rendered = renderDeadlineReminderEmail({
        accountId: testAccountId,
        email: targetEmail,
        opportunities: [{
          id: 'opp-preview-1',
          title: 'Virginia Quarterly Review Annual Fiction Prize',
          organizationName: 'Virginia Quarterly Review',
          deadlineFormatted: 'October 15, 2026',
          daysRemaining: 3,
          categoryLabel: 'Fiction Prize',
        }],
      });
      subject = `[PREVIEW] ${rendered.subject}`;
      html = rendered.html;
      text = rendered.text;
      break;
    }
    case 'deadline-multi': {
      const rendered = renderDeadlineReminderEmail({
        accountId: testAccountId,
        email: targetEmail,
        opportunities: [
          {
            id: 'opp-preview-1',
            title: 'Virginia Quarterly Review Annual Fiction Prize',
            organizationName: 'Virginia Quarterly Review',
            deadlineFormatted: 'October 15, 2026',
            daysRemaining: 3,
            categoryLabel: 'Fiction Prize',
          },
          {
            id: 'opp-preview-2',
            title: 'MacDowell Fellowship Winter Residency',
            organizationName: 'MacDowell Colony',
            deadlineFormatted: 'October 20, 2026',
            daysRemaining: 8,
            categoryLabel: 'Residency',
          },
        ],
      });
      subject = `[PREVIEW] ${rendered.subject}`;
      html = rendered.html;
      text = rendered.text;
      break;
    }
    case 'decision-accepted': {
      const rendered = renderDecisionLetter({
        submitterName: 'Preview Admin',
        organizationName: 'The Paris Review',
        workTitle: 'The Sound of Rain in Winter',
        outcome: 'accepted',
        editorialNote: 'We were captivated by the subtle pacing and vivid imagery of your piece. We would be honored to include it in our forthcoming winter edition.',
        nextSteps: 'Our managing editor will follow up within five business days with publication contracts and editorial proofs.',
      });
      subject = `[PREVIEW] ${rendered.subject}`;
      html = rendered.html;
      text = rendered.text;
      category = 'application_actionable';
      break;
    }
    case 'decision-declined': {
      const rendered = renderDecisionLetter({
        submitterName: 'Preview Admin',
        organizationName: 'Granta Magazine',
        workTitle: 'Night Crossing',
        outcome: 'declined',
        editorialNote: 'Our queue was exceptionally competitive this cycle. Although this piece is not the right fit for Granta right now, we encourage you to submit future work.',
      });
      subject = `[PREVIEW] ${rendered.subject}`;
      html = rendered.html;
      text = rendered.text;
      category = 'application_actionable';
      break;
    }
    case 'decision-waitlisted': {
      const rendered = renderDecisionLetter({
        submitterName: 'Preview Admin',
        organizationName: 'Tin House Summer Workshop',
        workTitle: 'Selected Poems',
        outcome: 'waitlisted',
        editorialNote: 'Your portfolio scored among our top candidates. We would like to place you on our active waitlist as final confirmations arrive.',
      });
      subject = `[PREVIEW] ${rendered.subject}`;
      html = rendered.html;
      text = rendered.text;
      category = 'application_actionable';
      break;
    }
    case 'alert-digest': {
      const rendered = renderAlertDigestEmail({
        accountId: testAccountId,
        email: targetEmail,
        alerts: [
          {
            id: 'alert-prev-1',
            audience: 'user',
            kind: 'new-match',
            title: 'New match: Pushcart Nominations Open',
            body: 'A call matching your saved search "Poetry & Essays" was published today.',
            reason: 'Matches your saved search "Poetry & Essays"',
            read: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'alert-prev-2',
            audience: 'user',
            kind: 'followed-org-new-call',
            title: 'Substack Fellowship opened applications',
            body: 'An organization you follow announced a new open call.',
            reason: 'You follow Substack Writers',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
      });
      subject = `[PREVIEW] ${rendered.subject}`;
      html = rendered.html;
      text = `${subject}\n\nReview matches in Missa: https://usemissa.com/inbox`;
      break;
    }
    case 'password-reset': {
      const rendered = renderPasswordResetEmail({
        accountId: testAccountId,
        email: targetEmail,
        resetToken: 'preview-token-12345',
        displayName: 'Preview Admin',
      });
      subject = `[PREVIEW] ${rendered.subject}`;
      html = rendered.html;
      text = rendered.text;
      category = 'security_critical';
      break;
    }
    default:
      return NextResponse.json({ error: `Unknown template key: ${templateKey}` }, { status: 400 });
  }

  const report = await sendMail({
    recipientEmail: targetEmail,
    recipientAccountId: testAccountId,
    kind: 'admin-preview-test',
    category,
    idempotencyKey: `preview-test:${templateKey}:${targetEmail}:${Date.now()}`,
    subject,
    html,
    text,
    templateKey,
    templateVersion: 'preview.v1',
    connectionString: process.env.DATABASE_URL,
    retryFailed: false,
  });

  return NextResponse.json({
    ok: report.status === 'sent' || report.status === 'replayed',
    report,
  });
}
