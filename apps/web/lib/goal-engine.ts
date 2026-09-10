import { randomUUID, createHash } from "node:crypto";
import {
  creatorPoolFor,
  CreatorRepositoryBase,
  CreatorConflictError,
  creatorCommandEnvelope,
  canonicalPublicOpportunityPredicate,
} from "@missa/radar-adapters";
import { z } from "zod";
import { opportunityTypes } from "./goal-options.ts";
import { goalProgressSQL } from "./goal-scope.ts";

export const goalInput = z
  .object({
    requestId: z.string().uuid(),
    discipline: z
      .string()
      .regex(/^[a-z0-9-]{1,80}$/)
      .nullable()
      .optional(),
    opportunityTypes: z.array(z.enum(opportunityTypes)).max(16).optional(),
    workId: z.string().min(1).max(200).nullable().optional(),
    matchPreferences: z
      .object({
        locations: z.array(z.string().min(1).max(80)).max(20).optional(),
        noFeeOnly: z.boolean().optional(),
        feeBudget: z
          .object({
            cents: z.number().int().min(0).max(10000000),
            currency: z.string().regex(/^[A-Z]{3}$/),
          })
          .optional(),
        attendFrom: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        attendUntil: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .refine(
        (v) => !v.attendUntil || !v.attendFrom || v.attendUntil >= v.attendFrom,
        { message: "Check your attendance dates" },
      )
      .optional(),
    title: z.string().trim().min(1).max(120),
    target: z.number().int().min(1).max(1000),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezone: z.string().refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }),
    nextStep: z.string().trim().min(1).max(500),
    cadenceDays: z.union([z.literal(0), z.literal(7), z.literal(30)]),
    recommendations: z.boolean(),
    targets: z
      .array(
        z.object({
          kind: z.enum(["opportunity", "organization", "program"]),
          id: z.string().min(1).max(200),
        }),
      )
      .max(30),
  })
  .refine((v) => v.endsOn >= v.startsOn, {
    message: "End date must follow start date",
  });
