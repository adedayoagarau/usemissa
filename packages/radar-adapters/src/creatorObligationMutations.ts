import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  canonicalCreatorRequestHash,
  CreatorConflictError,
  CreatorIdempotencyConflictError,
} from "./creatorRepository.js";
import type { CreatorPlan } from "./creatorEntitlements.js";
import {
  OBLIGATION_COLUMNS_SQL,
  obligationFromRow,
  obligationsAvailable,
  type CreatorObligation,
  type CreatorObligationAnchor,
  type CreatorObligationBufferPolicy,
  type CreatorObligationKind,
  type CreatorObligationState,
} from "./creatorObligations.js";

type Db = Pool | PoolClient;

/**
 * Writes to the creator obligation ledger: create, edit, complete, skip and
 * delete (revision-checked, replayable with an Idempotency-Key), template
 * sets, chain recalculation when an anchor date moves, and the hooks the
 * Tracker status change calls inside its own transaction.
 */

export class ObligationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObligationValidationError";
  }
}

export class ObligationNotFoundError extends Error {
  constructor(message = "This step is no longer in your plan.") {
    super(message);
    this.name = "ObligationNotFoundError";
  }
}

export type ObligationCommandOptions = {
  /** Required for edits and deletes; ignored on create. */
  expectedRevision?: number;
  idempotencyKey?: string;
};

export type ObligationCommandResult<T> = T & { receiptId?: string; replayed: boolean };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = new Set<CreatorObligationKind>(["start-by", "sub-deadline", "personal-target", "obligation"]);
const ANCHORS = new Set<CreatorObligationAnchor>(["deadline", "stage", "accepted", "fixed"]);
const POLICIES = new Set<CreatorObligationBufferPolicy>(["keep", "absorb", "ignore"]);
const STATES = new Set<CreatorObligationState>(["open", "done", "skipped"]);
const PRE_SUBMISSION_SQL = "('interested','saved','preparing','draft-started','ready-to-submit')";
const EXACT_DEADLINE_SQL = "('exact','fixed')";

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}

function validLabel(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 200)
    throw new ObligationValidationError("Name the step in 1 to 200 characters.");
  return value.trim();
}

function validOffset(value: unknown): number {
  if (!Number.isSafeInteger(value) || Math.abs(Number(value)) > 730)
    throw new ObligationValidationError("Choose an offset within two years of the date it follows.");
  return Number(value);
}

function validEffort(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 999)
    throw new ObligationValidationError("Estimate the effort as hours between 0 and 999.");
  return Math.round(value * 100) / 100;
}

/** Pure date helpers, shared with tests. All dates are ISO calendar dates. */
export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10);
}

export function calendarDaysBetween(from: string, to: string): number {
  const parse = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year!, month! - 1, day!);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

/** "Oct 3", with the year added when it is not the current one. */
export function shortCalendarDate(isoDate: string, today = new Date().toISOString().slice(0, 10)): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const sameYear = isoDate.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year!, month! - 1, day!)));
}

export type ChainCandidate = {
  id: string;
  dueOn: string;
  offsetDays: number | null;
  bufferPolicy: CreatorObligationBufferPolicy;
  state?: CreatorObligationState;
};

export type ChainMove = { id: string; from: string; to: string };

/**
 * The same rules as recalculateChain in apps/web/lib/deadline-chain.ts:
 * keep holds the distance from the anchor; absorb turns an extension into
 * slack and follows an earlier anchor by the same amount; ignore never moves
 * on its own. Done and skipped steps never move.
 */
export function chainMoves(items: readonly ChainCandidate[], oldAnchor: string, newAnchor: string): ChainMove[] {
  const delta = calendarDaysBetween(oldAnchor, newAnchor);
  if (!delta) return [];
  const moves: ChainMove[] = [];
  for (const item of items) {
    if (item.state && item.state !== "open") continue;
    if (item.offsetDays === null || item.bufferPolicy === "ignore") continue;
    let to: string;
    if (item.bufferPolicy === "keep") to = addCalendarDays(newAnchor, item.offsetDays);
    else if (delta > 0) continue;
    else to = addCalendarDays(item.dueOn, delta);
    if (to !== item.dueOn) moves.push({ id: item.id, from: item.dueOn, to });
  }
  return moves;
}

async function requireLedger(db: Db) {
  if (!(await obligationsAvailable(db)))
    throw new ObligationValidationError("Planning is not available yet. Try again later.");
}

type TrackedTarget = {
  id: string;
  opportunity_id: string;
  status: string;
  title: string;
  type: string;
  deadline_date: string | null;
  deadline_kind: string | null;
};

