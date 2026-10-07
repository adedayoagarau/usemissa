import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Pool, PoolClient } from 'pg';
import { DAILY_CAPPED_NOTICE_KINDS, defaultOffsetSubject, milestoneTitle, reminderInboxKind, reminderNoticeBody, reminderNoticeDedupeKey, reminderNoticeReason, tierEndingTitle } from './deadline-reminder-copy';
import { dailyNoticeBudget } from './deadline-reminders';
import { CreatorRepositoryBase, CreatorConflictError, creatorPoolFor, deferRemindersInQuietHours, type CreatorCommandEnvelope } from '@missa/radar-adapters';

const timezone = z.string().refine(v => { try { new Intl.DateTimeFormat('en', { timeZone: v }); return true; } catch { return false; } });
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a time of day');
export const reminderInput = z.discriminatedUnion('kind', [
  z.object({ opportunityId: z.string().min(1).max(200), kind: z.literal('deadline'), offsetDays: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(7), z.literal(14)]), timeOfDay: timeOfDay.default('09:00'), timezone }),
  z.object({ opportunityId: z.string().min(1).max(200), kind: z.enum(['preparation', 'response']), title: z.string().trim().min(1).max(160), dueAt: z.string().datetime({ offset: true }), repeatDays: z.union([z.literal(0), z.literal(7), z.literal(14), z.literal(30)]), timezone }),
]);
export type ReminderInput = z.infer<typeof reminderInput>;
export type ApplicationReminder = {
  id: string; opportunityId: string; applicationTitle: string; kind: ReminderKind;
  /** Set on rows Missa schedules itself: a default deadline offset, a fee tier, an obligation or the deadline-day alarm. */
  subjectKind: 'obligation' | 'tier' | 'stage' | 'escalation' | null; subjectId: string | null;
  title: string; dueAt: string | null; timezone: string; repeatDays: number; state: 'scheduled' | 'delivered' | 'cancelled' | 'needs-review' | 'suppressed' | 'expired';
  sourceDeadline: string | null; offsetDays: number | null; revision: number; inAppEnabled: boolean;
};
/**
 * preparation, deadline and response are the creator's own reminders. Missa
 * adds default deadline offsets (kind deadline, subject_id 'offset:N'), the
 * deadline-day alarm, fee-tier endings and obligation milestones; see
 * deadline-reminders.ts.
 */
export type ReminderKind = 'preparation' | 'deadline' | 'response' | 'milestone' | 'deadline-day' | 'tier';
export class ReminderValidationError extends Error {}
const saved = "('interested','saved','preparing','draft-started','ready-to-submit')";
const history = "('accepted','declined','withdrawn','delivered','archived')";

/**
 * What migration 0088 added that reminders depend on. Deploys can reach a
 * database before 0088, so every query that names these checks first.
 */
export type ReminderSchema = { subjects: boolean; tiers: boolean; obligations: boolean };
let migratedSchema: ReminderSchema | undefined;

/** Probes once per process after 0088 is applied; before that, on every call so the migration is picked up without a restart. */
export async function readReminderSchema(db: Pool | PoolClient): Promise<ReminderSchema> {
  if (migratedSchema) return migratedSchema;
  const row = (await db.query<ReminderSchema>(`select
      exists(select 1 from information_schema.columns where table_schema=current_schema()
        and table_name='creator_application_reminders' and column_name='subject_id') as subjects,
      to_regclass('public.opportunity_deadline_tiers') is not null as tiers,
      to_regclass('public.creator_obligations') is not null as obligations`)).rows[0];
  const schema = { subjects: Boolean(row?.subjects), tiers: Boolean(row?.tiers), obligations: Boolean(row?.obligations) };
  if (schema.subjects && schema.tiers && schema.obligations) migratedSchema = schema;
  return schema;
}

