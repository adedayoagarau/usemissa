import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  canonicalCreatorRequestHash,
  CreatorConflictError,
  CreatorIdempotencyConflictError,
} from "./creatorRepository.js";
import {
  creatorEntitlements,
  lockTrackingAllowance,
  TrackingLimitReachedError,
} from "./creatorEntitlements.js";
import { isoDay, isoDaysBetween, relationsReady, shiftIsoDate } from "./cycleNotices.js";

/**
 * Carry a tracked call to its next cycle.
 *
 * Design choice: `tracked_opportunities` is unique on (account_id,
 * opportunity_id), so the next cycle cannot be a second row for the same call.
 * Instead the existing row is carried in place, keeping its id, so the status
 * history, checklist, notes, Library links and obligations stay attached:
 *
 * - The finished cycle is recorded first, as a `tracked_status_events` row
 *   whose `evidence` holds `{ kind: "cycle-carry" }` with the previous cycle
 *   label, status, submitted date, deadline, and snapshots of the checklist
 *   and obligations. Nothing about the old cycle is lost.
 * - The row returns to `saved` with `submitted_at` and the personal target
 *   cleared, `cycle_label` set to the new cycle (for example "2027"), and
 *   `carried_from_tracked_id` set to its own id. A self-reference is the
 *   marker that the row was carried; the previous cycle lives in its events.
 * - Checklist items that were ready or complete go back to missing, keeping
 *   the Works, files and answers linked to them so they are quick to reuse.
 * - Preparation obligations (start-by and sub-deadlines) are copied as open
 *   rows re-anchored to the new cycle: deadline-anchored rows to the new
 *   deadline, or the forecast's expected close when the source has not
 *   published one; fixed and stage rows move by the same shift. The old rows
 *   stay as history (open ones are marked skipped, and their template keys get
 *   an `@<cycle>` suffix so the new cycle can reuse the template key).
 *   Personal targets are closed with the old cycle and not carried.
 *   Obligations after acceptance are untouched: they are still owed.
 * - Scheduled reminders for the old cycle are cancelled; the reminder tick
 *   schedules the new cycle's reminders.
 */

const PRE_SUBMISSION = ["interested", "saved", "preparing", "draft-started", "ready-to-submit"];
const OPEN_STATUSES = ["open", "closing-soon", "deadline-extended", "opening-soon"];
const COMMAND_TYPE = "tracker.cycle.carry";

export class CarryNotAvailableError extends Error {
  readonly code = "carry-not-available";
  constructor() {
    super("This call is still open, so there is no next cycle to carry it to yet.");
    this.name = "CarryNotAvailableError";
  }
}

export type CarryOptions = {
  idempotencyKey?: string;
  expectedRevision?: number;
  now?: Date;
};

export type CarryResult = {
  status: "carried";
  trackedId: string;
  opportunityId: string;
  previousCycleLabel: string;
  cycleLabel: string;
  previousStatus: string;
  revision: number;
  /** The new cycle's deadline, when known; predicted when it comes from the forecast. */
  deadline: { date: string; predicted: boolean } | null;
  checklistItemsReset: number;
  obligationsCopied: number;
  /** Deadline-anchored obligations not copied because no new date is known yet. */
  obligationsAwaitingDate: number;
  replayed: boolean;
};

type CarryRow = {
  id: string;
  opportunity_id: string;
  status: string;
  revision: number;
  cycle_label: string | null;
  submitted_at: Date | null;
  tracked_at: Date;
  deadline_date: string | null;
  opp_status: string;
  expected_close: string | null;
};

type ObligationSnapshot = {
  id: string;
  kind: string;
  label: string;
  template_key: string | null;
  anchor: string;
  anchor_stage_id: string | null;
  stage_due_on: string | null;
  offset_days: number | null;
  buffer_policy: string;
  due_on: string;
  timezone: string | null;
  effort_hours: string | null;
  checklist_item_id: string | null;
  state: string;
  source: string;
  position: number;
  opportunity_id: string | null;
};

