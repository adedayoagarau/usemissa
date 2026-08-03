import type {
  Entity,
  Program,
  OpenCall,
  SubmissionPath,
  SubmissionField,
  Submission,
  SubmissionDraft,
  Work,
  ReviewRound,
  ReviewAssignment,
  ReviewRecommendation,
  Decision,
  DecisionOutcome,
  DeliveryTask,
} from "./domain/types.js";
import { createStore, type WorkspaceStore } from "./store/store.js";
import { sequentialWorkspaceIds, type WorkspaceIdGenerator } from "./ids.js";
import { organizationScope, type OrganizationScope } from "./organizationScope.js";

export interface WorkspaceEngineOptions {
  store?: WorkspaceStore;
  now?: () => string;
  ids?: WorkspaceIdGenerator;
}

function* idsInStore(store: WorkspaceStore): Iterable<string> {
  const maps = [
    store.entities,
    store.programs,
    store.openCalls,
    store.submissionPaths,
    store.submissions,
    store.submissionDrafts,
    store.works,
    store.reviewRounds,
    store.reviewAssignments,
    store.decisions,
    store.deliveryTasks,
  ];
  for (const map of maps) yield* map.keys();
  for (const path of store.submissionPaths.values()) {
    for (const field of path.fields) yield field.id;
  }
  for (const entry of store.auditLog) yield entry.id;
}

/**
 * Facade over the Workspace domain, mirroring RadarEngine's shape
 * (packages/radar-engine/src/engine.ts) deliberately -- apps/web's route
 * handlers get one engine object to call, same pattern as the Radar side.
 */
export class WorkspaceEngine {
  readonly store: WorkspaceStore;
  private readonly now: () => string;
  private readonly ids: WorkspaceIdGenerator;

  constructor(opts: WorkspaceEngineOptions = {}) {
    this.store = opts.store ?? createStore();
    this.now = opts.now ?? (() => new Date().toISOString());
    this.ids = opts.ids ?? sequentialWorkspaceIds(idsInStore(this.store));
  }

  createEntity(organizationId: string, name: string, label?: string): Entity {
    const entity: Entity = {
      id: this.ids.next("entity"),
      organizationId,
      name,
      label,
      createdAt: this.now(),
    };
    this.store.entities.set(entity.id, entity);
    return entity;
  }

  createProgram(entityId: string, name: string): Program {
    if (!this.store.entities.has(entityId))
      throw new Error(`Unknown entity: ${entityId}`);
    const program: Program = {
      id: this.ids.next("program"),
      entityId,
      name,
      createdAt: this.now(),
    };
    this.store.programs.set(program.id, program);
    return program;
  }

  entitiesForOrganization(organizationId: string): Entity[] {
    return [...this.store.entities.values()].filter(
      (e) => e.organizationId === organizationId,
    );
  }

  organizationScope(organizationId: string): OrganizationScope {
    return organizationScope(this.store, organizationId);
  }

  programsForEntity(entityId: string): Program[] {
    return [...this.store.programs.values()].filter(
      (p) => p.entityId === entityId,
    );
  }

  createOpenCall(
    programId: string,
    title: string,
    radarOpportunityId?: string,
  ): OpenCall {
    if (!this.store.programs.has(programId))
      throw new Error(`Unknown program: ${programId}`);
    const openCall: OpenCall = {
      id: this.ids.next("opencall"),
      programId,
      title,
      status: "draft",
      radarOpportunityId,
      createdAt: this.now(),
    };
    this.store.openCalls.set(openCall.id, openCall);
    return openCall;
  }

  publishOpenCall(openCallId: string): OpenCall {
    const openCall = this.store.openCalls.get(openCallId);
    if (!openCall) throw new Error(`Unknown open call: ${openCallId}`);
    openCall.status = "published";
    openCall.publishedAt = this.now();
    return openCall;
  }

