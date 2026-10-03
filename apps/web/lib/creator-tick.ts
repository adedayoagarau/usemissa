import { PostgresCreatorCalendarRepository, creatorPoolFor } from '@missa/radar-adapters';
import { tickCreatorReminders } from './creator-reminders';
import { deliverCreatorReminderEmails } from './creator-reminder-email';
import { deliverWeeklyDigests } from './weekly-digest-delivery';
import { tickGoals } from './goal-engine';
import { deliverGoalCheckInEmails } from './goal-checkin-email';
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
  // The digest covers every due account, so a single-account run (--account) skips it.
  const weeklyDigests = accountId ? undefined : await deliverWeeklyDigests();
  const goals = await tickGoals(accountId);
  const goalEmails = await deliverGoalCheckInEmails();
  const following = await tickCreatorFollowing(accountId);
  return { deadlines, reminders, reminderEmails, weeklyDigests, goals, goalEmails, following };
}
