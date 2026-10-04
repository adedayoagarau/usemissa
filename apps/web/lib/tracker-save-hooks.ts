import { applyDefaultPlan } from './deadline-planning';
import { applyDefaultReminders } from './deadline-reminders';

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