  updateOpenCall(openCallId: string, patch: { title?: string; guidelineUrl?: string; guidelineText?: string }): OpenCall {
    const openCall = this.store.openCalls.get(openCallId);
    if (!openCall) throw new Error(`Unknown open call: ${openCallId}`);
    if (patch.title !== undefined) {
      const title = patch.title.trim();
      if (!title) throw new Error('Open call title is required');
      openCall.title = title;
    }
    if (patch.guidelineUrl !== undefined) openCall.guidelineUrl = patch.guidelineUrl.trim() || undefined;
    if (patch.guidelineText !== undefined) openCall.guidelineText = patch.guidelineText.trim() || undefined;
    return openCall;
  }

  closeOpenCall(openCallId: string): OpenCall {
    const openCall = this.store.openCalls.get(openCallId);
    if (!openCall) throw new Error(`Unknown open call: ${openCallId}`);
    openCall.status = 'closed';
    return openCall;
  }

  openCallsForProgram(programId: string): OpenCall[] {
    return [...this.store.openCalls.values()].filter(
      (o) => o.programId === programId,
    );
  }

  /** Walks Organization -> Entity -> Program -> OpenCall to answer "what's
   * live on this organization's public page" (Story 6.4). */
  publishedOpenCallsForOrganization(organizationId: string): OpenCall[] {
    const entityIds = new Set(
      this.entitiesForOrganization(organizationId).map((e) => e.id),
    );
    const programIds = new Set(
      [...this.store.programs.values()]
        .filter((p) => entityIds.has(p.entityId))
        .map((p) => p.id),
    );
    return [...this.store.openCalls.values()].filter(
      (o) => programIds.has(o.programId) && o.status === "published",
    );
  }

  createSubmissionPath(
    openCallId: string,
    categories: string[],
    fields: Array<Omit<SubmissionField, "id" | "order"> & { order?: number }>,
    feeCents?: number,
  ): SubmissionPath {
    if (!this.store.openCalls.has(openCallId))
      throw new Error(`Unknown open call: ${openCallId}`);
    const path: SubmissionPath = {
      id: this.ids.next("subpath"),
      openCallId,
      categories,
      fields: fields.map((f, i) => ({
        ...f,
        id: this.ids.next("field"),
        order: f.order ?? i,
      })),
      feeCents,
      createdAt: this.now(),
    };
    this.store.submissionPaths.set(path.id, path);
    return path;
  }

  submissionPathsForOpenCall(openCallId: string): SubmissionPath[] {
    return [...this.store.submissionPaths.values()].filter(
      (p) => p.openCallId === openCallId,
    );
  }

  updateSubmissionPath(
    submissionPathId: string,
    input: {
      categories: string[];
      fields: Array<Omit<SubmissionField, 'id' | 'order'> & { id?: string; order?: number }>;
      feeCents?: number;
    },
  ): SubmissionPath {
    const path = this.store.submissionPaths.get(submissionPathId);
    if (!path) throw new Error(`Unknown submission path: ${submissionPathId}`);
    path.categories = input.categories;
    path.feeCents = input.feeCents;
    path.fields = input.fields.map((field, index) => ({ ...field, id: field.id ?? this.ids.next('field'), order: field.order ?? index }));
    return path;
  }

  /** Creates a Submission with one or more Works in one step -- the item-
   * level decision model (see domain/types.ts's ADR) means a Submission is
   * never created without at least one Work under it. */
  createSubmission(
    submissionPathId: string,
    submitterAccountId: string,
    works: Array<{ title: string; fileUrl?: string; fileUrls?: string[] }>,
    payment?: { status: 'not-required' | 'paid'; sessionId?: string; feeCents?: number },
    details?: { answers?: Record<string, string | string[]>; category?: string; idempotencyKey?: string },
  ): Submission {
    if (!this.store.submissionPaths.has(submissionPathId))
      throw new Error(`Unknown submission path: ${submissionPathId}`);
    if (works.length === 0)
      throw new Error("A submission needs at least one work");

    if (details?.idempotencyKey) {
      const existing = [...this.store.submissions.values()].find((candidate) =>
        candidate.submissionPathId === submissionPathId &&
        candidate.submitterAccountId === submitterAccountId &&
        candidate.idempotencyKey === details.idempotencyKey,
      );
      if (existing) return existing;
    }

    const submission: Submission = {
      id: this.ids.next("submission"),
      submissionPathId,
      submitterAccountId,
      status: "submitted",
      submittedAt: this.now(),
      paymentStatus: payment?.status ?? 'not-required',
      paymentSessionId: payment?.sessionId,
      feeCents: payment?.feeCents,
      idempotencyKey: details?.idempotencyKey,
      answers: details?.answers,
      category: details?.category,
    };
    this.store.submissions.set(submission.id, submission);

    works.forEach((w, i) => {
      const work: Work = {
        id: this.ids.next("work"),
        submissionId: submission.id,
        title: w.title,
        fileUrl: w.fileUrl,
        fileUrls: w.fileUrls,
        order: i,
      };
      this.store.works.set(work.id, work);
    });

    return submission;
  }

