import Link from 'next/link';
import { verifyUnsubscribeToken } from '@/lib/email-tokens';
import { pageMetadata } from '@/lib/seo';
import { creatorPoolFor } from '@missa/radar-adapters';

export const metadata = pageMetadata({
  title: 'Unsubscribe',
  description: 'Manage your Missa notification preferences and unsubscribe settings.',
  path: '/unsubscribe',
  noIndex: true,
});

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>;
}

async function handleUnsubscribe(accountId: string, category: string) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  try {
    const pool = creatorPoolFor(connectionString);
    await pool.query(
      `update notification_preferences
          set email_enabled = case when $2 in ('all', 'notification_digest') then false else email_enabled end,
              saved_search_enabled = case when $2 in ('all', 'saved_search') then false else saved_search_enabled end,
              reminder_enabled = case when $2 in ('all', 'deadline_reminder') then false else reminder_enabled end,
              revision = revision + 1,
              updated_at = now()
        where account_id = $1`,
      [accountId, category]
    );
  } catch {
    // Database updates fail closed; preference page can be used for manual edits
  }
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <h1 className="text-xl font-medium text-foreground mb-2 font-serif">
            Missing unsubscribe link
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            This unsubscribe link appears to be invalid or incomplete. You can manage your email alerts directly from your profile settings.
          </p>
          <Link
            href="/profile"
            className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Manage preferences
          </Link>
        </div>
      </main>
    );
  }

  const result = verifyUnsubscribeToken(token);

  if (!result.valid) {
    return (
      <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <h1 className="text-xl font-medium text-foreground mb-2 font-serif">
            Expired or invalid link
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            This unsubscribe link has expired or has already been used. Please log in to adjust your notification preferences.
          </p>
          <Link
            href="/profile"
            className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Manage preferences
          </Link>
        </div>
      </main>
    );
  }

  // Apply unsubscribe update
  await handleUnsubscribe(result.accountId, result.category);

  const categoryLabel =
    result.category === 'saved_search'
      ? 'saved-search alerts'
      : result.category === 'deadline_reminder'
      ? 'deadline reminder emails'
      : 'email notifications and digests';

  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-sm">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-medium text-foreground mb-2 font-serif">
          You have been unsubscribed
        </h1>
        <p className="text-sm text-foreground/80 mb-2">
          We have removed <span className="font-medium text-foreground">{result.email}</span> from {categoryLabel}.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Critical account security and submission status notifications will still be delivered when necessary.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/profile"
            className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Adjust preferences
          </Link>
          <Link
            href="/"
            className="inline-block bg-background hover:bg-muted/50 border border-border text-foreground text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Return to Missa
          </Link>
        </div>
      </div>
    </main>
  );
}