/** Reminder list, with subject columns only when the database has them. */
export function reminderListSql(subjects: boolean): string {
  const subject = subjects ? `r.subject_kind as "subjectKind",r.subject_id as "subjectId"` : `null::text as "subjectKind",null::text as "subjectId"`;
  return `select r.id,r.opportunity_id as "opportunityId",o.title as "applicationTitle",r.kind,${subject},r.title,
      coalesce(r.snoozed_until,r.due_at) as "dueAt",r.timezone,r.repeat_days as "repeatDays",r.state,r.source_deadline::text as "sourceDeadline",
      r.deadline_offset_days as "offsetDays",r.revision,coalesce(p.in_app_enabled and p.reminder_enabled,false) as "inAppEnabled"
      from creator_application_reminders r join opportunities o on o.id=r.opportunity_id
      left join notification_preferences p on p.account_id=r.account_id
      where r.account_id=$1 and ($2::text is null or r.opportunity_id=$2) and r.state<>'cancelled'
      order by coalesce(r.snoozed_until,r.due_at) nulls last,r.created_at desc`;
}

/** The creator's own reminder of a kind: the row without a subject, or the only row before 0088. */
export function ownReminderSql(subjects: boolean): string {
  return `select id,state from creator_application_reminders where account_id=$1 and opportunity_id=$2 and kind=$3${subjects ? ' and subject_kind is null and subject_id is null' : ''} for update`;
}

/** Insert or re-arm the creator's own reminder; before 0088 the only uniqueness is (account, opportunity, kind). */
export function ownReminderUpsertSql(subjects: boolean): string {
  const target = subjects ? `(account_id,opportunity_id,kind,coalesce(subject_kind,''),coalesce(subject_id,''))` : `(account_id,opportunity_id,kind)`;
  return `insert into creator_application_reminders(id,account_id,opportunity_id,kind,title,timezone,due_at,repeat_days,deadline_offset_days,source_deadline)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        on conflict${target} do update set title=excluded.title,timezone=excluded.timezone,due_at=excluded.due_at,repeat_days=excluded.repeat_days,deadline_offset_days=excluded.deadline_offset_days,source_deadline=excluded.source_deadline,state='scheduled',snoozed_until=null,revision=creator_application_reminders.revision+1,updated_at=now()
        returning id,revision`;
}

export class CreatorReminderRepository extends CreatorRepositoryBase {
  constructor() {
    if (!process.env.DATABASE_URL) throw new Error('Reminder storage unavailable');
    super(creatorPoolFor(process.env.DATABASE_URL));
  }

  async list(accountId: string, opportunityId?: string): Promise<ApplicationReminder[]> {
    const schema = await readReminderSchema(this.pool);
    return (await this.query<ApplicationReminder>(reminderListSql(schema.subjects), [accountId, opportunityId ?? null])).rows;
  }

