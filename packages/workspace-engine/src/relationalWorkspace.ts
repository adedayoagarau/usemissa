import { createHash, randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import type { DecisionOutcome, SubmissionField } from './domain/types.js';
import { WorkspaceConflictError, WorkspaceIdempotencyReuseError, WorkspaceNotFoundError, type WorkspaceResourceType } from './errors.js';
import type { WorkspaceCommandEnvelope, WorkspaceCommandResult } from './repositories/contracts.js';
import { PostgresWorkspaceTransactionRunner } from './repositories/postgres/transactionRunner.js';

type Json = Record<string, unknown>;
type Row = Record<string, unknown>;
type TaxonomyAssignment = { termId: string; rule: 'accepted' | 'preferred' | 'required' | 'excluded'; required?: boolean };

export interface RelationalEntityView { id: string; organizationId: string; name: string; label?: string; revision: number }
export interface RelationalProgramView { id: string; entityId: string; name: string; revision: number }
export interface RelationalOpenCallView { id: string; programId: string; title: string; status: string; radarOpportunityId?: string; revision: number }
export interface RelationalReviewRoundView { id: string; openCallId: string; name: string; revision: number }
export interface RelationalCreatorDecisionContext {
  submitterAccountId: string;
  radarOpportunityId?: string;
  workTitle: string;
}
export interface RelationalOwnerSubmissionView {
  id:string; title:string; organizationName:string; status:string; submittedAt:string; category?:string;
  radarOpportunityId?:string; paymentStatus?:string;
  works:Array<{id:string;title:string;outcome?:string}>;
}

const tenantJoins: Record<WorkspaceResourceType, { table: string; joins: string; organization: string }> = {
  entity: { table: 'entities r', joins: '', organization: 'r.organization_id' },
  program: { table: 'programs r', joins: 'join entities e on e.id=r.entity_id', organization: 'e.organization_id' },
  open_call: { table: 'open_calls r', joins: 'join programs p on p.id=r.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  submission_path: { table: 'submission_paths r', joins: 'join open_calls o on o.id=r.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  submission: { table: 'submissions r', joins: 'join submission_paths sp on sp.id=r.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  work: { table: 'works r', joins: 'join submissions s on s.id=r.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  review_round: { table: 'review_rounds r', joins: 'join open_calls o on o.id=r.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  review_assignment: { table: 'review_assignments r', joins: 'join review_rounds rr on rr.id=r.review_round_id join open_calls o on o.id=rr.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  decision: { table: 'decisions r', joins: 'join works w on w.id=r.work_id join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  delivery_task: { table: 'delivery_tasks r', joins: 'join works w on w.id=r.work_id join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
};

export function workspaceRequestHash(value: unknown): string {
  const stable = (input: unknown): unknown => Array.isArray(input)
    ? input.map(stable)
    : input && typeof input === 'object'
      ? Object.fromEntries(Object.entries(input as Json).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]))
      : input;
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function relationalWorkspaceAuthorityEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY === '1';
}

export class RelationalWorkspace {
  private readonly transactions: PostgresWorkspaceTransactionRunner;
  constructor(readonly pool: Pool, private readonly failAfterDomainWrite?: () => void) {
    this.transactions = new PostgresWorkspaceTransactionRunner(pool);
  }

  async health(): Promise<{ authority: 'relational'; schemaReady: boolean }> {
    const result = await this.pool.query<{ ready: boolean }>(`select
      to_regclass('public.workspace_command_receipts') is not null
      and to_regclass('public.decisions') is not null
      and to_regclass('public.delivery_tasks') is not null
      and to_regclass('public.audit_events') is not null
      and to_regclass('public.outbox_events') is not null
      and not exists (
        select 1 from (values
          ('entities','revision'),('programs','revision'),('open_calls','revision'),
          ('submission_paths','revision'),('submissions','revision'),('works','revision'),
          ('review_rounds','revision'),('review_assignments','revision'),
          ('decisions','revision'),('delivery_tasks','revision'),
          ('audit_events','correlation_id'),('outbox_events','event_key')
        ) required(table_name,column_name)
        where not exists (select 1 from information_schema.columns c
          where c.table_schema='public' and c.table_name=required.table_name and c.column_name=required.column_name)
      ) as ready`);
    return { authority: 'relational', schemaReady: result.rows[0]?.ready === true };
  }

  async findOrganizationResource(organizationId: string, type: WorkspaceResourceType, id: string): Promise<Row | undefined> {
    const target = tenantJoins[type];
    const result = await this.pool.query(`select r.* from ${target.table} ${target.joins} where r.id=$1 and ${target.organization}=$2`, [id, organizationId]);
    return result.rows[0] as Row | undefined;
  }

  async entitiesForOrganization(organizationId: string): Promise<RelationalEntityView[]> {
    const result = await this.pool.query<RelationalEntityView>('select id,organization_id "organizationId",name,label,revision from entities where organization_id=$1 order by created_at,id', [organizationId]);
    return result.rows;
  }

  async programsForEntity(organizationId: string, entityId: string): Promise<RelationalProgramView[]> {
    const result = await this.pool.query<RelationalProgramView>(`select p.id,p.entity_id "entityId",p.name,p.revision from programs p
      join entities e on e.id=p.entity_id where p.entity_id=$1 and e.organization_id=$2 order by p.created_at,p.id`, [entityId, organizationId]);
    return result.rows;
  }

  async openCallsForOrganization(organizationId: string): Promise<RelationalOpenCallView[]> {
    const result = await this.pool.query<RelationalOpenCallView>(`select o.id,o.program_id "programId",o.title,o.status,o.radar_opportunity_id "radarOpportunityId",o.revision
      from open_calls o join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where e.organization_id=$1 order by o.created_at,o.id`, [organizationId]);
    return result.rows;
  }

  async reviewRoundsForOpenCall(organizationId: string, openCallId: string): Promise<RelationalReviewRoundView[]> {
    const result = await this.pool.query<RelationalReviewRoundView>(`select rr.id,rr.open_call_id "openCallId",rr.name,rr.revision from review_rounds rr
      join open_calls o on o.id=rr.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where rr.open_call_id=$1 and e.organization_id=$2 order by rr.created_at,rr.id`, [openCallId, organizationId]);
    return result.rows;
  }

  async organizationForReviewAssignment(reviewerAccountId: string, assignmentId: string): Promise<string | undefined> {
    const result = await this.pool.query<{ organization_id: string }>(`select e.organization_id from review_assignments ra
      join review_rounds rr on rr.id=ra.review_round_id join open_calls o on o.id=rr.open_call_id
      join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where ra.id=$1 and ra.reviewer_account_id=$2`, [assignmentId, reviewerAccountId]);
    return result.rows[0]?.organization_id;
  }

  async reviewAssignmentsForReviewer(reviewerAccountId: string): Promise<Row[]> {
    const result = await this.pool.query<Row>(`select ra.id,ra.review_round_id "reviewRoundId",ra.submission_id "submissionId",
      ra.reviewer_account_id "reviewerAccountId",ra.completed_at "completedAt",ra.revision,
      jsonb_build_object('id',s.id,'submissionPathId',s.submission_path_id,'status',s.status,'submittedAt',s.submitted_at,'revision',s.revision) submission,
      coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'submissionId',w.submission_id,'title',w.title,'order',w."order",'revision',w.revision) order by w."order") from works w where w.submission_id=s.id),'[]'::jsonb) works,
      case when rec.review_assignment_id is null then null else jsonb_build_object('reviewAssignmentId',rec.review_assignment_id,'score',rec.score,'notes',rec.notes,'recordedAt',rec.recorded_at) end recommendation
      from review_assignments ra join submissions s on s.id=ra.submission_id
      left join review_recommendations rec on rec.review_assignment_id=ra.id
      where ra.reviewer_account_id=$1 order by ra.created_at,ra.id`, [reviewerAccountId]);
    return result.rows;
  }

  async publicSubmissionPath(id: string): Promise<Row | undefined> {
    const result = await this.pool.query<Row>(`select sp.id,sp.open_call_id "openCallId",sp.categories,sp.fields,sp.fee_cents "feeCents",sp.revision,
      o.title "openCallTitle",o.radar_opportunity_id "radarOpportunityId",e.organization_id "organizationId"
      from submission_paths sp join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where sp.id=$1 and o.status='published'`, [id]);
    return result.rows[0];
  }

  async submissionForOwner(ownerAccountId: string, id: string): Promise<Row | undefined> {
    const result = await this.pool.query<Row>(`select s.id,s.submission_path_id "submissionPathId",s.status,s.submitted_at "submittedAt",s.revision,
      sp.open_call_id "openCallId",o.title "openCallTitle",o.radar_opportunity_id "radarOpportunityId",e.organization_id "organizationId",
      jsonb_build_object('id',sp.id,'openCallId',sp.open_call_id,'categories',sp.categories,'fields',sp.fields,'feeCents',sp.fee_cents,'revision',sp.revision) path,
      coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'submissionId',w.submission_id,'title',w.title,'order',w."order",'revision',w.revision) order by w."order") from works w where w.submission_id=s.id),'[]'::jsonb) works,
      coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'workId',d.work_id,'outcome',d.outcome,'decidedAt',d.decided_at,'revision',d.revision) order by d.decided_at,d.id) from decisions d join works w on w.id=d.work_id where w.submission_id=s.id),'[]'::jsonb) decisions
      from submissions s join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id
      join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where s.id=$1 and s.submitter_account_id=$2`, [id, ownerAccountId]);
    return result.rows[0];
  }

  async submissionsForOwner(ownerAccountId:string):Promise<RelationalOwnerSubmissionView[]> {
    const result=await this.pool.query<{
      id:string;title:string;organization_name:string;status:string;submitted_at:Date|string;category:string|null;
      radar_opportunity_id:string|null;payment_status:string|null;works:Array<{id:string;title:string;outcome?:string}>;
    }>(`select s.id,o.title,coalesce(ro.data->>'name',e.organization_id) organization_name,s.status,s.submitted_at,s.category,
        o.radar_opportunity_id,s.payment_status,
        coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'title',w.title,'outcome',d.outcome) order by w."order",w.id)
          from works w left join decisions d on d.work_id=w.id where w.submission_id=s.id),'[]'::jsonb) works
      from submissions s join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id
      join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      left join radar_organizations ro on ro.id=e.organization_id
      where s.submitter_account_id=$1 order by s.submitted_at desc,s.id desc`,[ownerAccountId]);
    return result.rows.map((row)=>({ id:row.id,title:row.title,organizationName:row.organization_name,status:row.status,
      submittedAt:new Date(row.submitted_at).toISOString(),works:row.works,
      ...(row.category ? {category:row.category}:{}),...(row.radar_opportunity_id ? {radarOpportunityId:row.radar_opportunity_id}:{}),
      ...(row.payment_status ? {paymentStatus:row.payment_status}:{}) }));
  }

  async creatorDecisionContext(organizationId: string, workId: string): Promise<RelationalCreatorDecisionContext | undefined> {
    const result = await this.pool.query<RelationalCreatorDecisionContext>(`select s.submitter_account_id "submitterAccountId",
      o.radar_opportunity_id "radarOpportunityId",w.title "workTitle"
      from works w join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id
      join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where w.id=$1 and e.organization_id=$2`, [workId, organizationId]);
    return result.rows[0];
  }

  private async currentRevision(client: PoolClient, organizationId: string, type: WorkspaceResourceType, id: string): Promise<number | null> {
    const target = tenantJoins[type];
    const result = await client.query<{ revision: number }>(`select r.revision from ${target.table} ${target.joins} where r.id=$1 and ${target.organization}=$2`, [id, organizationId]);
    return result.rows[0]?.revision ?? null;
  }

  private async mutateRevision(client: PoolClient, envelope: WorkspaceCommandEnvelope, type: WorkspaceResourceType, id: string, setSql: string, values: unknown[]): Promise<Row> {
    if (!envelope.organizationId || envelope.expectedRevision === undefined) throw new WorkspaceConflictError(type, id, envelope.expectedRevision ?? 0, null);
    const target = tenantJoins[type];
    const offset = values.length;
    const scopedTable = target.table.replace(/ r$/, ' r2');
    const scopedJoins = target.joins.replaceAll('r.', 'r2.');
    const scopedOrganization = target.organization.replaceAll('r.', 'r2.');
    const result = await client.query(
      `update ${target.table} set ${setSql}, revision=r.revision+1, updated_at=now()
       where r.id=$${offset + 1} and r.revision=$${offset + 3}
       and r.id in (select r2.id from ${scopedTable} ${scopedJoins} where ${scopedOrganization}=$${offset + 2}) returning r.*`,
      [...values, id, envelope.organizationId, envelope.expectedRevision],
    );
    if (result.rowCount === 0) throw new WorkspaceConflictError(type, id, envelope.expectedRevision, await this.currentRevision(client, envelope.organizationId, type, id));
    return result.rows[0] as Row;
  }

  private async effect(client: PoolClient, envelope: WorkspaceCommandEnvelope, action: string, type: string, id: string, revision: number, metadata: Json = {}, organizationId = envelope.organizationId): Promise<void> {
    const safe = { ...metadata, revision };
    await client.query('insert into audit_events (account_id,organization_id,action,target_type,target_id,detail,correlation_id,causation_id) values ($1,$2,$3,$4,$5,$6,$7,$8)', [envelope.actorAccountId, organizationId ?? null, action, type, id, safe, envelope.correlationId, envelope.causationId ?? null]);
    await client.query('insert into outbox_events (topic,aggregate_type,aggregate_id,payload,organization_id,event_key,correlation_id) values ($1,$2,$3,$4,$5,$6,$7)', [`workspace.${action}`, type, id, safe, organizationId ?? null, `${type}:${id}:${revision}:${action}`, envelope.correlationId]);
  }

  private async command(envelope: WorkspaceCommandEnvelope, identity: unknown, work: (client: PoolClient) => Promise<Omit<WorkspaceCommandResult, 'receiptId' | 'replayed'>>): Promise<WorkspaceCommandResult> {
    const scopeType = envelope.organizationId ? 'organization' : 'owner';
    const scopeId = envelope.organizationId ?? envelope.ownerAccountId;
    if (!scopeId || !envelope.idempotencyKey || envelope.idempotencyKey.length > 200 || !envelope.actorAccountId || !envelope.commandType || !envelope.requestHash || !envelope.correlationId) {
      throw new Error('A complete scoped command envelope is required');
    }
    if (scopeType === 'owner' && envelope.actorAccountId !== envelope.ownerAccountId) throw new WorkspaceNotFoundError();
    const requestHash = workspaceRequestHash({ commandType: envelope.commandType, identity, expectedRevision: envelope.expectedRevision });
    return this.transactions.transaction(async ({ client: rawClient }) => {
      const client = rawClient as PoolClient;
      const receiptId = randomUUID();
      const placeholder = { resourceType: 'pending', resourceId: 'pending', revision: 0, receiptId, replayed: false };
      const inserted = await client.query<{ id: string }>(
        `insert into workspace_command_receipts (id,scope_type,scope_id,actor_account_id,command_type,idempotency_key,request_hash,result,correlation_id,causation_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict do nothing returning id`,
        [receiptId, scopeType, scopeId, envelope.actorAccountId, envelope.commandType, envelope.idempotencyKey, requestHash, placeholder, envelope.correlationId, envelope.causationId ?? null],
      );
      if (inserted.rowCount === 0) {
        const prior = await client.query<{ request_hash: string; result: WorkspaceCommandResult }>(
          'select request_hash,result from workspace_command_receipts where scope_type=$1 and scope_id=$2 and actor_account_id=$3 and command_type=$4 and idempotency_key=$5',
          [scopeType, scopeId, envelope.actorAccountId, envelope.commandType, envelope.idempotencyKey],
        );
        if (prior.rows[0]?.request_hash !== requestHash) throw new WorkspaceIdempotencyReuseError();
        return { ...prior.rows[0]!.result, replayed: true };
      }
      const result = { ...(await work(client)), receiptId, replayed: false };
      this.failAfterDomainWrite?.();
      await client.query('update workspace_command_receipts set result=$2 where id=$1', [receiptId, result]);
      return result;
    });
  }

  async createEntity(envelope: WorkspaceCommandEnvelope, input: { id?: string; name: string; label?: string }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      const id = input.id ?? randomUUID();
      const row = await client.query<{ revision: number }>('insert into entities (id,organization_id,name,label) values ($1,$2,$3,$4) returning revision', [id, envelope.organizationId, input.name, input.label ?? null]);
      await this.effect(client, envelope, 'entity.created', 'entity', id, row.rows[0]!.revision);
      return { resourceType: 'entity', resourceId: id, revision: row.rows[0]!.revision };
    });
  }

  async createProgram(envelope: WorkspaceCommandEnvelope, input: { id?: string; entityId: string; name: string }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      const parent = await this.currentRevision(client, envelope.organizationId!, 'entity', input.entityId);
      if (parent === null) throw new WorkspaceNotFoundError();
      const id = input.id ?? randomUUID();
      const row = await client.query<{ revision: number }>('insert into programs (id,entity_id,name) values ($1,$2,$3) returning revision', [id, input.entityId, input.name]);
      await this.effect(client, envelope, 'program.created', 'program', id, row.rows[0]!.revision);
      return { resourceType: 'program', resourceId: id, revision: row.rows[0]!.revision };
    });
  }

  async createOpenCall(envelope: WorkspaceCommandEnvelope, input: { id?: string; programId: string; title: string; radarOpportunityId?: string }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      if (await this.currentRevision(client, envelope.organizationId!, 'program', input.programId) === null) throw new WorkspaceNotFoundError();
      const id = input.id ?? randomUUID();
      const row = await client.query<{ revision: number }>('insert into open_calls (id,program_id,title,radar_opportunity_id) values ($1,$2,$3,$4) returning revision', [id, input.programId, input.title, input.radarOpportunityId ?? null]);
      await this.effect(client, envelope, 'open_call.created', 'open_call', id, row.rows[0]!.revision);
      return { resourceType: 'open_call', resourceId: id, revision: row.rows[0]!.revision };
    });
  }

  async setOpenCallStatus(envelope: WorkspaceCommandEnvelope, id: string, status: 'published' | 'closed'): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id, status }, async (client) => {
      const row = await this.mutateRevision(client, envelope, 'open_call', id, `status=$1, published_at=case when $1='published' then coalesce(r.published_at,now()) else r.published_at end`, [status]);
      const revision = Number(row.revision);
      await this.effect(client, envelope, `open_call.${status}`, 'open_call', id, revision);
      return { resourceType: 'open_call', resourceId: id, revision };
    });
  }

  private async replaceSubmissionPathTaxonomy(client: PoolClient, pathId: string, assignments: TaxonomyAssignment[] = []): Promise<void> {
    await client.query('delete from submission_path_taxonomy_terms where submission_path_id=$1', [pathId]);
    for (const assignment of assignments) {
      await client.query('insert into submission_path_taxonomy_terms (submission_path_id,term_id,rule,required) values ($1,$2,$3,$4)', [pathId,assignment.termId,assignment.rule,assignment.required ?? assignment.rule === 'required']);
    }
  }

  async createSubmissionPath(envelope: WorkspaceCommandEnvelope, input: { id?: string; openCallId: string; categories: string[]; fields: SubmissionField[]; feeCents?: number; taxonomyAssignments?: TaxonomyAssignment[] }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      if (await this.currentRevision(client, envelope.organizationId!, 'open_call', input.openCallId) === null) throw new WorkspaceNotFoundError();
      const id = input.id ?? randomUUID();
      const row = await client.query<{ revision: number }>('insert into submission_paths (id,open_call_id,categories,fields,fee_cents) values ($1,$2,$3::jsonb,$4::jsonb,$5) returning revision', [id, input.openCallId, JSON.stringify(input.categories), JSON.stringify(input.fields), input.feeCents ?? null]);
      await this.replaceSubmissionPathTaxonomy(client, id, input.taxonomyAssignments);
      await this.effect(client, envelope, 'submission_path.created', 'submission_path', id, row.rows[0]!.revision);
      return { resourceType: 'submission_path', resourceId: id, revision: row.rows[0]!.revision };
    });
  }

  async updateSubmissionPath(envelope: WorkspaceCommandEnvelope, id: string, input: { openCallId: string; categories: string[]; fields: SubmissionField[]; feeCents?: number; taxonomyAssignments?: TaxonomyAssignment[] }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id, ...input }, async (client) => {
      const parent = await client.query('select 1 from submission_paths sp join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where sp.id=$1 and sp.open_call_id=$2 and e.organization_id=$3', [id,input.openCallId,envelope.organizationId]);
      if (!parent.rowCount) throw new WorkspaceNotFoundError();
      const row = await this.mutateRevision(client,envelope,'submission_path',id,'categories=$1::jsonb,fields=$2::jsonb,fee_cents=$3',[JSON.stringify(input.categories),JSON.stringify(input.fields),input.feeCents ?? null]);
      if (input.taxonomyAssignments !== undefined) await this.replaceSubmissionPathTaxonomy(client, id, input.taxonomyAssignments);
      const revision=Number(row.revision);
      await this.effect(client,envelope,'submission_path.updated','submission_path',id,revision);
      return {resourceType:'submission_path',resourceId:id,revision};
    });
  }

  async finalizeSubmission(envelope: WorkspaceCommandEnvelope, input: {
    id?: string;
    submissionPathId: string;
    works: Array<{ id?: string; title: string; fileUrl?: string; fileUrls?: string[] }>;
    answers?: Record<string, string | string[]>;
    category?: string;
    paymentStatus?: 'not-required' | 'paid';
    paymentSessionId?: string;
    feeCents?: number;
  }): Promise<WorkspaceCommandResult> {
    if (!input.works.length) throw new Error('A submission needs at least one work');
    return this.command(envelope, input, async (client) => {
      const path = await client.query<{ organization_id: string }>(`select e.organization_id from submission_paths sp
        join open_calls o on o.id=sp.open_call_id
        join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
        where sp.id=$1 and o.status='published' for update of o`, [input.submissionPathId]);
      if (!path.rowCount) throw new WorkspaceNotFoundError();
      const id = input.id ?? randomUUID();
      const row = await client.query<{ revision: number }>(`insert into submissions
        (id,submission_path_id,submitter_account_id,status,payment_status,payment_session_id,fee_cents,idempotency_key,answers,category)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning revision`,
      [id, input.submissionPathId, envelope.ownerAccountId, 'submitted', input.paymentStatus ?? 'not-required', input.paymentSessionId ?? null,
        input.feeCents ?? null, envelope.idempotencyKey, input.answers ?? null, input.category ?? null]);
      const works: Array<Record<string, unknown>> = [];
      for (const [order, work] of input.works.entries()) {
        const workId = work.id ?? randomUUID();
        const inserted = await client.query<Row>(
          'insert into works (id,submission_id,title,file_url,file_urls,"order") values ($1,$2,$3,$4,$5,$6) returning id,submission_id "submissionId",title,file_url "fileUrl",file_urls "fileUrls","order",revision',
          [workId, id, work.title, work.fileUrl ?? null, work.fileUrls ? JSON.stringify(work.fileUrls) : null, order],
        );
        works.push(inserted.rows[0]!);
      }
      await this.effect(client, envelope, 'submission.finalized', 'submission', id, row.rows[0]!.revision, { workCount: input.works.length }, path.rows[0]!.organization_id);
      return { resourceType: 'submission', resourceId: id, revision: row.rows[0]!.revision, data: { works } };
    });
  }

  async withdrawSubmission(envelope: WorkspaceCommandEnvelope, id: string): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id }, async (client) => {
      const result = await client.query<{ revision: number; organization_id: string }>(`update submissions s set status=$1,revision=s.revision+1,updated_at=now()
        from submission_paths sp join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
        where s.id=$2 and s.submission_path_id=sp.id and s.submitter_account_id=$3 and s.revision=$4 and s.status in ('submitted','in-review')
        returning s.revision,e.organization_id`, ['withdrawn', id, envelope.ownerAccountId, envelope.expectedRevision]);
      if (!result.rowCount) {
        const current = await client.query<{ revision: number }>('select revision from submissions where id=$1 and submitter_account_id=$2', [id, envelope.ownerAccountId]);
        throw new WorkspaceConflictError('submission', id, envelope.expectedRevision ?? 0, current.rows[0]?.revision ?? null);
      }
      const revision = result.rows[0]!.revision;
      await this.effect(client, envelope, 'submission.withdrawn', 'submission', id, revision, {}, result.rows[0]!.organization_id);
      return { resourceType: 'submission', resourceId: id, revision };
    });
  }

  async createReviewRound(envelope: WorkspaceCommandEnvelope, input: { id?: string; openCallId: string; name: string }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      if (await this.currentRevision(client,envelope.organizationId!,'open_call',input.openCallId) === null) throw new WorkspaceNotFoundError();
      const id=input.id ?? randomUUID();
      const row=await client.query<{revision:number}>('insert into review_rounds (id,open_call_id,name) values ($1,$2,$3) returning revision',[id,input.openCallId,input.name]);
      const revision=row.rows[0]!.revision;
      await this.effect(client,envelope,'review_round.created','review_round',id,revision);
      return {resourceType:'review_round',resourceId:id,revision};
    });
  }

  async assignReviewer(envelope: WorkspaceCommandEnvelope, input: { id?: string; reviewRoundId: string; submissionId: string; reviewerAccountId: string }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      const valid=await client.query(`select 1 from review_rounds rr
        join open_calls o on o.id=rr.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
        join submissions s on s.id=$2 join submission_paths sp on sp.id=s.submission_path_id
        where rr.id=$1 and rr.open_call_id=sp.open_call_id and e.organization_id=$3 for update of rr,s`,[input.reviewRoundId,input.submissionId,envelope.organizationId]);
      if (!valid.rowCount) throw new WorkspaceNotFoundError();
      const id=input.id ?? randomUUID();
      const row=await client.query<{revision:number}>('insert into review_assignments (id,review_round_id,submission_id,reviewer_account_id) values ($1,$2,$3,$4) returning revision',[id,input.reviewRoundId,input.submissionId,input.reviewerAccountId]);
      const revision=row.rows[0]!.revision;
      await this.effect(client,envelope,'review_assignment.created','review_assignment',id,revision);
      return {resourceType:'review_assignment',resourceId:id,revision};
    });
  }

  async completeReview(envelope: WorkspaceCommandEnvelope, assignmentId: string, input: { score?: number; notes?: string }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { assignmentId, ...input }, async (client) => {
      const assignment=await client.query<{revision:number}>(`select ra.revision from review_assignments ra
        join review_rounds rr on rr.id=ra.review_round_id join open_calls o on o.id=rr.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
        where ra.id=$1 and ra.reviewer_account_id=$2 and e.organization_id=$3 and ra.completed_at is null for update of ra`,[assignmentId,envelope.actorAccountId,envelope.organizationId]);
      if (!assignment.rows[0]) throw new WorkspaceNotFoundError();
      if (assignment.rows[0].revision !== envelope.expectedRevision) throw new WorkspaceConflictError('review_assignment',assignmentId,envelope.expectedRevision ?? 0,assignment.rows[0].revision);
      await client.query('insert into review_recommendations (review_assignment_id,score,notes,recorded_at,updated_at) values ($1,$2,$3,now(),now())',[assignmentId,input.score ?? null,input.notes ?? null]);
      const changed=await client.query<{revision:number}>('update review_assignments set completed_at=now(),revision=revision+1,updated_at=now() where id=$1 and revision=$2 returning revision',[assignmentId,envelope.expectedRevision]);
      const revision=changed.rows[0]!.revision;
      await this.effect(client,envelope,'review.completed','review_assignment',assignmentId,revision,{hasScore:input.score !== undefined});
      return {resourceType:'review_assignment',resourceId:assignmentId,revision};
    });
  }

  async recordDecision(envelope: WorkspaceCommandEnvelope, input: { id?: string; workId: string; outcome: DecisionOutcome }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      const submissionId = await this.lockSubmissionForWork(client, envelope.organizationId!, input.workId);
      if (!submissionId) throw new WorkspaceNotFoundError();
      const existing = await client.query<{ id: string; revision: number }>('select d.id,d.revision from decisions d join works w on w.id=d.work_id join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where d.work_id=$1 and e.organization_id=$2', [input.workId, envelope.organizationId]);
      const id = existing.rows[0]?.id ?? input.id ?? randomUUID();
      let revision: number;
      if (existing.rows[0]) {
        if (envelope.expectedRevision !== existing.rows[0].revision) throw new WorkspaceConflictError('decision', id, envelope.expectedRevision ?? 0, existing.rows[0].revision);
        if (input.outcome !== 'accepted') {
          const delivery = await client.query('select 1 from delivery_tasks where work_id=$1', [input.workId]);
          if (delivery.rowCount) throw new WorkspaceConflictError('decision', id, envelope.expectedRevision, existing.rows[0].revision);
        }
        const changed = await client.query<{ revision: number }>('update decisions set outcome=$1,decided_by_account_id=$2,decided_at=now(),updated_at=now(),revision=revision+1 where id=$3 and revision=$4 returning revision', [input.outcome,envelope.actorAccountId,id,envelope.expectedRevision]);
        revision = changed.rows[0]!.revision;
      } else {
        const inserted = await client.query<{ revision: number }>('insert into decisions (id,work_id,outcome,decided_by_account_id) values ($1,$2,$3,$4) returning revision', [id,input.workId,input.outcome,envelope.actorAccountId]);
        revision = inserted.rows[0]!.revision;
      }
      await this.refreshSubmissionSummary(client, submissionId);
      await this.effect(client, envelope, existing.rows[0] ? 'decision.corrected' : 'decision.recorded', 'decision', id, revision, { outcome: input.outcome });
      return { resourceType: 'decision', resourceId: id, revision };
    });
  }

  async removeDecision(envelope: WorkspaceCommandEnvelope, decisionId: string, expectedWorkId?: string): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { decisionId, expectedWorkId }, async (client) => {
      const parent = await client.query<{ submission_id: string }>('select w.submission_id from decisions d join works w on w.id=d.work_id join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where d.id=$1 and e.organization_id=$2 and ($3::text is null or d.work_id=$3)', [decisionId,envelope.organizationId,expectedWorkId ?? null]);
      if (!parent.rows[0]) throw new WorkspaceNotFoundError();
      await client.query('select id from submissions where id=$1 for update', [parent.rows[0].submission_id]);
      const scoped = await client.query<{ work_id: string; revision: number }>('select d.work_id,d.revision from decisions d join works w on w.id=d.work_id join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where d.id=$1 and e.organization_id=$2 and ($3::text is null or d.work_id=$3) for update of d', [decisionId,envelope.organizationId,expectedWorkId ?? null]);
      if (!scoped.rows[0]) throw new WorkspaceNotFoundError();
      const delivery = await client.query('select 1 from delivery_tasks where work_id=$1', [scoped.rows[0].work_id]);
      if (delivery.rowCount) throw new WorkspaceConflictError('decision',decisionId,envelope.expectedRevision ?? 0,scoped.rows[0].revision);
      if (scoped.rows[0].revision !== envelope.expectedRevision) throw new WorkspaceConflictError('decision',decisionId,envelope.expectedRevision ?? 0,scoped.rows[0].revision);
      await client.query('delete from decisions where id=$1', [decisionId]);
      await this.refreshSubmissionSummary(client, parent.rows[0].submission_id);
      const revision = scoped.rows[0].revision + 1;
      await this.effect(client,envelope,'decision.removed','decision',decisionId,revision);
      return { resourceType:'decision',resourceId:decisionId,revision };
    });
  }

  private async lockSubmissionForWork(client: PoolClient, organizationId: string, workId: string): Promise<string | undefined> {
    const row = await client.query<{ submission_id: string }>(`select s.id submission_id from works w
      join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id
      join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where w.id=$1 and e.organization_id=$2 and s.status <> 'withdrawn' for update of s`, [workId, organizationId]);
    return row.rows[0]?.submission_id;
  }

  private async refreshSubmissionSummary(client: PoolClient, submissionId: string): Promise<void> {
    const outcomes = await client.query<{ outcome: DecisionOutcome | null }>('select d.outcome from works w left join decisions d on d.work_id=w.id where w.submission_id=$1 order by w."order"', [submissionId]);
    const decided = outcomes.rows.map((item) => item.outcome).filter(Boolean) as DecisionOutcome[];
    let status = 'submitted';
    if (decided.length) {
      const unique = new Set(decided);
      if (decided.length === outcomes.rows.length && unique.size === 1) status = decided[0]!;
      else if (unique.has('accepted')) status = 'partially-accepted';
      else if (decided.length === outcomes.rows.length) status = 'mixed';
      else status = 'in-review';
    }
    await client.query("update submissions set status=$1,revision=revision+1,updated_at=now() where id=$2 and status<>'withdrawn'", [status,submissionId]);
  }

  async createDeliveryTask(envelope: WorkspaceCommandEnvelope, input: { id?: string; workId: string; dueDate?: string }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      const accepted = await client.query('select 1 from decisions d join works w on w.id=d.work_id join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where d.work_id=$1 and d.outcome=$2 and e.organization_id=$3 for update of d', [input.workId,'accepted',envelope.organizationId]);
      if (!accepted.rowCount) throw new WorkspaceNotFoundError();
      const id = input.id ?? randomUUID();
      const inserted = await client.query<{ revision:number }>('insert into delivery_tasks (id,work_id,due_date) values ($1,$2,$3) returning revision',[id,input.workId,input.dueDate ?? null]);
      const revision=inserted.rows[0]!.revision;
      await this.effect(client,envelope,'delivery.created','delivery_task',id,revision);
      return {resourceType:'delivery_task',resourceId:id,revision};
    });
  }

  async updateDeliveryTask(envelope: WorkspaceCommandEnvelope, id: string, status: 'pending'|'complete'): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id, status }, async (client) => {
      const row=await this.mutateRevision(client,envelope,'delivery_task',id,`status=$1, completed_at=case when $1='complete' then now() else null end`,[status]);
      const revision=Number(row.revision);
      await this.effect(client,envelope,'delivery.updated','delivery_task',id,revision,{status});
      return {resourceType:'delivery_task',resourceId:id,revision};
    });
  }
}

export async function createRelationalWorkspace(databaseUrl = process.env.DATABASE_URL): Promise<RelationalWorkspace> {
  if (!databaseUrl) throw new Error('DATABASE_URL is required when relational Workspace authority is enabled');
  const workspace = new RelationalWorkspace(new Pool({ connectionString: databaseUrl }));
  const health = await workspace.health();
  if (!health.schemaReady) {
    await workspace.pool.end();
    throw new Error('Workspace relational schema is unavailable; relational authority fails closed');
  }
  return workspace;
}
