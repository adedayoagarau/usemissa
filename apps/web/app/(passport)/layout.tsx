import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { safeAuthRedirect } from '@/lib/authRedirect';
import { AppNav } from '@/components/app-nav';
import { getEngine } from '@/lib/engine';

/** Auth-gated shell for the creator-facing Missa surface. */
export default async function PassportLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    const requestHeaders = await headers();
    const returnPath = safeAuthRedirect(requestHeaders.get('x-missa-request-path') ?? undefined);
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }
  const radar = await getEngine();
  const organizations = session.memberships.map((membership) => ({ id: membership.organizationId, name: radar.store.organizations.get(membership.organizationId)?.name ?? membership.organizationId }));

  return (
    <div className="min-h-screen bg-white">
      <AppNav email={session.account.email} userId={session.account.userId} isAdmin={session.account.isAdmin} organizations={organizations} />
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
