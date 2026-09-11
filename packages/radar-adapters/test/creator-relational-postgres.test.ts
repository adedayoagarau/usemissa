import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";
import {
  PostgresCreatorCalendarRepository,
  PostgresCreatorNotificationRepository,
  PostgresCreatorProfileRepository,
} from "../src/index.js";
import {
  CreatorIdempotencyConflictError,
  creatorCommandEnvelope,
} from "../src/creatorRepository.js";

const databaseUrl = process.env.DISPOSABLE_CREATOR_DATABASE_URL;
if (databaseUrl) {
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!/^missa_story_16_2_[a-z0-9_]+$/iu.test(databaseName)) {
    throw new Error(
      "Creator real-Postgres tests require an explicitly disposable missa_story_16_2_* database",
    );
  }
}

test(
  "creator authority converges across separate pools with replay, isolation, conflict, and rollback evidence",
  { skip: !databaseUrl },
  async () => {
    const firstPool = new Pool({ connectionString: databaseUrl!, max: 2 });
    const secondPool = new Pool({ connectionString: databaseUrl!, max: 2 });
    const accountA = "story-16-2-account-a";
    const accountB = "story-16-2-account-b";
    try {
      await firstPool.query(
        `insert into radar_accounts(id,email,data) values
          ($1,'creator-a@example.invalid','{}'::jsonb),
          ($2,'creator-b@example.invalid','{}'::jsonb)`,
        [accountA, accountB],
      );
      await firstPool.query(
        `insert into creator_profiles(account_id,user_id,display_name) values
          ($1,'story-16-2-user-a','Creator A'),
          ($2,'story-16-2-user-b','Creator B')`,
        [accountA, accountB],
      );
      await firstPool.query(
        `insert into notification_preferences(account_id) values ($1),($2)`,
        [accountA, accountB],
      );

      const profileA = new PostgresCreatorProfileRepository(firstPool);
      const profileAConcurrent = new PostgresCreatorProfileRepository(secondPool);
      const profileB = new PostgresCreatorProfileRepository(secondPool);
      const competing = await Promise.allSettled([
        profileA.updateProfile(
          creatorCommandEnvelope(accountA, "profile.update", "same-row-a", { displayName: "Creator A one", bio: null }, 1),
          { displayName: "Creator A one", bio: null },
        ),
        profileAConcurrent.updateProfile(
          creatorCommandEnvelope(accountA, "profile.update", "same-row-b", { displayName: "Creator A two", bio: null }, 1),
          { displayName: "Creator A two", bio: null },
        ),
      ]);
      assert.equal(competing.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(competing.filter((result) => result.status === "rejected").length, 1);

      const accountAAfterConflict = await profileA.profile(accountA);
      assert.equal(accountAAfterConflict?.revision, 2);
      const differentRows = await Promise.all([
        profileA.updateProfile(
          creatorCommandEnvelope(accountA, "profile.update", "different-row-a", { displayName: "Creator A final", bio: "A" }, 2),
          { displayName: "Creator A final", bio: "A" },
        ),
        profileB.updateProfile(
          creatorCommandEnvelope(accountB, "profile.update", "different-row-b", { displayName: "Creator B final", bio: "B" }, 1),
          { displayName: "Creator B final", bio: "B" },
        ),
      ]);
      assert.deepEqual(differentRows.map((receipt) => receipt.revision), [3, 2]);

      const notifications = new PostgresCreatorNotificationRepository(firstPool);
      const preferenceInput = {
        inAppEnabled: true,
        emailEnabled: true,
        digestCadence: "daily" as const,
        savedSearchEnabled: true,
        followEnabled: false,
        reminderEnabled: true,
      };
      const preferenceEnvelope = creatorCommandEnvelope(
        accountA,
        "notification-preferences.update",
        "preferences-replay",
        preferenceInput,
        1,
      );
      const preferenceFirst = await notifications.update(preferenceEnvelope, preferenceInput);
      const preferenceReplay = await notifications.update(preferenceEnvelope, preferenceInput);
      assert.equal(preferenceFirst.replayed, false);
      assert.equal(preferenceReplay.replayed, true);
      assert.equal(preferenceReplay.receiptId, preferenceFirst.receiptId);
      await assert.rejects(
        () =>
          notifications.update(
            creatorCommandEnvelope(
              accountA,
              "notification-preferences.update",
              "preferences-replay",
              { ...preferenceInput, digestCadence: "weekly" },
              1,
            ),
            { ...preferenceInput, digestCadence: "weekly" },
          ),
        CreatorIdempotencyConflictError,
      );

      const calendarA = new PostgresCreatorCalendarRepository(firstPool);
      const calendarB = new PostgresCreatorCalendarRepository(secondPool);
      const event = {
        id: "story-16-2-event-a",
        title: "Focused work",
        startAt: "2026-09-01T09:00:00.000Z",
        endAt: "2026-09-01T10:00:00.000Z",
        allDay: false,
        color: "ink",
      };
      await calendarA.createEvent(
        creatorCommandEnvelope(accountA, "calendar-event.create", "event-create-a", event, 1),
        event,
      );
      await assert.rejects(() =>
        calendarB.createEvent(
          creatorCommandEnvelope(accountB, "calendar-event.create", "event-cross-owner", event, 1),
          event,
        ),
      );
      assert.equal((await calendarB.events(accountB, new Date("2026-01-01"), new Date("2027-01-01"))).length, 0);
      assert.equal((await calendarA.events(accountA, new Date("2026-01-01"), new Date("2027-01-01"))).length, 1);

      const rolledBack = await firstPool.query<{ count: number }>(
        `select count(*)::int count from workspace_command_receipts
         where scope_id=$1 and idempotency_key='event-cross-owner'`,
        [accountB],
      );
      assert.equal(rolledBack.rows[0]?.count, 0);
      const governance = await firstPool.query<{ receipts: number; audits: number; outbox: number }>(
        `select
          (select count(*)::int from workspace_command_receipts where scope_id=$1) receipts,
          (select count(*)::int from audit_events where account_id=$1) audits,
          (select count(*)::int from outbox_events where aggregate_id=$2) outbox`,
        [accountA, event.id],
      );
      assert.ok((governance.rows[0]?.receipts ?? 0) >= 4);
      assert.ok((governance.rows[0]?.audits ?? 0) >= 4);
      assert.equal(governance.rows[0]?.outbox, 1);
    } finally {
      await Promise.all([firstPool.end(), secondPool.end()]);
    }
  },
);
