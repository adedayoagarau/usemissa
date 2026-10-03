/**
 * Deadline reminders that follow the application's status: default reminders
 * on save, the deadline-day alarm, fee-tier endings, obligation milestones,
 * the gone-quiet nudge and the time-to-follow-up notice.
 *
 * Slice D1 owns this module. The Foundation commit wires it into the save hook
 * and the creator tick with these signatures.
 */

export type DefaultRemindersResult = { created: number; skipped?: string };
export type DeadlineReminderTickResult = { processed: number };

/** Called after a call is saved to the Tracker. Never throws for missing data. */
export async function applyDefaultReminders(_accountId: string, _opportunityId: string): Promise<DefaultRemindersResult> {
  return { created: 0, skipped: "not-implemented" };
}

/** One pass over deadline reminders, before the reminder delivery tick. */
export async function tickDeadlineReminders(_accountId?: string): Promise<DeadlineReminderTickResult> {
  return { processed: 0 };
}
