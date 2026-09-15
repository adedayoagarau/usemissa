import { goalOpportunityScope, goalRecordedWorkScope } from "./goal-scope.ts";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { CreatorRepositoryBase, CreatorConflictError, creatorPoolFor, canonicalTrackerStatus, type CreatorCommandEnvelope } from "@missa/radar-adapters";
import type { MyStatus } from "@missa/radar-engine";
import type { ApplicationDetail, ApplicationSummary } from "./application-workspace-types";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, "Choose a valid date");
export const applicationCommand = z.discriminatedUnion("action", [
  z.object({ action: z.literal("notes"), notes: z.string().max(10000) }),
  z.object({ action: z.literal("record"), status: z.string().refine(v => !!canonicalTrackerStatus(v)), occurredOn: date, timezone: z.string().refine(v => { try { new Intl.DateTimeFormat("en", {timeZone:v}); return true; } catch { return false; } }), note: z.string().max(2000).default("") }),
]);
type Command = z.infer<typeof applicationCommand>;

const projection = `select t.opportunity_id as "opportunityId", o.title,
 coalesce(p.name,org.data->>'name','') as "organizationName",o.type,t.status as "myStatus",
 o.status as "opportunityStatus",o.publication_state='published' as available,t.revision,
 o.deadline_date::text as deadline,coalesce(o.deadline_kind,'unknown') as "deadlineKind",
 to_char(o.deadline_time at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as "deadlineTime",o.deadline_timezone as "deadlineTimezone",
 t.submitted_at as "submittedAt",t.updated_at as "updatedAt",w.title as "workTitle",t.work_id as "workId",t.notify
 from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
 left join radar_organizations org on org.id=o.organization_id
 left join gary_profiles p on p.id=o.organization_id
 left join creator_library_works w on w.id=t.work_id and w.account_id=t.account_id`;

function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try { const url = new URL(value); return ["https:","http:"].includes(url.protocol) && !url.username && !url.password ? url.toString() : null; } catch { return null; }
}

export class ApplicationWorkspaceRepository extends CreatorRepositoryBase {
  constructor() { if (!process.env.DATABASE_URL) throw new Error("Application storage unavailable"); super(creatorPoolFor(process.env.DATABASE_URL)); }

  async list(accountId: string): Promise<ApplicationSummary[]> {
    return (await this.query<ApplicationSummary>(`${projection} where t.account_id=$1 order by t.updated_at desc,t.id`,[accountId])).rows;
  }

  async detail(accountId: string, opportunityId: string): Promise<ApplicationDetail | null> {
    const item = (await this.query<ApplicationSummary>(`${projection} where t.account_id=$1 and t.opportunity_id=$2`,[accountId,opportunityId])).rows[0];
    if (!item) return null;
    const [context, history, versions, goals] = await Promise.all([
      this.query<{notes:string|null;guidelines_url:string|null;submission_url:string|null;submission_state:string}>(`select t.notes,o.guidelines_url,o.submission_url,o.submission_state from tracked_opportunities t join opportunities o on o.id=t.opportunity_id where t.account_id=$1 and t.opportunity_id=$2`,[accountId,opportunityId]),
      this.query<ApplicationDetail["history"][number]>(`select e.id,e.from_status as "from",e.to_status as "to",e.occurred_on::text as "occurredOn",e.created_at as "recordedAt",e.note,e.source,exists(select 1 from application_material_versions v where v.event_id=e.id and v.account_id=$1) as "hasMaterials" from tracked_status_events e join tracked_opportunities t on t.id=e.tracked_opportunity_id and t.account_id=e.account_id where e.account_id=$1 and t.opportunity_id=$2 order by e.created_at desc,e.id desc limit 100`,[accountId,opportunityId]),
      this.query<{id:string;createdAt:string;materials: Omit<ApplicationDetail["materials"][number],"id"|"createdAt">}>(`select v.id,v.created_at as "createdAt",v.materials from application_material_versions v join tracked_opportunities t on t.id=v.tracked_opportunity_id and t.account_id=v.account_id where v.account_id=$1 and t.opportunity_id=$2 order by v.created_at desc limit 20`,[accountId,opportunityId]),
      this.query<{id:string;title:string}>(`select g.id,g.title from creator_goals g join tracked_opportunities t on t.account_id=g.account_id and t.opportunity_id=$2 join opportunities o on o.id=t.opportunity_id where g.account_id=$1 and g.state='active' and ${goalOpportunityScope()} and (${goalRecordedWorkScope()} or (t.submitted_at is null and exists(select 1 from tracker_checklist_items i join tracker_checklists c on c.id=i.checklist_id where c.account_id=g.account_id and c.tracked_opportunity_id=t.id and i.work_id=g.work_id))) order by g.created_at desc`,[accountId,opportunityId]),
    ]);
    const c=context.rows[0];
    return {...item,notes:c.notes??"",applyUrl:item.available && ["open","closing-soon","deadline-extended"].includes(item.opportunityStatus) && c.submission_state==='available' ? safeUrl(c.submission_url) : null,guidelinesUrl:item.available?safeUrl(c.guidelines_url):null,history:history.rows,materials:versions.rows.map(v=>({id:v.id,createdAt:v.createdAt,...v.materials})),goals:goals.rows};
  }

