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
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:shadow-lg">Skip to content</a>
      <AppNav email={session.account.email} />
      <main id="main-content" className="mx-auto max-w-[1600px] px-6 py-8">{children}</main>
    </div>
  );
}
