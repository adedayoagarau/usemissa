'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/** Shared top nav for both the Passport and Workspace route groups --
 * labels match docs/missa-naming-decisions.md exactly. */
export function AppNav({ email }: { email: string }) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-6 border-b border-border px-6 py-3">
      <span className="font-heading text-xl font-semibold text-foreground">Missa</span>
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
        <Link href="/workspace" className="text-foreground hover:text-primary">
          Workspace
        </Link>
        <Link href="/submissions" className="text-foreground hover:text-primary">
          Submissions
        </Link>
        <Link href="/reviewer" className="text-foreground hover:text-primary">
          Your reviews
        </Link>
      </nav>
      <span className="ml-auto text-sm text-muted-foreground">{email}</span>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          router.push('/login');
          router.refresh();
        }}
      >
        Log out
      </Button>
    </header>
  );
}
