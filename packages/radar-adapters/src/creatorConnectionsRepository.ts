import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { CreatorRepositoryBase } from "./creatorRepository.js";

export const INQUIRY_TOPICS = ["commission", "booking", "publication", "collaboration", "other"] as const;
export type InquiryTopic = (typeof INQUIRY_TOPICS)[number];
export type InquiryStatus = "new" | "read" | "archived";
export type InvitationStatus = "sent" | "read" | "declined" | "archived";

export type CreatorInquiry = Readonly<{
  id: string; senderName: string; senderEmail: string; senderAccountId?: string;
  topic: InquiryTopic; message: string; status: InquiryStatus; createdAt: string;
}>;

export type CreatorInvitation = Readonly<{
  id: string; organizationId: string; organizationName: string;
  opportunityId: string; opportunityTitle: string; opportunitySlug?: string;
  deadline?: string; open: boolean; message: string; inviterName?: string;
  status: InvitationStatus; createdAt: string;
}>;

export type ProfilePerson = Readonly<{ accountId: string; name: string; handle?: string; since: string }>;

export type InviteOption = Readonly<{
  organizationId: string; organizationName: string; opportunityId: string;
  title: string; deadline?: string; invited: boolean;
}>;

/** Too many inquiries from one sender in the last day. */
export class InquiryRateLimitError extends Error {}

const OPEN = `(o.publication_state='published' and o.status in ('open','closing-soon','deadline-extended') and (o.deadline_date is null or o.deadline_date>=current_date))`;
const ORG_NAME = `coalesce(nullif(g.name,''),r.data->>'name',r.id)`;
const PERSON = `coalesce(nullif(p.published_data->>'name',''),nullif(a.data->>'displayName',''),'A Missa member')`;
const iso = (value: Date | string) => new Date(value).toISOString();
const day = (value: Date | string | null) => (value ? iso(value).slice(0, 10) : undefined);

/**
 * Follows, inquiries and invitations around a creator's public profile. Every
 * read and write is scoped by account id; callers resolve who the creator is
 * from the public handle and who the viewer is from the session.
 */
export class PostgresCreatorConnectionsRepository extends CreatorRepositoryBase {
  constructor(pool: Pool) { super(pool); }

  async follow(followerAccountId: string, creatorAccountId: string): Promise<void> {
    if (followerAccountId === creatorAccountId) throw new Error("You can't follow your own profile.");
    await this.query(
      `insert into creator_profile_follows(follower_account_id,creator_account_id) values($1,$2) on conflict do nothing`,
      [followerAccountId, creatorAccountId],
    );
  }

  async unfollow(followerAccountId: string, creatorAccountId: string): Promise<void> {
    await this.query(`delete from creator_profile_follows where follower_account_id=$1 and creator_account_id=$2`, [followerAccountId, creatorAccountId]);
  }

  async isFollowing(followerAccountId: string, creatorAccountId: string): Promise<boolean> {
    const result = await this.query<{ yes: boolean }>(
      `select exists(select 1 from creator_profile_follows where follower_account_id=$1 and creator_account_id=$2) as yes`,
      [followerAccountId, creatorAccountId],
    );
    return Boolean(result.rows[0]?.yes);
  }

  /** People who follow this creator, newest first. */
  async followers(creatorAccountId: string, limit = 200): Promise<ProfilePerson[]> {
    return this.people(
      `select f.follower_account_id as account_id, f.created_at from creator_profile_follows f where f.creator_account_id=$1`,
      creatorAccountId, limit,
    );
  }

  /** Creators this account follows, newest first. */
  async following(followerAccountId: string, limit = 200): Promise<ProfilePerson[]> {
    return this.people(
      `select f.creator_account_id as account_id, f.created_at from creator_profile_follows f where f.follower_account_id=$1`,
      followerAccountId, limit,
    );
  }

  private async people(source: string, accountId: string, limit: number): Promise<ProfilePerson[]> {
    const result = await this.query<{ account_id: string; name: string; handle: string | null; created_at: Date }>(
      `select s.account_id, ${PERSON} as name,
              (select h.display_handle from handles h where h.subject_type='user' and h.state='claimed' and h.subject_id=a.data->>'userId' limit 1) as handle,
              s.created_at
         from (${source}) s
         join radar_accounts a on a.id=s.account_id
         left join creator_portfolio_drafts p on p.account_id=a.id and p.published_at is not null
        where coalesce(a.data->>'active','true') <> 'false'
        order by s.created_at desc limit $2`,
      [accountId, limit],
    );
    return result.rows.map((row) => ({
      accountId: row.account_id, name: row.name, since: iso(row.created_at),
      ...(row.handle ? { handle: row.handle } : {}),
    }));
  }

