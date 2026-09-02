import { randomUUID } from "node:crypto";
import type { MyStatus, OpportunityType } from "@missa/radar-engine";
import {
  canonicalCreatorRequestHash,
  creatorPoolFor,
  CreatorConflictError,
  CreatorIdempotencyConflictError,
} from "./creatorRepository.js";
import { canonicalPublicOpportunityPredicate } from "./canonicalOpportunityProjection.js";

export type CanonicalTrackerSave = {
  status: "created" | "already-present";
  receiptId?: string;
  replayed: boolean;
  tracked: {
    id: string;
    accountId: string;
    opportunityId: string;
    status: string;
    revision: number;
    trackedAt: string;
    updatedAt: string;
  };
};

export type CanonicalTrackerStatus = MyStatus;

export type CanonicalTrackerItem = {
  opportunityId: string;
  title: string;
  organizationName?: string;
  type: OpportunityType;
  opportunityStatus: string;
  myStatus: MyStatus;
  deadline?: string;
  deadlineKind: string;
  revision: number;
  notify: boolean;
  workId?: string;
};

type TrackerRow = {
  id: string;
  account_id: string;
  opportunity_id: string;
  status: string;
  tracked_at: Date | string;
  updated_at: Date | string;
  revision: number;
  notify: boolean;
  work_id: string | null;
};

type TrackerOpportunityRow = TrackerRow & {
  title: string;
  organization_name: string | null;
  opportunity_status: string;
  opportunity_type: string;
  deadline_date: string | null;
  deadline_kind: string | null;
};

const OPPORTUNITY_TYPES = new Set<OpportunityType>([
  "open-call",
  "magazine",
  "grant",
  "award",
  "fellowship",
  "residency",
  "festival",
  "scholarship",
  "conference",
  "rfp",
  "contest",
  "pitch",
  "exhibition",
  "commission",
  "other",
]);

const CANONICAL_STATUSES = new Set<CanonicalTrackerStatus>([
  "interested",
  "saved",
  "preparing",
  "draft-started",
  "ready-to-submit",
  "submitted",
  "received",
  "in-review",
  "longlisted",
  "shortlisted",
  "finalist",
  "withdrawn",
  "partially-withdrawn",
  "accepted",
  "declined",
  "waitlisted",
  "revision-requested",
  "delivered",
  "archived",
]);

function opportunityType(value: string): OpportunityType {
  return OPPORTUNITY_TYPES.has(value as OpportunityType)
    ? (value as OpportunityType)
    : "other";
}

function deadlineKind(value: string | null): string {
  if (value === "fixed") return "exact";
  return value || "unknown";
}

function trackerItem(row: TrackerOpportunityRow): CanonicalTrackerItem {
  const status = CANONICAL_STATUSES.has(row.status as CanonicalTrackerStatus)
    ? (row.status as CanonicalTrackerStatus)
    : "interested";
  return {
    opportunityId: row.opportunity_id,
    title: row.title,
    organizationName: row.organization_name ?? undefined,
    type: opportunityType(row.opportunity_type),
    opportunityStatus: row.opportunity_status,
    myStatus: status,
    deadline: row.deadline_date ?? undefined,
    deadlineKind: deadlineKind(row.deadline_kind),
    revision: row.revision,
    notify: row.notify,
    workId: row.work_id ?? undefined,
  };
}

/**
 * Read the relational Tracker projection for the signed-in account. This is
 * intentionally separate from the legacy Radar snapshot while the two stores
 * are being migrated.
 */
export async function listCanonicalTrackedOpportunities(
  connectionString: string,
  accountId: string,
): Promise<CanonicalTrackerItem[]> {
  const pool = creatorPoolFor(connectionString);
    const result = await pool.query<TrackerOpportunityRow>(
      `select t.id, t.account_id, t.opportunity_id, t.status, t.tracked_at, t.updated_at, t.revision, t.notify, t.work_id,
              o.title, coalesce(org.data->>'name', o.organization_id) as organization_name, o.status as opportunity_status,
              o.type as opportunity_type, o.deadline_date, o.deadline_kind
       from tracked_opportunities t
       join opportunities o on o.id = t.opportunity_id
       left join radar_organizations org on org.id = o.organization_id
       where t.account_id = $1 and ${canonicalPublicOpportunityPredicate("o")}
       order by t.updated_at desc, t.id desc`,
      [accountId],
    );
  return result.rows.map(trackerItem);
}

