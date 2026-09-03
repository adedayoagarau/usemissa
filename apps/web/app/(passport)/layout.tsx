import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { safeAuthRedirect } from '@/lib/authRedirect';
import { CreatorShell } from '@/components/creator-shell';
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

  return <CreatorShell email={session.account.email} organizations={organizations} isAdmin={session.account.isAdmin}>
    <main className="mx-auto max-w-[1600px] px-6 py-6 sm:py-8">{children}</main>
  </CreatorShell>;
}
