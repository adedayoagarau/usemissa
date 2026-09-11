import { createHash, randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import type { DecisionOutcome, SubmissionField, SubmissionStatus } from './domain/types.js';
import { canTransitionConfiguration, portalConfigurationFromDatabase, type ConfigurationStatus, type FormDefinition, type OpportunityConfiguration, type PortalConfiguration, type ReviewWorkflowDefinition } from './portalConfiguration.js';
import { WorkspaceConflictError, WorkspaceIdempotencyReuseError, WorkspaceNotFoundError, WorkspaceTransitionError, type WorkspaceResourceType } from './errors.js';
import type { WorkspaceCommandEnvelope, WorkspaceCommandResult } from './repositories/contracts.js';
import { PostgresWorkspaceTransactionRunner } from './repositories/postgres/transactionRunner.js';

type Json = Record<string, unknown>;
type Row = Record<string, unknown>;
type TaxonomyAssignment = { termId: string; rule: 'accepted' | 'preferred' | 'required' | 'excluded'; required?: boolean };

export interface RelationalEntityView { id: string; organizationId: string; name: string; label?: string; revision: number }
export interface RelationalProgramView { id: string; entityId: string; name: string; revision: number }
export interface RelationalOpenCallView { id: string; programId: string; title: string; status: string; radarOpportunityId?: string; guidelineText?: string; revision: number }
export interface RelationalReviewRoundView { id: string; openCallId: string; name: string; revision: number }
export interface RelationalReviewerGroupView { id: string; organizationId: string; name: string; workloadLimit?: number; memberCount: number; openAssignmentCount: number; revision: number }
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
export interface RelationalOrganizationSubmissionView {
  id: string;
  submissionPathId: string;
  openCallId: string;
  openCallTitle: string;
  submitterAccountId: string;
  status: SubmissionStatus;
  submittedAt: string;
  category?: string;
  paymentStatus?: string;
  answers?: Record<string, string | string[]>;
  works: Array<{ id: string; title: string; fileUrl?: string; fileUrls?: string[]; order: number }>;
  assignments: Array<{ id: string; reviewerAccountId?: string; completedAt?: string }>;
  decisions: Array<{ workId: string; outcome: DecisionOutcome }>;
}
export interface RelationalPortalConfigurationView {
  id: string;
  organizationId: string;
  version: number;
  status: ConfigurationStatus;
  configuration: PortalConfiguration;
  revision: number;
  createdAt: string;
  publishedAt?: string;
  supersedesVersionId?: string;
}
export interface RelationalFormVersionView {
  id: string;
  organizationId: string;
  definitionKey: string;
  version: number;
  status: ConfigurationStatus;
  definition: FormDefinition;
  revision: number;
  createdAt: string;
  publishedAt?: string;
  supersedesVersionId?: string;
}
export interface RelationalReviewWorkflowVersionView {
  id: string;
  organizationId: string;
  openCallId: string;
  version: number;
  status: ConfigurationStatus;
  definition: ReviewWorkflowDefinition;
  revision: number;
  createdAt: string;
  publishedAt?: string;
  supersedesVersionId?: string;
}
export interface RelationalOpportunityConfigurationVersionView {
  id: string;
  organizationId: string;
  openCallId: string;
  version: number;
  status: ConfigurationStatus;
  configuration: OpportunityConfiguration;
  revision: number;
  createdAt: string;
  publishedAt?: string;
  supersedesVersionId?: string;
}
export interface RelationalPublicOpenCallView {
  id: string;
  title: string;
  radarOpportunityId?: string;
  hasHostedForm: boolean;
}
export interface RelationalSubmissionDraftView {
  id: string;
  submissionPathId: string;
  submitterAccountId: string;
  answers: Record<string, string | string[]>;
  workTitles: string[];
  category?: string;
  paymentSessionId?: string;
  formVersionId?: string;
  opportunityConfigurationVersionId?: string;
  sectionProgress: string[];
  recoveryReceiptId: string;
  revision: number;
  updatedAt: string;
  expiresAt: string;
}
export interface RelationalPublicSubmissionPathView {
  id: string;
  openCallId: string;
  openCallTitle: string;
  organizationId: string;
  categories: string[];
  fields: SubmissionField[];
  feeCents?: number;
  radarOpportunityId?: string;
  revision: number;
}
export type OrganizationBlindMode = 'none' | 'identity-redacted';
export interface RelationalOrganizationReviewSettingsView {
  organizationId: string;
  blindMode: OrganizationBlindMode;
  revision: number;
  updatedAt: string;
}

const tenantJoins: Record<WorkspaceResourceType, { table: string; joins: string; organization: string }> = {
  entity: { table: 'entities r', joins: '', organization: 'r.organization_id' },
  program: { table: 'programs r', joins: 'join entities e on e.id=r.entity_id', organization: 'e.organization_id' },
  open_call: { table: 'open_calls r', joins: 'join programs p on p.id=r.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  submission_path: { table: 'submission_paths r', joins: 'join open_calls o on o.id=r.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  submission: { table: 'submissions r', joins: 'join submission_paths sp on sp.id=r.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  submission_draft: { table: 'submission_drafts r', joins: 'join submission_paths sp on sp.id=r.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  work: { table: 'works r', joins: 'join submissions s on s.id=r.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  review_round: { table: 'review_rounds r', joins: 'join open_calls o on o.id=r.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  review_assignment: { table: 'review_assignments r', joins: 'join review_rounds rr on rr.id=r.review_round_id join open_calls o on o.id=rr.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  decision: { table: 'decisions r', joins: 'join works w on w.id=r.work_id join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  delivery_task: { table: 'delivery_tasks r', joins: 'join works w on w.id=r.work_id join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id', organization: 'e.organization_id' },
  portal_configuration: { table: 'portal_configuration_versions r', joins: '', organization: 'r.organization_id' },
  form_version: { table: 'form_versions r', joins: '', organization: 'r.organization_id' },
  review_workflow_version: { table: 'review_workflow_versions r', joins: '', organization: 'r.organization_id' },
  opportunity_configuration_version: { table: 'opportunity_configuration_versions r', joins: '', organization: 'r.organization_id' },
  organization_review_settings: { table: 'organization_review_settings r', joins: '', organization: 'r.organization_id' },
  reviewer_group: { table: 'reviewer_groups r', joins: '', organization: 'r.organization_id' },
  decision_message_draft: { table: 'decision_message_drafts r', joins: '', organization: 'r.organization_id' },
  message_delivery_attempt: { table: 'message_delivery_attempts r', joins: '', organization: 'r.organization_id' },
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
      and to_regclass('public.portal_configuration_versions') is not null
      and to_regclass('public.form_versions') is not null
      and to_regclass('public.review_workflow_versions') is not null
      and to_regclass('public.opportunity_configuration_versions') is not null
      and to_regclass('public.organization_review_settings') is not null
      and not exists (
        select 1 from (values
          ('entities','revision'),('programs','revision'),('open_calls','revision'),
          ('submission_paths','revision'),('submissions','revision'),('works','revision'),
          ('submission_drafts','revision'),('submission_drafts','form_version_id'),
          ('submission_drafts','opportunity_configuration_version_id'),('submission_drafts','recovery_receipt_id'),
          ('submissions','portal_configuration_version_id'),('submissions','form_version_id'),
          ('submissions','opportunity_configuration_version_id'),('submissions','review_workflow_version_id'),
          ('review_rounds','revision'),('review_assignments','revision'),
          ('decisions','revision'),('delivery_tasks','revision'),
          ('audit_events','correlation_id'),('outbox_events','event_key')
        ) required(table_name,column_name)
        where not exists (select 1 from information_schema.columns c
          where c.table_schema='public' and c.table_name=required.table_name and c.column_name=required.column_name)
      ) as ready`);
    return { authority: 'relational', schemaReady: result.rows[0]?.ready === true };
  }

  async organizationReviewSettings(organizationId: string): Promise<RelationalOrganizationReviewSettingsView> {
    const result = await this.pool.query<{ organization_id: string; blind_mode: OrganizationBlindMode; revision: number; updated_at: Date }>(
      "select organization_id,blind_mode,revision,updated_at from organization_review_settings where organization_id=$1",
      [organizationId],
    );
    const row = result.rows[0];
    if (!row) {
      return { organizationId, blindMode: 'identity-redacted', revision: 1, updatedAt: new Date(0).toISOString() };
    }
    return { organizationId: row.organization_id, blindMode: row.blind_mode, revision: row.revision, updatedAt: row.updated_at.toISOString() };
  }

  async updateOrganizationReviewSettings(envelope: WorkspaceCommandEnvelope, blindMode: OrganizationBlindMode): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { blindMode }, async (client) => {
      const organizationId = envelope.organizationId!;
      await client.query('select id from radar_organizations where id=$1 for update', [organizationId]);
      const current = await client.query<{ revision: number }>('select revision from organization_review_settings where organization_id=$1 for update', [organizationId]);
      const revision = current.rows[0]?.revision ?? 0;
      if (envelope.expectedRevision !== undefined && revision > 0 && envelope.expectedRevision !== revision) {
        throw new WorkspaceConflictError('organization_review_settings', organizationId, envelope.expectedRevision, revision || null);
      }
      const nextRevision = revision + 1;
      await client.query(`insert into organization_review_settings (organization_id,blind_mode,revision,updated_at)
        values ($1,$2,$3,now()) on conflict (organization_id) do update set blind_mode=excluded.blind_mode,revision=excluded.revision,updated_at=excluded.updated_at`,
      [organizationId, blindMode, nextRevision]);
      await this.effect(client, envelope, 'organization_review_settings.updated', 'organization_review_settings', organizationId, nextRevision, { blindMode });
      return { resourceType: 'organization_review_settings', resourceId: organizationId, revision: nextRevision };
    });
  }

  async portalConfiguration(organizationId: string, id: string): Promise<RelationalPortalConfigurationView | undefined> {
    const result = await this.pool.query<{
      id: string;
      organization_id: string;
      version: number;
      status: ConfigurationStatus;
      configuration: unknown;
      revision: number;
      created_at: Date;
      published_at: Date | null;
      supersedes_version_id: string | null;
    }>('select * from portal_configuration_versions where id=$1 and organization_id=$2', [id, organizationId]);
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      organizationId: row.organization_id,
      version: row.version,
      status: row.status,
      configuration: portalConfigurationFromDatabase(row.configuration),
      revision: row.revision,
      createdAt: row.created_at.toISOString(),
      ...(row.published_at ? { publishedAt: row.published_at.toISOString() } : {}),
      ...(row.supersedes_version_id ? { supersedesVersionId: row.supersedes_version_id } : {}),
    };
  }

  async publishedPortalConfiguration(organizationId: string): Promise<RelationalPortalConfigurationView | undefined> {
    const result = await this.pool.query<{ id: string }>("select id from portal_configuration_versions where organization_id=$1 and status='published'", [organizationId]);
    return result.rows[0] ? this.portalConfiguration(organizationId, result.rows[0].id) : undefined;
  }

  async portalConfigurationsForOrganization(organizationId: string): Promise<RelationalPortalConfigurationView[]> {
    const result = await this.pool.query<{ id: string }>('select id from portal_configuration_versions where organization_id=$1 order by version desc', [organizationId]);
    const configurations = await Promise.all(result.rows.map((row) => this.portalConfiguration(organizationId, row.id)));
    return configurations.filter((configuration): configuration is RelationalPortalConfigurationView => configuration !== undefined);
  }

  async formVersionsForOrganization(organizationId: string): Promise<RelationalFormVersionView[]> {
    const result = await this.pool.query<{
      id: string; organization_id: string; definition_key: string; version: number; status: ConfigurationStatus;
      definition: FormDefinition; revision: number; created_at: Date; published_at: Date | null; supersedes_version_id: string | null;
    }>('select * from form_versions where organization_id=$1 order by definition_key,version desc', [organizationId]);
    return result.rows.map((row) => ({
      id: row.id, organizationId: row.organization_id, definitionKey: row.definition_key, version: row.version,
      status: row.status, definition: row.definition, revision: row.revision, createdAt: row.created_at.toISOString(),
      ...(row.published_at ? { publishedAt: row.published_at.toISOString() } : {}),
      ...(row.supersedes_version_id ? { supersedesVersionId: row.supersedes_version_id } : {}),
    }));
  }

  async reviewWorkflowVersionsForOpenCall(organizationId: string, openCallId: string): Promise<RelationalReviewWorkflowVersionView[]> {
    const result = await this.pool.query<{
      id: string; organization_id: string; open_call_id: string; version: number; status: ConfigurationStatus;
      definition: ReviewWorkflowDefinition; revision: number; created_at: Date; published_at: Date | null; supersedes_version_id: string | null;
    }>('select * from review_workflow_versions where organization_id=$1 and open_call_id=$2 order by version desc', [organizationId, openCallId]);
    return result.rows.map((row) => ({
      id: row.id, organizationId: row.organization_id, openCallId: row.open_call_id, version: row.version,
      status: row.status, definition: row.definition, revision: row.revision, createdAt: row.created_at.toISOString(),
      ...(row.published_at ? { publishedAt: row.published_at.toISOString() } : {}),
      ...(row.supersedes_version_id ? { supersedesVersionId: row.supersedes_version_id } : {}),
    }));
  }

  async opportunityConfigurationVersionsForOpenCall(organizationId: string, openCallId: string): Promise<RelationalOpportunityConfigurationVersionView[]> {
    const result = await this.pool.query<{
      id: string; organization_id: string; open_call_id: string; version: number; status: ConfigurationStatus;
      configuration: OpportunityConfiguration; revision: number; created_at: Date; published_at: Date | null; supersedes_version_id: string | null;
    }>('select * from opportunity_configuration_versions where organization_id=$1 and open_call_id=$2 order by version desc', [organizationId, openCallId]);
    return result.rows.map((row) => ({
      id: row.id, organizationId: row.organization_id, openCallId: row.open_call_id, version: row.version,
      status: row.status, configuration: row.configuration, revision: row.revision, createdAt: row.created_at.toISOString(),
      ...(row.published_at ? { publishedAt: row.published_at.toISOString() } : {}),
      ...(row.supersedes_version_id ? { supersedesVersionId: row.supersedes_version_id } : {}),
    }));
  }

  async createPortalConfiguration(envelope: WorkspaceCommandEnvelope, configuration: PortalConfiguration): Promise<WorkspaceCommandResult> {
    return this.command(envelope, configuration, async (client) => {
      const organizationId = envelope.organizationId!;
      await client.query('select id from radar_organizations where id=$1 for update', [organizationId]);
      const versionResult = await client.query<{ version: number }>('select coalesce(max(version),0)+1 version from portal_configuration_versions where organization_id=$1', [organizationId]);
      const id = randomUUID();
      const version = versionResult.rows[0]!.version;
      const row = await client.query<{ revision: number }>('insert into portal_configuration_versions (id,organization_id,version,configuration) values ($1,$2,$3,$4) returning revision', [id, organizationId, version, configuration]);
      await this.effect(client, envelope, 'portal_configuration.created', 'portal_configuration', id, row.rows[0]!.revision, { version });
      return { resourceType: 'portal_configuration', resourceId: id, revision: row.rows[0]!.revision };
    });
  }

  async createFormVersion(envelope: WorkspaceCommandEnvelope, input: { definitionKey: string; definition: FormDefinition }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      await client.query('select id from radar_organizations where id=$1 for update', [envelope.organizationId]);
      const next = await client.query<{ version: number }>('select coalesce(max(version),0)+1 version from form_versions where organization_id=$1 and definition_key=$2', [envelope.organizationId, input.definitionKey]);
      const id = randomUUID();
      const version = next.rows[0]!.version;
      const row = await client.query<{ revision: number }>('insert into form_versions (id,organization_id,definition_key,version,definition) values ($1,$2,$3,$4,$5) returning revision', [id, envelope.organizationId, input.definitionKey, version, input.definition]);
      await this.effect(client, envelope, 'form_version.created', 'form_version', id, row.rows[0]!.revision, { definitionKey: input.definitionKey, version });
      return { resourceType: 'form_version', resourceId: id, revision: row.rows[0]!.revision };
    });
  }

  async createReviewWorkflowVersion(envelope: WorkspaceCommandEnvelope, input: { openCallId: string; definition: ReviewWorkflowDefinition }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      if (await this.currentRevision(client, envelope.organizationId!, 'open_call', input.openCallId) === null) throw new WorkspaceNotFoundError();
      const next = await client.query<{ version: number }>('select coalesce(max(version),0)+1 version from review_workflow_versions where open_call_id=$1', [input.openCallId]);
      const id = randomUUID();
      const version = next.rows[0]!.version;
      const row = await client.query<{ revision: number }>('insert into review_workflow_versions (id,organization_id,open_call_id,version,definition) values ($1,$2,$3,$4,$5) returning revision', [id, envelope.organizationId, input.openCallId, version, input.definition]);
      await this.effect(client, envelope, 'review_workflow_version.created', 'review_workflow_version', id, row.rows[0]!.revision, { openCallId: input.openCallId, version });
      return { resourceType: 'review_workflow_version', resourceId: id, revision: row.rows[0]!.revision };
    });
  }

  async createOpportunityConfigurationVersion(envelope: WorkspaceCommandEnvelope, input: { openCallId: string; configuration: OpportunityConfiguration }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      if (await this.currentRevision(client, envelope.organizationId!, 'open_call', input.openCallId) === null) throw new WorkspaceNotFoundError();
      const next = await client.query<{ version: number }>('select coalesce(max(version),0)+1 version from opportunity_configuration_versions where open_call_id=$1', [input.openCallId]);
      const id = randomUUID();
      const version = next.rows[0]!.version;
      const row = await client.query<{ revision: number }>('insert into opportunity_configuration_versions (id,organization_id,open_call_id,version,configuration) values ($1,$2,$3,$4,$5) returning revision', [id, envelope.organizationId, input.openCallId, version, input.configuration]);
      await this.effect(client, envelope, 'opportunity_configuration_version.created', 'opportunity_configuration_version', id, row.rows[0]!.revision, { openCallId: input.openCallId, version });
      return { resourceType: 'opportunity_configuration_version', resourceId: id, revision: row.rows[0]!.revision };
    });
  }

  async updateFormVersion(envelope: WorkspaceCommandEnvelope, id: string, definition: FormDefinition): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id, definition }, async (client) => {
      const current = await client.query<{ status: ConfigurationStatus }>('select status from form_versions where id=$1 and organization_id=$2', [id, envelope.organizationId]);
      if (!current.rows[0]) throw new WorkspaceNotFoundError();
      if (current.rows[0].status === 'published' || current.rows[0].status === 'superseded' || current.rows[0].status === 'archived') throw new WorkspaceTransitionError('Published forms are immutable');
      const row = await this.mutateRevision(client, envelope, 'form_version', id, 'definition=$1', [definition]);
      const revision = row.revision;
      await this.effect(client, envelope, 'form_version.updated', 'form_version', id, revision);
      return { resourceType: 'form_version', resourceId: id, revision };
    });
  }

  async transitionFormVersion(envelope: WorkspaceCommandEnvelope, id: string, status: ConfigurationStatus): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id, status }, async (client) => {
      const current = await client.query<{ status: ConfigurationStatus; definition_key: string }>('select status,definition_key from form_versions where id=$1 and organization_id=$2', [id, envelope.organizationId]);
      const form = current.rows[0];
      if (!form) throw new WorkspaceNotFoundError();
      if (!canTransitionConfiguration(form.status, status)) throw new WorkspaceTransitionError(`Form cannot transition from ${form.status} to ${status}`);
      if (status === 'published') {
        const superseded = await client.query<{ id: string; revision: number }>("update form_versions set status='superseded',revision=revision+1,updated_at=now() where organization_id=$1 and definition_key=$2 and status='published' returning id,revision", [envelope.organizationId, form.definition_key]);
        for (const prior of superseded.rows) await this.effect(client, envelope, 'form_version.superseded', 'form_version', prior.id, prior.revision);
      }
      const row = await this.mutateRevision(client, envelope, 'form_version', id, `status=$1${status === 'published' ? ', published_at=now()' : ''}`, [status]);
      const revision = row.revision;
      await this.effect(client, envelope, `form_version.${status}`, 'form_version', id, revision);
      return { resourceType: 'form_version', resourceId: id, revision };
    });
  }

  async updateReviewWorkflowVersion(envelope: WorkspaceCommandEnvelope, id: string, definition: ReviewWorkflowDefinition): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id, definition }, async (client) => {
      const current = await client.query<{ status: ConfigurationStatus }>('select status from review_workflow_versions where id=$1 and organization_id=$2', [id, envelope.organizationId]);
      if (!current.rows[0]) throw new WorkspaceNotFoundError();
      if (current.rows[0].status === 'published' || current.rows[0].status === 'superseded' || current.rows[0].status === 'archived') throw new WorkspaceTransitionError('Published review workflows are immutable');
      const row = await this.mutateRevision(client, envelope, 'review_workflow_version', id, 'definition=$1', [definition]);
      const revision = row.revision;
      await this.effect(client, envelope, 'review_workflow_version.updated', 'review_workflow_version', id, revision);
      return { resourceType: 'review_workflow_version', resourceId: id, revision };
    });
  }

  async transitionReviewWorkflowVersion(envelope: WorkspaceCommandEnvelope, id: string, status: ConfigurationStatus): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id, status }, async (client) => {
      const current = await client.query<{ status: ConfigurationStatus; open_call_id: string }>('select status,open_call_id from review_workflow_versions where id=$1 and organization_id=$2', [id, envelope.organizationId]);
      const workflow = current.rows[0];
      if (!workflow) throw new WorkspaceNotFoundError();
      if (!canTransitionConfiguration(workflow.status, status)) throw new WorkspaceTransitionError(`Review workflow cannot transition from ${workflow.status} to ${status}`);
      if (status === 'published') {
        const superseded = await client.query<{ id: string; revision: number }>("update review_workflow_versions set status='superseded',revision=revision+1,updated_at=now() where open_call_id=$1 and status='published' returning id,revision", [workflow.open_call_id]);
        for (const prior of superseded.rows) await this.effect(client, envelope, 'review_workflow_version.superseded', 'review_workflow_version', prior.id, prior.revision);
      }
      const row = await this.mutateRevision(client, envelope, 'review_workflow_version', id, `status=$1${status === 'published' ? ', published_at=now()' : ''}`, [status]);
      const revision = row.revision;
      await this.effect(client, envelope, `review_workflow_version.${status}`, 'review_workflow_version', id, revision);
      return { resourceType: 'review_workflow_version', resourceId: id, revision };
    });
  }

  async updateOpportunityConfigurationVersion(envelope: WorkspaceCommandEnvelope, id: string, configuration: OpportunityConfiguration): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id, configuration }, async (client) => {
      const current = await client.query<{ status: ConfigurationStatus }>('select status from opportunity_configuration_versions where id=$1 and organization_id=$2', [id, envelope.organizationId]);
      if (!current.rows[0]) throw new WorkspaceNotFoundError();
      if (current.rows[0].status === 'published' || current.rows[0].status === 'superseded' || current.rows[0].status === 'archived') throw new WorkspaceTransitionError('Published opportunity configurations are immutable');
      const row = await this.mutateRevision(client, envelope, 'opportunity_configuration_version', id, 'configuration=$1', [configuration]);
      const revision = row.revision;
      await this.effect(client, envelope, 'opportunity_configuration_version.updated', 'opportunity_configuration_version', id, revision);
      return { resourceType: 'opportunity_configuration_version', resourceId: id, revision };
    });
  }

  async transitionOpportunityConfigurationVersion(envelope: WorkspaceCommandEnvelope, id: string, status: ConfigurationStatus): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id, status }, async (client) => {
      const current = await client.query<{ status: ConfigurationStatus; open_call_id: string }>('select status,open_call_id from opportunity_configuration_versions where id=$1 and organization_id=$2', [id, envelope.organizationId]);
      const configuration = current.rows[0];
      if (!configuration) throw new WorkspaceNotFoundError();
      if (!canTransitionConfiguration(configuration.status, status)) throw new WorkspaceTransitionError(`Opportunity configuration cannot transition from ${configuration.status} to ${status}`);
      if (status === 'published') {
        const superseded = await client.query<{ id: string; revision: number }>("update opportunity_configuration_versions set status='superseded',revision=revision+1,updated_at=now() where open_call_id=$1 and status='published' returning id,revision", [configuration.open_call_id]);
        for (const prior of superseded.rows) await this.effect(client, envelope, 'opportunity_configuration_version.superseded', 'opportunity_configuration_version', prior.id, prior.revision);
      }
      const row = await this.mutateRevision(client, envelope, 'opportunity_configuration_version', id, `status=$1${status === 'published' ? ', published_at=now()' : ''}`, [status]);
      const revision = row.revision;
      await this.effect(client, envelope, `opportunity_configuration_version.${status}`, 'opportunity_configuration_version', id, revision);
      return { resourceType: 'opportunity_configuration_version', resourceId: id, revision };
    });
  }

  async updatePortalConfiguration(envelope: WorkspaceCommandEnvelope, id: string, configuration: PortalConfiguration): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id, configuration }, async (client) => {
      const current = await client.query<{ status: ConfigurationStatus }>('select status from portal_configuration_versions where id=$1 and organization_id=$2', [id, envelope.organizationId]);
      if (!current.rows[0]) throw new WorkspaceNotFoundError();
      if (current.rows[0].status === 'published' || current.rows[0].status === 'superseded' || current.rows[0].status === 'archived') throw new WorkspaceTransitionError('Published portal configurations are immutable');
      const row = await this.mutateRevision(client, envelope, 'portal_configuration', id, 'configuration=$1', [configuration]);
      const revision = row.revision;
      await this.effect(client, envelope, 'portal_configuration.updated', 'portal_configuration', id, revision);
      return { resourceType: 'portal_configuration', resourceId: id, revision };
    });
  }

  async transitionPortalConfiguration(envelope: WorkspaceCommandEnvelope, id: string, status: ConfigurationStatus): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id, status }, async (client) => {
      const current = await client.query<{ status: ConfigurationStatus }>('select status from portal_configuration_versions where id=$1 and organization_id=$2', [id, envelope.organizationId]);
      const from = current.rows[0]?.status;
      if (!from) throw new WorkspaceNotFoundError();
      if (!canTransitionConfiguration(from, status)) throw new WorkspaceTransitionError(`Portal configuration cannot transition from ${from} to ${status}`);
      if (status === 'published') {
        const superseded = await client.query<{ id: string; revision: number }>("update portal_configuration_versions set status='superseded',revision=revision+1,updated_at=now() where organization_id=$1 and status='published' returning id,revision", [envelope.organizationId]);
        for (const prior of superseded.rows) await this.effect(client, envelope, 'portal_configuration.superseded', 'portal_configuration', prior.id, prior.revision);
      }
      const publishedSql = status === 'published' ? ', published_at=now()' : '';
      const row = await this.mutateRevision(client, envelope, 'portal_configuration', id, `status=$1${publishedSql}`, [status]);
      const revision = row.revision;
      await this.effect(client, envelope, `portal_configuration.${status}`, 'portal_configuration', id, revision);
      return { resourceType: 'portal_configuration', resourceId: id, revision };
    });
  }

  async rollbackPortalConfiguration(envelope: WorkspaceCommandEnvelope, sourceId: string): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { sourceId }, async (client) => {
      const source = await client.query<{ configuration: unknown; status: ConfigurationStatus }>('select configuration,status from portal_configuration_versions where id=$1 and organization_id=$2', [sourceId, envelope.organizationId]);
      if (!source.rows[0]) throw new WorkspaceNotFoundError();
      if (source.rows[0].status === 'draft' || source.rows[0].status === 'in-review' || source.rows[0].status === 'approved') throw new WorkspaceTransitionError('Only a previously published portal configuration can be restored');
      await client.query('select id from radar_organizations where id=$1 for update', [envelope.organizationId]);
      const versionResult = await client.query<{ version: number }>('select coalesce(max(version),0)+1 version from portal_configuration_versions where organization_id=$1', [envelope.organizationId]);
      const superseded = await client.query<{ id: string; revision: number }>("update portal_configuration_versions set status='superseded',revision=revision+1,updated_at=now() where organization_id=$1 and status='published' returning id,revision", [envelope.organizationId]);
      for (const prior of superseded.rows) await this.effect(client, envelope, 'portal_configuration.superseded', 'portal_configuration', prior.id, prior.revision);
      const id = randomUUID();
      const version = versionResult.rows[0]!.version;
      const configuration = portalConfigurationFromDatabase(source.rows[0].configuration);
      const row = await client.query<{ revision: number }>("insert into portal_configuration_versions (id,organization_id,version,status,configuration,supersedes_version_id,published_at) values ($1,$2,$3,'published',$4,$5,now()) returning revision", [id, envelope.organizationId, version, configuration, sourceId]);
      await this.effect(client, envelope, 'portal_configuration.rollback-published', 'portal_configuration', id, row.rows[0]!.revision, { version, sourceId });
      return { resourceType: 'portal_configuration', resourceId: id, revision: row.rows[0]!.revision };
    });
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
    const result = await this.pool.query<RelationalOpenCallView>(`select o.id,o.program_id "programId",o.title,o.status,o.radar_opportunity_id "radarOpportunityId",o.guideline_text "guidelineText",o.revision
      from open_calls o join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where e.organization_id=$1 order by o.created_at,o.id`, [organizationId]);
    return result.rows;
  }

  async publishedOpenCallsForPortal(organizationId: string): Promise<RelationalPublicOpenCallView[]> {
    const result = await this.pool.query<{
      id: string;
      title: string;
      radar_opportunity_id: string | null;
      has_hosted_form: boolean;
    }>(`select o.id,o.title,o.radar_opportunity_id,
      exists(select 1 from submission_paths sp where sp.open_call_id=o.id) has_hosted_form
      from open_calls o join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where e.organization_id=$1 and o.status='published' order by o.published_at desc nulls last,o.created_at desc,o.id`, [organizationId]);
    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      hasHostedForm: row.has_hosted_form,
      ...(row.radar_opportunity_id ? { radarOpportunityId: row.radar_opportunity_id } : {}),
    }));
  }

  async reviewRoundsForOpenCall(organizationId: string, openCallId: string): Promise<RelationalReviewRoundView[]> {
    const result = await this.pool.query<RelationalReviewRoundView>(`select rr.id,rr.open_call_id "openCallId",rr.name,rr.revision from review_rounds rr
      join open_calls o on o.id=rr.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where rr.open_call_id=$1 and e.organization_id=$2 order by rr.created_at,rr.id`, [openCallId, organizationId]);
    return result.rows;
  }

  async reviewerGroupsForOrganization(organizationId: string): Promise<RelationalReviewerGroupView[]> {
    const result = await this.pool.query<{ id: string; organization_id: string; name: string; workload_limit: number | null; member_count: string; open_assignment_count: string; revision: number }>(`select rg.id,rg.organization_id,rg.name,rg.workload_limit,rg.revision,
      count(distinct rgm.reviewer_account_id)::text member_count,
      count(ra.id) filter (where ra.completed_at is null)::text open_assignment_count
      from reviewer_groups rg left join reviewer_group_members rgm on rgm.group_id=rg.id
      left join review_assignments ra on ra.reviewer_group_id=rg.id
      where rg.organization_id=$1 group by rg.id order by rg.created_at,rg.id`, [organizationId]);
    return result.rows.map((row) => ({ id: row.id, organizationId: row.organization_id, name: row.name, ...(row.workload_limit === null ? {} : { workloadLimit: row.workload_limit }), memberCount: Number(row.member_count), openAssignmentCount: Number(row.open_assignment_count), revision: row.revision }));
  }

  async createReviewerGroup(envelope: WorkspaceCommandEnvelope, input: { name: string; workloadLimit?: number }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      const id = randomUUID();
      const row = await client.query<{ revision: number }>('insert into reviewer_groups (id,organization_id,name,workload_limit) values ($1,$2,$3,$4) returning revision', [id, envelope.organizationId, input.name, input.workloadLimit ?? null]);
      await this.effect(client, envelope, 'reviewer_group.created', 'reviewer_group', id, row.rows[0]!.revision, input);
      return { resourceType: 'reviewer_group', resourceId: id, revision: row.rows[0]!.revision };
    });
  }

  async createDecisionMessageDraft(envelope: WorkspaceCommandEnvelope, input: { decisionId: string; recipientAccountId: string; subject: string; body: string }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      const decision = await client.query<{ id: string }>(`select d.id from decisions d join works w on w.id=d.work_id join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where d.id=$1 and e.organization_id=$2`, [input.decisionId, envelope.organizationId]);
      if (!decision.rows[0]) throw new WorkspaceNotFoundError();
      const id = randomUUID();
      const row = await client.query<{ revision: number }>('insert into decision_message_drafts (id,organization_id,decision_id,recipient_account_id,subject,body) values ($1,$2,$3,$4,$5,$6) returning revision', [id, envelope.organizationId, input.decisionId, input.recipientAccountId, input.subject, input.body]);
      await this.effect(client, envelope, 'decision_message_draft.created', 'decision_message_draft', id, row.rows[0]!.revision, { decisionId: input.decisionId });
      return { resourceType: 'decision_message_draft', resourceId: id, revision: row.rows[0]!.revision };
    });
  }

  async transitionDecisionMessageDraft(envelope: WorkspaceCommandEnvelope, id: string, status: 'approved' | 'scheduled'): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { id, status }, async (client) => {
      const current = await client.query<{ status: string; revision: number }>('select status,revision from decision_message_drafts where id=$1 and organization_id=$2 for update', [id, envelope.organizationId]);
      const draft = current.rows[0];
      if (!draft) throw new WorkspaceNotFoundError();
      if (draft.status !== 'draft' && !(draft.status === 'approved' && status === 'scheduled')) throw new WorkspaceTransitionError(`Message draft cannot transition from ${draft.status} to ${status}`);
      if (envelope.expectedRevision !== undefined && draft.revision !== envelope.expectedRevision) throw new WorkspaceConflictError('decision_message_draft', id, envelope.expectedRevision, draft.revision);
      const revision = draft.revision + 1;
      await client.query('update decision_message_drafts set status=$1,revision=$2,updated_at=now() where id=$3', [status, revision, id]);
      await this.effect(client, envelope, `decision_message_draft.${status}`, 'decision_message_draft', id, revision, {});
      return { resourceType: 'decision_message_draft', resourceId: id, revision };
    });
  }

  async recordMessageDeliveryAttempt(envelope: WorkspaceCommandEnvelope, input: { messageDraftId: string; providerStatus: 'accepted' | 'delivered' | 'failed'; providerReference?: string; errorCode?: string; retryAt?: string }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      const draft = await client.query<{ id: string }>('select id from decision_message_drafts where id=$1 and organization_id=$2', [input.messageDraftId, envelope.organizationId]);
      if (!draft.rows[0]) throw new WorkspaceNotFoundError();
      const next = await client.query<{ attempt_number: number }>('select coalesce(max(attempt_number),0)+1 attempt_number from message_delivery_attempts where message_draft_id=$1', [input.messageDraftId]);
      const attemptNumber = next.rows[0]!.attempt_number;
      const id = randomUUID();
      await client.query('insert into message_delivery_attempts (id,organization_id,message_draft_id,attempt_number,provider_status,provider_reference,error_code,retry_at) values ($1,$2,$3,$4,$5,$6,$7,$8)', [id, envelope.organizationId, input.messageDraftId, attemptNumber, input.providerStatus, input.providerReference ?? null, input.errorCode ?? null, input.retryAt ?? null]);
      await this.effect(client, envelope, 'message_delivery_attempt.recorded', 'message_delivery_attempt', id, attemptNumber, { messageDraftId: input.messageDraftId, providerStatus: input.providerStatus });
      return { resourceType: 'message_delivery_attempt', resourceId: id, revision: attemptNumber };
    });
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
      count(*) over (partition by ra.reviewer_account_id) "assignmentCount",
      count(*) filter (where ra.completed_at is null) over (partition by ra.reviewer_account_id) "openAssignmentCount",
      jsonb_build_object('id',s.id,'submissionPathId',s.submission_path_id,'status',s.status,'submittedAt',s.submitted_at,'revision',s.revision) submission,
      coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'submissionId',w.submission_id,'title',w.title,'order',w."order",'revision',w.revision) order by w."order") from works w where w.submission_id=s.id),'[]'::jsonb) works,
      case when rec.review_assignment_id is null then null else jsonb_build_object('reviewAssignmentId',rec.review_assignment_id,'score',rec.score,'notes',rec.notes,'recordedAt',rec.recorded_at) end recommendation
      from review_assignments ra join submissions s on s.id=ra.submission_id
      left join review_recommendations rec on rec.review_assignment_id=ra.id
      where ra.reviewer_account_id=$1 order by ra.created_at,ra.id`, [reviewerAccountId]);
    return result.rows;
  }

  async reviewAssignmentsForSubmission(organizationId: string, submissionId: string): Promise<Row[]> {
    const result = await this.pool.query<Row>(`select ra.id,ra.review_round_id "reviewRoundId",ra.submission_id "submissionId",
      ra.reviewer_account_id "reviewerAccountId",ra.completed_at "completedAt",ra.revision,
      case when rec.review_assignment_id is null then null else jsonb_build_object('reviewAssignmentId',rec.review_assignment_id,'score',rec.score,'notes',rec.notes,'recordedAt',rec.recorded_at) end recommendation
      from review_assignments ra join review_rounds rr on rr.id=ra.review_round_id join open_calls o on o.id=rr.open_call_id
      join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      left join review_recommendations rec on rec.review_assignment_id=ra.id
      where ra.submission_id=$1 and e.organization_id=$2 order by ra.created_at,ra.id`, [submissionId, organizationId]);
    return result.rows;
  }

  async recommendationForAssignment(assignmentId: string, organizationId?: string): Promise<Row | undefined> {
    const result = await this.pool.query<Row>(`select rec.review_assignment_id "reviewAssignmentId",rec.score,rec.notes,rec.recorded_at "recordedAt"
      from review_recommendations rec join review_assignments ra on ra.id=rec.review_assignment_id
      join review_rounds rr on rr.id=ra.review_round_id join open_calls o on o.id=rr.open_call_id
      join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where rec.review_assignment_id=$1${organizationId ? ' and e.organization_id=$2' : ''}`, organizationId ? [assignmentId, organizationId] : [assignmentId]);
    return result.rows[0];
  }

  async publicSubmissionPath(id: string): Promise<RelationalPublicSubmissionPathView | undefined> {
    const result = await this.pool.query<{
      id: string; open_call_id: string; categories: string[]; fields: SubmissionField[]; fee_cents: number | null; revision: number;
      open_call_title: string; radar_opportunity_id: string | null; organization_id: string;
    }>(`select sp.id,sp.open_call_id,sp.categories,sp.fields,sp.fee_cents,sp.revision,
      o.title open_call_title,o.radar_opportunity_id,e.organization_id
      from submission_paths sp join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where sp.id=$1 and o.status='published'`, [id]);
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id, openCallId: row.open_call_id, openCallTitle: row.open_call_title, organizationId: row.organization_id,
      categories: row.categories, fields: row.fields, revision: row.revision,
      ...(row.fee_cents !== null ? { feeCents: row.fee_cents } : {}),
      ...(row.radar_opportunity_id ? { radarOpportunityId: row.radar_opportunity_id } : {}),
    };
  }

  async publicSubmissionPathForOpenCall(organizationId: string, openCallId: string): Promise<RelationalPublicSubmissionPathView | undefined> {
    const result = await this.pool.query<{ id: string }>(`select sp.id from submission_paths sp join open_calls o on o.id=sp.open_call_id
      join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where sp.open_call_id=$1 and e.organization_id=$2 and o.status='published' order by sp.created_at,sp.id limit 1`, [openCallId, organizationId]);
    return result.rows[0] ? this.publicSubmissionPath(result.rows[0].id) : undefined;
  }

  async submissionDraftForOwner(submissionPathId: string, submitterAccountId: string): Promise<RelationalSubmissionDraftView | undefined> {
    const result = await this.pool.query<{
      id: string; submission_path_id: string; submitter_account_id: string; answers: Record<string, string | string[]>;
      category: string | null; work_titles: string[]; payment_session_id: string | null; form_version_id: string | null;
      opportunity_configuration_version_id: string | null; section_progress: string[]; recovery_receipt_id: string;
      revision: number; updated_at: Date; expires_at: Date;
    }>(`select id,submission_path_id,submitter_account_id,answers,category,work_titles,payment_session_id,form_version_id,
      opportunity_configuration_version_id,section_progress,recovery_receipt_id,revision,updated_at,expires_at
      from submission_drafts where submission_path_id=$1 and submitter_account_id=$2 and expires_at>now()`, [submissionPathId, submitterAccountId]);
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id, submissionPathId: row.submission_path_id, submitterAccountId: row.submitter_account_id,
      answers: row.answers, workTitles: row.work_titles, sectionProgress: row.section_progress,
      recoveryReceiptId: row.recovery_receipt_id, revision: row.revision,
      updatedAt: row.updated_at.toISOString(), expiresAt: row.expires_at.toISOString(),
      ...(row.category ? { category: row.category } : {}),
      ...(row.payment_session_id ? { paymentSessionId: row.payment_session_id } : {}),
      ...(row.form_version_id ? { formVersionId: row.form_version_id } : {}),
      ...(row.opportunity_configuration_version_id ? { opportunityConfigurationVersionId: row.opportunity_configuration_version_id } : {}),
    };
  }

  async saveSubmissionDraft(envelope: WorkspaceCommandEnvelope, input: {
    submissionPathId: string;
    answers: Record<string, string | string[]>;
    workTitles: string[];
    sectionProgress: string[];
    category?: string;
    paymentSessionId?: string;
  }): Promise<WorkspaceCommandResult> {
    return this.command(envelope, input, async (client) => {
      const path = await client.query<{ organization_id: string; opportunity_configuration_version_id: string | null; form_version_id: string | null }>(`select e.organization_id,
        oc.id opportunity_configuration_version_id,fv.id form_version_id
        from submission_paths sp join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
        left join opportunity_configuration_versions oc on oc.open_call_id=o.id and oc.status='published'
        left join form_versions fv on fv.id=(oc.configuration->>'applicationFormVersionId')::uuid and fv.status='published'
        where sp.id=$1 and o.status='published' for update of sp`, [input.submissionPathId]);
      if (!path.rows[0]) throw new WorkspaceNotFoundError();
      const existing = await client.query<{ id: string; revision: number }>('select id,revision from submission_drafts where submission_path_id=$1 and submitter_account_id=$2 for update', [input.submissionPathId, envelope.ownerAccountId]);
      const draft = existing.rows[0];
      if (draft && draft.revision !== envelope.expectedRevision) throw new WorkspaceConflictError('submission_draft', draft.id, envelope.expectedRevision ?? 0, draft.revision);
      const id = draft?.id ?? randomUUID();
      let revision: number;
      if (draft) {
        const changed = await client.query<{ revision: number }>(`update submission_drafts set answers=$1,category=$2,work_titles=$3,payment_session_id=$4,
          section_progress=$5,revision=revision+1,updated_at=now(),expires_at=now()+interval '30 days' where id=$6 and revision=$7 returning revision`,
        [JSON.stringify(input.answers), input.category ?? null, JSON.stringify(input.workTitles), input.paymentSessionId ?? null, JSON.stringify(input.sectionProgress), id, envelope.expectedRevision]);
        revision = changed.rows[0]!.revision;
      } else {
        const inserted = await client.query<{ revision: number }>(`insert into submission_drafts
          (id,submission_path_id,submitter_account_id,answers,category,work_titles,payment_session_id,form_version_id,opportunity_configuration_version_id,section_progress,updated_at,expires_at)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now()+interval '30 days') returning revision`,
        [id, input.submissionPathId, envelope.ownerAccountId, JSON.stringify(input.answers), input.category ?? null, JSON.stringify(input.workTitles), input.paymentSessionId ?? null,
          path.rows[0].form_version_id, path.rows[0].opportunity_configuration_version_id, JSON.stringify(input.sectionProgress)]);
        revision = inserted.rows[0]!.revision;
      }
      await this.effect(client, envelope, draft ? 'submission_draft.saved' : 'submission_draft.created', 'submission_draft', id, revision, { sectionProgress: input.sectionProgress }, path.rows[0].organization_id);
      return { resourceType: 'submission_draft', resourceId: id, revision };
    });
  }

  async deleteSubmissionDraft(envelope: WorkspaceCommandEnvelope, submissionPathId: string): Promise<WorkspaceCommandResult> {
    return this.command(envelope, { submissionPathId }, async (client) => {
      const current = await client.query<{ id: string; revision: number; organization_id: string }>(`select d.id,d.revision,e.organization_id from submission_drafts d
        join submission_paths sp on sp.id=d.submission_path_id join open_calls o on o.id=sp.open_call_id
        join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
        where d.submission_path_id=$1 and d.submitter_account_id=$2 for update of d`, [submissionPathId, envelope.ownerAccountId]);
      const draft = current.rows[0];
      if (!draft) throw new WorkspaceNotFoundError();
      if (draft.revision !== envelope.expectedRevision) throw new WorkspaceConflictError('submission_draft', draft.id, envelope.expectedRevision ?? 0, draft.revision);
      await client.query('delete from submission_drafts where id=$1', [draft.id]);
      await this.effect(client, envelope, 'submission_draft.deleted', 'submission_draft', draft.id, draft.revision + 1, {}, draft.organization_id);
      return { resourceType: 'submission_draft', resourceId: draft.id, revision: draft.revision + 1 };
    });
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

  async submissionsForOrganization(organizationId: string): Promise<RelationalOrganizationSubmissionView[]> {
    const result = await this.pool.query<RelationalOrganizationSubmissionView>(`select s.id,s.submission_path_id "submissionPathId",o.id "openCallId",o.title "openCallTitle",
        s.submitter_account_id "submitterAccountId",s.status,s.submitted_at "submittedAt",s.category,s.payment_status "paymentStatus",s.answers,
        coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'title',w.title,'fileUrl',w.file_url,'fileUrls',w.file_urls,'order',w."order") order by w."order",w.id) from works w where w.submission_id=s.id),'[]'::jsonb) works,
        coalesce((select jsonb_agg(jsonb_build_object('id',ra.id,'reviewerAccountId',ra.reviewer_account_id,'completedAt',ra.completed_at) order by ra.id) from review_assignments ra where ra.submission_id=s.id),'[]'::jsonb) assignments,
        coalesce((select jsonb_agg(jsonb_build_object('workId',d.work_id,'outcome',d.outcome) order by d.work_id) from decisions d join works w on w.id=d.work_id where w.submission_id=s.id),'[]'::jsonb) decisions
      from submissions s join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id
      join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
      where e.organization_id=$1 order by s.submitted_at desc,s.id desc`, [organizationId]);
    return result.rows.map((row) => ({ ...row, submittedAt: new Date(row.submittedAt).toISOString() }));
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

  private async mutateRevision(client: PoolClient, envelope: WorkspaceCommandEnvelope, type: WorkspaceResourceType, id: string, setSql: string, values: unknown[]): Promise<{ revision: number }> {
    if (!envelope.organizationId || envelope.expectedRevision === undefined) throw new WorkspaceConflictError(type, id, envelope.expectedRevision ?? 0, null);
    const target = tenantJoins[type];
    const offset = values.length;
    const scopedTable = target.table.replace(/ r$/, ' r2');
    const scopedJoins = target.joins.replaceAll('r.', 'r2.');
    const scopedOrganization = target.organization.replaceAll('r.', 'r2.');
    const result = await client.query<{ revision: number }>(
      `update ${target.table} set ${setSql}, revision=r.revision+1, updated_at=now()
       where r.id=$${offset + 1} and r.revision=$${offset + 3}
       and r.id in (select r2.id from ${scopedTable} ${scopedJoins} where ${scopedOrganization}=$${offset + 2}) returning r.*`,
      [...values, id, envelope.organizationId, envelope.expectedRevision],
    );
    if (result.rowCount === 0) throw new WorkspaceConflictError(type, id, envelope.expectedRevision, await this.currentRevision(client, envelope.organizationId, type, id));
    return result.rows[0]!;
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
      const revision = row.revision;
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
      const revision=row.revision;
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
      const path = await client.query<{
        organization_id: string;
        portal_configuration_version_id: string | null;
        form_version_id: string | null;
        opportunity_configuration_version_id: string | null;
        review_workflow_version_id: string | null;
      }>(`select e.organization_id,pc.id portal_configuration_version_id,
        coalesce(d.form_version_id,fv.id) form_version_id,
        coalesce(d.opportunity_configuration_version_id,oc.id) opportunity_configuration_version_id,
        rw.id review_workflow_version_id from submission_paths sp
        join open_calls o on o.id=sp.open_call_id
        join programs p on p.id=o.program_id join entities e on e.id=p.entity_id
        left join submission_drafts d on d.submission_path_id=sp.id and d.submitter_account_id=$2
        left join portal_configuration_versions pc on pc.organization_id=e.organization_id and pc.status='published'
        left join opportunity_configuration_versions oc on oc.open_call_id=o.id and oc.status='published'
        left join form_versions fv on fv.id=(oc.configuration->>'applicationFormVersionId')::uuid and fv.status='published'
        left join review_workflow_versions rw on rw.id=(oc.configuration->>'reviewWorkflowVersionId')::uuid and rw.status='published'
        where sp.id=$1 and o.status='published' for update of o`, [input.submissionPathId, envelope.ownerAccountId]);
      if (!path.rowCount) throw new WorkspaceNotFoundError();
      const id = input.id ?? randomUUID();
      const row = await client.query<{ revision: number }>(`insert into submissions
        (id,submission_path_id,submitter_account_id,status,payment_status,payment_session_id,fee_cents,idempotency_key,answers,category,
         portal_configuration_version_id,form_version_id,opportunity_configuration_version_id,review_workflow_version_id)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning revision`,
      [id, input.submissionPathId, envelope.ownerAccountId, 'submitted', input.paymentStatus ?? 'not-required', input.paymentSessionId ?? null,
        input.feeCents ?? null, envelope.idempotencyKey, input.answers ? JSON.stringify(input.answers) : null, input.category ?? null,
        path.rows[0].portal_configuration_version_id, path.rows[0].form_version_id,
        path.rows[0].opportunity_configuration_version_id, path.rows[0].review_workflow_version_id]);
      const works: Array<Record<string, unknown>> = [];
      for (const [order, work] of input.works.entries()) {
        const workId = work.id ?? randomUUID();
        const inserted = await client.query<Row>(
          'insert into works (id,submission_id,title,file_url,file_urls,"order") values ($1,$2,$3,$4,$5,$6) returning id,submission_id "submissionId",title,file_url "fileUrl",file_urls "fileUrls","order",revision',
          [workId, id, work.title, work.fileUrl ?? null, work.fileUrls ? JSON.stringify(work.fileUrls) : null, order],
        );
        works.push(inserted.rows[0]!);
      }
      await client.query('delete from submission_drafts where submission_path_id=$1 and submitter_account_id=$2', [input.submissionPathId, envelope.ownerAccountId]);
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
      const revision=row.revision;
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