/** Tracked id from either a tracked id or an opportunity id the account tracks. */
export async function resolveTrackedId(db: Pool | PoolClient, accountId: string, idOrOpportunityId: string): Promise<string | null> {
  const result = await db.query<{ id: string }>(
    `select id from tracked_opportunities where account_id = $1 and (id = $2 or opportunity_id = $2)
      order by (id = $2) desc limit 1`,
    [accountId, idOrOpportunityId],
  );
  return result.rows[0]?.id ?? null;
}

/** Whether a call can be carried: it closed, or the creator's part in this cycle is over. */
export function canCarry(status: string, oppStatus: string, deadline: string | null, today: string): boolean {
  if (!PRE_SUBMISSION.includes(status)) return true;
  if (deadline && deadline < today) return true;
  return !OPEN_STATUSES.includes(oppStatus) && !(deadline && deadline >= today);
}

/** The next cycle label: the year of its deadline, or the year after the last one. */
export function nextCycleLabel(previous: string, deadline: string | null): string {
  if (deadline) {
    const year = deadline.slice(0, 4);
    return year === previous ? deadline.slice(0, 7) : year;
  }
  const year = Number(previous.slice(0, 4));
  return Number.isFinite(year) ? String(year + 1) : `${previous} next`;
}

/** Where a carried obligation falls in the new cycle, or null when no date is known. */
export function reanchoredDueOn(
  obligation: Pick<ObligationSnapshot, "anchor" | "offset_days" | "due_on" | "stage_due_on">,
  newDeadline: string | null,
  oldDeadline: string | null,
  today: string,
): string | null {
  const shift = newDeadline && oldDeadline ? isoDaysBetween(oldDeadline, newDeadline) : null;
  if (obligation.anchor === "deadline") {
    return newDeadline && obligation.offset_days !== null ? shiftIsoDate(newDeadline, obligation.offset_days) : null;
  }
  if (obligation.anchor === "stage" && obligation.stage_due_on && obligation.stage_due_on >= today && obligation.offset_days !== null) {
    return shiftIsoDate(obligation.stage_due_on, obligation.offset_days);
  }
  return shift === null ? null : shiftIsoDate(obligation.due_on, shift);
}

