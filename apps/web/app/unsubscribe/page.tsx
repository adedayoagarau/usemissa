import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { verifyUnsubscribeToken } from '@/lib/email-tokens';
import { pageMetadata } from '@/lib/seo';
import { unsubscribeCategoryLabel } from '@/lib/unsubscribe';

export const metadata = pageMetadata({
  title: 'Unsubscribe',
  description: 'Stop Missa notification emails.',
  path: '/unsubscribe',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string; result?: string; category?: string }>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-sm">
        <h1 className="text-2xl font-medium text-foreground mb-2 font-serif">{title}</h1>
        {children}
      </div>
    </main>
  );
}

function SettingsLink({ label = 'Open email settings' }: { label?: string }) {
  return (
    <Link href="/inbox" className={buttonVariants({ variant: 'outline' })}>
      {label}
    </Link>
  );
}

/**
 * Opening this page never changes settings. Mail scanners follow links, so
 * the change happens only when the person presses the button, which posts to
 * /api/me/unsubscribe and returns here with the result.
 */
export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token, result, category } = await searchParams;

  if (result === 'updated') {
    return (
      <Panel title="You are unsubscribed">
        <p className="text-sm text-muted-foreground mb-6">
          Missa will stop sending {unsubscribeCategoryLabel(category ?? 'all')}. Account security and submission
          emails still arrive.
        </p>
        <SettingsLink label="Change email settings" />
      </Panel>
    );
  }

  if (result === 'unavailable' || result === 'account-not-found') {
    return (
      <Panel title="We could not unsubscribe you">
        <p className="text-sm text-muted-foreground mb-6">
          {result === 'unavailable'
            ? 'Email settings are unavailable right now. Try the link again later, or turn emails off in your settings.'
            : 'We could not find the account for this link. Sign in to change your email settings.'}
        </p>
        <SettingsLink />
      </Panel>
    );
  }

  if (!token || result === 'invalid') {
    return (
      <Panel title="This link does not work">
        <p className="text-sm text-muted-foreground mb-6">
          The unsubscribe link is incomplete or has expired. You can turn emails off in your settings.
        </p>
        <SettingsLink />
      </Panel>
    );
  }

  const verification = verifyUnsubscribeToken(token);
  if (!verification.valid) {
    return (
      <Panel title="This link does not work">
        <p className="text-sm text-muted-foreground mb-6">
          The unsubscribe link is incomplete or has expired. You can turn emails off in your settings.
        </p>
        <SettingsLink />
      </Panel>
    );
  }

  return (
    <Panel title="Unsubscribe from Missa emails">
      <p className="text-sm text-muted-foreground mb-6">
        Stop sending {unsubscribeCategoryLabel(verification.category)} to{' '}
        <span className="font-medium text-foreground">{verification.email}</span>?
      </p>
      <form method="post" action="/api/me/unsubscribe" className="flex flex-col sm:flex-row gap-3 justify-center">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="source" value="page" />
        <Button type="submit">Unsubscribe</Button>
        <SettingsLink label="Keep emails" />
      </form>
    </Panel>
  );
}
