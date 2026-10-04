import { creatorPlan, creatorPoolFor, planIncludesSmsReminders, type CreatorNotificationPreferences } from '@missa/radar-adapters';
import { getCreatorNotificationRepository } from './creatorRepositories';
import { smsConfig } from './sms';

/** Whether the account's current plan includes text reminders; Free when the plan cannot be read. */
export async function smsPlanEligible(accountId: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const plan = await creatorPlan(creatorPoolFor(process.env.DATABASE_URL), accountId).catch(() => 'free' as const);
  return planIncludesSmsReminders(plan);
}

/**
 * Notification preferences as the settings panel needs them: the stored
 * values, whether Telnyx is configured right now, and whether the plan
 * includes text reminders. Returns undefined when preferences are unavailable.
 */
export async function notificationPreferencesView(accountId: string): Promise<CreatorNotificationPreferences | undefined> {
  const repository = getCreatorNotificationRepository();
  if (!repository) return undefined;
  const [preferences, eligible] = await Promise.all([repository.preferences(accountId), smsPlanEligible(accountId)]);
  return { ...preferences, smsProviderState: smsConfig() ? 'available' : 'unavailable', smsPlanEligible: eligible };
}
