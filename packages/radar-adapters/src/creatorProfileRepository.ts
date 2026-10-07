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
  givenName: string | null;
  familyName: string | null;
  usesSingleName: boolean;
  countryCode: string | null;
  city: string | null;
  timezone: string | null;
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

/** An organization's recorded acceptance of one of the creator's submitted works. */
export type AcceptedOutcome = Readonly<{
  outcomeId: string;
  workTitle: string;
  callTitle: string;
  organizationName: string;
  decidedAt: string;
}>;

/** A stored portfolio file, described without its bytes. */
export type PortfolioMediaFact = Readonly<{
  id: string;
  /** The type sniffed from the file's own bytes when it was uploaded. */
  contentType: string;
  bytes: number;
}>;

/** The parts of a published snapshot a reciprocal credit check reads. */
export type PublishedCreditList = Readonly<{
  name: unknown;
  collaborators: unknown;
  modules: unknown;
}>;

/** A request resolves at most this many handles. */
export const MAX_HANDLE_LOOKUPS = 12;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type ProfileRow = {
  account_id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  given_name: string | null;
  family_name: string | null;
  uses_single_name: boolean;
  country_code: string | null;
  city: string | null;
  timezone: string | null;
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
    givenName: row.given_name,
    familyName: row.family_name,
    usesSingleName: row.uses_single_name,
    countryCode: row.country_code,
    city: row.city,
    timezone: row.timezone,
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
      `select account_id, user_id, display_name, bio, given_name, family_name, uses_single_name,
              country_code, city, timezone, display_name_visibility, bio_visibility,
              tracked_opportunity_count_visibility,
              reduce_motion, revision, updated_at
       from creator_profiles where account_id = $1`,
      [accountId],
    );
    return result.rows[0] ? profileView(result.rows[0]) : undefined;
  }

  async publicProfile(userId: string): Promise<{ id?: string; displayName?: string; bio?: string; isPrivate?: true } | undefined> {
    const result = await this.query<ProfileRow>(
      `select account_id, user_id, display_name, bio, given_name, family_name, uses_single_name,
              country_code, city, timezone, display_name_visibility, bio_visibility,
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
    const result=await this.query<{published_data:unknown}>(`select p.published_data from creator_portfolio_drafts p join radar_accounts a on a.id=p.account_id where a.data->>'userId'=$1 and coalesce(a.data->>'active','true') <> 'false' and p.published_at is not null`,[userId]);
    return result.rows[0]?.published_data;
  }

  /** The published snapshot with its owner, so provenance can be re-verified on read. */
  async publishedPortfolio(userId:string): Promise<{ accountId: string; data: unknown } | undefined> {
    const result=await this.query<{account_id:string;published_data:unknown}>(`select p.account_id, p.published_data from creator_portfolio_drafts p join radar_accounts a on a.id=p.account_id where a.data->>'userId'=$1 and coalesce(a.data->>'active','true') <> 'false' and p.published_at is not null`,[userId]);
    const row=result.rows[0];
    return row ? { accountId: row.account_id, data: row.published_data } : undefined;
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
       (account_id=$2 or exists(select 1 from creator_portfolio_drafts p join radar_accounts a on a.id=p.account_id where p.account_id=m.account_id and coalesce(a.data->>'active','true') <> 'false' and p.published_at is not null and m.id=any(p.published_media_ids)))`,[id,accountId??null]);
    return result.rows[0];
  }

  /**
   * What the account's stored files are, read without loading them: the type
   * sniffed when they were uploaded and their size in bytes. Booking kit files
   * are described from this on every write and every public read, so a client
   * can never state a type or size. Files the account does not own are absent.
   */
  async portfolioMediaFacts(
    accountId: string,
    ids: readonly string[],
  ): Promise<PortfolioMediaFact[]> {
    const wanted = [...new Set(ids)].filter((id) => UUID.test(id));
    if (!wanted.length) return [];
    const result = await this.query<{ id: string; content_type: string; size: string | number }>(
      `select m.id, m.content_type, octet_length(m.bytes) as size
         from creator_portfolio_media m
        where m.account_id = $1 and m.id = any($2::uuid[])`,
      [accountId, wanted],
    );
    return result.rows.map((row) => ({
      id: row.id,
      contentType: row.content_type,
      bytes: Number(row.size),
    }));
  }

  /**
   * The users behind up to twelve handles, keyed by the handle asked for.
   * Only claimed user handles count, whether written as the current handle or
   * an old alias. A handle that is reserved, blocked, belongs to an
   * organization or does not exist is simply absent, so the answer says nothing
   * `/@handle` does not.
   */
  async userIdsForHandles(keys: readonly string[]): Promise<Map<string, string>> {
    const wanted = [...new Set(keys)].slice(0, MAX_HANDLE_LOOKUPS);
    const found = new Map<string, string>();
    if (!wanted.length) return found;
    const canonical = await this.query<{ key: string; user_id: string }>(
      `select handle_key as key, subject_id as user_id
         from handles
        where handle_key = any($1::text[]) and subject_type = 'user' and state = 'claimed'`,
      [wanted],
    );
    for (const row of canonical.rows) found.set(row.key, row.user_id);
    const missing = wanted.filter((key) => !found.has(key));
    if (!missing.length) return found;
    const aliases = await this.query<{ key: string; user_id: string }>(
      `select a.alias_key as key, h.subject_id as user_id
         from handle_aliases a
         join handles h on h.handle_key = a.handle_key
        where a.alias_key = any($1::text[]) and h.subject_type = 'user' and h.state = 'claimed'`,
      [missing],
    );
    for (const row of aliases.rows) found.set(row.key, row.user_id);
    return found;
  }

  /** Every handle this user answers to: the current one and any old aliases. */
  async userHandleKeys(userId: string): Promise<string[]> {
    const result = await this.query<{ key: string }>(
      `select h.handle_key as key
         from handles h
        where h.subject_type = 'user' and h.subject_id = $1 and h.state = 'claimed'
       union
       select a.alias_key as key
         from handle_aliases a
         join handles h on h.handle_key = a.handle_key
        where h.subject_type = 'user' and h.subject_id = $1 and h.state = 'claimed'`,
      [userId],
    );
    return result.rows.map((row) => row.key);
  }

  /**
   * The credits other creators have published: for each user with a live
   * snapshot, its name, collaborators and module list as stored. Only what a
   * reciprocal check needs is returned, never the rest of the snapshot, and
   * unpublished or deactivated accounts are absent.
   */
  async publishedCreditLists(
    userIds: readonly string[],
  ): Promise<Map<string, PublishedCreditList>> {
    const wanted = [...new Set(userIds)].slice(0, MAX_HANDLE_LOOKUPS);
    const lists = new Map<string, PublishedCreditList>();
    if (!wanted.length) return lists;
    const result = await this.query<{
      user_id: string;
      name: unknown;
      collaborators: unknown;
      modules: unknown;
    }>(
      `select a.data->>'userId' as user_id,
              p.published_data->'name' as name,
              p.published_data->'collaborators' as collaborators,
              p.published_data->'modules' as modules
         from creator_portfolio_drafts p
         join radar_accounts a on a.id = p.account_id
        where a.data->>'userId' = any($1::text[])
          and coalesce(a.data->>'active', 'true') <> 'false'
          and p.published_at is not null`,
      [wanted],
    );
    for (const row of result.rows)
      lists.set(row.user_id, {
        name: row.name,
        collaborators: row.collaborators,
        modules: row.modules,
      });
    return lists;
  }

  /** Remove an owner-uploaded asset only when it is not part of the live snapshot. */
  async deletePortfolioMedia(id: string, accountId: string): Promise<"deleted" | "published" | "missing"> {
    const result = await this.query<{ id: string }>(
      `delete from creator_portfolio_media m
       where m.id = $1 and m.account_id = $2
         and not exists (
           select 1 from creator_portfolio_drafts p
           where p.account_id = m.account_id
             and p.published_at is not null
             and m.id = any(p.published_media_ids)
         )
       returning m.id`,
      [id, accountId],
    );
    if (result.rows[0]) return "deleted";
    const owned = await this.query<{ published: boolean }>(
      `select exists(
         select 1 from creator_portfolio_media m
         where m.id=$1 and m.account_id=$2
       ) as published`,
      [id, accountId],
    );
    if (!owned.rows[0]?.published) return "missing";
    const live = await this.query<{ live: boolean }>(
      `select exists(
         select 1 from creator_portfolio_drafts p
         where p.account_id=$2 and p.published_at is not null and $1::uuid = any(p.published_media_ids)
       ) as live`,
      [id, accountId],
    );
    return live.rows[0]?.live ? "published" : "missing";
  }

  /**
   * Acceptances an organization recorded for this account's Missa submissions.
   * These are the only facts that can mark a Track record entry Confirmed.
   */
  async acceptedOutcomes(accountId: string): Promise<AcceptedOutcome[]> {
    const result = await this.query<{
      outcome_id: string;
      work_title: string;
      call_title: string;
      organization_name: string;
      decided_at: Date;
    }>(
      `select d.id as outcome_id, w.title as work_title, oc.title as call_title,
              coalesce(org.data->>'name', e.name) as organization_name, d.decided_at
         from decisions d
         join works w on w.id = d.work_id
         join submissions s on s.id = w.submission_id
         join submission_paths sp on sp.id = s.submission_path_id
         join open_calls oc on oc.id = sp.open_call_id
         join programs p on p.id = oc.program_id
         join entities e on e.id = p.entity_id
         left join radar_organizations org on org.id = e.organization_id
        where s.submitter_account_id = $1 and d.outcome = 'accepted'
        order by d.decided_at desc
        limit 100`,
      [accountId],
    );
    return result.rows.map((row) => ({
      outcomeId: row.outcome_id,
      workTitle: row.work_title,
      callTitle: row.call_title,
      organizationName: row.organization_name,
      decidedAt: new Date(row.decided_at).toISOString(),
    }));
  }

  private async throwProfileConflict(client: PoolClient, envelope: CreatorCommandEnvelope): Promise<never> {
    const current = await client.query<{ revision: number }>(
      "select revision from creator_profiles where account_id = $1 for update",
      [envelope.accountId],
    );
    throw new CreatorConflictError("profile", envelope.accountId, envelope.expectedRevision, current.rows[0]?.revision ?? 0);
  }
}
