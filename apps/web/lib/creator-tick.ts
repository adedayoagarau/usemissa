import { PostgresCreatorCalendarRepository, creatorPoolFor, recordWorkerTick } from '@missa/radar-adapters';
import { tickCreatorReminders } from './creator-reminders';
import { deliverCreatorReminderEmails } from './creator-reminder-email';
import { deliverCreatorReminderTexts } from './creator-reminder-text';
import { deliverWeeklyDigests } from './weekly-digest-delivery';
import { tickGoals } from './goal-engine';
import { deliverGoalCheckInEmails } from './goal-checkin-email';
import { tickCreatorFollowing } from './creator-following';
import { calendarSyncTickLimits, drainCalendarSyncJobs } from './calendar-sync';

/**
 * One creator scheduling pass, shared by the /api/cron/creator route and the
 * Railway creator worker so both run the same steps in the same order.
 * Deadlines come first so this pass's reminders are recalculated against the
 * current source; texts for Plus creators follow the reminder emails; calendar
 * provider export runs last within its own bounded batch and time budget so a
 * slow provider cannot delay reminder email.
 *
 * Every pass (successful or not) updates the `creator-worker` liveness row in
 * radar_agent_runs, which readiness and the admin worker-lane table read.
 */
export async function runCreatorTick(accountId?: string) {
  const startedAt = new Date();
  const pool = process.env.DATABASE_URL ? creatorPoolFor(process.env.DATABASE_URL) : undefined;
  try {
    const calendar = pool ? new PostgresCreatorCalendarRepository(pool) : undefined;
    const deadlines = calendar ? await calendar.reconcileOfficialDeadlines(accountId) : undefined;
    const reminders = await tickCreatorReminders(accountId);
    const reminderEmails = await deliverCreatorReminderEmails();
    const reminderTexts = await deliverCreatorReminderTexts();
    // The digest covers every due account, so a single-account run (--account) skips it.
    const weeklyDigests = accountId ? undefined : await deliverWeeklyDigests();
    const goals = await tickGoals(accountId);
    const goalEmails = await deliverGoalCheckInEmails();
    const following = await tickCreatorFollowing(accountId);
    const calendarSync = calendar
      ? await drainCalendarSyncJobs(calendar, { accountId, ...calendarSyncTickLimits() })
      : undefined;
    const result = { deadlines, reminders, reminderEmails, reminderTexts, weeklyDigests, goals, goalEmails, following, calendarSync };
    if (pool)
      await recordWorkerTick(pool, 'creator-worker', {
        status: 'completed',
        startedAt,
        inputCount: (reminders.processed ?? 0) + (goals.processed ?? 0) + (following.processed ?? 0) + (calendarSync ? calendarSync.processed + calendarSync.failed + calendarSync.reconnectRequired : 0),
        outputCount: reminderEmails.sent + reminderTexts.sent + (calendarSync?.processed ?? 0),
      });
    return result;
  } catch (error) {
    if (pool)
      await recordWorkerTick(pool, 'creator-worker', {
        status: 'failed',
        startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    throw error;
  }
}
