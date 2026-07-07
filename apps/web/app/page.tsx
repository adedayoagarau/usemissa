import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session) {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-foreground">Missa</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as {session.account.email}. This is the Story 1.2 placeholder shell -- Opportunities,
        Tracker, and Workspace views land in Epic 3 and Epic 6.
      </p>
      <Button className="mt-6">Placeholder primary action (shadcn Button, themed)</Button>
    </main>
  );
}