  async create(envelope: CreatorCommandEnvelope, input: ReminderInput) {
    return this.executeOwnerCommand(envelope, async client => {
      const schema = await readReminderSchema(client);
      const t = (await client.query<{ status: string; deadline: string | null; deadline_kind: string; publication_state: string; deadline_time: string | Date | null; deadline_timezone: string | null }>(`select t.status,o.deadline_date::text as deadline,o.deadline_kind,o.publication_state,o.deadline_time,o.deadline_timezone from tracked_opportunities t join opportunities o on o.id=t.opportunity_id where t.account_id=$1 and t.opportunity_id=$2 for update of t`, [envelope.accountId, input.opportunityId])).rows[0];
      if (!t) throw new ReminderValidationError('Save this application before setting a reminder.');
      const preparing = ['interested', 'saved', 'preparing', 'draft-started', 'ready-to-submit'].includes(t.status);
      if (input.kind === 'response' ? preparing || ['accepted', 'declined', 'withdrawn', 'delivered', 'archived'].includes(t.status) : !preparing)
        throw new ReminderValidationError(input.kind === 'response' ? 'Response check-ins are for applications awaiting a response.' : 'This application has moved beyond preparation.');
      if (input.kind === 'deadline' && (!t.deadline || !['fixed', 'exact'].includes(t.deadline_kind) || t.publication_state !== 'published'))
        throw new ReminderValidationError('A confirmed deadline is needed. Set a personal preparation reminder instead.');
      const due = input.kind === 'deadline'
        ? (await client.query<{ value: string }>(`select ((($1::date-$2::int)::timestamp+$3::time) at time zone $4) as value`, [t.deadline, input.offsetDays, input.timeOfDay, input.timezone])).rows[0].value
        : input.dueAt;
      if (input.kind === 'deadline') {
        // The reminder must still land before the deadline closes: at the
        // provider's stated time when the source gave one, and at the end of the
        // deadline day in the deadline's own timezone otherwise.
        const window = (await client.query<{ ahead: boolean; before_close: boolean }>(
          `select $1::timestamptz > now() as ahead,$1::timestamptz < coalesce($2::timestamptz,(($3::date+1)::timestamp at time zone coalesce($4::text,$5::text))) as before_close`,
          [due, t.deadline_time, t.deadline, t.deadline_timezone, input.timezone])).rows[0];
        if (!window.before_close) throw new ReminderValidationError('That time is after the deadline closes. Choose an earlier reminder time.');
        if (!window.ahead) throw new ReminderValidationError('Choose a reminder time that is still ahead.');
      } else if (!(await client.query<{ valid: boolean }>('select $1::timestamptz > now() as valid', [due])).rows[0].valid) throw new ReminderValidationError('Choose a reminder time that is still ahead.');
      // Existing active reminders are edited explicitly, never silently overwritten by a new request.
      // Only the creator's own row counts (no subject); Missa's default offsets are separate rows.
      const existing = (await client.query<{ id: string; state: string }>(ownReminderSql(schema.subjects), [envelope.accountId, input.opportunityId, input.kind])).rows[0];
      if (existing && ['scheduled', 'needs-review'].includes(existing.state)) throw new ReminderValidationError('You already have this reminder. Open it to reschedule or cancel it.');
      // The creator's own deadline reminder replaces a default reminder on the same day.
      if (input.kind === 'deadline' && schema.subjects) await client.query(`update creator_application_reminders set state='cancelled',due_at=null,snoozed_until=null,revision=revision+1,updated_at=now()
        where account_id=$1 and opportunity_id=$2 and kind='deadline' and subject_kind is null and subject_id=$3 and state in ('scheduled','needs-review')`, [envelope.accountId, input.opportunityId, defaultOffsetSubject(input.offsetDays)]);
      const row = (await client.query<{ id: string; revision: number }>(ownReminderUpsertSql(schema.subjects), [randomUUID(), envelope.accountId, input.opportunityId, input.kind, input.kind === 'deadline' ? 'Application deadline' : input.title, input.timezone, due, input.kind === 'deadline' ? 0 : input.repeatDays, input.kind === 'deadline' ? input.offsetDays : null, input.kind === 'deadline' ? t.deadline : null])).rows[0];
      return { resourceType: 'application-reminder', resourceId: row.id, revision: row.revision };
    });
  }

  async change(envelope: CreatorCommandEnvelope, id: string, input: { action: 'cancel' | 'snooze'; days?: 1 | 7 }) {
    return this.executeOwnerCommand(envelope, async client => {
      const row = (await client.query<{ revision: number; state: string }>('select revision,state from creator_application_reminders where id=$1 and account_id=$2 for update', [id, envelope.accountId])).rows[0];
      if (!row || row.revision !== envelope.expectedRevision) throw new CreatorConflictError('application-reminder', id, envelope.expectedRevision, row?.revision ?? 0);
      if (input.action === 'snooze' && !['scheduled', 'delivered'].includes(row.state)) throw new ReminderValidationError('Create a new reminder for the current application details.');
      const updated = (await client.query<{ revision: number }>(`update creator_application_reminders set state=case when $3='cancel' then 'cancelled' else 'scheduled' end,
        snoozed_until=case when $3='snooze' then now()+make_interval(days=>$4::int) else null end,
        due_at=case when $3='snooze' and due_at is null then now()+make_interval(days=>$4::int) else due_at end,revision=revision+1,updated_at=now() where id=$1 and account_id=$2 returning revision`, [id, envelope.accountId, input.action, input.days ?? 1])).rows[0];
      await client.query('update creator_inbox_alerts set read_at=coalesce(read_at,now()),revision=revision+1 where account_id=$1 and reminder_id=$2 and read_at is null', [envelope.accountId, id]);
      return { resourceType: 'application-reminder', resourceId: id, revision: updated.revision };
    });
  }

