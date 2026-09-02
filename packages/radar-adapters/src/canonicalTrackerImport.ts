import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import {
  createStore,
  type ManualTrackerEntry,
  type MyStatus,
  type Opportunity,
  type OpportunityStatus,
  type OpportunityType,
  type RadarStore,
  type StatusEvent,
} from "@missa/radar-engine";

type Queryable = Pick<Pool | PoolClient,"query">;
type OpportunityRow = {
  id:string;title:string;organization_id:string|null;organization_name:string|null;source_id:string;source_url:string;
  status:string;type:string;genres:string[];open_date:string|null;deadline_date:string|null;deadline_kind:string;
  fee_status:string;fee_cents:number|null;fee_currency:string|null;prize:string|null;location:string|null;
  simultaneous_allowed:boolean|null;guidelines_url:string|null;submission_url:string|null;created_at:Date|string;
  source_checked_at:Date|string|null;last_changed_at:Date|string|null;
};

function iso(value:Date|string|null):string { return value ? new Date(value).toISOString() : new Date(0).toISOString(); }

function canonicalOpportunity(row:OpportunityRow):Opportunity {
  return {
    id:row.id,createdAt:iso(row.created_at),status:row.status as OpportunityStatus,sourceId:row.source_id,sourceUrl:row.source_url,
    alternateSourceIds:[],scores:{freshness:0,confidence:0,trust:0},trustSignals:[],lastCheckedAt:iso(row.source_checked_at),
    lastChangedAt:iso(row.last_changed_at ?? row.created_at),lastExtractionConfidence:0,lastOpenSignal:false,lastClosedSignal:false,
    lastSuspiciousSignals:[],pastCycles:[],conflicts:[],
    fields:{ title:row.title,...(row.organization_name ? {organizationName:row.organization_name}:{}),...(row.organization_id ? {organizationId:row.organization_id}:{}),
      type:row.type as OpportunityType,genres:row.genres,deadline:{kind:(row.deadline_kind === "fixed" ? "exact" : row.deadline_kind) as Opportunity["fields"]["deadline"]["kind"],...(row.deadline_date ? {date:row.deadline_date}: {})},
      fee:{disclosed:row.fee_status !== "unknown",...(row.fee_cents===null ? {}:{amountCents:row.fee_cents}),...(row.fee_currency ? {currency:row.fee_currency}:{})},
      eligibility:[],requiredMaterials:[],contactEmailPresent:false,...(row.open_date ? {openDate:row.open_date}:{}),...(row.prize ? {prize:row.prize}:{}),
      ...(row.location ? {location:row.location}:{}),...(row.simultaneous_allowed===null ? {}:{simultaneousAllowed:row.simultaneous_allowed}),
      ...(row.guidelines_url ? {guidelinesUrl:row.guidelines_url}:{}),...(row.submission_url ? {submissionUrl:row.submission_url}:{}) },
  };
}

export async function loadCanonicalTrackerImportStore(queryable:Queryable, accountId:string, userId:string):Promise<RadarStore> {
  const store=createStore();
  const opportunities=await queryable.query<OpportunityRow>(
    `select o.id,o.title,o.organization_id,coalesce(org.data->>'name',o.organization_id) organization_name,o.source_id,
       coalesce(s.canonical_url,s.url) source_url,o.status,o.type,o.genres,o.open_date,o.deadline_date,o.deadline_kind,
       o.fee_status,o.fee_cents,o.fee_currency,o.prize,o.location,o.simultaneous_allowed,o.guidelines_url,o.submission_url,
       o.created_at,o.source_checked_at,o.last_changed_at
     from opportunities o join opportunity_sources s on s.id=o.source_id left join radar_organizations org on org.id=o.organization_id
     where o.publication_state='published' order by o.id`,
  );
  store.opportunities=new Map(opportunities.rows.map((row)=>[row.id,canonicalOpportunity(row)]));
  const tracked=await queryable.query<{id:string;opportunity_id:string;status:MyStatus;notify:boolean;submitted_at:Date|string|null;last_import_id:string|null;tracked_at:Date|string}>(
    `select id,opportunity_id,status,notify,submitted_at,last_import_id,tracked_at from tracked_opportunities where account_id=$1 order by opportunity_id`,[accountId],
  );
  const events=await queryable.query<{tracked_opportunity_id:string;from_status:MyStatus|null;to_status:MyStatus;source:StatusEvent["source"];note:string|null;created_at:Date|string}>(
    `select e.tracked_opportunity_id,e.from_status,e.to_status,e.source,e.note,e.created_at from tracked_status_events e
     join tracked_opportunities t on t.id=e.tracked_opportunity_id where t.account_id=$1 order by e.created_at,e.id`,[accountId],
  );
  const byTracked=new Map<string,StatusEvent[]>();
  for (const event of events.rows) {
    const list=byTracked.get(event.tracked_opportunity_id) ?? [];
    list.push({at:iso(event.created_at),...(event.from_status ? {from:event.from_status}:{}),to:event.to_status,source:event.source,...(event.note ? {note:event.note}:{})});
    byTracked.set(event.tracked_opportunity_id,list);
  }
  store.tracked=tracked.rows.map((row)=>({ userId,opportunityId:row.opportunity_id,myStatus:row.status,notify:row.notify,trackedAt:iso(row.tracked_at),events:byTracked.get(row.id) ?? [],
    ...(row.submitted_at ? {submittedAt:iso(row.submitted_at)}:{}),...(row.last_import_id ? {lastImportId:row.last_import_id}:{}) }));
  const manual=await queryable.query<{id:string;title:string;organization_name:string|null;status:MyStatus;source_kind:ManualTrackerEntry["sourceKind"];detail:Record<string,unknown>;created_at:Date|string}>(
    `select id,title,organization_name,status,source_kind,detail,created_at from tracker_manual_entries where account_id=$1 order by id`,[accountId],
  );
  store.manualTrackerEntries=manual.rows.map((row)=>({ ...(row.detail as Omit<ManualTrackerEntry,"id"|"userId"|"title"|"organizationName"|"myStatus"|"sourceKind"|"importedAt">),
    id:row.id,userId,title:row.title,organizationName:row.organization_name ?? "",myStatus:row.status,sourceKind:row.source_kind,importedAt:iso(row.created_at) } as ManualTrackerEntry));
  return store;
}