  worksForSubmission(submissionId: string): Work[] {
    return [...this.store.works.values()]
      .filter((w) => w.submissionId === submissionId)
      .sort((a, b) => a.order - b.order);
  }

  withdrawSubmission(submissionId: string, submitterAccountId: string): Submission {
    const submission = this.store.submissions.get(submissionId);
    if (!submission || submission.submitterAccountId !== submitterAccountId) throw new Error('Submission not found');
    if (['accepted', 'declined', 'waitlisted', 'partially-accepted', 'mixed'].includes(submission.status)) throw new Error('A decided submission cannot be withdrawn');
    submission.status = 'withdrawn';
    this.store.auditLog.push({ id: this.ids.next('audit'), at: this.now(), accountId: submitterAccountId, action: 'submission.withdrawn', targetType: 'submission', targetId: submission.id });
    return submission;
  }

  submissionDraftFor(submissionPathId: string, submitterAccountId: string): SubmissionDraft | undefined {
    const draft = [...this.store.submissionDrafts.values()].find((candidate) => candidate.submissionPathId === submissionPathId && candidate.submitterAccountId === submitterAccountId);
    if (!draft) return undefined;
    if (Date.parse(draft.expiresAt) <= Date.parse(this.now())) { this.store.submissionDrafts.delete(draft.id); return undefined; }
    return draft;
  }

  expiredSubmissionDrafts(): SubmissionDraft[] {
    const now = Date.parse(this.now());
    return [...this.store.submissionDrafts.values()].filter((draft) => Date.parse(draft.expiresAt) <= now);
  }

  saveSubmissionDraft(submissionPathId: string, submitterAccountId: string, input: { answers: Record<string, string | string[]>; category?: string; workTitles: string[]; idempotencyKey?: string; paymentSessionId?: string }): SubmissionDraft {
    if (!this.store.submissionPaths.has(submissionPathId)) throw new Error('Unknown submission path');
    const existing = this.submissionDraftFor(submissionPathId, submitterAccountId);
    const updatedAt = this.now();
    const draft: SubmissionDraft = { id: existing?.id ?? this.ids.next('submission_draft'), submissionPathId, submitterAccountId, answers: input.answers, category: input.category, workTitles: input.workTitles, idempotencyKey: input.idempotencyKey, paymentSessionId: input.paymentSessionId ?? existing?.paymentSessionId, updatedAt, expiresAt: new Date(Date.parse(updatedAt) + 30 * 24 * 60 * 60 * 1000).toISOString() };
    this.store.submissionDrafts.set(draft.id, draft);
    return draft;
  }

  deleteSubmissionDraft(submissionPathId: string, submitterAccountId: string): void {
    const draft = this.submissionDraftFor(submissionPathId, submitterAccountId);
    if (draft) this.store.submissionDrafts.delete(draft.id);
  }

  submissionsForOpenCall(openCallId: string): Submission[] {
    const pathIds = new Set(
      this.submissionPathsForOpenCall(openCallId).map((p) => p.id),
    );
    return [...this.store.submissions.values()].filter((s) =>
      pathIds.has(s.submissionPathId),
    );
  }

