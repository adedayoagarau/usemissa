import type { PostgresCreatorCalendarRepository } from '@missa/radar-adapters';

import { getCreatorCalendarRepository } from './creatorRepositories';
import { applyDefaultPlan } from './deadline-planning';
import { applyDefaultReminders } from './deadline-reminders';

export type TrackerSaveCalendar = { status: 'added' | 'no-deadline' | 'pending'; eventId?: string };

/**
 * Work that follows a successful Tracker save: default deadline reminders and,
 * on plans with start-by planning, the default preparation plan. Each step is
 * independent; a failure is reported, never thrown, so it cannot undo a save
 * the creator has already seen succeed.
 */
export async function onTrackerSaved(accountId: string, opportunityId: string) {
  const [reminders, plan] = await Promise.allSettled([
    applyDefaultReminders(accountId, opportunityId),
    applyDefaultPlan(accountId, opportunityId),
  ]);
  return {
    reminders: reminders.status === 'fulfilled' ? reminders.value : { created: 0, skipped: 'failed' },
    plan: plan.status === 'fulfilled' ? plan.value : { created: 0, skipped: 'failed' },
  };
}

/**
 * Everything every save path owes the creator once the save has committed:
 * the official calendar deadline, then the default reminders and plan. A
 * calendar failure is reported as pending, never thrown; the creator pass
 * adds the missing deadline and its reminders (completeMissedSaveFollowUps).
 */
export async function afterTrackerSave(accountId: string, opportunityId: string): Promise<TrackerSaveCalendar> {
  let calendar: TrackerSaveCalendar = { status: 'no-deadline' };
  try {
    const repository = getCreatorCalendarRepository();
    if (repository) calendar = await repository.ensureOpportunityDeadline(accountId, opportunityId);
  } catch (error) {
    console.error('[tracker-save] official deadline failed; the creator pass will add it', error instanceof Error ? error.message : error);
    calendar = { status: 'pending' };
  }
  await onTrackerSaved(accountId, opportunityId);
  return calendar;
}

/**
 * The creator pass's retry for save follow-ups. An application in preparation
 * with a confirmed deadline ahead but no official calendar deadline had its
 * follow-up interrupted, so it gets the deadline and then the default
 * reminders and plan, exactly as a save would have given it. Both defaults
 * keep what the creator already changed. One failing application does not
 * stop the rest.
 */
export async function completeMissedSaveFollowUps(calendar: PostgresCreatorCalendarRepository, accountId?: string) {
  const missing = await calendar.missingOfficialDeadlines(accountId);
  let added = 0;
  let failed = 0;
  for (const row of missing) {
    try {
      const result = await calendar.ensureOpportunityDeadline(row.accountId, row.opportunityId);
      if (result.status !== 'added') continue;
      added += 1;
      await onTrackerSaved(row.accountId, row.opportunityId);
    } catch (error) {
      failed += 1;
      console.error('[tracker-save] missed official deadline retry failed', row.opportunityId, error instanceof Error ? error.message : error);
    }
  }
  return { found: missing.length, added, failed };
}
