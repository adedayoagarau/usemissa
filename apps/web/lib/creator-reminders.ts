import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { CreatorRepositoryBase, CreatorConflictError, creatorPoolFor, type CreatorCommandEnvelope } from '@missa/radar-adapters';

const timezone = z.string().refine(v => { try { new Intl.DateTimeFormat('en', { timeZone: v }); return true; } catch { return false; } });
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a time of day');
export const reminderInput = z.discriminatedUnion('kind', [
  z.object({ opportunityId: z.string().min(1).max(200), kind: z.literal('deadline'), offsetDays: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(7), z.literal(14)]), timeOfDay: timeOfDay.default('09:00'), timezone }),
  z.object({ opportunityId: z.string().min(1).max(200), kind: z.enum(['preparation', 'response']), title: z.string().trim().min(1).max(160), dueAt: z.string().datetime({ offset: true }), repeatDays: z.union([z.literal(0), z.literal(7), z.literal(14), z.literal(30)]), timezone }),
]);
export type ReminderInput = z.infer<typeof reminderInput>;
export type ApplicationReminder = {
  id: string; opportunityId: string; applicationTitle: string; kind: 'preparation' | 'deadline' | 'response';
  title: string; dueAt: string | null; timezone: string; repeatDays: number; state: 'scheduled' | 'delivered' | 'cancelled' | 'needs-review' | 'suppressed' | 'expired';
  sourceDeadline: string | null; offsetDays: number | null; revision: number; inAppEnabled: boolean;
};
export class ReminderValidationError extends Error {}
const saved = "('interested','saved','preparing','draft-started','ready-to-submit')";
const history = "('accepted','declined','withdrawn','delivered','archived')";

export class CreatorReminderRepository extends CreatorRepositoryBase {
  constructor() {
    if (!process.env.DATABASE_URL) throw new Error('Reminder storage unavailable');
    super(creatorPoolFor(process.env.DATABASE_URL));
  }

  async list(accountId: string, opportunityId?: string): Promise<ApplicationReminder[]> {
    return (await this.query<ApplicationReminder>(`select r.id,r.opportunity_id as "opportunityId",o.title as "applicationTitle",r.kind,r.title,
      coalesce(r.snoozed_until,r.due_at) as "dueAt",r.timezone,r.repeat_days as "repeatDays",r.state,r.source_deadline::text as "sourceDeadline",
      r.deadline_offset_days as "offsetDays",r.revision,coalesce(p.in_app_enabled and p.reminder_enabled,false) as "inAppEnabled"
      from creator_application_reminders r join opportunities o on o.id=r.opportunity_id
      left join notification_preferences p on p.account_id=r.account_id
      where r.account_id=$1 and ($2::text is null or r.opportunity_id=$2) and r.state<>'cancelled'
      order by coalesce(r.snoozed_until,r.due_at) nulls last,r.created_at desc`, [accountId, opportunityId ?? null])).rows;
  }

