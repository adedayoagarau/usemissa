import type { Pool, PoolClient } from "pg";
import { CreatorConflictError, CreatorRepositoryBase, type CreatorCommandEnvelope, type CreatorReceipt } from "./creatorRepository.js";

export type NotificationDigestCadence = "off" | "daily" | "weekly";
export type CreatorNotificationPreferences = Readonly<{
  inAppEnabled: boolean; emailEnabled: boolean; digestCadence: NotificationDigestCadence;
  savedSearchEnabled: boolean; followEnabled: boolean; reminderEnabled: boolean;
  providerState: "unavailable" | "available"; revision: number;
}>;

type PreferenceRow = {
  in_app_enabled: boolean; email_enabled: boolean; digest_cadence: NotificationDigestCadence;
  saved_search_enabled: boolean; follow_enabled: boolean; reminder_enabled: boolean;
  provider_state: "unavailable" | "available"; revision: number;
};

function view(row: PreferenceRow): CreatorNotificationPreferences {
  return {
    inAppEnabled: row.in_app_enabled, emailEnabled: row.email_enabled, digestCadence: row.digest_cadence,
    savedSearchEnabled: row.saved_search_enabled, followEnabled: row.follow_enabled,
    reminderEnabled: row.reminder_enabled, providerState: row.provider_state, revision: row.revision,
  };
}

export class PostgresCreatorNotificationRepository extends CreatorRepositoryBase {
  constructor(pool: Pool) { super(pool); }

  async preferences(accountId: string): Promise<CreatorNotificationPreferences> {
    const result = await this.query<PreferenceRow>(
      `select in_app_enabled,email_enabled,digest_cadence,saved_search_enabled,
              follow_enabled,reminder_enabled,provider_state,revision
       from notification_preferences where account_id=$1`,
      [accountId],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Notification preferences are unavailable for this account");
    return view(row);
  }

  async syncProviderState(accountId: string, providerState: "unavailable" | "available"): Promise<CreatorNotificationPreferences> {
    await this.query(
      `update notification_preferences set provider_state=$2,updated_at=case when provider_state<>$2 then now() else updated_at end
       where account_id=$1 and provider_state<>$2`,
      [accountId, providerState],
    );
    return this.preferences(accountId);
  }

  async update(envelope: CreatorCommandEnvelope, input: Omit<CreatorNotificationPreferences, "providerState" | "revision">): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const updated = await client.query<{ revision: number }>(
        `update notification_preferences set in_app_enabled=$3,email_enabled=$4,digest_cadence=$5,
           saved_search_enabled=$6,follow_enabled=$7,reminder_enabled=$8,revision=revision+1,updated_at=now()
         where account_id=$1 and revision=$2 returning revision`,
        [envelope.accountId, envelope.expectedRevision, input.inAppEnabled, input.emailEnabled, input.digestCadence,
          input.savedSearchEnabled, input.followEnabled, input.reminderEnabled],
      );
      if (!updated.rows[0]) return this.conflict(client, envelope);
      return { resourceType: "notification-preferences", resourceId: envelope.accountId, revision: updated.rows[0].revision };
    });
  }

  private async conflict(client: PoolClient, envelope: CreatorCommandEnvelope): Promise<never> {
    const current = await client.query<{ revision: number }>(
      "select revision from notification_preferences where account_id=$1 for update",
      [envelope.accountId],
    );
    throw new CreatorConflictError("notification-preferences", envelope.accountId, envelope.expectedRevision, current.rows[0]?.revision ?? 0);
  }
}
