import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { AppNav } from '@/components/app-nav';

/** Auth-gated shell for the organization-facing (Missa Workspace) surface. */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');

  return (
    <div>
      <AppNav email={session.account.email} />
      {children}
    </div>
  );
}