export function goalPool() {
  if (!process.env.DATABASE_URL) throw new Error("Goal storage unavailable");
  return creatorPoolFor(process.env.DATABASE_URL);
}
const publicOpportunity = canonicalPublicOpportunityPredicate("o");
export async function goalDisciplines() {
  return (
    await goalPool().query(
      `select discipline as value, initcap(replace(discipline,'-',' ')) as label,count(*)::int as count from opportunities o where ${publicOpportunity} and discipline is not null and discipline <> 'all-disciplines' group by discipline order by count(*) desc limit 60`,
    )
  ).rows;
}
function disciplineMatch(alias: string, parameter: string) {
  return `(${parameter}::text is null or ${alias}.discipline=${parameter} or ${parameter}=any(${alias}.genres))`;
}
export async function searchGoalTargets(
  query: string,
  kind?: "organization" | "opportunity" | "program",
  discipline?: string | null,
  types: string[] = [],
) {
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const p = goalPool();
  const values = [pattern, discipline ?? null, types];
  const typeMatch = "(cardinality($3::text[])=0 or o.type=any($3::text[]))";
  if (kind === "program")
    return (
      await p.query(
        `select p.id,p.name,'program' as kind,e.name as organization,count(*)::int as calls from programs p join entities e on e.id=p.entity_id join opportunities o on o.program_id=p.id where p.name ilike $1 and ${publicOpportunity} and ${disciplineMatch("o", "$2")} and ${typeMatch} group by p.id,p.name,e.name order by p.name limit 30`,
        values,
      )
    ).rows;
  const opportunities =
    kind === "organization"
      ? []
      : (
          await p.query(
            `select o.id,o.title as name,'opportunity' as kind,o.type,o.status,o.discipline,o.deadline_date::text as deadline,o.deadline_kind,org.data->>'name' as organization from opportunities o left join radar_organizations org on org.id=o.organization_id where ${publicOpportunity} and o.title ilike $1 and ${disciplineMatch("o", "$2")} and ${typeMatch} order by o.title limit 30`,
            values,
          )
        ).rows;
  const organizations =
    kind === "opportunity"
      ? []
      : (
          await p.query(
            `select p.id,p.name,'organization' as kind,p.profile_kind as type,p.country,p.website_url,coalesce((select count(*)::int from opportunities o where o.organization_id=p.id and ${publicOpportunity}),0) as calls from gary_profiles p where p.name ilike $1 and (cardinality($3::text[])=0 or exists(select 1 from opportunities o where o.organization_id=p.id and ${publicOpportunity} and ${typeMatch})) and ($2::text is null or exists(select 1 from opportunities o where o.organization_id=p.id and ${publicOpportunity} and ${disciplineMatch("o", "$2")}) or exists(select 1 from gary_profile_observations obs where obs.profile_id=p.id and lower(obs.genres_json::text) like '%'||$2||'%')) order by p.name limit 30`,
            values,
          )
        ).rows;
  return [...opportunities, ...organizations];
}
export async function createGoal(
  accountId: string,
  input: z.infer<typeof goalInput>,
) {
  const client = await goalPool().connect();
  try {
    await client.query("BEGIN");
    if (
      input.workId &&
      !(
        await client.query(
          "select id from creator_library_works where id=$1 and account_id=$2",
          [input.workId, accountId],
        )
      ).rowCount
    )
      throw new Error("Choose a work from your Library.");
    for (const t of input.targets) {
      const found = await client.query(
        t.kind === "opportunity"
          ? `select o.id from opportunities o where o.id=$1 and ${publicOpportunity}`
          : t.kind === "program"
            ? `select p.id from programs p where p.id=$1 and exists(select 1 from opportunities o where o.program_id=p.id and ${publicOpportunity})`
            : `select p.id from gary_profiles p where p.id=$1 union select r.id from radar_organizations r where r.id=$1`,
        [t.id],
      );
      if (!found.rowCount) throw new Error("Target is no longer available");
    }
    const id = input.requestId;
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      accountId + id,
    ]);
    const previous = await client.query(
      "select account_id,request_hash from creator_goals where id=$1",
      [id],
    );
    if (previous.rowCount) {
      if (
        previous.rows[0].account_id !== accountId ||
        previous.rows[0].request_hash !== fingerprint
      )
        throw new Error("Request conflict");
      await client.query("COMMIT");
      return id;
    }
    await client.query(
      `insert into creator_goals(id,account_id,title,target,starts_on,ends_on,timezone,next_step,cadence_days,next_check_at,recommendations,request_hash,discipline,opportunity_types,work_id,match_preferences) values($1,$2,$3,$4,$5,$6,$7,$8,$9,case when $9::int=0 then null else now()+make_interval(days=>$9::int) end,$10,$11,$12,$13,$14,$15::jsonb)`,
      [
        id,
        accountId,
        input.title,
        input.target,
        input.startsOn,
        input.endsOn,
        input.timezone,
        input.nextStep,
        input.cadenceDays,
        input.recommendations,
        fingerprint,
        input.discipline ?? null,
        input.opportunityTypes ?? [],
        input.workId ?? null,
        JSON.stringify(input.matchPreferences ?? {}),
      ],
    );
    for (const t of input.targets)
      await client.query(
        "insert into creator_goal_targets(goal_id,kind,target_id) values($1,$2,$3) on conflict do nothing",
        [id, t.kind, t.id],
      );
    await client.query("COMMIT");
    return id;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
