import { PostgresCreatorCalendarRepository, creatorPoolFor } from '@missa/radar-adapters';
import { tickCreatorReminders } from './creator-reminders';
import { deliverCreatorReminderEmails } from './creator-reminder-email';
import { tickGoals } from './goal-engine';
import { tickCreatorFollowing } from './creator-following';

/**
 * One creator scheduling pass, shared by the Vercel cron route and the Railway
 * creator worker so both run the same steps in the same order. Deadlines come
 * first so this pass's reminders are recalculated against the current source.
 */
export async function runCreatorTick(accountId?: string) {
  const deadlines = process.env.DATABASE_URL
    ? await new PostgresCreatorCalendarRepository(creatorPoolFor(process.env.DATABASE_URL)).reconcileOfficialDeadlines(accountId)
    : undefined;
  const reminders = await tickCreatorReminders(accountId);
  const reminderEmails = await deliverCreatorReminderEmails();
  const goals = await tickGoals(accountId);
  const following = await tickCreatorFollowing(accountId);
  return { deadlines, reminders, reminderEmails, goals, following };
}