async function lockTracked(
  client: PoolClient,
  accountId: string,
  ref: { trackedOpportunityId?: string; opportunityId?: string },
): Promise<TrackedTarget | undefined> {
  if (!ref.trackedOpportunityId && !ref.opportunityId) return undefined;
  const result = await client.query<TrackedTarget>(
    `select t.id,t.opportunity_id,t.status,o.title,o.type,o.deadline_date::text deadline_date,o.deadline_kind
       from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
      where t.account_id=$1 and ($2::text is null or t.id=$2) and ($3::text is null or t.opportunity_id=$3)
      for update of t`,
    [accountId, ref.trackedOpportunityId ?? null, ref.opportunityId ?? null],
  );
  return result.rows[0];
}

function exactDeadline(target: Pick<TrackedTarget, "deadline_date" | "deadline_kind"> | undefined): string | null {
  return target?.deadline_date && ["exact", "fixed"].includes(target.deadline_kind ?? "") ? target.deadline_date : null;
}

async function readObligation(db: Db, accountId: string, id: string, lock = false): Promise<CreatorObligation | undefined> {
  const result = await db.query(
    `select ${OBLIGATION_COLUMNS_SQL}
       from creator_obligations ob left join opportunities o on o.id=ob.opportunity_id
      where ob.id::text=$1 and ob.account_id=$2 ${lock ? "for update of ob" : ""}`,
    [id, accountId],
  );
  return result.rows[0] ? obligationFromRow(result.rows[0]) : undefined;
}

/**
 * Record that the creator worked on a tracked call. Tolerates databases
 * without migration 0088, where the column does not exist yet.
 */
export async function touchTrackedActivity(db: Db, trackedOpportunityId: string | null | undefined): Promise<void> {
  if (!trackedOpportunityId || !(await obligationsAvailable(db))) return;
  await db.query("update tracked_opportunities set last_activity_at=now() where id=$1", [trackedOpportunityId]);
}

/** touchTrackedActivity for a checklist write, which knows only the checklist. */
export async function touchChecklistActivity(db: Db, accountId: string, checklistId: string): Promise<void> {
  if (!(await obligationsAvailable(db))) return;
  await db.query(
    `update tracked_opportunities t set last_activity_at=now()
       from tracker_checklists c where c.id=$1 and c.account_id=$2 and t.id=c.tracked_opportunity_id`,
    [checklistId, accountId],
  );
}