  async inboxLinks(accountId: string) {
    return (await this.query<{ id: string; href: string; reminderId: string | null; body: string; reason: string }>(`select id,action_href as href,reminder_id as "reminderId",body,reason from creator_inbox_alerts where account_id=$1 and action_href is not null`, [accountId])).rows;
  }
}

/** When a tier or milestone row's subject closes: the same expressions the quiet-hours deferral uses. */
function subjectCloseSql(schema: ReminderSchema): string {
  const tier = schema.subjects && schema.tiers
    ? `when r.kind='tier' then (select coalesce(d.closes_at,((d.closes_on+1)::timestamp at time zone coalesce(d.timezone,o.deadline_timezone,r.timezone)))
         from opportunity_deadline_tiers d where d.id::text=r.subject_id)` : '';
  const milestone = schema.subjects && schema.obligations
    ? `when r.kind='milestone' then (select coalesce(ob.due_at,((ob.due_on+1)::timestamp at time zone coalesce(ob.timezone,r.timezone)))
         from creator_obligations ob where ob.id::text=r.subject_id)` : '';
  return tier || milestone ? `(case ${tier} ${milestone} end)` : 'null::timestamptz';
}

/** Facts to re-word tier and milestone titles on the day they are delivered. */
function subjectFactsSql(schema: ReminderSchema): string {
  const milestone = schema.subjects && schema.obligations
    ? `(select ob.label from creator_obligations ob where r.kind='milestone' and ob.id::text=r.subject_id)` : 'null::text';
  const tier = schema.subjects && schema.tiers
    ? `(select json_build_object('label',d.label,'feeCents',d.fee_cents,'currency',coalesce(d.fee_currency,'USD'),'nextLabel',n.label,'nextFeeCents',n.fee_cents)
         from opportunity_deadline_tiers d join lateral (select d2.label,d2.fee_cents from opportunity_deadline_tiers d2
           where d2.opportunity_id=d.opportunity_id and d2.closes_on>d.closes_on and d2.fee_cents>d.fee_cents
             and coalesce(d2.fee_currency,'USD')=coalesce(d.fee_currency,'USD') order by d2.closes_on,d2.position limit 1) n on true
        where r.kind='tier' and d.id::text=r.subject_id and d.fee_cents is not null)` : 'null::json';
  return `${milestone} as milestone_label,${tier} as tier_facts`;
}

type TierFacts = { label: string; feeCents: number; currency: string | null; nextLabel: string; nextFeeCents: number };

/** Tier and milestone titles say "today" or "tomorrow", so they are worded for the day they go out; other kinds keep their stored title. */
export function deliveryTitle(r: { kind: string; title: string; subject_date: string | null; local_today: string; milestone_label: string | null; tier_facts: TierFacts | null }): string {
  if (!r.subject_date) return r.title;
  if (r.kind === 'milestone' && r.milestone_label) return milestoneTitle(r.milestone_label, r.subject_date, r.local_today);
  if (r.kind === 'tier' && r.tier_facts)
    return tierEndingTitle({ ...r.tier_facts, closesOn: r.subject_date, today: r.local_today });
  return r.title;
}

