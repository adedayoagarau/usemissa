import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { safeAuthRedirect } from '@/lib/authRedirect';
import { CreatorShell } from '@/components/creator-shell';
import { getEngine } from '@/lib/engine';

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
  const radar = session.memberships.length ? await getEngine() : undefined;
  const organizations = session.memberships.map((membership) => ({ id: membership.organizationId, name: radar?.store.organizations.get(membership.organizationId)?.name ?? membership.organizationId }));

  return <CreatorShell email={session.account.email} organizations={organizations} isAdmin={session.account.isAdmin}>
    <main className="mx-auto max-w-[1600px] px-6 py-6 sm:py-8">{children}</main>
  </CreatorShell>;
}