export async function carryTrackedToNextCycle(
  pool: Pool,
  accountId: string,
  trackedId: string,
  options: CarryOptions = {},
): Promise<CarryResult | null> {
  const now = options.now ?? new Date();
  const today = isoDay(now);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const requestHash = canonicalCreatorRequestHash(COMMAND_TYPE, { trackedId }, options.expectedRevision ?? 1);
    if (options.idempotencyKey) {
      const replay = await client.query<{ request_hash: string; result: CarryResult }>(
        `select request_hash, result from workspace_command_receipts
          where scope_type = 'owner' and scope_id = $1 and actor_account_id = $1 and command_type = $2 and idempotency_key = $3
          for update`,
        [accountId, COMMAND_TYPE, options.idempotencyKey],
      );
      const prior = replay.rows[0];
      if (prior) {
        if (prior.request_hash !== requestHash) throw new CreatorIdempotencyConflictError();
        await client.query("COMMIT");
        return { ...prior.result, replayed: true };
      }
    }
    // Carrying returns a call to Saved, which counts towards the Free limit while
    // the call is open; take the allowance lock before the row lock, as saves do.
    const allowance = await lockTrackingAllowance(client, accountId);
    const hasForecasts = await relationsReady(client, ["opportunity_cycle_forecasts", "opportunity_cycle_history"]);
    const current = await client.query<CarryRow>(
      `select t.id, t.opportunity_id, t.status, t.revision, t.cycle_label, t.submitted_at, t.tracked_at,
              o.deadline_date::text as deadline_date, o.status as opp_status,
              ${hasForecasts ? "f.expected_close::text" : "null::text"} as expected_close
         from tracked_opportunities t
         join opportunities o on o.id = t.opportunity_id
         ${hasForecasts ? "left join opportunity_cycle_forecasts f on f.opportunity_id = o.id" : ""}
        where t.id = $1 and t.account_id = $2
        for update of t`,
      [trackedId, accountId],
    );
    const row = current.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }
    if (options.expectedRevision !== undefined && row.revision !== options.expectedRevision) {
      throw new CreatorConflictError("tracked-opportunity", trackedId, options.expectedRevision, row.revision);
    }
    if (!canCarry(row.status, row.opp_status, row.deadline_date, today)) throw new CarryNotAvailableError();

    // The listing may already show the next round; then the finished cycle's
    // deadline is the last recorded close before today.
    let oldDeadline: string | null;
    let deadline: CarryResult["deadline"];
    if (row.deadline_date && row.deadline_date >= today) {
      deadline = { date: row.deadline_date, predicted: false };
      oldDeadline = hasForecasts
        ? ((
            await client.query<{ closed: string | null }>(
              "select max(closed_on)::text as closed from opportunity_cycle_history where opportunity_id = $1 and closed_on < $2::date",
              [row.opportunity_id, today],
            )
          ).rows[0]?.closed ?? null)
        : null;
    } else {
      oldDeadline = row.deadline_date;
      deadline = row.expected_close && row.expected_close >= today ? { date: row.expected_close, predicted: true } : null;
    }
    const previousCycleLabel =
      row.cycle_label ?? (oldDeadline ?? isoDay(new Date(row.tracked_at))).slice(0, 4);
    const cycleLabel = nextCycleLabel(previousCycleLabel, deadline?.date ?? null);

    const checklist = await client.query<{ id: string; label: string; state: string; work_id: string | null; file_id: string | null; saved_answer_id: string | null }>(
      `select i.id, i.label, i.state, i.work_id, i.file_id, i.saved_answer_id
         from tracker_checklist_items i
         join tracker_checklists c on c.id = i.checklist_id and c.account_id = i.account_id
        where c.account_id = $1 and c.tracked_opportunity_id = $2
        order by i.position`,
      [accountId, row.id],
    );
    const hasObligations = await relationsReady(client, ["creator_obligations"]);
    const obligations: ObligationSnapshot[] = hasObligations
      ? (
          await client.query<ObligationSnapshot>(
            `select ob.id, ob.kind, ob.label, ob.template_key, ob.anchor, ob.anchor_stage_id, s.due_on::text as stage_due_on,
                    ob.offset_days, ob.buffer_policy, ob.due_on::text as due_on, ob.timezone, ob.effort_hours::text as effort_hours,
                    ob.checklist_item_id, ob.state, ob.source, ob.position, ob.opportunity_id
               from creator_obligations ob
               left join opportunity_stages s on s.id = ob.anchor_stage_id
              where ob.account_id = $1 and ob.tracked_opportunity_id = $2
              order by ob.position, ob.due_on`,
            [accountId, row.id],
          )
        ).rows
      : [];

    const updated = await client.query<{ revision: number }>(
      `update tracked_opportunities
          set status = 'saved', submitted_at = null, personal_target_on = null,
              cycle_label = $3, carried_from_tracked_id = id,
              revision = revision + 1, updated_at = now(), last_activity_at = now()
        where id = $1 and account_id = $2 and revision = $4
        returning revision`,
      [row.id, accountId, cycleLabel, row.revision],
    );
    const revision = updated.rows[0]?.revision;
    if (revision === undefined) throw new CreatorConflictError("tracked-opportunity", trackedId, row.revision, row.revision + 1);
    if (allowance.activeTrackedLimit !== null && !PRE_SUBMISSION.includes(row.status)) {
      const after = await creatorEntitlements(client, accountId);
      if (after.activeTracked > allowance.activeTracked && after.activeTracked > allowance.activeTrackedLimit) {
        throw new TrackingLimitReachedError(allowance.activeTrackedLimit, allowance.activeTracked);
      }
    }

    await client.query(
      `insert into tracked_status_events
         (id, tracked_opportunity_id, account_id, from_status, to_status, source, idempotency_key, note, evidence, occurred_on)
       values ($1, $2, $3, $4, 'saved', 'user', $5, $6, $7::jsonb, $8::date)`,
      [
        randomUUID(),
        row.id,
        accountId,
        row.status,
        options.idempotencyKey ?? null,
        `Carried from the ${previousCycleLabel} cycle to ${cycleLabel}.`,
        JSON.stringify({
          kind: "cycle-carry",
          previousCycleLabel,
          cycleLabel,
          previousStatus: row.status,
          previousSubmittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
          previousDeadline: oldDeadline,
          checklist: checklist.rows,
          obligations: obligations.map(({ stage_due_on: _stage, ...rest }) => rest),
        }),
        today,
      ],
    );

    const reset = await client.query(
      `update tracker_checklist_items i set state = 'missing', revision = i.revision + 1, updated_at = now()
         from tracker_checklists c
        where c.id = i.checklist_id and c.account_id = i.account_id
          and c.account_id = $1 and c.tracked_opportunity_id = $2 and i.state in ('ready', 'complete')`,
      [accountId, row.id],
    );

    let obligationsCopied = 0;
    let obligationsAwaitingDate = 0;
    if (hasObligations && obligations.length) {
      await client.query(
        `update creator_obligations
            set state = case when state = 'open' then 'skipped' else state end,
                template_key = case when template_key is not null and position('@' in template_key) = 0
                                    then template_key || '@' || $3 else template_key end,
                revision = revision + 1, updated_at = now()
          where account_id = $1 and tracked_opportunity_id = $2
            and kind in ('start-by', 'sub-deadline', 'personal-target')`,
        [accountId, row.id, previousCycleLabel],
      );
      for (const obligation of obligations) {
        if (!["start-by", "sub-deadline"].includes(obligation.kind) || obligation.state === "skipped") continue;
        const dueOn = reanchoredDueOn(obligation, deadline?.date ?? null, oldDeadline, today);
        if (!dueOn) {
          obligationsAwaitingDate += 1;
          continue;
        }
        const templateKey = obligation.template_key?.split("@")[0] ?? null;
        const inserted = await client.query(
          `insert into creator_obligations
             (account_id, tracked_opportunity_id, opportunity_id, kind, label, template_key, anchor, anchor_stage_id,
              offset_days, buffer_policy, due_on, timezone, effort_hours, checklist_item_id, state, source, position)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::date, $12, $13::numeric, $14, 'open', $15, $16)
           on conflict do nothing`,
          [
            accountId,
            row.id,
            obligation.opportunity_id ?? row.opportunity_id,
            obligation.kind,
            obligation.label,
            templateKey,
            obligation.anchor,
            obligation.anchor_stage_id,
            obligation.offset_days,
            obligation.buffer_policy,
            dueOn,
            obligation.timezone,
            obligation.effort_hours,
            obligation.checklist_item_id,
            obligation.source,
            obligation.position,
          ],
        );
        obligationsCopied += inserted.rowCount ?? 0;
      }
    }

    await client.query(
      `update creator_application_reminders
          set state = 'cancelled', due_at = null, snoozed_until = null, revision = revision + 1, updated_at = now()
        where account_id = $1 and opportunity_id = $2 and state in ('scheduled', 'needs-review')`,
      [accountId, row.opportunity_id],
    );

    const result: CarryResult = {
      status: "carried",
      trackedId: row.id,
      opportunityId: row.opportunity_id,
      previousCycleLabel,
      cycleLabel,
      previousStatus: row.status,
      revision,
      deadline,
      checklistItemsReset: reset.rowCount ?? 0,
      obligationsCopied,
      obligationsAwaitingDate,
      replayed: false,
    };
    if (options.idempotencyKey) {
      const correlationId = randomUUID();
      await client.query(
        `insert into workspace_command_receipts
           (id, scope_type, scope_id, actor_account_id, command_type, idempotency_key, request_hash, result, correlation_id)
         values ($1, 'owner', $2, $2, $3, $4, $5, $6::jsonb, $7)`,
        [randomUUID(), accountId, COMMAND_TYPE, options.idempotencyKey, requestHash, JSON.stringify(result), correlationId],
      );
      await client.query(
        `insert into audit_events (account_id, action, target_type, target_id, detail, correlation_id)
         values ($1, $2, 'tracked_opportunity', $3, $4::jsonb, $5)`,
        [accountId, COMMAND_TYPE, row.opportunity_id, JSON.stringify({ previousCycleLabel, cycleLabel, revision }), correlationId],
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