  async change(envelope: CreatorCommandEnvelope, opportunityId: string, input: Command) {
    return this.executeOwnerCommand(envelope, async client => {
      const row=(await client.query<{id:string;status:MyStatus;revision:number;submitted_at:string|null;work_id:string|null}>(`select id,status,revision,submitted_at,work_id from tracked_opportunities where account_id=$1 and opportunity_id=$2 for update`,[envelope.accountId,opportunityId])).rows[0];
      if (!row || row.revision!==envelope.expectedRevision) throw new CreatorConflictError("application",opportunityId,envelope.expectedRevision,row?.revision??0);
      if (input.action==='notes') {
        await client.query(`update tracked_opportunities set notes=$3,revision=revision+1,updated_at=now() where account_id=$1 and opportunity_id=$2`,[envelope.accountId,opportunityId,input.notes]);
      } else {
        const future=(await client.query<{future:boolean}>(`select $1::date > (now() at time zone $2)::date as future`,[input.occurredOn,input.timezone])).rows[0].future;
        if(future)throw new Error("A recorded update cannot be in the future.");
        const preparing=["interested","saved","preparing","draft-started","ready-to-submit"].includes(input.status);
        const eventId=randomUUID();
        await client.query(`update tracked_opportunities set status=$3,submitted_at=case when $3='submitted' then ($4::date + time '12:00') at time zone $5 when $6 then null else submitted_at end,revision=revision+1,updated_at=now() where account_id=$1 and opportunity_id=$2`,[envelope.accountId,opportunityId,input.status,input.occurredOn,input.timezone,preparing]);
        await client.query(`insert into tracked_status_events(id,tracked_opportunity_id,account_id,from_status,to_status,source,idempotency_key,note,occurred_on,evidence) values($1,$2,$3,$4,$5,'user',$6,$7,$8,$9::jsonb)`,[eventId,row.id,envelope.accountId,row.status,input.status,envelope.idempotencyKey,input.note||null,input.occurredOn,JSON.stringify({datePrecision:'day',timezone:input.timezone,correction:row.status===input.status})]);
        await client.query(`update creator_application_reminders set state='cancelled',due_at=null,snoozed_until=null,revision=revision+1,updated_at=now()
          where account_id=$1 and opportunity_id=$2 and state in ('scheduled','needs-review') and
          ((kind in ('preparation','deadline') and not $3::boolean) or (kind='response' and ($3::boolean or $4::boolean)))`,
          [envelope.accountId,opportunityId,preparing,['accepted','declined','withdrawn','delivered','archived'].includes(input.status)]);
        if(input.status==='submitted' && !row.submitted_at) {
          // Capture the actual selected material versions; future Library edits cannot rewrite this event.
          const works=(await client.query(`select distinct w.id,w.title,w.description,w.metadata,w.revision from creator_library_works w where w.account_id=$1 and (w.id=$2 or w.id in(select i.work_id from tracker_checklist_items i join tracker_checklists c on c.id=i.checklist_id where c.tracked_opportunity_id=$3 and c.account_id=$1 and i.account_id=$1))`,[envelope.accountId,row.work_id,row.id])).rows;
          const answers=(await client.query(`select distinct a.id,a.label,a.answer,a.revision from creator_saved_answers a join tracker_checklist_items i on i.saved_answer_id=a.id and i.account_id=a.account_id join tracker_checklists c on c.id=i.checklist_id and c.account_id=i.account_id where a.account_id=$1 and c.tracked_opportunity_id=$2`,[envelope.accountId,row.id])).rows;
          const files=(await client.query(`select distinct f.id,f.name,f.mime_type,f.size_bytes,f.revision from creator_library_files f where f.account_id=$1 and (f.work_id=any($2::text[]) or f.id=any($4::text[]) or f.id in(select i.file_id from tracker_checklist_items i join tracker_checklists c on c.id=i.checklist_id where c.account_id=$1 and i.account_id=$1 and c.tracked_opportunity_id=$3))`,[envelope.accountId,works.map(w=>w.id),row.id,works.flatMap(w=>w.metadata?.fileId?[w.metadata.fileId]:[])])).rows;
          const versionId=randomUUID();
          await client.query(`insert into application_material_versions(id,account_id,tracked_opportunity_id,event_id,materials) values($1,$2,$3,$4,$5::jsonb)`,[versionId,envelope.accountId,row.id,eventId,JSON.stringify({works,answers,files})]);
          for(const file of files)await client.query(`insert into application_material_files(version_id,file_id) values($1,$2)`,[versionId,file.id]);
        }
      }
      return {resourceType:"application",resourceId:opportunityId,revision:row.revision+1};
    });
  }
}
