import type { Entity, Program, OpenCall, SubmissionPath, SubmissionField, Submission, Work } from './domain/types.js';
import { createStore, nextIdFor, type WorkspaceStore } from './store/store.js';

export interface WorkspaceEngineOptions {
  store?: WorkspaceStore;
  now?: () => string;
}

/**
 * Facade over the Workspace domain, mirroring RadarEngine's shape
 * (packages/radar-engine/src/engine.ts) deliberately -- apps/web's route
 * handlers get one engine object to call, same pattern as the Radar side.
 */
export class WorkspaceEngine {
  readonly store: WorkspaceStore;
  private readonly now: () => string;

  constructor(opts: WorkspaceEngineOptions = {}) {
    this.store = opts.store ?? createStore();
    this.now = opts.now ?? (() => new Date().toISOString());
  }

  createEntity(organizationId: string, name: string, label?: string): Entity {
    const entity: Entity = { id: nextIdFor('entity'), organizationId, name, label, createdAt: this.now() };
    this.store.entities.set(entity.id, entity);
    return entity;
  }

  createProgram(entityId: string, name: string): Program {
    if (!this.store.entities.has(entityId)) throw new Error(`Unknown entity: ${entityId}`);
    const program: Program = { id: nextIdFor('program'), entityId, name, createdAt: this.now() };
    this.store.programs.set(program.id, program);
    return program;
  }

  entitiesForOrganization(organizationId: string): Entity[] {
    return [...this.store.entities.values()].filter((e) => e.organizationId === organizationId);
  }

  programsForEntity(entityId: string): Program[] {
    return [...this.store.programs.values()].filter((p) => p.entityId === entityId);
  }

  createOpenCall(programId: string, title: string, radarOpportunityId?: string): OpenCall {
    if (!this.store.programs.has(programId)) throw new Error(`Unknown program: ${programId}`);
    const openCall: OpenCall = { id: nextIdFor('opencall'), programId, title, status: 'draft', radarOpportunityId, createdAt: this.now() };
    this.store.openCalls.set(openCall.id, openCall);
    return openCall;
  }

  publishOpenCall(openCallId: string): OpenCall {
    const openCall = this.store.openCalls.get(openCallId);
    if (!openCall) throw new Error(`Unknown open call: ${openCallId}`);
    openCall.status = 'published';
    openCall.publishedAt = this.now();
    return openCall;
  }

  openCallsForProgram(programId: string): OpenCall[] {
    return [...this.store.openCalls.values()].filter((o) => o.programId === programId);
  }

  /** Walks Organization -> Entity -> Program -> OpenCall to answer "what's
   * live on this organization's public page" (Story 6.4). */
  publishedOpenCallsForOrganization(organizationId: string): OpenCall[] {
    const entityIds = new Set(this.entitiesForOrganization(organizationId).map((e) => e.id));
    const programIds = new Set([...this.store.programs.values()].filter((p) => entityIds.has(p.entityId)).map((p) => p.id));
    return [...this.store.openCalls.values()].filter((o) => programIds.has(o.programId) && o.status === 'published');
  }

  createSubmissionPath(
    openCallId: string,
    categories: string[],
    fields: Array<Omit<SubmissionField, 'id' | 'order'> & { order?: number }>,
    feeCents?: number
  ): SubmissionPath {
    if (!this.store.openCalls.has(openCallId)) throw new Error(`Unknown open call: ${openCallId}`);
    const path: SubmissionPath = {
      id: nextIdFor('subpath'),
      openCallId,
      categories,
      fields: fields.map((f, i) => ({ ...f, id: nextIdFor('field'), order: f.order ?? i })),
      feeCents,
      createdAt: this.now(),
    };
    this.store.submissionPaths.set(path.id, path);
    return path;
  }

  submissionPathsForOpenCall(openCallId: string): SubmissionPath[] {
    return [...this.store.submissionPaths.values()].filter((p) => p.openCallId === openCallId);
  }

  /** Creates a Submission with one or more Works in one step -- the item-
   * level decision model (see domain/types.ts's ADR) means a Submission is
   * never created without at least one Work under it. */
  createSubmission(submissionPathId: string, submitterAccountId: string, works: Array<{ title: string; fileUrl?: string }>): Submission {
    if (!this.store.submissionPaths.has(submissionPathId)) throw new Error(`Unknown submission path: ${submissionPathId}`);
    if (works.length === 0) throw new Error('A submission needs at least one work');

    const submission: Submission = {
      id: nextIdFor('submission'),
      submissionPathId,
      submitterAccountId,
      status: 'submitted',
      submittedAt: this.now(),
    };
    this.store.submissions.set(submission.id, submission);

    works.forEach((w, i) => {
      const work: Work = { id: nextIdFor('work'), submissionId: submission.id, title: w.title, fileUrl: w.fileUrl, order: i };
      this.store.works.set(work.id, work);
    });

    return submission;
  }

  worksForSubmission(submissionId: string): Work[] {
    return [...this.store.works.values()].filter((w) => w.submissionId === submissionId).sort((a, b) => a.order - b.order);
  }

  submissionsForOpenCall(openCallId: string): Submission[] {
    const pathIds = new Set(this.submissionPathsForOpenCall(openCallId).map((p) => p.id));
    return [...this.store.submissions.values()].filter((s) => pathIds.has(s.submissionPathId));
  }
}
