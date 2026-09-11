import { AdminPageFrame } from '@/components/platform-admin';
import { requirePlatformAdminPage } from '@/lib/platformAdmin';
import { EmailPreviewStudioClient, type EmailTemplateDefinition } from './email-preview-client';
import { renderWelcomeEmail } from '@/emails/welcome';
import { renderDeadlineReminderEmail } from '@/emails/deadline-reminder';
import { renderDecisionLetter } from '@/emails/decision-letter';
import { renderAlertDigestEmail } from '@/emails/alert-digest';
import { renderPasswordResetEmail } from '@/emails/password-reset';

export const dynamic = 'force-dynamic';

export default async function AdminEmailPreviewsPage() {
  const session = await requirePlatformAdminPage();
  const testAccountId = 'admin_preview_dummy';
  const testEmail = session.account.email;

  const welcome = renderWelcomeEmail({
    accountId: testAccountId,
    email: testEmail,
    displayName: session.account.displayName || 'Jane Creator',
  });

  const deadlineSingle = renderDeadlineReminderEmail({
    accountId: testAccountId,
    email: testEmail,
    opportunities: [{
      id: 'opp-1',
      title: 'Virginia Quarterly Review Annual Fiction Prize',
      organizationName: 'Virginia Quarterly Review',
      deadlineFormatted: 'October 15, 2026',
      daysRemaining: 3,
      categoryLabel: 'Fiction Prize',
    }],
  });

  const deadlineMulti = renderDeadlineReminderEmail({
    accountId: testAccountId,
    email: testEmail,
    opportunities: [
      {
        id: 'opp-1',
        title: 'Virginia Quarterly Review Annual Fiction Prize',
        organizationName: 'Virginia Quarterly Review',
        deadlineFormatted: 'October 15, 2026',
        daysRemaining: 3,
        categoryLabel: 'Fiction Prize',
      },
      {
        id: 'opp-2',
        title: 'MacDowell Fellowship Winter Residency',
        organizationName: 'MacDowell Colony',
        deadlineFormatted: 'October 20, 2026',
        daysRemaining: 8,
        categoryLabel: 'Residency',
      },
      {
        id: 'opp-3',
        title: 'Tin House Summer Poetry Workshop',
        organizationName: 'Tin House',
        deadlineFormatted: 'October 24, 2026',
        daysRemaining: 12,
        categoryLabel: 'Workshop',
      },
    ],
  });

  const decisionAccepted = renderDecisionLetter({
    submitterName: 'Jane Creator',
    organizationName: 'The Paris Review',
    workTitle: 'The Sound of Rain in Winter',
    outcome: 'accepted',
    editorialNote: 'We were captivated by the subtle pacing and vivid imagery of your piece. We would be honored to include it in our forthcoming winter edition.',
    nextSteps: 'Our managing editor will follow up within five business days with publication contracts and editorial proofs.',
  });

  const decisionDeclined = renderDecisionLetter({
    submitterName: 'Jane Creator',
    organizationName: 'Granta Magazine',
    workTitle: 'Night Crossing',
    outcome: 'declined',
    editorialNote: 'Our queue was exceptionally competitive this cycle. Although this piece is not the right fit for Granta right now, we encourage you to submit future work.',
  });

  const decisionWaitlisted = renderDecisionLetter({
    submitterName: 'Jane Creator',
    organizationName: 'Tin House Summer Workshop',
    workTitle: 'Selected Poems',
    outcome: 'waitlisted',
    editorialNote: 'Your portfolio scored among our top candidates. We would like to place you on our active waitlist as final confirmations arrive.',
  });

  const alertDigest = renderAlertDigestEmail({
    accountId: testAccountId,
    email: testEmail,
    alerts: [
      {
        id: 'alert-1',
        audience: 'user',
        kind: 'new-match',
        title: 'New match: Pushcart Nominations Open',
        body: 'A call matching your saved search "Poetry & Essays" was published today.',
        reason: 'Matches your saved search "Poetry & Essays"',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alert-2',
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

  const passwordReset = renderPasswordResetEmail({
    accountId: testAccountId,
    email: testEmail,
    resetToken: 'mock-reset-token-for-preview-studio',
    displayName: session.account.displayName || 'Jane Creator',
  });

  const templates: EmailTemplateDefinition[] = [
    {
      key: 'welcome',
      label: 'Welcome onboarding',
      category: 'marketing',
      subject: welcome.subject,
      html: welcome.html,
      text: welcome.text,
      description: 'Sent immediately after password signup or invite claim to guide user onboarding.',
    },
    {
      key: 'deadline-single',
      label: 'Deadline countdown (single call)',
      category: 'notification_digest',
      subject: deadlineSingle.subject,
      html: deadlineSingle.html,
      text: deadlineSingle.text,
      description: 'High-urgency alert when a single tracked opportunity is closing in 1, 3, or 7 days.',
    },
    {
      key: 'deadline-multi',
      label: 'Upcoming deadlines (multiple calls)',
      category: 'notification_digest',
      subject: deadlineMulti.subject,
      html: deadlineMulti.html,
      text: deadlineMulti.text,
      description: 'Batched digest sent when multiple tracked opportunities are closing soon.',
    },
    {
      key: 'decision-accepted',
      label: 'Decision letter: Accepted',
      category: 'application_actionable',
      subject: decisionAccepted.subject,
      html: decisionAccepted.html,
      text: decisionAccepted.text,
      description: 'Official organization acceptance notice with custom editorial notes and next steps.',
    },
    {
      key: 'decision-declined',
      label: 'Decision letter: Declined',
      category: 'application_actionable',
      subject: decisionDeclined.subject,
      html: decisionDeclined.html,
      text: decisionDeclined.text,
      description: 'Respectful, calm declination letter preserving editorial feedback.',
    },
    {
      key: 'decision-waitlisted',
      label: 'Decision letter: Waitlisted',
      category: 'application_actionable',
      subject: decisionWaitlisted.subject,
      html: decisionWaitlisted.html,
      text: decisionWaitlisted.text,
      description: 'Waitlist placement notice keeping submitters informed during editorial rounds.',
    },
    {
      key: 'alert-digest',
      label: 'Radar alert digest',
      category: 'notification_digest',
      subject: alertDigest.subject,
      html: alertDigest.html,
      text: `${alertDigest.subject}\n\nReview matches in Missa: https://usemissa.com/inbox`,
      description: 'Periodic digest of new opportunity matches and followed organization announcements.',
    },
    {
      key: 'password-reset',
      label: 'Password reset',
      category: 'security_critical',
      subject: passwordReset.subject,
      html: passwordReset.html,
      text: passwordReset.text,
      description: 'Mandatory transactional recovery link expiring in 1 hour.',
    },
  ];

  return (
    <AdminPageFrame>
      <div className="space-y-6">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Platform scope · Communications
          </p>
          <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-foreground">
            Email Preview Studio
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Visual inspection, responsive frame verification (Desktop 600px vs. Mobile 390px), plain-text audit, and live test-dispatch for all Missa journey templates.
          </p>
        </header>

        <EmailPreviewStudioClient
          templates={templates}
          adminEmail={session.account.email}
        />
      </div>
    </AdminPageFrame>
  );
}
