import { randomUUID } from "node:crypto";
import {
  CreatorRepositoryBase,
  CreatorConflictError,
  creatorPoolFor,
  type CreatorCommandEnvelope,
} from "@missa/radar-adapters";

export type FollowKind = "organization" | "program";
export type FollowTarget = {
  id: string;
  name: string;
  kind: FollowKind;
  organizationId: string | null;
  organizationName: string | null;
  openCalls: number;
  type: string | null;
  country: string | null;
  followed: boolean;
  revision: number | null;
};
export type FollowDetail = FollowTarget & {
  calls: {
    id: string;
    title: string;
    type: string;
    status: string;
    deadline: string | null;
    deadlinePassed: boolean;
    edition: string | null;
    confirmed: boolean;
  }[];
  programs: { id: string; name: string }[];
};
export class FollowingValidationError extends Error {}

// Reuse stored publication and first-party verification. An annual date is never inferred from a title.
const confirmed = `(o.publication_state='published' and exists(select 1 from opportunity_url_observations u where u.opportunity_id=o.id and u.state='verified' and u.first_party and u.last_verified_at is not null and u.role in ('guidelines','submission','official') and (o.program_id is null or u.program_id=o.program_id)))`;
const open = `(o.status in ('open','closing-soon','deadline-extended') and (o.deadline_date is null or o.deadline_date>=current_date))`;
const edition = `coalesce(o.edition_label,'')`;
const scopes = `select account_id,'organization'::text as kind,organization_id as target_id,created_at from organization_follows
  union all select account_id,'program'::text,program_id,created_at from creator_program_follows`;

function targetProjection(kind: FollowKind) {
  if (kind === "program")
    return `select p.id,p.name,'program'::text as kind,e.organization_id as "organizationId",coalesce(g.name,r.data->>'name',e.name) as "organizationName",null::text as country,
    (select min(o.type) from opportunities o where o.program_id=p.id and o.publication_state='published') as type,
    (select count(*)::int from opportunities o where o.program_id=p.id and ${confirmed} and ${open}) as "openCalls",
    f.account_id is not null as followed,f.revision
    from programs p join entities e on e.id=p.entity_id left join gary_profiles g on g.id=e.organization_id left join radar_organizations r on r.id=e.organization_id
    left join creator_program_follows f on f.program_id=p.id and f.account_id=$1`;
  return `select r.id,coalesce(g.name,r.data->>'name',r.id) as name,'organization'::text as kind,r.id as "organizationId",null::text as "organizationName",g.country,g.profile_kind as type,
    (select count(*)::int from opportunities o where o.organization_id=r.id and ${confirmed} and ${open}) as "openCalls",f.account_id is not null as followed,f.revision
    from radar_organizations r left join gary_profiles g on g.id=r.id left join organization_follows f on f.organization_id=r.id and f.account_id=$1`;
}

export class CreatorFollowingRepository extends CreatorRepositoryBase {
  constructor() {
    if (!process.env.DATABASE_URL)
      throw new Error("Following storage unavailable");
    super(creatorPoolFor(process.env.DATABASE_URL));
  }

  async search(
    accountId: string,
    input: {
      kind: FollowKind;
      query?: string;
      discipline?: string;
      followed?: boolean;
      page?: number;
    },
  ) {
    const alias = input.kind === "program" ? "p" : "r",
      relation = input.kind === "program" ? "program_id" : "organization_id";
    const values = [
      accountId,
      `%${(input.query ?? "").replace(/[\\%_]/g, "\\$&")}%`,
      input.discipline ?? null,
      !!input.followed,
    ];
    const identity =
      input.kind === "program"
        ? "p.name"
        : "coalesce(g.name,r.data->>'name',r.id)";
    const where = `where ${identity} ilike $2 and (not $4::boolean or f.account_id is not null)
      and (f.account_id is not null or ${input.kind === "program" ? `exists(select 1 from opportunities o where o.${relation}=${alias}.id and o.publication_state='published')` : `(g.id is not null or exists(select 1 from opportunities o where o.organization_id=r.id and o.publication_state='published'))`})
      and ($3::text is null or exists(select 1 from opportunities o where o.${relation}=${alias}.id and o.publication_state='published' and (o.discipline=$3 or $3=any(o.genres))))`;
    const base = `${targetProjection(input.kind)} ${where}`;
    const [rows, count] = await Promise.all([
      this.query<FollowTarget>(
        `${base} order by name,${alias}.id limit 24 offset $5`,
        [...values, (input.page ?? 0) * 24],
      ),
      this.query<{ total: number }>(
        `select count(*)::int as total from (${base}) matched`,
        values,
      ),
    ]);
    return {
      items: rows.rows,
      total: count.rows[0].total,
      page: input.page ?? 0,
    };
  }

