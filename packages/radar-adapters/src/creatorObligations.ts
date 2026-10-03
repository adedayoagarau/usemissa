import type { Pool, PoolClient } from "pg";

type Db = Pool | PoolClient;

export type CreatorObligationKind =
  "start-by" | "sub-deadline" | "personal-target" | "obligation";
export type CreatorObligationAnchor =
  "deadline" | "stage" | "accepted" | "fixed";
export type CreatorObligationBufferPolicy = "keep" | "absorb" | "ignore";
export type CreatorObligationState = "open" | "done" | "skipped";
export type CreatorObligationSource = "template" | "user" | "system";

/**
 * One dated commitment in the creator's obligation ledger: a start-by date, a
 * lead-time sub-deadline (references, final draft, upload), a personal target,
 * or an obligation after acceptance (report due, arrival, delivery). Anchored
 * rows move with their anchor according to `bufferPolicy`; fixed rows never
 * move on their own.
 */
export type CreatorObligation = {
  id: string;
  accountId: string;
  trackedOpportunityId: string | null;
  opportunityId: string | null;
  opportunityTitle: string | null;
  kind: CreatorObligationKind;
  label: string;
  templateKey: string | null;
  anchor: CreatorObligationAnchor;
  anchorStageId: string | null;
  offsetDays: number | null;
  bufferPolicy: CreatorObligationBufferPolicy;
  dueOn: string;
  dueAt: string | null;
  timezone: string | null;
  effortHours: number | null;
  checklistItemId: string | null;
  state: CreatorObligationState;
  source: CreatorObligationSource;
  position: number;
  completedAt: string | null;
  revision: number;
  updatedAt: string;
};

type ObligationRow = {
  id: string;
  account_id: string;
  tracked_opportunity_id: string | null;
  opportunity_id: string | null;
  opportunity_title: string | null;
  kind: CreatorObligationKind;
  label: string;
  template_key: string | null;
  anchor: CreatorObligationAnchor;
  anchor_stage_id: string | null;
  offset_days: number | null;
  buffer_policy: CreatorObligationBufferPolicy;
  due_on: Date | string;
  due_at: Date | string | null;
  timezone: string | null;
  effort_hours: string | number | null;
  checklist_item_id: string | null;
  state: CreatorObligationState;
  source: CreatorObligationSource;
  position: number;
  completed_at: Date | string | null;
  revision: number;
  updated_at: Date | string;
};

function isoDate(value: Date | string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  return new Date(value).toISOString().slice(0, 10);
}

function isoTime(value: Date | string | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

export const OBLIGATION_COLUMNS_SQL = `ob.id, ob.account_id, ob.tracked_opportunity_id, ob.opportunity_id, o.title as opportunity_title,
  ob.kind, ob.label, ob.template_key, ob.anchor, ob.anchor_stage_id, ob.offset_days, ob.buffer_policy,
  ob.due_on, ob.due_at, ob.timezone, ob.effort_hours, ob.checklist_item_id, ob.state, ob.source, ob.position,
  ob.completed_at, ob.revision, ob.updated_at`;

export function obligationFromRow(row: ObligationRow): CreatorObligation {
  return {
    id: row.id,
    accountId: row.account_id,
    trackedOpportunityId: row.tracked_opportunity_id,
    opportunityId: row.opportunity_id,
    opportunityTitle: row.opportunity_title,
    kind: row.kind,
    label: row.label,
    templateKey: row.template_key,
    anchor: row.anchor,
    anchorStageId: row.anchor_stage_id,
    offsetDays: row.offset_days,
    bufferPolicy: row.buffer_policy,
    dueOn: isoDate(row.due_on),
    dueAt: isoTime(row.due_at),
    timezone: row.timezone,
    effortHours: row.effort_hours === null ? null : Number(row.effort_hours),
    checklistItemId: row.checklist_item_id,
    state: row.state,
    source: row.source,
    position: row.position,
    completedAt: isoTime(row.completed_at),
    revision: row.revision,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** True once migration 0088 has been applied. */
export async function obligationsAvailable(db: Db): Promise<boolean> {
  const result = await db.query<{ ready: boolean }>(
    "select to_regclass('public.creator_obligations') is not null as ready",
  );
  return Boolean(result.rows[0]?.ready);
}

export type ListObligationsOptions = {
  /** Inclusive ISO date bounds on due_on. */
  from?: string;
  to?: string;
  trackedOpportunityId?: string;
  opportunityId?: string;
  states?: CreatorObligationState[];
};

/** The creator's obligations, soonest first. Empty before migration 0088. */
export async function listObligations(
  db: Db,
  accountId: string,
  options: ListObligationsOptions = {},
): Promise<CreatorObligation[]> {
  if (!(await obligationsAvailable(db))) return [];
  const result = await db.query<ObligationRow>(
    `select ${OBLIGATION_COLUMNS_SQL}
       from creator_obligations ob
       left join opportunities o on o.id = ob.opportunity_id
      where ob.account_id = $1
        and ($2::date is null or ob.due_on >= $2::date)
        and ($3::date is null or ob.due_on <= $3::date)
        and ($4::text is null or ob.tracked_opportunity_id = $4)
        and ($5::text is null or ob.opportunity_id = $5)
        and ($6::text[] is null or ob.state = any($6::text[]))
      order by ob.due_on, ob.position, ob.created_at`,
    [
      accountId,
      options.from ?? null,
      options.to ?? null,
      options.trackedOpportunityId ?? null,
      options.opportunityId ?? null,
      options.states ?? null,
    ],
  );
  return result.rows.map(obligationFromRow);
}