async function runObligationCommand<T>(
  pool: Pool,
  accountId: string,
  commandType: string,
  payload: unknown,
  options: ObligationCommandOptions,
  mutate: (client: PoolClient) => Promise<{ result: T; targetId: string; revision?: number }>,
): Promise<ObligationCommandResult<T>> {
  const requestHash = canonicalCreatorRequestHash(commandType, payload, options.expectedRevision ?? 1);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (options.idempotencyKey) {
      const replay = await client.query<{ request_hash: string; result: ObligationCommandResult<T> }>(
        `select request_hash,result from workspace_command_receipts
          where scope_type='owner' and scope_id=$1 and actor_account_id=$1 and command_type=$2 and idempotency_key=$3 for update`,
        [accountId, commandType, options.idempotencyKey],
      );
      const prior = replay.rows[0];
      if (prior) {
        if (prior.request_hash !== requestHash) throw new CreatorIdempotencyConflictError();
        await client.query("COMMIT");
        return { ...prior.result, replayed: true };
      }
    }
    await requireLedger(client);
    const mutation = await mutate(client);
    let result: ObligationCommandResult<T> = { ...mutation.result, replayed: false };
    if (options.idempotencyKey) {
      const receiptId = randomUUID();
      const correlationId = randomUUID();
      result = { ...result, receiptId };
      await client.query(
        `insert into workspace_command_receipts
           (id,scope_type,scope_id,actor_account_id,command_type,idempotency_key,request_hash,result,correlation_id)
         values ($1,'owner',$2,$2,$3,$4,$5,$6::jsonb,$7)`,
        [receiptId, accountId, commandType, options.idempotencyKey, requestHash, JSON.stringify(result), correlationId],
      );
      await client.query(
        `insert into audit_events (account_id,action,target_type,target_id,detail,correlation_id)
         values ($1,$2,'creator-obligation',$3,$4::jsonb,$5)`,
        [accountId, commandType, mutation.targetId, JSON.stringify({ receiptId, revision: mutation.revision ?? null }), correlationId],
      );
    }
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export type CreateObligationInput = {
  trackedOpportunityId?: string;
  opportunityId?: string;
  kind?: CreatorObligationKind;
  label: string;
  anchor?: CreatorObligationAnchor;
  anchorStageId?: string;
  /** Signed days from the anchor; required for anchored steps. */
  offsetDays?: number;
  /** Required for fixed steps; for an accepted anchor it is the acceptance date plus the offset. */
  dueOn?: string;
  bufferPolicy?: CreatorObligationBufferPolicy;
  effortHours?: number | null;
  timezone?: string | null;
};

/** Add one step to the creator's plan. */
export async function createObligation(
  pool: Pool,
  accountId: string,
  input: CreateObligationInput,
  options: ObligationCommandOptions = {},
): Promise<ObligationCommandResult<{ obligation: CreatorObligation }>> {
  const label = validLabel(input.label);
  const anchor = input.anchor ?? (input.offsetDays !== undefined && input.dueOn === undefined ? "deadline" : "fixed");
  if (!ANCHORS.has(anchor)) throw new ObligationValidationError("Choose what this step follows.");
  const kind = input.kind ?? (anchor === "deadline" || anchor === "stage" ? "sub-deadline" : "obligation");
  if (!KINDS.has(kind)) throw new ObligationValidationError("Choose a kind of step.");
  const bufferPolicy = input.bufferPolicy ?? "keep";
  if (!POLICIES.has(bufferPolicy)) throw new ObligationValidationError("Choose how this step follows deadline changes.");
  const effortHours = input.effortHours === undefined ? null : validEffort(input.effortHours);
  if (input.dueOn !== undefined && !validDate(input.dueOn)) throw new ObligationValidationError("Choose a valid date.");
  const offsetDays = input.offsetDays === undefined ? null : validOffset(input.offsetDays);
  if (anchor === "fixed" && !input.dueOn) throw new ObligationValidationError("Choose a date for this step.");
  if (anchor !== "fixed" && offsetDays === null) throw new ObligationValidationError("Choose how many days before or after this step falls.");
  return runObligationCommand(pool, accountId, "obligation.create", { ...input, label }, options, async (client) => {
    const tracked = await lockTracked(client, accountId, input);
    if ((input.trackedOpportunityId || input.opportunityId) && !tracked)
      throw new ObligationValidationError("Save this opportunity to your Tracker before planning it.");
    let dueOn: string;
    let anchorStageId: string | null = null;
    if (anchor === "fixed") dueOn = input.dueOn!;
    else if (anchor === "deadline") {
      const deadline = exactDeadline(tracked);
      if (!deadline) throw new ObligationValidationError("This call has no confirmed deadline yet. Choose a date instead.");
      dueOn = addCalendarDays(deadline, offsetDays!);
    } else if (anchor === "stage") {
      if (!tracked || !input.anchorStageId) throw new ObligationValidationError("Choose the stage this step follows.");
      const stage = await client.query<{ id: string; due_on: string | null }>(
        "select id,due_on::text due_on from opportunity_stages where id::text=$1 and opportunity_id=$2",
        [input.anchorStageId, tracked.opportunity_id],
      );
      if (!stage.rows[0]?.due_on) throw new ObligationValidationError("That stage has no date yet. Choose a date instead.");
      anchorStageId = stage.rows[0].id;
      dueOn = addCalendarDays(stage.rows[0].due_on, offsetDays!);
    } else {
      dueOn = input.dueOn ?? addCalendarDays(new Date().toISOString().slice(0, 10), offsetDays!);
    }
    const inserted = await client.query(
      `insert into creator_obligations
         (account_id,tracked_opportunity_id,opportunity_id,kind,label,anchor,anchor_stage_id,offset_days,buffer_policy,
          due_on,timezone,effort_hours,state,source,position)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::date,$11,$12,'open','user',
               (select coalesce(max(position)+1,0) from creator_obligations where account_id=$1 and tracked_opportunity_id is not distinct from $2))
       returning id`,
      [accountId, tracked?.id ?? null, tracked?.opportunity_id ?? null, kind, label, anchor, anchorStageId, offsetDays,
        bufferPolicy, dueOn, input.timezone ?? null, effortHours],
    );
    await touchTrackedActivity(client, tracked?.id);
    const obligation = (await readObligation(client, accountId, inserted.rows[0].id))!;
    return { result: { obligation }, targetId: obligation.id, revision: obligation.revision };
  });
}

export type UpdateObligationInput = {
  label?: string;
  dueOn?: string;
  offsetDays?: number;
  bufferPolicy?: CreatorObligationBufferPolicy;
  effortHours?: number | null;
  state?: CreatorObligationState;
};

/**
 * Edit a step. A new date on a deadline-anchored step keeps it anchored with
 * the new distance, so later deadline changes still carry it; a new offset
 * recomputes the date from the current anchor.
 */
export async function updateObligation(
  pool: Pool,
  accountId: string,
  id: string,
  input: UpdateObligationInput,
  options: ObligationCommandOptions & { expectedRevision: number },
): Promise<ObligationCommandResult<{ obligation: CreatorObligation }>> {
  if (!Number.isSafeInteger(options.expectedRevision) || options.expectedRevision < 1)
    throw new ObligationValidationError("Refresh this step before changing it.");
  const label = input.label === undefined ? undefined : validLabel(input.label);
  if (input.dueOn !== undefined && !validDate(input.dueOn)) throw new ObligationValidationError("Choose a valid date.");
  if (input.dueOn !== undefined && input.offsetDays !== undefined)
    throw new ObligationValidationError("Choose a date or an offset, not both.");
  const offsetDays = input.offsetDays === undefined ? undefined : validOffset(input.offsetDays);
  if (input.bufferPolicy !== undefined && !POLICIES.has(input.bufferPolicy))
    throw new ObligationValidationError("Choose how this step follows deadline changes.");
  if (input.state !== undefined && !STATES.has(input.state)) throw new ObligationValidationError("Choose open, done or skipped.");
  const effortHours = input.effortHours === undefined ? undefined : validEffort(input.effortHours);
  return runObligationCommand(pool, accountId, "obligation.update", { id, ...input }, options, async (client) => {
    const current = await readObligation(client, accountId, id, true);
    if (!current) throw new ObligationNotFoundError();
    if (current.revision !== options.expectedRevision)
      throw new CreatorConflictError("creator-obligation", id, options.expectedRevision, current.revision);
    let anchorOn: string | null = null;
    if (current.anchor === "deadline" && current.trackedOpportunityId) {
      const tracked = await client.query<{ deadline_date: string | null; deadline_kind: string | null }>(
        `select o.deadline_date::text deadline_date,o.deadline_kind from tracked_opportunities t join opportunities o on o.id=t.opportunity_id where t.id=$1`,
        [current.trackedOpportunityId],
      );
      anchorOn = exactDeadline(tracked.rows[0]);
    } else if (current.anchor === "stage" && current.anchorStageId) {
      anchorOn = (await client.query<{ due_on: string | null }>("select due_on::text due_on from opportunity_stages where id=$1", [current.anchorStageId])).rows[0]?.due_on ?? null;
    } else if (current.anchor === "accepted" && current.offsetDays !== null) {
      anchorOn = addCalendarDays(current.dueOn, -current.offsetDays);
    }
    let dueOn = current.dueOn;
    let nextOffset = current.offsetDays;
    let anchor = current.anchor;
    if (input.dueOn !== undefined) {
      dueOn = input.dueOn;
      if (anchor !== "fixed" && anchorOn) nextOffset = calendarDaysBetween(anchorOn, dueOn);
      else if (anchor !== "fixed") { anchor = "fixed"; nextOffset = null; }
    } else if (offsetDays !== undefined) {
      if (anchor === "fixed" || !anchorOn) throw new ObligationValidationError("This step has a fixed date. Choose a new date instead.");
      nextOffset = offsetDays;
      dueOn = addCalendarDays(anchorOn, offsetDays);
    }
    const state = input.state ?? current.state;
    const updated = await client.query(
      `update creator_obligations
          set label=$3,due_on=$4::date,offset_days=$5,anchor=$6,buffer_policy=$7,effort_hours=$8,state=$9,
              completed_at=case when $9='open' then null when state='open' then now() else completed_at end,
              revision=revision+1,updated_at=now()
        where id::text=$1 and account_id=$2 returning id`,
      [id, accountId, label ?? current.label, dueOn, nextOffset, anchor, input.bufferPolicy ?? current.bufferPolicy,
        effortHours === undefined ? current.effortHours : effortHours, state],
    );
    if (!updated.rows[0]) throw new ObligationNotFoundError();
    await touchTrackedActivity(client, current.trackedOpportunityId);
    const obligation = (await readObligation(client, accountId, id))!;
    return { result: { obligation }, targetId: id, revision: obligation.revision };
  });
}

/** Remove a step from the plan. */
export async function deleteObligation(
  pool: Pool,
  accountId: string,
  id: string,
  options: ObligationCommandOptions & { expectedRevision: number },
): Promise<ObligationCommandResult<{ id: string; deleted: true }>> {
  if (!Number.isSafeInteger(options.expectedRevision) || options.expectedRevision < 1)
    throw new ObligationValidationError("Refresh this step before removing it.");
  return runObligationCommand(pool, accountId, "obligation.delete", { id }, options, async (client) => {
    const current = await readObligation(client, accountId, id, true);
    if (!current) throw new ObligationNotFoundError();
    if (current.revision !== options.expectedRevision)
      throw new CreatorConflictError("creator-obligation", id, options.expectedRevision, current.revision);
    await client.query("delete from creator_obligations where id::text=$1 and account_id=$2", [id, accountId]);
    await touchTrackedActivity(client, current.trackedOpportunityId);
    return { result: { id, deleted: true as const }, targetId: id, revision: current.revision + 1 };
  });
}

/** One template step, with effort already corrected by the creator's preferences. */
export type ObligationTemplateInput = {
  key: string;
  label: string;
  kind: "start-by" | "sub-deadline" | "obligation";
  anchor: "deadline" | "accepted";
  offsetDays: number;
  effortHours?: number | null;
  bufferPolicy?: CreatorObligationBufferPolicy;
};

export type ApplyTemplatesResult = {
  created: CreatorObligation[];
  /** Keys already in the plan, in any state, including skipped. */
  existing: string[];
  /** Keys whose date would already have passed. */
  past: string[];
};

/** The stored template key; before and after steps never collide. */
export function templateStorageKey(template: Pick<ObligationTemplateInput, "key" | "anchor">): string {
  return `${template.anchor === "accepted" ? "after" : "before"}:${template.key}`;
}

/**
 * Add template steps to a tracked call, anchored to `anchorOn` (the deadline
 * for preparation steps, the acceptance date for what follows). Idempotent: a
 * step whose template is already in the plan, even skipped, is not added
 * again, and creator_obligations_template_idx settles races. Steps that would
 * be due before `today` are left out. Runs inside the caller's transaction
 * when given a client.
 */
export async function applyTemplates(
  db: Db,
  accountId: string,
  trackedOpportunityId: string,
  templates: readonly ObligationTemplateInput[],
  anchorOn: string,
  options: { today?: string; source?: "template" | "system" } = {},
): Promise<ApplyTemplatesResult> {
  if (!validDate(anchorOn)) throw new ObligationValidationError("Choose a valid date to plan from.");
  await requireLedger(db);
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const tracked = await db.query<{ opportunity_id: string }>(
    "select opportunity_id from tracked_opportunities where id=$1 and account_id=$2",
    [trackedOpportunityId, accountId],
  );
  if (!tracked.rows[0]) throw new ObligationValidationError("Save this opportunity to your Tracker before planning it.");
  const created: CreatorObligation[] = [];
  const existing: string[] = [];
  const past: string[] = [];
  const base = await db.query<{ next: number }>(
    "select coalesce(max(position)+1,0)::int next from creator_obligations where tracked_opportunity_id=$1",
    [trackedOpportunityId],
  );
  let position = base.rows[0]?.next ?? 0;
  const ordered = [...templates].sort((a, b) => a.offsetDays - b.offsetDays);
  for (const template of ordered) {
    const key = templateStorageKey(template);
    const dueOn = addCalendarDays(anchorOn, template.offsetDays);
    if (dueOn < today) { past.push(template.key); continue; }
    const inserted = await db.query<{ id: string }>(
      `insert into creator_obligations
         (account_id,tracked_opportunity_id,opportunity_id,kind,label,template_key,anchor,offset_days,buffer_policy,
          due_on,effort_hours,state,source,position)
       select $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::date,$11,'open',$12,$13
        where not exists (select 1 from creator_obligations where tracked_opportunity_id=$2 and template_key=$6)
       on conflict (tracked_opportunity_id,template_key) where template_key is not null and state <> 'skipped' do nothing
       returning id`,
      [accountId, trackedOpportunityId, tracked.rows[0].opportunity_id, template.kind, template.label, key, template.anchor,
        template.offsetDays, template.bufferPolicy ?? "keep", dueOn, template.effortHours ?? null, options.source ?? "template", position],
    );
    if (!inserted.rows[0]) { existing.push(template.key); continue; }
    position += 1;
    created.push((await readObligation(db, accountId, inserted.rows[0].id))!);
  }
  if (created.length) await touchTrackedActivity(db, trackedOpportunityId);
  return { created, existing, past };
}

/** applyTemplates in its own transaction, locking the tracked call first. */
export async function applyTemplatesForTracked(
  pool: Pool,
  accountId: string,
  ref: { trackedOpportunityId?: string; opportunityId?: string },
  templates: readonly ObligationTemplateInput[],
  anchor: "deadline" | "today",
  options: { today?: string; onlyWhenEmpty?: boolean } = {},
): Promise<ApplyTemplatesResult & { trackedOpportunityId: string; skipped?: "has-plan" | "no-deadline" }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await requireLedger(client);
    const tracked = await lockTracked(client, accountId, ref);
    if (!tracked) throw new ObligationValidationError("Save this opportunity to your Tracker before planning it.");
    const today = options.today ?? new Date().toISOString().slice(0, 10);
    const empty = { created: [], existing: [], past: [], trackedOpportunityId: tracked.id };
    if (options.onlyWhenEmpty) {
      const planned = await client.query(
        "select 1 from creator_obligations where tracked_opportunity_id=$1 and template_key is not null limit 1",
        [tracked.id],
      );
      if (planned.rowCount) { await client.query("COMMIT"); return { ...empty, skipped: "has-plan" }; }
    }
    const anchorOn = anchor === "today" ? today : exactDeadline(tracked);
    if (!anchorOn) { await client.query("COMMIT"); return { ...empty, skipped: "no-deadline" }; }
    const result = await applyTemplates(client, accountId, tracked.id, templates, anchorOn, { today });
    await client.query("COMMIT");
    return { ...result, trackedOpportunityId: tracked.id };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function insertPlanNotice(
  db: Db,
  notice: { accountId: string; opportunityId: string; kind: string; title: string; body: string; dedupeKey: string; actionHref: string },
): Promise<number> {
  const inserted = await db.query(
    `insert into creator_inbox_alerts(id,account_id,opportunity_id,kind,title,body,reason,dedupe_key,delivery_eligibility,action_href)
     values($1,$2,$3,$4,$5,$6,'You saved this opportunity.',$7,'in-app',$8)
     on conflict (account_id,dedupe_key) do nothing`,
    [randomUUID(), notice.accountId, notice.opportunityId, notice.kind, notice.title, notice.body, notice.dedupeKey, notice.actionHref],
  );
  return inserted.rowCount ?? 0;
}

export function trackerItemHref(opportunityId: string, section?: string): string {
  return `/tracker?application=${encodeURIComponent(opportunityId)}${section ? `&section=${encodeURIComponent(section)}` : ""}`;
}

export type ChainRecalculationOptions = {
  accountId?: string;
  trackedOpportunityId?: string;
  /** Only accounts on these plans move automatically; omit for every account. */
  plans?: readonly CreatorPlan[];
  /** Today, for notice wording. */
  today?: string;
  limit?: number;
};

export type ChainRecalculationSummary = { processed: number; moved: number; notices: number };

type ChainRow = {
  id: string;
  account_id: string;
  tracked_opportunity_id: string;
  opportunity_id: string;
  title: string;
  label: string;
  anchor: "deadline" | "stage";
  stage_label: string | null;
  due_on: string;
  offset_days: number;
  buffer_policy: CreatorObligationBufferPolicy;
  anchor_on: string;
};

/**
 * Move anchored, open steps whose anchor date (the official deadline, or a
 * stage date) no longer matches the date they were planned from. The date a
 * step was planned from is its due date minus its offset, so the pass is
 * idempotent and needs no history: steps that already follow the anchor are
 * never touched, and an absorbed extension is left as slack. Each tracked
 * call with moves gets one 'obligations-moved' Inbox notice naming the old
 * and new dates. Runs inside the caller's transaction.
 */
export async function recalculateObligationChainsIn(
  client: PoolClient,
  options: ChainRecalculationOptions = {},
): Promise<ChainRecalculationSummary> {
  if (!(await obligationsAvailable(client))) return { processed: 0, moved: 0, notices: 0 };
  let planFilter = "";
  const values: unknown[] = [options.accountId ?? null, options.trackedOpportunityId ?? null, options.limit ?? 500];
  if (options.plans) {
    if (!options.plans.length) return { processed: 0, moved: 0, notices: 0 };
    const plansReady = (await client.query<{ ready: boolean }>("select to_regclass('public.creator_plans') is not null ready")).rows[0]?.ready;
    if (!plansReady && !options.plans.includes("free")) return { processed: 0, moved: 0, notices: 0 };
    values.push([...options.plans]);
    planFilter = plansReady
      ? `and coalesce((select p.plan from creator_plans p where p.account_id=ob.account_id and (p.expires_at is null or p.expires_at>now())),'free') = any($4::text[])`
      : "";
  }
  const rows = await client.query<ChainRow>(
    `select * from (
       select ob.id::text id,ob.account_id,ob.tracked_opportunity_id,t.opportunity_id,o.title,ob.label,ob.anchor,s.label stage_label,
              ob.due_on::text due_on,ob.offset_days,ob.buffer_policy,
              (case when ob.anchor='deadline' then o.deadline_date else s.due_on end)::text anchor_on
         from creator_obligations ob
         join tracked_opportunities t on t.id=ob.tracked_opportunity_id and t.account_id=ob.account_id
         join opportunities o on o.id=t.opportunity_id
         left join opportunity_stages s on s.id=ob.anchor_stage_id
        where ob.state='open' and ob.offset_days is not null and ob.buffer_policy<>'ignore'
          and ($1::text is null or ob.account_id=$1) and ($2::text is null or ob.tracked_opportunity_id=$2)
          and ((ob.anchor='deadline' and o.deadline_date is not null and o.deadline_kind in ${EXACT_DEADLINE_SQL})
               or (ob.anchor='stage' and s.due_on is not null))
          ${planFilter}
        order by ob.tracked_opportunity_id,ob.due_on,ob.id
        for update of ob skip locked
     ) candidate
     where (candidate.due_on::date - candidate.offset_days) <> candidate.anchor_on::date
       and not (candidate.buffer_policy='absorb' and candidate.anchor_on::date > candidate.due_on::date - candidate.offset_days)
     limit $3`,
    values,
  );
  const groups = new Map<string, ChainRow[]>();
  for (const row of rows.rows) {
    const plannedFrom = addCalendarDays(row.due_on, -row.offset_days);
    const key = `${row.tracked_opportunity_id}|${row.anchor}|${plannedFrom}|${row.anchor_on}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const perTracked = new Map<string, { row: ChainRow; was: string; now: string; moves: Array<ChainMove & { label: string }> }>();
  let moved = 0;
  for (const [key, group] of groups) {
    const plannedFrom = key.split("|")[2]!;
    const anchorOn = group[0]!.anchor_on;
    const moves = chainMoves(
      group.map((row) => ({ id: row.id, dueOn: row.due_on, offsetDays: row.offset_days, bufferPolicy: row.buffer_policy })),
      plannedFrom,
      anchorOn,
    );
    for (const move of moves) {
      await client.query(
        "update creator_obligations set due_on=$2::date,revision=revision+1,updated_at=now() where id::text=$1",
        [move.id, move.to],
      );
      moved += 1;
      const row = group.find((candidate) => candidate.id === move.id)!;
      const entry = perTracked.get(row.tracked_opportunity_id) ?? { row, was: plannedFrom, now: anchorOn, moves: [] };
      entry.moves.push({ ...move, label: row.label });
      perTracked.set(row.tracked_opportunity_id, entry);
    }
  }
  let notices = 0;
  for (const [trackedId, entry] of perTracked) {
    const what = entry.row.anchor === "stage" ? `The ${entry.row.stage_label ?? "stage"} date` : "The deadline";
    const steps = entry.moves
      .map((move) => `${move.label} from ${shortCalendarDate(move.from, today)} to ${shortCalendarDate(move.to, today)}`)
      .join("; ");
    const count = entry.moves.length;
    notices += await insertPlanNotice(client, {
      accountId: entry.row.account_id,
      opportunityId: entry.row.opportunity_id,
      kind: "obligations-moved",
      title: `Your plan moved with the date: ${entry.row.title}`,
      body: `${what} moved from ${shortCalendarDate(entry.was, today)} to ${shortCalendarDate(entry.now, today)}, so ${count === 1 ? "one step moved" : `${count} steps moved`}: ${steps}.`,
      dedupeKey: `obligations-moved:${trackedId}:${entry.row.anchor}:${entry.now}`,
      actionHref: trackerItemHref(entry.row.opportunity_id, "plan"),
    });
  }
  return { processed: rows.rowCount ?? 0, moved, notices };
}

/** recalculateObligationChainsIn in its own transaction. */
export async function recalculateObligationChainsForAccount(
  pool: Pool,
  options: ChainRecalculationOptions = {},
): Promise<ChainRecalculationSummary> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await recalculateObligationChainsIn(client, options);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * The creator's answer to a deadline-changed review, "move my preparation":
 * open deadline-anchored steps that do not already follow the new deadline
 * are placed at their planned distance from it. That covers every change
 * since they were planned, including ones nobody reviewed, whatever their
 * buffer policy. Steps the automatic chain already moved are left alone.
 */
export async function shiftObligationsWithDeadline(
  client: PoolClient,
  accountId: string,
  opportunityId: string,
  previous: string,
  next: string,
): Promise<number> {
  if (!(await obligationsAvailable(client))) return 0;
  if (!calendarDaysBetween(previous, next)) return 0;
  const shifted = await client.query(
    `update creator_obligations ob
        set due_on=$3::date+ob.offset_days,revision=ob.revision+1,updated_at=now()
       from tracked_opportunities t
      where t.id=ob.tracked_opportunity_id and t.account_id=$1 and t.opportunity_id=$2 and ob.account_id=$1
        and ob.anchor='deadline' and ob.state='open' and ob.offset_days is not null
        and (ob.due_on - ob.offset_days) <> $3::date`,
    [accountId, opportunityId, next],
  );
  return shifted.rowCount ?? 0;
}

export type TrackedStatusChange = {
  accountId: string;
  trackedOpportunityId: string;
  opportunityId: string;
  title: string;
  from: string;
  to: string;
};

export type TrackedStatusHookResult = { closed: number; suggested: number };

/**
 * Planning work that follows a Tracker status change, inside the status
 * transaction. Submitting closes the open preparation steps; an acceptance
 * offers the usual next steps through one Inbox notice the creator can act
 * on. Every change records activity on the call.
 */
export async function onTrackedStatusChanged(client: PoolClient, change: TrackedStatusChange): Promise<TrackedStatusHookResult> {
  if (!(await obligationsAvailable(client))) return { closed: 0, suggested: 0 };
  await touchTrackedActivity(client, change.trackedOpportunityId);
  let closed = 0;
  let suggested = 0;
  if (change.to === "submitted") {
    const done = await client.query(
      `update creator_obligations set state='done',completed_at=now(),revision=revision+1,updated_at=now()
        where tracked_opportunity_id=$1 and account_id=$2 and state='open' and kind in ('start-by','sub-deadline')`,
      [change.trackedOpportunityId, change.accountId],
    );
    closed = done.rowCount ?? 0;
  }
  if (change.to === "accepted") {
    const hasAfter = await client.query(
      "select 1 from creator_obligations where tracked_opportunity_id=$1 and anchor='accepted' limit 1",
      [change.trackedOpportunityId],
    );
    if (!hasAfter.rowCount)
      suggested = await insertPlanNotice(client, {
        accountId: change.accountId,
        opportunityId: change.opportunityId,
        kind: "obligations-suggested",
        title: `Plan what comes next: ${change.title}`,
        body: "Congratulations. Add the usual steps after an acceptance, like returning the agreement, with dates you can change.",
        dedupeKey: `obligations-suggested:${change.trackedOpportunityId}`,
        actionHref: trackerItemHref(change.opportunityId, "after-acceptance"),
      });
  }
  return { closed, suggested };
}

/** An open tracked call with what capacity and start-by planning need. */
export type PlanningItem = {
  trackedOpportunityId: string;
  opportunityId: string;
  title: string;
  type: string;
  status: string;
  deadline: string | null;
  deadlineKind: string | null;
  personalTargetOn: string | null;
  /** Hours of effort on open steps. */
  remainingEffortHours: number;
  openSteps: number;
};

type PlanningRow = {
  tracked_id: string; opportunity_id: string; title: string; type: string; status: string;
  deadline_date: string | null; deadline_kind: string | null; personal_target_on: string | null;
  remaining: string | number | null; open_steps: number;
};

type PlanningRef = { opportunityId?: string; trackedOpportunityId?: string };

async function queryPlanningItems(db: Db, accountId: string, ref: PlanningRef = {}): Promise<PlanningItem[]> {
  if (!(await obligationsAvailable(db))) return [];
  const result = await db.query<PlanningRow>(
    `select t.id tracked_id,t.opportunity_id,o.title,o.type,t.status,o.deadline_date::text deadline_date,o.deadline_kind,
            t.personal_target_on::text personal_target_on,
            (select coalesce(sum(ob.effort_hours),0) from creator_obligations ob where ob.tracked_opportunity_id=t.id and ob.state='open') remaining,
            (select count(*)::int from creator_obligations ob where ob.tracked_opportunity_id=t.id and ob.state='open') open_steps
       from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
      where t.account_id=$1 and ($2::text is not null or $3::text is not null or t.status in ${PRE_SUBMISSION_SQL})
        and ($2::text is null or t.opportunity_id=$2) and ($3::text is null or t.id=$3)
      order by coalesce(t.personal_target_on,o.deadline_date) nulls last,t.id`,
    [accountId, ref.opportunityId ?? null, ref.trackedOpportunityId ?? null],
  );
  return result.rows.map((row) => ({
    trackedOpportunityId: row.tracked_id,
    opportunityId: row.opportunity_id,
    title: row.title,
    type: row.type,
    status: row.status,
    deadline: row.deadline_date,
    deadlineKind: row.deadline_kind,
    personalTargetOn: row.personal_target_on,
    remainingEffortHours: Number(row.remaining ?? 0),
    openSteps: row.open_steps,
  }));
}

/** Tracked calls still in preparation, with remaining effort from open steps. */
export async function listPlanningItems(db: Db, accountId: string): Promise<PlanningItem[]> {
  return queryPlanningItems(db, accountId);
}

/** One tracked call, in any status, or undefined when it is not tracked. */
export async function planningItemFor(db: Db, accountId: string, ref: PlanningRef): Promise<PlanningItem | undefined> {
  if (!ref.opportunityId && !ref.trackedOpportunityId) return undefined;
  return (await queryPlanningItems(db, accountId, ref))[0];
}