  async detail(
    accountId: string,
    kind: FollowKind,
    id: string,
  ): Promise<FollowDetail | null> {
    const alias = kind === "program" ? "p" : "r",
      relation = kind === "program" ? "program_id" : "organization_id";
    const row = (
      await this.query<FollowTarget>(
        `${targetProjection(kind)} where ${alias}.id=$2 and (f.account_id is not null or ${kind === "program" ? `exists(select 1 from opportunities o where o.program_id=p.id and o.publication_state='published')` : `g.id is not null or exists(select 1 from opportunities o where o.organization_id=r.id and o.publication_state='published')`})`,
        [accountId, id],
      )
    ).rows[0];
    if (!row) return null;
    const calls = (
      await this.query<FollowDetail["calls"][number]>(
        `select o.id,o.title,o.type,o.status,o.deadline_date::text as deadline,coalesce(o.deadline_date<current_date,false) as "deadlinePassed",o.edition_label as edition,${confirmed} as confirmed from opportunities o where o.${relation}=$1 and o.publication_state='published' order by case when ${open} then 0 else 1 end,o.deadline_date desc nulls last,o.created_at desc limit 60`,
        [id],
      )
    ).rows;
    const programs =
      kind === "organization"
        ? (
            await this.query<FollowDetail["programs"][number]>(
              `select p.id,p.name from programs p join entities e on e.id=p.entity_id where e.organization_id=$1 and exists(select 1 from opportunities o where o.program_id=p.id and o.publication_state='published') order by p.name limit 60`,
              [id],
            )
          ).rows
        : [];
    return { ...row, calls, programs };
  }

  async follow(envelope: CreatorCommandEnvelope, kind: FollowKind, id: string) {
    if (!(await this.detail(envelope.accountId, kind, id)))
      throw new FollowingValidationError(
        "This organization or program is not available.",
      );
    return this.executeOwnerCommand(envelope, async (client) => {
      const table =
          kind === "program"
            ? "creator_program_follows"
            : "organization_follows",
        column = kind === "program" ? "program_id" : "organization_id";
      const result = (
        await client.query<{ revision: number }>(
          `insert into ${table}(account_id,${column}${kind === "organization" ? ",notification_initialized_at" : ""}) values($1,$2${kind === "organization" ? ",now()" : ""}) on conflict(account_id,${column}) do nothing returning revision`,
          [envelope.accountId, id],
        )
      ).rows[0];
      const revision =
        result?.revision ??
        (
          await client.query<{ revision: number }>(
            `select revision from ${table} where account_id=$1 and ${column}=$2`,
            [envelope.accountId, id],
          )
        ).rows[0].revision;
      if (result)
        await client.query(
          `insert into creator_follow_editions(account_id,kind,target_id,opportunity_id,edition_key,open_seen) select $1,$2,$3,o.id,${edition},${open} from opportunities o where o.${column}=$3 and ${confirmed} on conflict(account_id,kind,target_id,opportunity_id,edition_key) do update set open_seen=creator_follow_editions.open_seen or excluded.open_seen`,
          [envelope.accountId, kind, id],
        );
      return { resourceType: `${kind}-follow`, resourceId: id, revision };
    });
  }

