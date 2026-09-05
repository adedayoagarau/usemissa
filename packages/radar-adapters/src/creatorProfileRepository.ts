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

  async portfolioState(accountId: string) {
    const result = await this.query<{draft_data: unknown; revision: number; published_at: string | null}>(
      'select draft_data, revision, published_at from creator_portfolio_drafts where account_id=$1', [accountId]);
    const row = result.rows[0];
    return { draft: row?.draft_data ?? null, revision: row?.revision ?? 0, publishedAt: row?.published_at ?? null };
  }

  async writePortfolio(accountId: string, draft: unknown, revision: number) {
    const result = await this.query<{revision:number}>(
      `insert into creator_portfolio_drafts(account_id,draft_data,revision) select $1,$2::jsonb,1 where $3=0
       on conflict(account_id) do update set draft_data=excluded.draft_data, revision=creator_portfolio_drafts.revision+1, updated_at=now()
       where creator_portfolio_drafts.revision=$3 returning revision`, [accountId,JSON.stringify(draft),revision]);
    // Existing rows need an UPDATE when the caller has a nonzero revision.
    if (result.rows[0]) return result.rows[0].revision;
    if (revision > 0) {
      const updated=await this.query<{revision:number}>(`update creator_portfolio_drafts set draft_data=$2::jsonb, revision=revision+1, updated_at=now() where account_id=$1 and revision=$3 returning revision`,[accountId,JSON.stringify(draft),revision]);
      if(updated.rows[0]) return updated.rows[0].revision;
    }
    throw new CreatorConflictError('profile',accountId,revision,-1);
  }

  async publishPortfolio(accountId: string, revision: number, mediaIds: string[], projection: unknown) {
    const result=await this.query<{published_at:string}>(
      `update creator_portfolio_drafts p set published_data=$4::jsonb, published_at=now(), published_media_ids=$3::uuid[]
       where account_id=$1 and revision=$2
       and exists(select 1 from radar_accounts a join handles h on h.subject_id=a.data->>'userId' and h.subject_type='user' and h.state='claimed' where a.id=$1)
       and not exists(select 1 from unnest($3::uuid[]) mid where not exists(select 1 from creator_portfolio_media m where m.id=mid and m.account_id=$1))
       returning published_at`,[accountId,revision,mediaIds,JSON.stringify(projection)]);
    if(!result.rows[0]) throw new CreatorConflictError('profile',accountId,revision,-1);
    return result.rows[0].published_at;
  }

  async unpublishPortfolio(accountId:string) {
    await this.query(`update creator_portfolio_drafts set published_data=null,published_at=null,published_media_ids='{}' where account_id=$1`,[accountId]);
  }

  async publicPortfolio(userId:string): Promise<unknown | undefined> {
    const result=await this.query<{published_data:unknown}>(`select p.published_data from creator_portfolio_drafts p join radar_accounts a on a.id=p.account_id where a.data->>'userId'=$1 and p.published_at is not null`,[userId]);
    return result.rows[0]?.published_data;
  }

  async ownPortfolioMedia(accountId:string, ids:string[]) {
    const result=await this.query<{id:string}>('select id from creator_portfolio_media where account_id=$1 and id=any($2::uuid[])',[accountId,ids]);
    return result.rows.length === new Set(ids).size;
  }

  async addPortfolioMedia(accountId:string, id:string, contentType:string, bytes:Buffer) {
    const client=await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('select id from radar_accounts where id=$1 for update',[accountId]);
      const total=await client.query<{total:string}>('select coalesce(sum(octet_length(bytes)),0) as total from creator_portfolio_media where account_id=$1',[accountId]);
      if(Number(total.rows[0]!.total)+bytes.length>100*1024*1024) throw new CreatorCommandValidationError('Your media storage is full (100 MB).');
      await client.query('insert into creator_portfolio_media(id,account_id,content_type,bytes) values($1,$2,$3,$4)',[id,accountId,contentType,bytes]);
      await client.query('commit');
    } catch(error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  async portfolioMedia(id:string, accountId?:string) {
    const result=await this.query<{bytes:Buffer;content_type:string}>(
      `select m.bytes,m.content_type from creator_portfolio_media m where id=$1 and
       (account_id=$2 or exists(select 1 from creator_portfolio_drafts p where p.account_id=m.account_id and p.published_at is not null and m.id=any(p.published_media_ids)))`,[id,accountId??null]);
    return result.rows[0];
  }

  private async throwProfileConflict(client: PoolClient, envelope: CreatorCommandEnvelope): Promise<never> {
    const current = await client.query<{ revision: number }>(
      "select revision from creator_profiles where account_id = $1 for update",
      [envelope.accountId],
    );
    throw new CreatorConflictError("profile", envelope.accountId, envelope.expectedRevision, current.rows[0]?.revision ?? 0);
  }
}