  /** Walks Organization -> Entity -> Program -> OpenCall -> Submission for
   * Story 7.1's admin inbox -- "every Submission this org has ever received,"
   * not just one Open Call's worth. */
  submissionsForOrganization(
    organizationId: string,
  ): Array<Submission & { openCallId: string; openCallTitle: string }> {
    const openCalls = new Map(
      this.publishedAndDraftOpenCallsForOrganization(organizationId).map(
        (o) => [o.id, o],
      ),
    );
    const result: Array<
      Submission & { openCallId: string; openCallTitle: string }
    > = [];
    for (const openCall of openCalls.values()) {
      for (const submission of this.submissionsForOpenCall(openCall.id)) {
        result.push({
          ...submission,
          openCallId: openCall.id,
          openCallTitle: openCall.title,
        });
      }
    }
    return result;
  }

  /** Same Org -> Entity -> Program traversal as publishedOpenCallsForOrganization,
   * but including drafts -- an admin managing their own org needs to see
   * everything, not just what's public. */
  private publishedAndDraftOpenCallsForOrganization(
    organizationId: string,
  ): OpenCall[] {
    const entityIds = new Set(
      this.entitiesForOrganization(organizationId).map((e) => e.id),
    );
    const programIds = new Set(
      [...this.store.programs.values()]
        .filter((p) => entityIds.has(p.entityId))
        .map((p) => p.id),
    );
    return [...this.store.openCalls.values()].filter((o) =>
      programIds.has(o.programId),
    );
  }

  createReviewRound(openCallId: string, name: string): ReviewRound {
    if (!this.store.openCalls.has(openCallId))
      throw new Error(`Unknown open call: ${openCallId}`);
    const round: ReviewRound = {
      id: this.ids.next("round"),
      openCallId,
      name,
      createdAt: this.now(),
    };
    this.store.reviewRounds.set(round.id, round);
    return round;
  }

  reviewRoundsForOpenCall(openCallId: string): ReviewRound[] {
    return [...this.store.reviewRounds.values()].filter(
      (r) => r.openCallId === openCallId,
    );
  }

  assignReviewer(
    reviewRoundId: string,
    submissionId: string,
    reviewerAccountId: string,
  ): ReviewAssignment {
    const round = this.store.reviewRounds.get(reviewRoundId);
    if (!round) throw new Error(`Unknown review round: ${reviewRoundId}`);
    const submission = this.store.submissions.get(submissionId);
    if (!submission) throw new Error(`Unknown submission: ${submissionId}`);
    const submissionPath = this.store.submissionPaths.get(submission.submissionPathId);
    if (!submissionPath || submissionPath.openCallId !== round.openCallId) {
      throw new Error("Review round and submission must belong to the same opportunity");
    }
    const assignment: ReviewAssignment = {
      id: this.ids.next("assignment"),
      reviewRoundId,
      submissionId,
      reviewerAccountId,
    };
    this.store.reviewAssignments.set(assignment.id, assignment);
    return assignment;
  }

  /** A reviewer's own dashboard: only their assigned Submissions, per Story 7.2's AC. */
  reviewAssignmentsForReviewer(reviewerAccountId: string): ReviewAssignment[] {
    return [...this.store.reviewAssignments.values()].filter(
      (a) => a.reviewerAccountId === reviewerAccountId,
    );
  }

  reviewAssignmentsForSubmission(submissionId: string): ReviewAssignment[] {
    return [...this.store.reviewAssignments.values()].filter(
      (a) => a.submissionId === submissionId,
    );
  }

  /** Story 7.3: a reviewer records their recommendation against the fixed
   * MVP rubric (score + notes, not a rubric builder). Marks the assignment
   * complete -- one recommendation per assignment, recording again replaces it. */
  recordReview(
    reviewAssignmentId: string,
    score?: number,
    notes?: string,
  ): ReviewRecommendation {
    const assignment = this.store.reviewAssignments.get(reviewAssignmentId);
    if (!assignment)
      throw new Error(`Unknown review assignment: ${reviewAssignmentId}`);
    const recommendation: ReviewRecommendation = {
      reviewAssignmentId,
      score,
      notes,
      recordedAt: this.now(),
    };
    this.store.reviewRecommendations.set(reviewAssignmentId, recommendation);
    assignment.completedAt = this.now();
    return recommendation;
  }

