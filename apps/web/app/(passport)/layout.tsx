import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';

/**
 * Auth-gated shell for the submitter-facing (Missa Passport) surface.
 * Nav labels match docs/missa-naming-decisions.md exactly (Opportunities /
 * Tracker are live; Home/Library/Calendar/Messages/Insights land in later
 * epics -- not stubbed here to avoid dead links).
 */
export default async function PassportLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');

  return (
    <div>
      <header className="flex items-center gap-6 border-b border-border px-6 py-3">
        <span className="text-lg font-semibold text-foreground">Missa</span>
        <nav className="flex gap-4 text-sm">
          <Link href="/opportunities" className="text-foreground hover:text-primary">
            Opportunities
          </Link>
          <Link href="/inbox" className="text-foreground hover:text-primary">
            Inbox
          </Link>
          <Link href="/tracker" className="text-foreground hover:text-primary">
            Tracker
          </Link>
        </nav>
        <span className="ml-auto text-sm text-muted-foreground">{session.account.email}</span>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