/** Preserve the complete creator lifecycle vocabulary in relational authority. */
export function canonicalTrackerStatus(
  value: string,
): CanonicalTrackerStatus | null {
  return CANONICAL_STATUSES.has(value as MyStatus) ? value as MyStatus : null;
}

export type CanonicalTrackerStatusUpdate = {
  status: "updated" | "unchanged";
  tracked: CanonicalTrackerItem;
  receiptId?: string;
  replayed: boolean;
};

export type CanonicalTrackerReminderUpdate = {
  status: "updated" | "unchanged";
  tracked: CanonicalTrackerItem;
  receiptId?: string;
  replayed: boolean;
};

export type CanonicalTrackerRemoval = {
  status: "removed";
  opportunityId: string;
  receiptId?: string;
  replayed: boolean;
};

export async function updateCanonicalTrackerStatus(
  connectionString: string,
  accountId: string,
  opportunityId: string,
  status: CanonicalTrackerStatus,
  options: { expectedRevision?: number; idempotencyKey?: string; source?: "user" | "radar" | "email"; note?: string; confidence?: "high" | "possible" | "unknown"; candidateId?: string; evidence?: Record<string, unknown> } = {},
): Promise<CanonicalTrackerStatusUpdate | null> {
  const pool = creatorPoolFor(connectionString);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const commandType="tracker.status.update";
    const requestHash=canonicalCreatorRequestHash(commandType,{ opportunityId,status },options.expectedRevision ?? 1);
    if (options.idempotencyKey) {
      const replay=await client.query<{request_hash:string;result:CanonicalTrackerStatusUpdate}>(
        `select request_hash,result from workspace_command_receipts
         where scope_type='owner' and scope_id=$1 and actor_account_id=$1 and command_type=$2 and idempotency_key=$3 for update`,
        [accountId,commandType,options.idempotencyKey],
      );
      const prior=replay.rows[0];
      if (prior) {
        if (prior.request_hash!==requestHash) throw new CreatorIdempotencyConflictError();
        await client.query("COMMIT");
        return { ...prior.result,replayed:true };
      }
    }
    const current = await client.query<TrackerOpportunityRow>(
      `select t.id, t.account_id, t.opportunity_id, t.status, t.tracked_at, t.updated_at, t.revision, t.notify, t.work_id,
              o.title, coalesce(org.data->>'name', o.organization_id) as organization_name, o.status as opportunity_status,
              o.type as opportunity_type, o.deadline_date, o.deadline_kind
       from tracked_opportunities t
       join opportunities o on o.id = t.opportunity_id
       left join radar_organizations org on org.id = o.organization_id
       where t.account_id = $1 and t.opportunity_id = $2 and ${canonicalPublicOpportunityPredicate("o")}
       for update of t`,
      [accountId, opportunityId],
    );
    const row = current.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }
    if (options.expectedRevision !== undefined && row.revision !== options.expectedRevision) {
      throw new CreatorConflictError("tracked-opportunity", opportunityId, options.expectedRevision, row.revision);
    }
    if (row.status === status) {
      const result=await recordTrackerStatusCommand(client,accountId,opportunityId,{ status:"unchanged",tracked:trackerItem(row),replayed:false },requestHash,options);
      await client.query("COMMIT");
      return result;
    }

    const updated = await client.query<TrackerRow>(
      `update tracked_opportunities
       set status = $3, revision = revision + 1, updated_at = now()
       where account_id = $1 and opportunity_id = $2 and revision = $4
       returning id, account_id, opportunity_id, status, tracked_at, updated_at, revision, notify, work_id`,
      [accountId, opportunityId, status, row.revision],
    );
    await client.query(
      `insert into tracked_status_events
         (tracked_opportunity_id, account_id, from_status, to_status, source, idempotency_key, note, confidence, candidate_id, evidence)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [row.id, accountId, row.status, status, options.source ?? "user", options.idempotencyKey ?? null, options.note ?? null, options.confidence ?? null, options.candidateId ?? null, options.evidence ? JSON.stringify(options.evidence) : null],
    );
    const next = updated.rows[0];
    const result = next
      ? {
          status: "updated" as const,
          tracked: trackerItem({ ...row, ...next }),
          replayed:false,
        }
      : null;
    if (!result) { await client.query("ROLLBACK"); return null; }
    const governed=await recordTrackerStatusCommand(client,accountId,opportunityId,result,requestHash,options);
    await client.query("COMMIT");
    return governed;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function recordTrackerStatusCommand(
  client: import("pg").PoolClient,
  accountId:string,
  opportunityId:string,
  result:CanonicalTrackerStatusUpdate,
  requestHash:string,
  options:{ idempotencyKey?:string },
):Promise<CanonicalTrackerStatusUpdate> {
  if (!options.idempotencyKey) return result;
  const receiptId=randomUUID(),correlationId=randomUUID();
  const bounded={ ...result,receiptId };
  await client.query(
    `insert into workspace_command_receipts
       (id,scope_type,scope_id,actor_account_id,command_type,idempotency_key,request_hash,result,correlation_id)
     values ($1,'owner',$2,$2,'tracker.status.update',$3,$4,$5::jsonb,$6)`,
    [receiptId,accountId,options.idempotencyKey,requestHash,JSON.stringify(bounded),correlationId],
  );
  await client.query(
    `insert into audit_events (account_id,action,target_type,target_id,detail,correlation_id)
     values ($1,'tracker.status.update','tracked_opportunity',$2,$3::jsonb,$4)`,
    [accountId,opportunityId,JSON.stringify({receiptId,status:result.status,revision:result.tracked.revision}),correlationId],
  );
  await client.query(
    `insert into outbox_events (topic,aggregate_type,aggregate_id,payload,event_key,correlation_id)
     values ('tracker.status.update','tracked_opportunity',$1,$2::jsonb,$3,$4)`,
    [opportunityId,JSON.stringify({opportunityId,status:result.tracked.myStatus,revision:result.tracked.revision}),receiptId,correlationId],
  );
  return bounded;
}

export async function updateCanonicalTrackerReminder(
  connectionString: string,
  accountId: string,
  opportunityId: string,
  notify: boolean,
  options: { expectedRevision: number; idempotencyKey: string },
): Promise<CanonicalTrackerReminderUpdate | null> {
  const pool = creatorPoolFor(connectionString);
  const client = await pool.connect();
  const commandType = "tracker.reminder.update";
  const requestHash = canonicalCreatorRequestHash(
    commandType,
    { opportunityId, notify },
    options.expectedRevision,
  );
  try {
    await client.query("BEGIN");
    const replay = await client.query<{ request_hash: string; result: CanonicalTrackerReminderUpdate }>(
      `select request_hash, result from workspace_command_receipts
       where scope_type='owner' and scope_id=$1 and actor_account_id=$1
         and command_type=$2 and idempotency_key=$3 for update`,
      [accountId, commandType, options.idempotencyKey],
    );
    if (replay.rows[0]) {
      if (replay.rows[0].request_hash !== requestHash) throw new CreatorIdempotencyConflictError();
      await client.query("COMMIT");
      return { ...replay.rows[0].result, replayed: true };
    }
    const current = await client.query<TrackerOpportunityRow>(
      `select t.id, t.account_id, t.opportunity_id, t.status, t.tracked_at, t.updated_at, t.revision, t.notify, t.work_id,
              o.title, coalesce(org.data->>'name', o.organization_id) as organization_name, o.status as opportunity_status,
              o.type as opportunity_type, o.deadline_date, o.deadline_kind
       from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
       left join radar_organizations org on org.id=o.organization_id
       where t.account_id=$1 and t.opportunity_id=$2 and ${canonicalPublicOpportunityPredicate("o")} for update of t`,
      [accountId, opportunityId],
    );
    const row = current.rows[0];
    if (!row) { await client.query("ROLLBACK"); return null; }
    if (row.revision !== options.expectedRevision) {
      throw new CreatorConflictError("tracked-opportunity", opportunityId, options.expectedRevision, row.revision);
    }
    let tracked = trackerItem(row);
    let status: CanonicalTrackerReminderUpdate["status"] = "unchanged";
    if (row.notify !== notify) {
      const changed = await client.query<TrackerRow>(
        `update tracked_opportunities set notify=$3,revision=revision+1,updated_at=now()
         where account_id=$1 and opportunity_id=$2 and revision=$4
         returning id,account_id,opportunity_id,status,tracked_at,updated_at,revision,notify,work_id`,
        [accountId, opportunityId, notify, row.revision],
      );
      tracked = trackerItem({ ...row, ...changed.rows[0] });
      status = "updated";
    }
    const receiptId = randomUUID(), correlationId = randomUUID();
    const result: CanonicalTrackerReminderUpdate = { status, tracked, receiptId, replayed: false };
    await client.query(
      `insert into workspace_command_receipts
       (id,scope_type,scope_id,actor_account_id,command_type,idempotency_key,request_hash,result,correlation_id)
       values ($1,'owner',$2,$2,$3,$4,$5,$6::jsonb,$7)`,
      [receiptId, accountId, commandType, options.idempotencyKey, requestHash, JSON.stringify(result), correlationId],
    );
    await client.query(
      `insert into audit_events (account_id,action,target_type,target_id,detail,correlation_id)
       values ($1,$2,'tracked_opportunity',$3,$4::jsonb,$5)`,
      [accountId, commandType, opportunityId, JSON.stringify({ receiptId, notify, revision: tracked.revision }), correlationId],
    );
    await client.query(
      `insert into outbox_events (topic,aggregate_type,aggregate_id,payload,event_key,correlation_id)
       values ($1,'tracked_opportunity',$2,$3::jsonb,$4,$5)`,
      [commandType, opportunityId, JSON.stringify({ opportunityId, notify, revision: tracked.revision }), receiptId, correlationId],
    );
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

export async function removeCanonicalTrackedOpportunity(
  connectionString: string,
  accountId: string,
  opportunityId: string,
  options: { expectedRevision: number; idempotencyKey: string },
): Promise<CanonicalTrackerRemoval | null> {
  const pool = creatorPoolFor(connectionString);
  const client = await pool.connect();
  const commandType = "tracker.remove";
  const requestHash = canonicalCreatorRequestHash(commandType, { opportunityId }, options.expectedRevision);
  try {
    await client.query("BEGIN");
    const replay = await client.query<{ request_hash: string; result: CanonicalTrackerRemoval }>(
      `select request_hash,result from workspace_command_receipts
       where scope_type='owner' and scope_id=$1 and actor_account_id=$1
         and command_type=$2 and idempotency_key=$3 for update`,
      [accountId, commandType, options.idempotencyKey],
    );
    if (replay.rows[0]) {
      if (replay.rows[0].request_hash !== requestHash) throw new CreatorIdempotencyConflictError();
      await client.query("COMMIT");
      return { ...replay.rows[0].result, replayed: true };
    }
    const current = await client.query<{ id: string; revision: number }>(
      `select id,revision from tracked_opportunities
       where account_id=$1 and opportunity_id=$2 for update`,
      [accountId, opportunityId],
    );
    const row = current.rows[0];
    if (!row) { await client.query("ROLLBACK"); return null; }
    if (row.revision !== options.expectedRevision) {
      throw new CreatorConflictError("tracked-opportunity", opportunityId, options.expectedRevision, row.revision);
    }
    const receiptId = randomUUID(), correlationId = randomUUID();
    const result: CanonicalTrackerRemoval = { status: "removed", opportunityId, receiptId, replayed: false };
    await client.query(
      `insert into workspace_command_receipts
       (id,scope_type,scope_id,actor_account_id,command_type,idempotency_key,request_hash,result,correlation_id)
       values ($1,'owner',$2,$2,$3,$4,$5,$6::jsonb,$7)`,
      [receiptId, accountId, commandType, options.idempotencyKey, requestHash, JSON.stringify(result), correlationId],
    );
    await client.query(
      `insert into audit_events (account_id,action,target_type,target_id,detail,correlation_id)
       values ($1,$2,'tracked_opportunity',$3,$4::jsonb,$5)`,
      [accountId, commandType, opportunityId, JSON.stringify({ receiptId, removedRevision: row.revision }), correlationId],
    );
    await client.query(
      `insert into outbox_events (topic,aggregate_type,aggregate_id,payload,event_key,correlation_id)
       values ($1,'tracked_opportunity',$2,$3::jsonb,$4,$5)`,
      [commandType, opportunityId, JSON.stringify({ opportunityId, removedRevision: row.revision }), receiptId, correlationId],
    );
    await client.query(`delete from tracked_opportunities where id=$1`, [row.id]);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

function trackedRow(row: TrackerRow): CanonicalTrackerSave["tracked"] {
  return {
    id: row.id,
    accountId: row.account_id,
    opportunityId: row.opportunity_id,
    status: row.status,
    revision: row.revision,
    trackedAt: new Date(row.tracked_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/**
 * Save an authoritative opportunity for an account during the migration from
 * the legacy Radar JSON snapshot to the relational opportunity projection.
 * The schema and its migrations belong to @missa/db; this adapter only owns
 * the request-time transaction.
 */
export async function saveCanonicalOpportunityToTracker(
  connectionString: string,
  accountId: string,
  opportunityId: string,
  options: { idempotencyKey?: string; correlationId?: string } = {},
): Promise<CanonicalTrackerSave | null> {
  const pool = creatorPoolFor(connectionString);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const commandType = "tracker.save";
    const requestHash = canonicalCreatorRequestHash(
      commandType,
      { opportunityId },
      1,
    );
    if (options.idempotencyKey) {
      const replay = await client.query<{
        request_hash: string;
        result: CanonicalTrackerSave;
      }>(
        `select request_hash, result
         from workspace_command_receipts
         where scope_type = 'owner' and scope_id = $1 and actor_account_id = $1
           and command_type = $2 and idempotency_key = $3
         for update`,
        [accountId, commandType, options.idempotencyKey],
      );
      const prior = replay.rows[0];
      if (prior) {
        if (prior.request_hash !== requestHash) {
          throw new CreatorIdempotencyConflictError();
        }
        await client.query("COMMIT");
        return { ...prior.result, replayed: true };
      }
    }

    const opportunity = await client.query<{ id: string }>(
      "select id from opportunities where id = $1 and publication_state = 'published'",
      [opportunityId],
    );
    if (!opportunity.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const inserted = await client.query<TrackerRow>(
      `insert into tracked_opportunities
         (id, account_id, opportunity_id, status, tracked_at, updated_at)
       values ($1, $2, $3, 'interested', now(), now())
       on conflict (account_id, opportunity_id) do nothing
       returning id, account_id, opportunity_id, status, tracked_at, updated_at, revision, notify, work_id`,
      [`tracked_${randomUUID()}`, accountId, opportunityId],
    );

    if (inserted.rows[0]) {
      await client.query(
        `insert into tracked_status_events
           (tracked_opportunity_id, account_id, from_status, to_status, source)
         values ($1, $2, null, 'interested', 'user')`,
        [inserted.rows[0].id, accountId],
      );
      const result: CanonicalTrackerSave = {
        status: "created",
        tracked: trackedRow(inserted.rows[0]),
        replayed: false,
      };
      const governed = await recordTrackerSaveCommand(
        client,
        accountId,
        opportunityId,
        result,
        requestHash,
        options,
      );
      await client.query("COMMIT");
      return governed;
    }

    const existing = await client.query<TrackerRow>(
      `select id, account_id, opportunity_id, status, tracked_at, updated_at, revision, notify, work_id
       from tracked_opportunities
       where account_id = $1 and opportunity_id = $2`,
      [accountId, opportunityId],
    );
    const row = existing.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }
    const result: CanonicalTrackerSave = {
      status: "already-present",
      tracked: trackedRow(row),
      replayed: false,
    };
    const governed = await recordTrackerSaveCommand(
      client,
      accountId,
      opportunityId,
      result,
      requestHash,
      options,
    );
    await client.query("COMMIT");
    return governed;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function recordTrackerSaveCommand(
  client: import("pg").PoolClient,
  accountId: string,
  opportunityId: string,
  result: CanonicalTrackerSave,
  requestHash: string,
  options: { idempotencyKey?: string; correlationId?: string },
): Promise<CanonicalTrackerSave> {
  if (!options.idempotencyKey) return result;
  const receiptId = randomUUID();
  const correlationId = options.correlationId ?? randomUUID();
  const bounded = { ...result, receiptId };
  await client.query(
    `insert into workspace_command_receipts
       (id, scope_type, scope_id, actor_account_id, command_type, idempotency_key,
        request_hash, result, correlation_id)
     values ($1, 'owner', $2, $2, 'tracker.save', $3, $4, $5::jsonb, $6)`,
    [receiptId, accountId, options.idempotencyKey, requestHash, JSON.stringify(bounded), correlationId],
  );
  await client.query(
    `insert into audit_events
       (account_id, action, target_type, target_id, detail, correlation_id)
     values ($1, 'tracker.save', 'tracked_opportunity', $2, $3::jsonb, $4)`,
    [accountId, opportunityId, JSON.stringify({ receiptId, status: result.status }), correlationId],
  );
  await client.query(
    `insert into outbox_events
       (topic, aggregate_type, aggregate_id, payload, event_key, correlation_id)
     values ('tracker.save', 'tracked_opportunity', $1, $2::jsonb, $3, $4)`,
    [opportunityId, JSON.stringify({ opportunityId, status: result.status }), receiptId, correlationId],
  );
  return bounded;
}
