import { creatorPlan, creatorPoolFor, planIncludesEmailReminders, planIncludesSmsReminders, type CreatorNotificationPreferences, type CreatorPlan } from '@missa/radar-adapters';
import { getCreatorNotificationRepository } from './creatorRepositories';
import { smsConfig } from './sms';

/** The account's current plan; Free when it cannot be read. */
async function planOf(accountId: string): Promise<CreatorPlan> {
  if (!process.env.DATABASE_URL) return 'free';
  return creatorPlan(creatorPoolFor(process.env.DATABASE_URL), accountId).catch(() => 'free' as const);
}

/** Whether the account's current plan includes text reminders; Free when the plan cannot be read. */
export async function smsPlanEligible(accountId: string): Promise<boolean> {
  return planIncludesSmsReminders(await planOf(accountId));
}

/** Whether the account's current plan includes reminder email; Free when the plan cannot be read. */
export async function emailPlanEligible(accountId: string): Promise<boolean> {
  return planIncludesEmailReminders(await planOf(accountId));
}

/**
 * Notification preferences as the settings panel needs them: the stored
 * values, whether Telnyx is configured right now, and whether the plan
 * includes text and email reminders. Returns undefined when preferences are unavailable.
 */
export async function notificationPreferencesView(accountId: string): Promise<CreatorNotificationPreferences | undefined> {
  const repository = getCreatorNotificationRepository();
  if (!repository) return undefined;
  const [preferences, plan] = await Promise.all([repository.preferences(accountId), planOf(accountId)]);
  return {
    ...preferences,
    smsProviderState: smsConfig() ? 'available' : 'unavailable',
    smsPlanEligible: planIncludesSmsReminders(plan),
    emailPlanEligible: planIncludesEmailReminders(plan),
  };
}
