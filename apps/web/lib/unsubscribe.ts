import { creatorPoolFor } from '@missa/radar-adapters';
import type { EmailCategory } from './email-tokens';

export type UnsubscribeOutcome = 'updated' | 'account-not-found' | 'unavailable';

type Queryable = {
  query: (sql: string, params: unknown[]) => Promise<{ rowCount: number | null }>;
};

/**
 * What an unsubscribe link turns off. Category links only touch their own
 * preference so a reminder link does not stop every other email. Digest,
 * marketing and unknown categories turn off all notification email.
 */
export function unsubscribeColumns(category: EmailCategory | string): {
  emailEnabled: boolean;
  savedSearchEnabled: boolean;
  reminderEnabled: boolean;
} {
  if (category === 'deadline_reminder') return { emailEnabled: true, savedSearchEnabled: true, reminderEnabled: false };
  if (category === 'saved_search') return { emailEnabled: true, savedSearchEnabled: false, reminderEnabled: true };
  if (category === 'notification_digest') return { emailEnabled: false, savedSearchEnabled: true, reminderEnabled: true };
  return { emailEnabled: false, savedSearchEnabled: false, reminderEnabled: false };
}

/**
 * Turns off the email a verified unsubscribe token names. Values in
 * unsubscribeColumns mark what stays as it is (true) and what turns off
 * (false); nothing here ever turns email back on.
 *
 * Returns 'updated' only when a preference row was written, so callers can
 * report the real result instead of claiming success.
 */
export async function applyUnsubscribe(
  accountId: string,
  category: EmailCategory | string,
  database: Queryable | undefined = process.env.DATABASE_URL ? creatorPoolFor(process.env.DATABASE_URL) : undefined,
): Promise<UnsubscribeOutcome> {
  if (!database) return 'unavailable';
  const keep = unsubscribeColumns(category);
  try {
    // An account without a preference row still gets one, so the choice is
    // stored before any sender reads defaults.
    await database.query(
      `insert into notification_preferences (account_id)
       select id from radar_accounts where id = $1
       on conflict (account_id) do nothing`,
      [accountId],
    );
    const result = await database.query(
      `update notification_preferences
          set email_enabled = case when $2 then email_enabled else false end,
              saved_search_enabled = case when $3 then saved_search_enabled else false end,
              reminder_enabled = case when $4 then reminder_enabled else false end,
              revision = revision + 1,
              updated_at = now()
        where account_id = $1`,
      [accountId, keep.emailEnabled, keep.savedSearchEnabled, keep.reminderEnabled],
    );
    return (result.rowCount ?? 0) > 0 ? 'updated' : 'account-not-found';
  } catch (error) {
    console.error('Unsubscribe update failed', { accountId, category, error });
    return 'unavailable';
  }
}

export function unsubscribeCategoryLabel(category: EmailCategory | string): string {
  if (category === 'saved_search') return 'saved search emails';
  if (category === 'deadline_reminder') return 'reminder emails';
  return 'all notification emails';
}
