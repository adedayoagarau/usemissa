import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { AppNav } from '@/components/app-nav';

/** Auth-gated shell for the submitter-facing (Missa Passport) surface. */
export default async function PassportLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');

  return (
    <div>
      <AppNav email={session.account.email} />
      <main className="mx-auto max-w-[1600px] px-6 py-8">{children}</main>
    </div>
  );
}
