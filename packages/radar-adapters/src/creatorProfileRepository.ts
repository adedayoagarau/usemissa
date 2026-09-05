import type { Pool, PoolClient } from "pg";
import {
  CreatorCommandValidationError,
  CreatorConflictError,
  CreatorRepositoryBase,
  type CreatorCommandEnvelope,
  type CreatorReceipt,
} from "./creatorRepository.js";

export type CreatorProfileInput = Readonly<{
  displayName: string;
  bio: string | null;
}>;

export type CreatorProfileView = Readonly<{
  accountId: string;
  userId: string;
  displayName: string;
  bio: string | null;
  privacy: Readonly<{
    displayName: "public" | "private";
    bio: "public" | "private";
    trackedOpportunityCount: "public" | "private";
  }>;
  reduceMotion: boolean;
  revision: number;
  updatedAt: string;
}>;

export type CreatorPrivacyInput = CreatorProfileView["privacy"];

type ProfileRow = {
  account_id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  display_name_visibility: "public" | "private";
  bio_visibility: "public" | "private";
  tracked_opportunity_count_visibility: "public" | "private";
  reduce_motion: boolean;
  revision: number;
  updated_at: Date | string;
};

export function normalizeCreatorProfileInput(value: CreatorProfileInput): CreatorProfileInput {
  const displayName = value.displayName.trim();
  const bio = value.bio?.trim() || null;
  if (!displayName || displayName.length > 120) {
    throw new CreatorCommandValidationError("Display name must contain 1 to 120 characters");
  }
  if (bio && bio.length > 2_000) {
    throw new CreatorCommandValidationError("Bio must contain at most 2000 characters");
  }
  return { displayName, bio };
}

export function normalizeCreatorPrivacyInput(value: CreatorPrivacyInput): CreatorPrivacyInput {
  const values = [value.displayName, value.bio, value.trackedOpportunityCount];
  if (values.some((item) => item !== "public" && item !== "private")) {
    throw new CreatorCommandValidationError("Visibility must be exactly public or private");
  }
  return { ...value };
}

function profileView(row: ProfileRow): CreatorProfileView {
  return {
    accountId: row.account_id,
    userId: row.user_id,
    displayName: row.display_name,
    bio: row.bio,
    privacy: {
      displayName: row.display_name_visibility,
      bio: row.bio_visibility,
      trackedOpportunityCount: row.tracked_opportunity_count_visibility,
    },
    reduceMotion: row.reduce_motion,
    revision: row.revision,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class PostgresCreatorProfileRepository extends CreatorRepositoryBase {
  constructor(pool: Pool) { super(pool); }

  async profile(accountId: string): Promise<CreatorProfileView | undefined> {
    const result = await this.query<ProfileRow>(
      `select account_id, user_id, display_name, bio, display_name_visibility, bio_visibility,
              tracked_opportunity_count_visibility,
              reduce_motion, revision, updated_at
       from creator_profiles where account_id = $1`,
      [accountId],
    );
    return result.rows[0] ? profileView(result.rows[0]) : undefined;
  }

  async publicProfile(userId: string): Promise<{ id?: string; displayName?: string; bio?: string; isPrivate?: true } | undefined> {
    const result = await this.query<ProfileRow>(
      `select account_id, user_id, display_name, bio, display_name_visibility, bio_visibility,
              tracked_opportunity_count_visibility, reduce_motion, revision, updated_at
       from creator_profiles where user_id=$1`, [userId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    const profile = {
      id: row.user_id,
      ...(row.display_name_visibility === "public" ? { displayName: row.display_name } : {}),
      ...(row.bio_visibility === "public" && row.bio ? { bio: row.bio } : {}),
    };
    return profile.displayName || profile.bio ? profile : { isPrivate: true };
  }

  async motion(accountId: string): Promise<Record<string, string>> {
    const result = await this.query<{ event_type: string; created_at: Date | string }>(
      "select event_type, created_at from creator_profile_motion_events where account_id=$1 order by created_at", [accountId],
    );
    return Object.fromEntries(result.rows.map((row) => [row.event_type, new Date(row.created_at).toISOString()]));
  }

  async recordMotion(envelope: CreatorCommandEnvelope, event: string): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const inserted = await client.query<{ id: string; revision: number }>(
        `insert into creator_profile_motion_events (account_id,event_type)
         values ($1,$2) on conflict (account_id,event_type) do update set event_type=excluded.event_type
         returning id,revision`, [envelope.accountId, event],
      );
      const row = inserted.rows[0]!;
      return { resourceType: "profile-motion", resourceId: row.id, revision: row.revision };
    });
  }

  async updateProfile(envelope: CreatorCommandEnvelope, value: CreatorProfileInput): Promise<CreatorReceipt> {
    const input = normalizeCreatorProfileInput(value);
    return this.executeOwnerCommand(envelope, async (client) => {
      const updated = await client.query<{ account_id: string; revision: number }>(
        `update creator_profiles
         set display_name = $3, bio = $4, revision = revision + 1, updated_at = now()
         where account_id = $1 and revision = $2
         returning account_id, revision`,
        [envelope.accountId, envelope.expectedRevision, input.displayName, input.bio],
      );
      const row = updated.rows[0];
      if (row) return { resourceType: "profile", resourceId: row.account_id, revision: row.revision };
      return this.throwProfileConflict(client, envelope);
    });
  }

  async updatePrivacy(envelope: CreatorCommandEnvelope, value: CreatorPrivacyInput): Promise<CreatorReceipt> {
    const input = normalizeCreatorPrivacyInput(value);
    return this.executeOwnerCommand(envelope, async (client) => {
      const updated = await client.query<{ account_id: string; revision: number }>(
        `update creator_profiles
         set display_name_visibility = $3, bio_visibility = $4,
             tracked_opportunity_count_visibility = $5,
             revision = revision + 1, updated_at = now()
         where account_id = $1 and revision = $2
         returning account_id, revision`,
        [envelope.accountId, envelope.expectedRevision, input.displayName, input.bio, input.trackedOpportunityCount],
      );
      const row = updated.rows[0];
      if (row) return { resourceType: "profile", resourceId: row.account_id, revision: row.revision };
      return this.throwProfileConflict(client, envelope);
    });
  }

  async getPortfolioDraft<T = unknown>(accountId: string): Promise<T | undefined> {
    const result = await this.query<{ draft_data: T }>(
      "select draft_data from creator_portfolio_drafts where account_id = $1",
      [accountId],
    );
    return result.rows[0]?.draft_data;
  }

  async savePortfolioDraft<T = unknown>(accountId: string, draft: T): Promise<void> {
    await this.query(
      `insert into creator_portfolio_drafts (account_id, draft_data, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (account_id) do update
       set draft_data = excluded.draft_data, updated_at = now()`,
      [accountId, JSON.stringify(draft)],
    );
  }

  private async throwProfileConflict(client: PoolClient, envelope: CreatorCommandEnvelope): Promise<never> {
    const current = await client.query<{ revision: number }>(
      "select revision from creator_profiles where account_id = $1 for update",
      [envelope.accountId],
    );
    throw new CreatorConflictError("profile", envelope.accountId, envelope.expectedRevision, current.rows[0]?.revision ?? 0);
  }
}
