import type { CreatorNotificationPreferences } from '@missa/radar-adapters';

export type MessageCategory =
  | 'security_critical'      // Password reset, session security, verify email (bypasses preference opt-outs)
  | 'application_actionable'  // Submission receipts, decision letters, revision requests (actionable workflow)
  | 'notification_digest';   // Deadline reminders, saved search matches, org follows (respects preferences)

export type NotificationSubtype =
  | 'saved_search'
  | 'deadline_reminder'
  | 'followed_org'
  | 'general';

export interface EvaluateDeliveryInput {
  accountId: string;
  category: MessageCategory;
  subtype?: NotificationSubtype;
  preference?: CreatorNotificationPreferences | null;
  recipientSuppressed?: boolean;
  accountActive?: boolean;
}

export type DeliveryVerdict =
  | { allowed: true; cadence?: 'immediate' | 'daily' | 'weekly' }
  | { allowed: false; reason: DeliveryRejectionReason };

export type DeliveryRejectionReason =
  | 'suppressed'
  | 'account_inactive'
  | 'email_disabled'
  | 'digest_cadence_off'
  | 'saved_search_disabled'
  | 'reminders_disabled'
  | 'follow_updates_disabled'
  | 'preferences_missing';

/**
 * Pure evaluation function enforcing privacy, deliverability compliance,
 * and category-specific rules according to Missa's multi-tiered message model.
 */
export function evaluateEmailDelivery(input: EvaluateDeliveryInput): DeliveryVerdict {
  // 1. Suppression & Account active check (universal)
  if (input.recipientSuppressed) {
    return { allowed: false, reason: 'suppressed' };
  }

  if (input.accountActive === false) {
    return { allowed: false, reason: 'account_inactive' };
  }

  // 2. Security Critical: Mandatory delivery
  if (input.category === 'security_critical') {
    return { allowed: true, cadence: 'immediate' };
  }

  // 3. Application Actionable: Editorial decisions & submission receipts
  // Essential lifecycle messages that submitters expect to receive
  if (input.category === 'application_actionable') {
    return { allowed: true, cadence: 'immediate' };
  }

  // 4. Notification Digest: User configurable preferences
  if (!input.preference) {
    return { allowed: false, reason: 'preferences_missing' };
  }

  const { preference } = input;

  if (!preference.emailEnabled) {
    return { allowed: false, reason: 'email_disabled' };
  }

  if (preference.digestCadence === 'off') {
    return { allowed: false, reason: 'digest_cadence_off' };
  }

  if (input.subtype === 'saved_search' && !preference.savedSearchEnabled) {
    return { allowed: false, reason: 'saved_search_disabled' };
  }

  if (input.subtype === 'deadline_reminder' && !preference.reminderEnabled) {
    return { allowed: false, reason: 'reminders_disabled' };
  }

  if (input.subtype === 'followed_org' && !preference.followEnabled) {
    return { allowed: false, reason: 'follow_updates_disabled' };
  }

  return {
    allowed: true,
    cadence: preference.digestCadence,
  };
}