  async create(envelope: CreatorCommandEnvelope, input: ReminderInput) {
    return this.executeOwnerCommand(envelope, async client => {
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
      const existing = (await client.query<{ id: string; state: string }>('select id,state from creator_application_reminders where account_id=$1 and opportunity_id=$2 and kind=$3 for update', [envelope.accountId, input.opportunityId, input.kind])).rows[0];
      if (existing && ['scheduled', 'needs-review'].includes(existing.state)) throw new ReminderValidationError('You already have this reminder. Open it to reschedule or cancel it.');
      const row = (await client.query<{ id: string; revision: number }>(`insert into creator_application_reminders(id,account_id,opportunity_id,kind,title,timezone,due_at,repeat_days,deadline_offset_days,source_deadline)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        on conflict(account_id,opportunity_id,kind) do update set title=excluded.title,timezone=excluded.timezone,due_at=excluded.due_at,repeat_days=excluded.repeat_days,deadline_offset_days=excluded.deadline_offset_days,source_deadline=excluded.source_deadline,state='scheduled',snoozed_until=null,revision=creator_application_reminders.revision+1,updated_at=now()
        returning id,revision`, [randomUUID(), envelope.accountId, input.opportunityId, input.kind, input.kind === 'deadline' ? 'Application deadline' : input.title, input.timezone, due, input.kind === 'deadline' ? 0 : input.repeatDays, input.kind === 'deadline' ? input.offsetDays : null, input.kind === 'deadline' ? t.deadline : null])).rows[0];
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

/** Executes without an open browser. Database time and row locks define each delivery slot. */
export async function tickCreatorReminders(accountId?: string) {
  if (!process.env.DATABASE_URL) throw new Error('Reminder storage unavailable');
  const client = await creatorPoolFor(process.env.DATABASE_URL).connect();
  try {
    await client.query('begin');
    await client.query(`update creator_application_reminders r set state='cancelled',due_at=null,snoozed_until=null,revision=r.revision+1,updated_at=now()
      where ($1::text is null or r.account_id=$1) and r.state in ('scheduled','needs-review') and (
      not exists(select 1 from tracked_opportunities t where t.account_id=r.account_id and t.opportunity_id=r.opportunity_id) or
      exists(select 1 from tracked_opportunities t where t.account_id=r.account_id and t.opportunity_id=r.opportunity_id and
      ((r.kind in ('preparation','deadline') and t.status not in ${saved}) or (r.kind='response' and (t.status in ${saved} or t.status in ${history})))) )`, [accountId ?? null]);
    await client.query(`update creator_application_reminders r set state='needs-review',due_at=null,snoozed_until=null,revision=r.revision+1,updated_at=now()
      from opportunities o where o.id=r.opportunity_id and ($1::text is null or r.account_id=$1) and r.state='scheduled' and r.kind='deadline'
      and (o.publication_state<>'published' or o.deadline_date is null or o.deadline_kind not in ('fixed','exact'))`, [accountId ?? null]);
    await client.query(`update creator_application_reminders r set due_at=((o.deadline_date-r.deadline_offset_days)::timestamp+coalesce((r.due_at at time zone r.timezone)::time,time '09:00')::interval) at time zone r.timezone,
      source_deadline=o.deadline_date,snoozed_until=null,revision=r.revision+1,updated_at=now()
      from opportunities o where o.id=r.opportunity_id and ($1::text is null or r.account_id=$1) and r.state='scheduled' and r.kind='deadline'
      and r.source_deadline is distinct from o.deadline_date`, [accountId ?? null]);
    await client.query(`update creator_application_reminders r set state='needs-review',due_at=null,snoozed_until=null,revision=r.revision+1,updated_at=now()
      from opportunities o where o.id=r.opportunity_id and ($1::text is null or r.account_id=$1) and r.state='scheduled' and r.kind='deadline'
      and r.due_at >= coalesce(o.deadline_time,((o.deadline_date+1)::timestamp at time zone coalesce(o.deadline_timezone,r.timezone)))`, [accountId ?? null]);
    const due = await client.query(`select r.*,o.title as application_title,t.status as application_status,o.deadline_date < (now() at time zone r.timezone)::date as deadline_passed,
      coalesce(r.snoozed_until,r.due_at) as effective_due,coalesce(p.in_app_enabled and p.reminder_enabled,false) as allowed
      from creator_application_reminders r join opportunities o on o.id=r.opportunity_id
      join tracked_opportunities t on t.account_id=r.account_id and t.opportunity_id=r.opportunity_id
      left join notification_preferences p on p.account_id=r.account_id
      where ($1::text is null or r.account_id=$1) and r.state='scheduled' and coalesce(r.snoozed_until,r.due_at)<=now()
      order by coalesce(r.snoozed_until,r.due_at) for update of r skip locked limit 100`, [accountId ?? null]);
    let delivered = 0;
    for (const r of due.rows) {
      let sent=false;
      if (r.allowed) {
        const isLateDeadline = r.kind === 'deadline' && r.deadline_passed;
        if (!isLateDeadline) {
          const href = `/tracker?view=${r.kind === 'response' ? 'awaiting' : 'saved'}&application=${encodeURIComponent(r.opportunity_id)}`;
          const inserted = await client.query(`insert into creator_inbox_alerts(id,account_id,opportunity_id,kind,title,body,reason,dedupe_key,delivery_eligibility,action_href,reminder_id)
            values($1,$2,$3,$4,$5,$6,$7,$8,'in-app',$9,$10) on conflict do nothing returning id`, [randomUUID(), r.account_id, r.opportunity_id, r.kind === 'response' ? 'response-overdue' : 'deadline-reminder', r.title, r.application_title, 'You scheduled this reminder.', `application-reminder:${r.id}:${new Date(r.effective_due).toISOString()}`, href, r.id]);
          sent=Boolean(inserted.rowCount);delivered += inserted.rowCount ?? 0;
        }
      }
      await client.query(`update creator_application_reminders set state=case when repeat_days>0 then 'scheduled' when $2 then 'delivered' when $3 then 'suppressed' else 'expired' end,
        due_at=case when repeat_days=0 then null else ((now() at time zone timezone)+make_interval(days=>repeat_days)) at time zone timezone end,snoozed_until=null,
        last_delivered_at=case when $2 then now() else last_delivered_at end,revision=revision+1,updated_at=now() where id=$1`, [r.id, sent, !r.allowed]);
    }
    await client.query('commit');
    return { processed: due.rowCount ?? 0, delivered };
  } catch (e) { await client.query('rollback'); throw e; }
  finally { client.release(); }
}
