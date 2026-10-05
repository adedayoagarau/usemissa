import {
  deadlineAtRisk,
  deadlineRiskState,
  decide,
  type Queryable,
} from "@missa/decisions";
import {
  creatorDecisionContext,
  type CreatorDecisionContext,
} from "./creator-decisions";
import { PRE_SUBMISSION_STATUSES } from "./deadline-reminder-copy";

/** Applications checked per creator tick; each is asked at most once a day. */
export const DEADLINE_RISK_BATCH = 25;

type RiskRow = {
  id: string;
  status: string;
  days_until: number;
  days_since_update: number | null;
  has_reminder: boolean;
  has_work: boolean;
};

/**
 * Records, for saved applications with a confirmed deadline in the next two
 * weeks, whether the writer looks likely to miss it (scope `nudges`). This is
 * shadow-only for now: the status-aware deadline reminders (deadline-day
 * alarm, gone-quiet nudge) already cover these calls by rule, so Jev's answer
 * is recorded for comparison and changes nothing yet. Never throws.
 */
export async function recordDeadlineRisk(
  db: Queryable,
  context: CreatorDecisionContext,
  options: { accountId?: string; limit?: number } = {},
): Promise<{ checked: number } | undefined> {
  try {
    const present = await db.query(
      "select to_regclass('public.data_decisions') is not null as present",
    );
    if (
      (present.rows[0] as { present?: boolean } | undefined)?.present !== true
    )
      return undefined;
    const rows = (
      await db.query(
        `select t.id, t.status,
              (o.deadline_date - current_date)::int as days_until,
              floor(extract(epoch from now() - coalesce((to_jsonb(t)->>'last_activity_at')::timestamptz, t.updated_at)) / 86400)::int as days_since_update,
              exists(select 1 from creator_application_reminders r
                      where r.account_id = t.account_id and r.opportunity_id = t.opportunity_id
                        and r.state in ('scheduled', 'delivered')) as has_reminder,
              t.work_id is not null as has_work
         from tracked_opportunities t
         join opportunities o on o.id = t.opportunity_id
        where ($1::text is null or t.account_id = $1)
          and t.status = any($5::text[])
          and o.publication_state = 'published'
          and o.deadline_kind in ('fixed', 'exact')
          and o.deadline_date between current_date and current_date + 14
          and not exists(select 1 from data_decisions d
                          where d.subject_type = $2 and d.subject_id = t.id and d.question_key = $3
                            and d.created_at > now() - interval '20 hours')
        order by o.deadline_date, t.id
        limit $4`,
        [
          options.accountId ?? null,
          deadlineAtRisk.subjectType,
          deadlineAtRisk.key,
          options.limit ?? DEADLINE_RISK_BATCH,
          [...PRE_SUBMISSION_STATUSES],
        ],
      )
    ).rows as RiskRow[];
    for (const row of rows) {
      const result = await decide({
        ...context,
        subjectId: row.id,
        state: deadlineRiskState({
          status: row.status,
          daysUntilDeadline: Number(row.days_until),
          daysSinceLastUpdate:
            row.days_since_update === null
              ? null
              : Number(row.days_since_update),
          hasReminder: row.has_reminder,
          hasWorkAttached: row.has_work,
        }),
        questions: [deadlineAtRisk],
      });
      if (result.error) {
        console.warn("Creator decision (nudges) stopped:", result.error);
        break;
      }
    }
    return { checked: rows.length };
  } catch (error) {
    console.warn(
      "Creator decision (nudges) skipped:",
      error instanceof Error ? error.message : String(error),
    );
    return undefined;
  }
}

/** The creator tick's entry point: does nothing unless Jev may see creator data. */
export async function recordDeadlineRiskFromEnv(
  db: Queryable,
  accountId?: string,
) {
  const context = creatorDecisionContext("nudges");
  return context ? recordDeadlineRisk(db, context, { accountId }) : undefined;
}
