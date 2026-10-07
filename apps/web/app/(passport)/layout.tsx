import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { safeAuthRedirect } from '@/lib/authRedirect';
import { CreatorShell } from '@/components/creator-shell';
import { creatorShellOrganizations } from '@/lib/creatorShellOrganizations';
import { getCreatorNotificationRepository } from '@/lib/creatorRepositories';
import { EmailChoicePrompt } from '@/components/missa/email-choice-prompt';
import { emailPlanEligible } from '@/lib/sms-preferences';

/** Private creator surface: never index, and name it for browser chrome. */
export const metadata = {
  title: 'Your Missa workspace',
  description:
    'Your saved opportunities, applications, deadlines, and materials in Missa.',
  robots: { index: false, follow: false },
};

/** Auth-gated shell for the creator-facing Missa surface. */
export default async function PassportLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    const requestHeaders = await headers();
    const returnPath = safeAuthRedirect(requestHeaders.get('x-missa-request-path') ?? undefined);
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }
  const organizations = await creatorShellOrganizations(session.memberships);

  // Accounts from before email was on by default are asked once; the prompt
  // must never keep the workspace from rendering.
  const preferences = await getCreatorNotificationRepository()?.preferences(session.account.id).catch(() => undefined);
  // Free keeps reminders in the Inbox, so the question is only about The Sunday List.
  const remindersByEmail = preferences?.emailChoiceNeeded ? await emailPlanEligible(session.account.id) : true;

  return <CreatorShell email={session.account.email} organizations={organizations} isAdmin={session.account.isAdmin}>
    <main className="mx-auto max-w-[1600px] px-6 py-6 sm:py-8">
      {preferences?.emailChoiceNeeded ? <EmailChoicePrompt revision={preferences.revision} remindersByEmail={remindersByEmail} /> : null}
      {children}
    </main>
  </CreatorShell>;
}