class GoalEditor extends CreatorRepositoryBase {
  constructor() {
    super(goalPool());
  }
  async edit(
    accountId: string,
    id: string,
    revision: number,
    input: z.infer<typeof goalInput>,
  ) {
    const envelope = creatorCommandEnvelope(
      accountId,
      "goal.edit",
      input.requestId,
      { id, ...input },
      revision,
    );
    return this.executeOwnerCommand(envelope, async (client) => {
      const previous = (
        await client.query(
          "select * from creator_goals where id=$1 and account_id=$2 for update",
          [id, accountId],
        )
      ).rows[0];
      if (!previous || previous.revision !== revision)
        throw new CreatorConflictError(
          "goal",
          id,
          revision,
          previous?.revision ?? 0,
        );
      if (
        input.workId &&
        !(
          await client.query(
            "select id from creator_library_works where id=$1 and account_id=$2",
            [input.workId, accountId],
          )
        ).rowCount
      )
        throw new Error("Choose a work from your Library.");
      for (const t of input.targets) {
        // Existing targets remain editable even if their public listing has closed or disappeared.
        if (
          (
            await client.query(
              "select 1 from creator_goal_targets where goal_id=$1 and kind=$2 and target_id=$3",
              [id, t.kind, t.id],
            )
          ).rowCount
        )
          continue;
        const found = await client.query(
          t.kind === "opportunity"
            ? `select o.id from opportunities o where o.id=$1 and ${publicOpportunity}`
            : t.kind === "program"
              ? `select p.id from programs p where p.id=$1 and exists(select 1 from opportunities o where o.program_id=p.id and ${publicOpportunity})`
              : "select id from radar_organizations where id=$1 union select id from gary_profiles where id=$1",
          [t.id],
        );
        if (!found.rowCount) throw new Error("Target is no longer available.");
      }
      const row = (
        await client.query(
          `update creator_goals set title=$3,target=$4,ends_on=$5,timezone=$6,next_step=$7,cadence_days=$8,recommendations=$9,discipline=$10,opportunity_types=$11,work_id=$12,match_preferences=$13::jsonb,
        next_check_at=case when state<>'active' or $8::int=0 then null when cadence_days=$8::int and timezone=$6 then next_check_at else now()+make_interval(days=>$8::int) end,
        revision=revision+1,updated_at=now() where id=$1 and account_id=$2 returning revision`,
          [
            id,
            accountId,
            input.title,
            input.target,
            input.endsOn,
            input.timezone,
            input.nextStep,
            input.cadenceDays,
            input.recommendations,
            input.discipline ?? null,
            input.opportunityTypes ?? [],
            input.workId ?? null,
            JSON.stringify(input.matchPreferences ?? {}),
          ],
        )
      ).rows[0];
      await client.query("delete from creator_goal_targets where goal_id=$1", [
        id,
      ]);
      for (const t of input.targets)
        await client.query(
          "insert into creator_goal_targets(goal_id,kind,target_id) values($1,$2,$3) on conflict do nothing",
          [id, t.kind, t.id],
        );
      return { resourceType: "goal", resourceId: id, revision: row.revision };
    });
  }
  async moveDate(accountId: string, id: string, revision: number, endsOn: string, requestId: string) {
    const envelope = creatorCommandEnvelope(accountId, "goal.move-date", requestId, { id, endsOn }, revision);
    return this.executeOwnerCommand(envelope, async (client) => {
      const result = await client.query<{ revision: number }>(
        `update creator_goals set ends_on=$4::date, revision=revision+1, updated_at=now()
          where id=$1 and account_id=$2 and revision=$3 returning revision`,
        [id, accountId, revision, endsOn],
      );
      if (!result.rowCount) throw new CreatorConflictError("goal", id, revision, revision + 1);
      return { resourceType: "goal", resourceId: id, revision: result.rows[0]!.revision };
    });
  }
}
export async function editGoal(
  accountId: string,
  id: string,
  revision: number,
  input: z.infer<typeof goalInput>,
) {
  return new GoalEditor().edit(accountId, id, revision, input);
}