  recommendationForAssignment(
    reviewAssignmentId: string,
  ): ReviewRecommendation | undefined {
    return this.store.reviewRecommendations.get(reviewAssignmentId);
  }

  /**
   * Records the final outcome for one Work. The organization argument is an
   * authorization boundary: callers cannot create or mutate a decision for a
   * Work that is not owned by that organization. Recording again is an
   * intentional upsert so an editor can correct a decision without creating
   * competing rows for the same Work.
   */
  recordDecision(
    organizationId: string,
    workId: string,
    outcome: DecisionOutcome,
    decidedByAccountId: string,
  ): Decision {
    const scope = this.organizationScope(organizationId);
    const work = scope.work(workId);
    if (!work) throw new Error("Work is not part of this organization");
    const existing = [...this.store.decisions.values()].find((d) => d.workId === workId);
    const decision: Decision = existing
      ? {
          ...existing,
          outcome,
          decidedByAccountId,
          decidedAt: this.now(),
        }
      : {
          id: this.ids.next("decision"),
          workId,
          outcome,
          decidedByAccountId,
          decidedAt: this.now(),
        };
    this.store.decisions.set(decision.id, decision);
    this.recordDecisionAudit(decision, existing ? "decision.updated" : "decision.recorded");
    this.refreshSubmissionStatus(work.submissionId);
    return decision;
  }

  /** Explicit create alias for repository/route callers that use CRUD naming. */
  createDecision(
    organizationId: string,
    workId: string,
    outcome: DecisionOutcome,
    decidedByAccountId: string,
  ): Decision {
    const existing = this.decisionForWork(organizationId, workId);
    if (existing) throw new Error(`A decision already exists for work: ${workId}`);
    return this.recordDecision(organizationId, workId, outcome, decidedByAccountId);
  }

  updateDecision(
    organizationId: string,
    decisionId: string,
    outcome: DecisionOutcome,
    decidedByAccountId: string,
  ): Decision {
    const decision = this.organizationScope(organizationId).decision(decisionId);
    if (!decision) throw new Error("Decision is not part of this organization");
    return this.recordDecision(organizationId, decision.workId, outcome, decidedByAccountId);
  }

  deleteDecision(organizationId: string, decisionId: string): void {
    const decision = this.organizationScope(organizationId).decision(decisionId);
    if (!decision) throw new Error("Decision is not part of this organization");
    this.store.decisions.delete(decisionId);
    this.recordDecisionAudit(decision, "decision.deleted");
    const work = this.store.works.get(decision.workId);
    if (work) this.refreshSubmissionStatus(work.submissionId);
  }

  decisionForWork(organizationId: string, workId: string): Decision | undefined {
    if (!this.organizationScope(organizationId).work(workId)) return undefined;
    return [...this.store.decisions.values()].find((d) => d.workId === workId);
  }

  decisionsForOrganization(organizationId: string): Decision[] {
    const scope = this.organizationScope(organizationId);
    return [...this.store.decisions.values()].filter((decision) => Boolean(scope.decision(decision.id)));
  }

  decisionsForSubmission(organizationId: string, submissionId: string): Decision[] {
    const scope = this.organizationScope(organizationId);
    if (!scope.submission(submissionId)) return [];
    const workIds = new Set(this.worksForSubmission(submissionId).map((work) => work.id));
    return [...this.store.decisions.values()].filter((decision) => workIds.has(decision.workId));
  }

