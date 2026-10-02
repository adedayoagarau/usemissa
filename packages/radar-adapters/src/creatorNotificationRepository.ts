import type { Pool, PoolClient } from "pg";
import { CreatorConflictError, CreatorRepositoryBase, type CreatorCommandEnvelope, type CreatorReceipt } from "./creatorRepository.js";

export type NotificationDigestCadence = "off" | "daily" | "weekly";
export type CreatorNotificationPreferences = Readonly<{
  inAppEnabled: boolean; emailEnabled: boolean; digestCadence: NotificationDigestCadence;
  savedSearchEnabled: boolean; followEnabled: boolean; reminderEnabled: boolean;
  smsEnabled?: boolean; smsPhone?: string | null; smsPhoneVerifiedAt?: string | null;
  smsProviderState?: "unavailable" | "available";
  /** IANA timezone for reminder timing; null means each reminder's own timezone. */
  timezone?: string | null;
  /** "HH:MM" local start and end of quiet hours; both null when quiet hours are off. */
  quietHoursStart?: string | null; quietHoursEnd?: string | null;
  /** True for an account that has not yet chosen its email settings and should be asked once. */
  emailChoiceNeeded?: boolean;
  providerState: "unavailable" | "available"; revision: number;
}>;

const clock = (minute: number | null) =>
  minute === null ? null : `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
/** Parse "HH:MM" into minutes after midnight; null for anything else. */
export function quietHoursMinute(value: string | null | undefined): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

type PreferenceRow = {
  in_app_enabled: boolean; email_enabled: boolean; digest_cadence: NotificationDigestCadence;
  saved_search_enabled: boolean; follow_enabled: boolean; reminder_enabled: boolean;
  sms_enabled: boolean; sms_phone: string | null; sms_phone_verified_at: Date | string | null;
  sms_provider_state: "unavailable" | "available";
  timezone: string | null; quiet_hours_start_minute: number | null; quiet_hours_end_minute: number | null;
  email_choice_needed: boolean;
  provider_state: "unavailable" | "available"; revision: number;
};

function view(row: PreferenceRow): CreatorNotificationPreferences {
  return {
    inAppEnabled: row.in_app_enabled, emailEnabled: row.email_enabled, digestCadence: row.digest_cadence,
    savedSearchEnabled: row.saved_search_enabled, followEnabled: row.follow_enabled,
    reminderEnabled: row.reminder_enabled, smsEnabled: row.sms_enabled, smsPhone: row.sms_phone,
    smsPhoneVerifiedAt: row.sms_phone_verified_at ? new Date(row.sms_phone_verified_at).toISOString() : null,
    smsProviderState: row.sms_provider_state, timezone: row.timezone,
    quietHoursStart: clock(row.quiet_hours_start_minute), quietHoursEnd: clock(row.quiet_hours_end_minute),
    emailChoiceNeeded: Boolean(row.email_choice_needed),
    providerState: row.provider_state, revision: row.revision,
  };
}

export class PostgresCreatorNotificationRepository extends CreatorRepositoryBase {
  constructor(pool: Pool) { super(pool); }

  async preferences(accountId: string): Promise<CreatorNotificationPreferences> {
    const result = await this.query<PreferenceRow>(
      `select p.in_app_enabled,p.email_enabled,p.digest_cadence,p.saved_search_enabled,
              p.follow_enabled,p.reminder_enabled,p.provider_state,p.revision,
              coalesce((to_jsonb(p)->>'sms_enabled')::boolean,false) as sms_enabled,
              to_jsonb(p)->>'sms_phone' as sms_phone,
              (to_jsonb(p)->>'sms_phone_verified_at')::timestamptz as sms_phone_verified_at,
              coalesce(to_jsonb(p)->>'sms_provider_state','unavailable') as sms_provider_state,
              to_jsonb(p)->>'timezone' as timezone,
              (to_jsonb(p)->>'quiet_hours_start_minute')::int as quiet_hours_start_minute,
              (to_jsonb(p)->>'quiet_hours_end_minute')::int as quiet_hours_end_minute,
              (to_jsonb(p) ? 'email_choice_at') and to_jsonb(p)->>'email_choice_at' is null as email_choice_needed
       from notification_preferences p where p.account_id=$1`,
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

  async update(envelope: CreatorCommandEnvelope, input: Omit<CreatorNotificationPreferences, "providerState" | "revision" | "smsProviderState" | "smsPhoneVerifiedAt" | "smsEnabled" | "smsPhone" | "timezone" | "quietHoursStart" | "quietHoursEnd"> & Partial<Pick<CreatorNotificationPreferences, "smsEnabled" | "smsPhone" | "timezone" | "quietHoursStart" | "quietHoursEnd">>): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const smsSchema = await client.query<{ ready: boolean }>(
        `select count(*) = 4 as ready
         from information_schema.columns
         where table_schema=current_schema() and table_name='notification_preferences'
           and column_name in ('sms_enabled','sms_phone','sms_phone_verified_at','sms_provider_state')`,
      );
      const smsReset = smsSchema.rows[0]?.ready
        ? ",sms_enabled=false,sms_phone=null"
        : "";
      const timingSchema = await client.query<{ ready: boolean }>(
        `select count(*) = 3 as ready
         from information_schema.columns
         where table_schema=current_schema() and table_name='notification_preferences'
           and column_name in ('timezone','quiet_hours_start_minute','quiet_hours_end_minute')`,
      );
      // Older databases without the timing columns keep saving the rest.
      const timing = timingSchema.rows[0]?.ready
        ? ",timezone=$9,quiet_hours_start_minute=$10,quiet_hours_end_minute=$11"
        : "";
      // Saving these settings is the creator's email choice, so the one-time prompt stops.
      const choice = await this.hasEmailChoiceColumn(client) ? ",email_choice_at=now()" : "";
      const updated = await client.query<{ revision: number }>(
        `update notification_preferences set in_app_enabled=$3,email_enabled=$4,digest_cadence=$5,
           saved_search_enabled=$6,follow_enabled=$7,reminder_enabled=$8${smsReset}${timing}${choice},
           revision=revision+1,updated_at=now()
         where account_id=$1 and revision=$2 returning revision`,
        [envelope.accountId, envelope.expectedRevision, input.inAppEnabled, input.emailEnabled, input.digestCadence,
          input.savedSearchEnabled, input.followEnabled, input.reminderEnabled,
          ...(timing ? [input.timezone ?? null, quietHoursMinute(input.quietHoursStart), quietHoursMinute(input.quietHoursEnd)] : [])],
      );
      if (!updated.rows[0]) return this.conflict(client, envelope);
      return { resourceType: "notification-preferences", resourceId: envelope.accountId, revision: updated.rows[0].revision };
    });
  }

  /**
   * Answer the one-time email question for an account created before email
   * was on by default. Accepting turns on reminder emails and the weekly
   * digest; declining keeps the current settings. Either way Missa stops asking.
   */
  async recordEmailChoice(envelope: CreatorCommandEnvelope, accept: boolean): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      if (!await this.hasEmailChoiceColumn(client)) throw new Error("Email choice is unavailable before migration 0079");
      const updated = await client.query<{ revision: number }>(
        `update notification_preferences
            set email_choice_at=now(),
                email_enabled=case when $3 then true else email_enabled end,
                reminder_enabled=case when $3 then true else reminder_enabled end,
                digest_cadence=case when $3 then 'weekly' else digest_cadence end,
                revision=revision+1,updated_at=now()
          where account_id=$1 and revision=$2 returning revision`,
        [envelope.accountId, envelope.expectedRevision, accept],
      );
      if (!updated.rows[0]) return this.conflict(client, envelope);
      return { resourceType: "notification-preferences", resourceId: envelope.accountId, revision: updated.rows[0].revision };
    });
  }

  private async hasEmailChoiceColumn(client: PoolClient): Promise<boolean> {
    const result = await client.query<{ ready: boolean }>(
      `select count(*) = 1 as ready from information_schema.columns
        where table_schema=current_schema() and table_name='notification_preferences' and column_name='email_choice_at'`,
    );
    return Boolean(result.rows[0]?.ready);
  }

  private async conflict(client: PoolClient, envelope: CreatorCommandEnvelope): Promise<never> {
    const current = await client.query<{ revision: number }>(
      "select revision from notification_preferences where account_id=$1 for update",
      [envelope.accountId],
    );
    throw new CreatorConflictError("notification-preferences", envelope.accountId, envelope.expectedRevision, current.rows[0]?.revision ?? 0);
  }
}
