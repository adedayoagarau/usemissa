import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { PostgresCreatorNotificationRepository } from "../src/creatorNotificationRepository.js";

test("notification preference reads tolerate a database awaiting the SMS migration", async () => {
  let statement = "";
  const pool = {
    query: async (text: string) => {
      statement = text.replace(/\s+/g, " ").trim();
      return {
        rows: [{
          in_app_enabled: true,
          email_enabled: true,
          digest_cadence: "weekly",
          saved_search_enabled: true,
          follow_enabled: true,
          reminder_enabled: true,
          provider_state: "available",
          revision: 1,
          sms_enabled: false,
          sms_phone: null,
          sms_phone_verified_at: null,
          sms_provider_state: "unavailable",
        }],
      };
    },
  } as unknown as Pool;

  const preferences = await new PostgresCreatorNotificationRepository(pool).preferences("acct-legacy");
  assert.equal(preferences.smsEnabled, false);
  assert.equal(preferences.smsProviderState, "unavailable");
  assert.match(statement, /to_jsonb\(p\)->>'sms_enabled'/);
  assert.doesNotMatch(statement, /,sms_enabled,/);
});