  /**
   * Stores an inquiry. A sender may send three to one creator and ten in all
   * per day; the limit is checked inside the same transaction as the insert.
   */
  async createInquiry(input: {
    creatorAccountId: string; senderAccountId?: string; senderName: string; senderEmail: string;
    topic: InquiryTopic; message: string; senderKey?: string;
  }): Promise<CreatorInquiry> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      if (input.senderKey) {
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [`inquiry:${input.senderKey}`]);
        const recent = await client.query<{ total: number; here: number }>(
          `select count(*)::int as total, count(*) filter (where creator_account_id=$2)::int as here
             from creator_inquiries where sender_key=$1 and created_at > now() - interval '1 day'`,
          [input.senderKey, input.creatorAccountId],
        );
        const counts = recent.rows[0] ?? { total: 0, here: 0 };
        if (counts.here >= 3 || counts.total >= 10) throw new InquiryRateLimitError("Too many messages today.");
      }
      const id = randomUUID();
      const inserted = await client.query<{ created_at: Date }>(
        `insert into creator_inquiries(id,creator_account_id,sender_account_id,sender_name,sender_email,topic,message,sender_key)
         values($1,$2,$3,$4,$5,$6,$7,$8) returning created_at`,
        [id, input.creatorAccountId, input.senderAccountId ?? null, input.senderName, input.senderEmail, input.topic, input.message, input.senderKey ?? null],
      );
      await client.query("commit");
      return {
        id, senderName: input.senderName, senderEmail: input.senderEmail,
        ...(input.senderAccountId ? { senderAccountId: input.senderAccountId } : {}),
        topic: input.topic, message: input.message, status: "new",
        createdAt: iso(inserted.rows[0]!.created_at),
      };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async inquiries(creatorAccountId: string, limit = 200): Promise<CreatorInquiry[]> {
    const result = await this.query<{
      id: string; sender_account_id: string | null; sender_name: string; sender_email: string;
      topic: InquiryTopic; message: string; status: InquiryStatus; created_at: Date;
    }>(
      `select id,sender_account_id,sender_name,sender_email,topic,message,status,created_at
         from creator_inquiries where creator_account_id=$1 order by created_at desc limit $2`,
      [creatorAccountId, limit],
    );
    return result.rows.map((row) => ({
      id: row.id, senderName: row.sender_name, senderEmail: row.sender_email,
      ...(row.sender_account_id ? { senderAccountId: row.sender_account_id } : {}),
      topic: row.topic, message: row.message, status: row.status, createdAt: iso(row.created_at),
    }));
  }

  /** Returns false when the inquiry is not this creator's. */
  async setInquiryStatus(creatorAccountId: string, id: string, status: InquiryStatus): Promise<boolean> {
    const result = await this.query(
      `update creator_inquiries set status=$3,
              read_at=case when $3<>'new' then coalesce(read_at,now()) else null end,
              archived_at=case when $3='archived' then now() else null end
        where creator_account_id=$1 and id=$2 returning id`,
      [creatorAccountId, id, status],
    );
    return result.rows.length > 0;
  }

  /** Open, published opportunities from these organizations, marking ones this creator already has. */
  async inviteOptions(organizationIds: readonly string[], creatorAccountId: string): Promise<InviteOption[]> {
    if (!organizationIds.length) return [];
    const result = await this.query<{
      organization_id: string; organization_name: string; id: string; title: string;
      deadline_date: Date | string | null; invited: boolean;
    }>(
      `select o.organization_id, ${ORG_NAME} as organization_name, o.id, o.title, o.deadline_date,
              exists(select 1 from creator_invitations i where i.creator_account_id=$2 and i.opportunity_id=o.id) as invited
         from opportunities o
         join radar_organizations r on r.id=o.organization_id
         left join gary_profiles g on g.id=r.id
        where o.organization_id=any($1::text[]) and ${OPEN}
        order by organization_name, o.deadline_date nulls last, o.title limit 200`,
      [organizationIds, creatorAccountId],
    );
    return result.rows.map((row) => ({
      organizationId: row.organization_id, organizationName: row.organization_name,
      opportunityId: row.id, title: row.title, invited: row.invited,
      ...(day(row.deadline_date) ? { deadline: day(row.deadline_date)! } : {}),
    }));
  }

  /**
   * Records an invitation when the opportunity is open, published and belongs
   * to the organization. Returns "duplicate" when this creator already has one
   * for the opportunity and "unavailable" when the opportunity doesn't qualify.
   */
  async createInvitation(input: {
    creatorAccountId: string; organizationId: string; opportunityId: string;
    inviterAccountId: string; message: string;
  }): Promise<{ status: "created"; id: string } | { status: "duplicate" | "unavailable" }> {
    const id = randomUUID();
    const result = await this.query<{ id: string }>(
      `insert into creator_invitations(id,creator_account_id,organization_id,opportunity_id,inviter_account_id,message)
       select $1,$2,$3,o.id,$5,$6 from opportunities o where o.id=$4 and o.organization_id=$3 and ${OPEN}
       on conflict (creator_account_id, opportunity_id) do nothing returning id`,
      [id, input.creatorAccountId, input.organizationId, input.opportunityId, input.inviterAccountId, input.message],
    );
    if (result.rows[0]) return { status: "created", id };
    const existing = await this.query(
      `select 1 from creator_invitations where creator_account_id=$1 and opportunity_id=$2`,
      [input.creatorAccountId, input.opportunityId],
    );
    return { status: existing.rows.length ? "duplicate" : "unavailable" };
  }

  async invitations(creatorAccountId: string, limit = 200): Promise<CreatorInvitation[]> {
    const result = await this.query<{
      id: string; organization_id: string; organization_name: string; opportunity_id: string;
      title: string; slug: string | null; deadline_date: Date | string | null; open: boolean;
      message: string; inviter_name: string | null; status: InvitationStatus; created_at: Date;
    }>(
      `select i.id, i.organization_id, ${ORG_NAME} as organization_name, i.opportunity_id, o.title, o.slug,
              o.deadline_date, ${OPEN} as open, i.message,
              nullif(inviter.data->>'displayName','') as inviter_name, i.status, i.created_at
         from creator_invitations i
         join opportunities o on o.id=i.opportunity_id
         join radar_organizations r on r.id=i.organization_id
         left join gary_profiles g on g.id=r.id
         left join radar_accounts inviter on inviter.id=i.inviter_account_id
        where i.creator_account_id=$1 order by i.created_at desc limit $2`,
      [creatorAccountId, limit],
    );
    return result.rows.map((row) => ({
      id: row.id, organizationId: row.organization_id, organizationName: row.organization_name,
      opportunityId: row.opportunity_id, opportunityTitle: row.title, open: row.open,
      message: row.message, status: row.status, createdAt: iso(row.created_at),
      ...(row.slug ? { opportunitySlug: row.slug } : {}),
      ...(day(row.deadline_date) ? { deadline: day(row.deadline_date)! } : {}),
      ...(row.inviter_name ? { inviterName: row.inviter_name } : {}),
    }));
  }

  async setInvitationStatus(creatorAccountId: string, id: string, status: InvitationStatus): Promise<boolean> {
    const result = await this.query(
      `update creator_invitations set status=$3,
              read_at=case when $3<>'sent' then coalesce(read_at,now()) else null end,
              responded_at=case when $3 in ('declined','archived') then now() else responded_at end
        where creator_account_id=$1 and id=$2 returning id`,
      [creatorAccountId, id, status],
    );
    return result.rows.length > 0;
  }

  /** Badge counts for the creator's profile inbox. */
  async counts(creatorAccountId: string): Promise<{ inquiries: number; invitations: number; followers: number }> {
    const result = await this.query<{ inquiries: number; invitations: number; followers: number }>(
      `select (select count(*)::int from creator_inquiries where creator_account_id=$1 and status='new') as inquiries,
              (select count(*)::int from creator_invitations where creator_account_id=$1 and status='sent') as invitations,
              (select count(*)::int from creator_profile_follows where creator_account_id=$1) as followers`,
      [creatorAccountId],
    );
    return result.rows[0] ?? { inquiries: 0, invitations: 0, followers: 0 };
  }

  /** The creator's sign-in email, for notifications only; never shown to visitors. */
  async accountEmail(accountId: string): Promise<string | undefined> {
    const result = await this.query<{ email: string | null }>(`select email from radar_accounts where id=$1`, [accountId]);
    return result.rows[0]?.email ?? undefined;
  }
}