  createDeliveryTask(organizationId: string, workId: string, dueDate?: string): DeliveryTask {
    const scope = this.organizationScope(organizationId);
    const work = scope.work(workId);
    if (!work) throw new Error("Work is not part of this organization");
    const decision = this.decisionForWork(organizationId, workId);
    if (!decision || decision.outcome !== "accepted") throw new Error("Delivery tasks require an accepted Work");
    const existing = [...this.store.deliveryTasks.values()].find((task) => task.workId === workId);
    if (existing) return existing;
    if (dueDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error("dueDate must be YYYY-MM-DD");
    const task: DeliveryTask = { id: this.ids.next("delivery_task"), workId, status: "pending", ...(dueDate ? { dueDate: dueDate as `${number}-${number}-${number}` } : {}) };
    this.store.deliveryTasks.set(task.id, task);
    this.store.auditLog.push({ id: this.ids.next("audit"), at: this.now(), accountId: undefined, action: "delivery.created", targetType: "delivery_task", targetId: task.id, detail: JSON.stringify({ workId }) });
    return task;
  }

  updateDeliveryTask(organizationId: string, taskId: string, status: "pending" | "complete"): DeliveryTask {
    const task = this.store.deliveryTasks.get(taskId);
    if (!task || !this.organizationScope(organizationId).work(task.workId)) throw new Error("Delivery task is not part of this organization");
    task.status = status;
    task.completedAt = status === "complete" ? this.now() : undefined;
    this.store.auditLog.push({ id: this.ids.next("audit"), at: this.now(), accountId: undefined, action: "delivery.updated", targetType: "delivery_task", targetId: task.id, detail: JSON.stringify({ status }) });
    return task;
  }

  deliveryTasksForOrganization(organizationId: string): DeliveryTask[] {
    const scope = this.organizationScope(organizationId);
    return [...this.store.deliveryTasks.values()].filter((task) => Boolean(scope.work(task.workId)));
  }

  reportingForOrganization(organizationId: string): { submissions: number; decisions: number; accepted: number; declined: number; waitlisted: number; conversionRate: number; medianDaysToDecision: number | null; byMonth: Array<{ month: string; submissions: number }> } {
    const submissions = this.submissionsForOrganization(organizationId);
    const decisions = this.decisionsForOrganization(organizationId);
    const counts = { accepted: 0, declined: 0, waitlisted: 0 };
    for (const decision of decisions) counts[decision.outcome]++;
    const times = submissions.flatMap((submission) => { const workIds = new Set(this.worksForSubmission(submission.id).map((work) => work.id)); const decided = decisions.filter((decision) => workIds.has(decision.workId)); if (!decided.length) return []; const latest = decided.reduce((max, decision) => Math.max(max, Date.parse(decision.decidedAt)), 0); return latest > 0 ? [(latest - Date.parse(submission.submittedAt)) / 86_400_000] : []; }).sort((a, b) => a - b);
    const medianDaysToDecision = times.length ? Math.round(times[Math.floor(times.length / 2)]! * 10) / 10 : null;
    const byMonthMap = new Map<string, number>();
    for (const submission of submissions) { const month = submission.submittedAt.slice(0, 7); byMonthMap.set(month, (byMonthMap.get(month) ?? 0) + 1); }
    return { submissions: submissions.length, decisions: decisions.length, ...counts, conversionRate: decisions.length ? Math.round((counts.accepted / decisions.length) * 1000) / 1000 : 0, medianDaysToDecision, byMonth: [...byMonthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, submissions: count })) };
  }

  private recordDecisionAudit(decision: Decision, action: string): void {
    this.store.auditLog.push({
      id: this.ids.next("audit"),
      at: decision.decidedAt,
      accountId: decision.decidedByAccountId,
      action,
      targetType: "work_decision",
      targetId: decision.id,
      detail: JSON.stringify({ workId: decision.workId, outcome: decision.outcome }),
    });
  }

  /** Derives packet status from item-level outcomes; never hand-set by callers. */
  private refreshSubmissionStatus(submissionId: string): void {
    const submission = this.store.submissions.get(submissionId);
    if (!submission || submission.status === "withdrawn") return;
    const works = this.worksForSubmission(submissionId);
    const outcomes = works
      .map((work) => [...this.store.decisions.values()].find((decision) => decision.workId === work.id)?.outcome)
      .filter((outcome): outcome is DecisionOutcome => Boolean(outcome));
    if (outcomes.length === 0) {
      // A removed decision must not leave a stale terminal summary behind.
      submission.status = "submitted";
      return;
    }
    const unique = new Set(outcomes);
    const complete = outcomes.length === works.length;
    if (unique.size === 1 && complete) {
      submission.status = outcomes[0];
      return;
    }
    if (unique.has("accepted")) {
      submission.status = "partially-accepted";
      return;
    }
    if (complete) submission.status = "mixed";
  }
}