  async unfollow(
    envelope: CreatorCommandEnvelope,
    kind: FollowKind,
    id: string,
  ) {
    return this.executeOwnerCommand(envelope, async (client) => {
      const table =
          kind === "program"
            ? "creator_program_follows"
            : "organization_follows",
        column = kind === "program" ? "program_id" : "organization_id";
      const result = await client.query<{ revision: number }>(
        `delete from ${table} where account_id=$1 and ${column}=$2 and revision=$3 returning revision`,
        [envelope.accountId, id, envelope.expectedRevision],
      );
      if (!result.rowCount)
        throw new CreatorConflictError(
          `${kind}-follow`,
          id,
          envelope.expectedRevision,
          0,
        );
      // Retain delivery history, just like Inbox updates. Future candidates require
      // an active follow; this history prevents replay and identifies later editions
      // if the creator follows the same program again.
      return {
        resourceType: `${kind}-follow`,
        resourceId: id,
        revision: result.rows[0].revision + 1,
      };
    });
  }
}

export async function tickCreatorFollowing(accountId?: string) {
  if (!process.env.DATABASE_URL)
    throw new Error("Following storage unavailable");
  const c = await creatorPoolFor(process.env.DATABASE_URL).connect();
  try {
    await c.query("begin");
    if (
      !(
        await c.query<{ locked: boolean }>(
          "select pg_try_advisory_xact_lock(hashtext('missa-creator-following')) as locked",
        )
      ).rows[0].locked
    ) {
      await c.query("commit");
      return { processed: 0, delivered: 0 };
    }
    // Existing organization follows get a baseline on adoption; old catalogue entries are not replayed as new.
    await c.query(
      `insert into creator_follow_editions(account_id,kind,target_id,opportunity_id,edition_key,open_seen)
      select f.account_id,'organization',f.organization_id,o.id,${edition},${open} from organization_follows f join opportunities o on o.organization_id=f.organization_id
      where ($1::text is null or f.account_id=$1) and f.notification_initialized_at is null and ${confirmed} on conflict do nothing`,
      [accountId ?? null],
    );
    await c.query(
      "update organization_follows set notification_initialized_at=now() where notification_initialized_at is null and ($1::text is null or account_id=$1)",
      [accountId ?? null],
    );
    const candidates = await c.query(
      `select f.account_id,f.kind,f.target_id,o.id,o.title,${edition} as edition_key,a.data->>'userId' as user_id,
      coalesce(n.in_app_enabled and n.follow_enabled,false) as allowed,
      exists(select 1 from creator_follow_editions previous where previous.account_id=f.account_id and previous.opportunity_id=o.id and previous.edition_key<>${edition}) as previous_edition
      from (${scopes}) f join opportunities o on (f.kind='program' and o.program_id=f.target_id) or (f.kind='organization' and o.organization_id=f.target_id)
      join radar_accounts a on a.id=f.account_id left join notification_preferences n on n.account_id=f.account_id
      left join creator_follow_editions seen on seen.account_id=f.account_id and seen.kind=f.kind and seen.target_id=f.target_id and seen.opportunity_id=o.id and seen.edition_key=${edition}
      where ($1::text is null or f.account_id=$1) and ${confirmed} and ${open} and coalesce(seen.open_seen,false)=false order by o.created_at,f.account_id limit 500`,
      [accountId ?? null],
    );
    let delivered = 0;
    for (const row of candidates.rows) {
      if (row.allowed) {
        const key = `follow-new:${row.id}:${row.user_id ?? row.account_id}${row.previous_edition ? `:${row.edition_key}` : ""}`;
        const inserted = await c.query(
          `insert into creator_inbox_alerts(id,account_id,opportunity_id,kind,title,body,reason,dedupe_key,delivery_eligibility,action_href)
          values($1,$2,$3,'followed-org-new-call',$4,$5,$6,$7,'in-app',$8) on conflict do nothing returning id`,
          [
            randomUUID(),
            row.account_id,
            row.id,
            row.title,
            "A confirmed call is now open.",
            row.kind === "program"
              ? "You follow this program."
              : "You follow this organization.",
            key,
            `/opportunities/${encodeURIComponent(row.id)}`,
          ],
        );
        delivered += inserted.rowCount ?? 0;
      }
      await c.query(
        `insert into creator_follow_editions(account_id,kind,target_id,opportunity_id,edition_key,open_seen) values($1,$2,$3,$4,$5,true) on conflict(account_id,kind,target_id,opportunity_id,edition_key) do update set open_seen=true`,
        [row.account_id, row.kind, row.target_id, row.id, row.edition_key],
      );
    }
    await c.query("commit");
    return { processed: candidates.rowCount ?? 0, delivered };
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