/** Executes without an open browser. Database time and row locks define each delivery slot. */
export async function tickCreatorReminders(accountId?: string) {
  if (!process.env.DATABASE_URL) throw new Error('Reminder storage unavailable');
  const client = await creatorPoolFor(process.env.DATABASE_URL).connect();
  try {
    const schema = await readReminderSchema(client);
    const subjectClose = subjectCloseSql(schema);
    await client.query('begin');
    await client.query(`update creator_application_reminders r set state='cancelled',due_at=null,snoozed_until=null,revision=r.revision+1,updated_at=now()
      where ($1::text is null or r.account_id=$1) and r.state in ('scheduled','needs-review') and (
      not exists(select 1 from tracked_opportunities t where t.account_id=r.account_id and t.opportunity_id=r.opportunity_id) or
      exists(select 1 from tracked_opportunities t where t.account_id=r.account_id and t.opportunity_id=r.opportunity_id and
      ((r.kind in ('preparation','deadline','deadline-day','tier') and t.status not in ${saved}) or (r.kind='response' and (t.status in ${saved} or t.status in ${history})))) )`, [accountId ?? null]);
    await client.query(`update creator_application_reminders r set state='needs-review',due_at=null,snoozed_until=null,revision=r.revision+1,updated_at=now()
      from opportunities o where o.id=r.opportunity_id and ($1::text is null or r.account_id=$1) and r.state='scheduled' and r.kind='deadline'
      and (o.publication_state<>'published' or o.deadline_date is null or o.deadline_kind not in ('fixed','exact'))`, [accountId ?? null]);
    // A moved deadline re-times deadline rows. A default offset row ("Closes in
    // a week") that would now land in the past expires instead of firing late
    // with a title that no longer matches the days left.
    const moved = `((o.deadline_date-r.deadline_offset_days)::timestamp+coalesce((r.due_at at time zone r.timezone)::time,time '09:00')::interval) at time zone r.timezone`;
    const lateDefault = schema.subjects ? `(r.subject_id like 'offset:%' and ${moved} <= now())` : 'false';
    await client.query(`update creator_application_reminders r set state=case when ${lateDefault} then 'expired' else r.state end,
      due_at=case when ${lateDefault} then null else ${moved} end,
      source_deadline=o.deadline_date,snoozed_until=null,revision=r.revision+1,updated_at=now()
      from opportunities o where o.id=r.opportunity_id and ($1::text is null or r.account_id=$1) and r.state='scheduled' and r.kind='deadline'
      and r.source_deadline is distinct from o.deadline_date`, [accountId ?? null]);
    await client.query(`update creator_application_reminders r set state='needs-review',due_at=null,snoozed_until=null,revision=r.revision+1,updated_at=now()
      from opportunities o where o.id=r.opportunity_id and ($1::text is null or r.account_id=$1) and r.state='scheduled' and r.kind='deadline'
      and r.due_at >= coalesce(o.deadline_time,((o.deadline_date+1)::timestamp at time zone coalesce(o.deadline_timezone,r.timezone)))`, [accountId ?? null]);
    // A tier or milestone notice is pointless once its subject has closed.
    if (subjectClose !== 'null::timestamptz')
      await client.query(`update creator_application_reminders r set state='expired',due_at=null,snoozed_until=null,revision=r.revision+1,updated_at=now()
        from opportunities o where o.id=r.opportunity_id and ($1::text is null or r.account_id=$1) and r.state='scheduled' and r.kind in ('tier','milestone')
        and ${subjectClose} <= now()`, [accountId ?? null]);
    const deferred = await deferRemindersInQuietHours(client, accountId);
    // "Deadline reminders off" on a Tracker item holds Missa's own deadline
    // notices for that call (default offsets, the deadline-day alarm, fee-tier
    // endings) without cancelling them, so switching it back on resumes them.
    // The creator's own reminders are never held by it.
    // (subject_id is null on the creator's own rows, so it is coalesced before
    // the pattern match: a null predicate would drop those rows from the pass.)
    const isDefaultOffset = `(r.kind='deadline' and coalesce(r.subject_id,'') like 'offset:%')`;
    const heldByToggle = schema.subjects
      ? `(not t.notify and (${isDefaultOffset} or r.kind in ('deadline-day','tier')))`
      : 'false';
    // A default offset ("Closes in a week") whose day has gone by, for example
    // while the call's reminders were off, expires instead of firing late.
    const offsetPassed = schema.subjects
      ? `(${isDefaultOffset} and o.deadline_date-coalesce(r.deadline_offset_days,0) < (now() at time zone r.timezone)::date)`
      : 'false';
    const due = await client.query(`select r.*,o.title as application_title,t.status as application_status,
      (o.deadline_date < (now() at time zone r.timezone)::date or ${offsetPassed}) as deadline_passed,
      coalesce(r.snoozed_until,r.due_at) as effective_due,coalesce(p.in_app_enabled and p.reminder_enabled,false) as allowed,
      z.account_timezone,(((now() at time zone z.account_timezone)::date+1)+time '09:00') at time zone z.account_timezone as next_morning,
      ${subjectClose} as subject_closes_at,r.source_deadline::text as subject_date,(now() at time zone r.timezone)::date::text as local_today,
      ${subjectFactsSql(schema)}
      from creator_application_reminders r join opportunities o on o.id=r.opportunity_id
      join tracked_opportunities t on t.account_id=r.account_id and t.opportunity_id=r.opportunity_id
      left join notification_preferences p on p.account_id=r.account_id
      cross join lateral (select case when exists(select 1 from pg_timezone_names tz where tz.name=to_jsonb(p)->>'timezone') then to_jsonb(p)->>'timezone' else r.timezone end as account_timezone) z
      where ($1::text is null or r.account_id=$1) and r.state='scheduled' and coalesce(r.snoozed_until,r.due_at)<=now()
        and not ${heldByToggle}
      order by coalesce(r.snoozed_until,r.due_at) for update of r skip locked limit 100`, [accountId ?? null]);
    let delivered = 0, capped = 0;
    const budgets = new Map<string, number>();
    for (const r of due.rows) {
      let sent=false;
      const inboxKind = reminderInboxKind(r.kind);
      if (r.allowed && (DAILY_CAPPED_NOTICE_KINDS as readonly string[]).includes(inboxKind)) {
        // Fee-tier and milestone notices share the creator's daily cap; over
        // the cap they wait for the next local morning instead of piling up.
        // One whose subject closes before that morning goes out now instead,
        // since waiting would mean it never arrives in time.
        const left = budgets.get(r.account_id) ?? await dailyNoticeBudget(client, r.account_id, r.account_timezone);
        const closesFirst = r.subject_closes_at && new Date(r.next_morning).getTime() >= new Date(r.subject_closes_at).getTime();
        if (left <= 0 && !closesFirst) {
          await client.query(`update creator_application_reminders set snoozed_until=$2,revision=revision+1,updated_at=now() where id=$1`, [r.id, r.next_morning]);
          budgets.set(r.account_id, 0); capped += 1;
          continue;
        }
        budgets.set(r.account_id, Math.max(0, left - 1));
      }
      if (r.allowed) {
        const isLateDeadline = (r.kind === 'deadline' || r.kind === 'deadline-day') && r.deadline_passed;
        if (!isLateDeadline) {
          const href = `/tracker?view=${r.kind === 'response' ? 'awaiting' : 'saved'}&application=${encodeURIComponent(r.opportunity_id)}`;
          const inserted = await client.query(`insert into creator_inbox_alerts(id,account_id,opportunity_id,kind,title,body,reason,dedupe_key,delivery_eligibility,action_href,reminder_id)
            values($1,$2,$3,$4,$5,$6,$7,$8,'in-app',$9,$10) on conflict do nothing returning id`, [randomUUID(), r.account_id, r.opportunity_id, inboxKind, deliveryTitle(r), reminderNoticeBody(r.application_title), reminderNoticeReason(r.kind, r.subject_id ?? null), reminderNoticeDedupeKey({ ...r, subject_id: r.subject_id ?? null }), href, r.id]);
          sent=Boolean(inserted.rowCount);delivered += inserted.rowCount ?? 0;
        }
      }
      await client.query(`update creator_application_reminders set state=case when repeat_days>0 then 'scheduled' when $2 then 'delivered' when $3 then 'suppressed' else 'expired' end,
        due_at=case when repeat_days=0 then null else ((now() at time zone timezone)+make_interval(days=>repeat_days)) at time zone timezone end,snoozed_until=null,
        last_delivered_at=case when $2 then now() else last_delivered_at end,revision=revision+1,updated_at=now() where id=$1`, [r.id, sent, !r.allowed]);
    }
    await client.query('commit');
    return { processed: due.rowCount ?? 0, delivered, deferred, capped };
  } catch (e) { await client.query('rollback'); throw e; }
  finally { client.release(); }
}