export async function listGoals(accountId: string) {
  const result = await goalPool().query(
    `select g.*,g.starts_on::text as starts_on,g.ends_on::text as ends_on,
 ${goalProgressSQL()} as progress,
 coalesce((select jsonb_agg(jsonb_build_object('kind',gt.kind,'id',gt.target_id,'name',coalesce(o.title,p.name,program.name,org.data->>'name',gt.target_id))) from creator_goal_targets gt left join programs program on gt.kind='program' and program.id=gt.target_id left join gary_profiles p on gt.kind='organization' and p.id=gt.target_id left join opportunities o on gt.kind='opportunity' and o.id=gt.target_id left join radar_organizations org on gt.kind='organization' and org.id=gt.target_id where gt.goal_id=g.id),'[]'::jsonb) as targets
 from creator_goals g where g.account_id=$1 order by g.created_at desc`,
    [accountId],
  );
  return result.rows.map((g) => ({
    ...g,
    next_check_at: g.progress >= g.target ? null : g.next_check_at,
  }));
}
export async function changeGoal(
  accountId: string,
  id: string,
  revision: number,
  action: "pause" | "resume" | "check-in",
  nextStep?: string,
) {
  const c = await goalPool().connect();
  try {
    await c.query("BEGIN");
    const r = await c.query(
      `update creator_goals set state=case when $4='pause' then 'paused' when $4='resume' then 'active' else state end,next_step=coalesce($5,next_step),next_check_at=case when $4='pause' or cadence_days=0 then null else now()+make_interval(days=>cadence_days) end,revision=revision+1,updated_at=now() where id=$1 and account_id=$2 and revision=$3 returning id`,
      [id, accountId, revision, action, nextStep ?? null],
    );
    if (!r.rowCount) throw new Error("Goal changed. Refresh and try again.");
    if (action === "check-in")
      await c.query(
        "insert into creator_goal_checkins(id,goal_id,next_step) values($1,$2,$3)",
        [randomUUID(), id, nextStep],
      );
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

export async function moveGoalDate(
  accountId: string,
  id: string,
  revision: number,
  endsOn: string,
  requestId: string,
) {
  return new GoalEditor().moveDate(accountId, id, revision, endsOn, requestId);
}
/** Database time is authoritative; locking and unique due slots make overlapping ticks safe. */
export async function tickGoals(accountId?: string) {
  const c = await goalPool().connect();
  try {
    await c.query("BEGIN");
    const due = await c.query(
      `select g.*,coalesce(p.in_app_enabled and p.reminder_enabled,false) as allowed from creator_goals g left join notification_preferences p on p.account_id=g.account_id where ($1::text is null or g.account_id=$1) and g.state='active' and g.starts_on <= (now() at time zone g.timezone)::date and ${goalProgressSQL()} < g.target and g.next_check_at<=now() and g.ends_on >= (now() at time zone g.timezone)::date order by g.next_check_at for update of g skip locked limit 100`,
      [accountId ?? null],
    );
    for (const g of due.rows) {
      const key = `goal:${g.id}:${new Date(g.next_check_at).toISOString()}`;
      const inserted = await c.query(
        `insert into creator_goal_notifications(id,goal_id,due_at,state) values($1,$2,$3,$4) on conflict do nothing returning id`,
        [
          randomUUID(),
          g.id,
          g.next_check_at,
          g.allowed ? "delivered" : "suppressed",
        ],
      );
      if (inserted.rowCount && g.allowed)
        await c.query(
          `insert into creator_inbox_alerts(id,account_id,kind,title,body,reason,dedupe_key,delivery_eligibility) values($1,$2,'deadline-reminder',$3,$4,$5,$6,'in-app') on conflict do nothing`,
          [
            randomUUID(),
            g.account_id,
            `Check in: ${g.title}`,
            g.next_step,
            `Goal check-in · /goals?goal=${g.id}`,
            key,
          ],
        );
      await c.query(
        `update creator_goals set next_check_at=case when cadence_days=0 then null else now()+make_interval(days=>cadence_days) end where id=$1`,
        [g.id],
      );
    }
    await c.query("COMMIT");
    return { processed: due.rowCount };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

export async function goalRecommendations(accountId: string, goalId: string) {
  const { CreatorRecommendationRepository, RecommendationValidationError } =
    await import("./creator-recommendations.ts");
  let feed;
  try {
    feed = await new CreatorRecommendationRepository().feed(accountId, {
      goalId,
    });
  } catch (error) {
    // Keep goal ownership private. A missing or foreign goal has no feed.
    if (error instanceof RecommendationValidationError)
      return [];
    throw error;
  }
  return feed.items.map((item) => ({
    ...item,
    reason: item.reasons.map((r) => r.label).join(" · "),
  }));
}
