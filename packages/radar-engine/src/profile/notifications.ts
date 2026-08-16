import type {
  ProfileNotificationSettings,
  UserProfile,
} from "../domain/types.js";

export const DEFAULT_PROFILE_NOTIFICATION_SETTINGS: ProfileNotificationSettings =
  {
    emailAlerts: true,
    deadlineReminderDays: [7, 3, 1],
    timezone: "UTC",
  };

function validTimezone(value: string): boolean {
  if (!value || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function profileNotificationSettings(
  user: Pick<UserProfile, "notificationSettings">,
): ProfileNotificationSettings {
  const value = user.notificationSettings;
  if (!value) return structuredClone(DEFAULT_PROFILE_NOTIFICATION_SETTINGS);
  return {
    emailAlerts: value.emailAlerts,
    deadlineReminderDays: [...value.deadlineReminderDays],
    timezone: value.timezone,
  };
}

export function updateProfileNotificationSettings(
  user: UserProfile,
  input: unknown,
): ProfileNotificationSettings {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Notification settings must be an object.");
  const body = input as Record<string, unknown>;
  if (typeof body.emailAlerts !== "boolean")
    throw new Error("Choose whether Missa may send opportunity emails.");
  if (!Array.isArray(body.deadlineReminderDays))
    throw new Error("Choose your deadline reminders.");
  const days = [...new Set(body.deadlineReminderDays)];
  if (
    days.some(
      (day) =>
        typeof day !== "number" ||
        !([1, 3, 7] as const).includes(day as 1 | 3 | 7),
    )
  )
    throw new Error("Deadline reminders can be 7, 3, or 1 day before.");
  if (typeof body.timezone !== "string" || !validTimezone(body.timezone))
    throw new Error("Choose a valid timezone.");
  const settings: ProfileNotificationSettings = {
    emailAlerts: body.emailAlerts,
    deadlineReminderDays: days
      .map((day) => day as 1 | 3 | 7)
      .sort((left, right) => right - left),
    timezone: body.timezone,
  };
  user.notificationSettings = settings;
  return profileNotificationSettings(user);
}
