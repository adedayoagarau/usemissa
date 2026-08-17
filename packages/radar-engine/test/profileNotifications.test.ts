import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_PROFILE_NOTIFICATION_SETTINGS,
  profileNotificationSettings,
  updateProfileNotificationSettings,
  type UserProfile,
} from "../src/index.js";

function user(): UserProfile {
  return { id: "user_one", displayName: "Creator", attributes: {}, genres: [] };
}

test("notification settings preserve existing email and reminder behavior by default", () => {
  assert.deepEqual(
    profileNotificationSettings(user()),
    DEFAULT_PROFILE_NOTIFICATION_SETTINGS,
  );
});

test("notification settings validate timezone and normalize reminder days", () => {
  const profile = user();
  assert.deepEqual(
    updateProfileNotificationSettings(profile, {
      emailAlerts: false,
      deadlineReminderDays: [1, 7, 1],
      timezone: "Africa/Lagos",
    }),
    {
      emailAlerts: false,
      deadlineReminderDays: [7, 1],
      timezone: "Africa/Lagos",
    },
  );
  assert.throws(
    () =>
      updateProfileNotificationSettings(profile, {
        emailAlerts: true,
        deadlineReminderDays: [2],
        timezone: "Unknown/Place",
      }),
    /7, 3, or 1 day/u,
  );
});
