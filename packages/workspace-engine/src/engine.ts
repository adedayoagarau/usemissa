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
  CommunicationBatch,
  CommunicationKind,
  CommunicationRecipient,
  CommunicationRecipientStatus,
  SubmissionStage,
  SubmitterQuestion,
  RoundRubric,
  CriterionScores,
  SubmissionRevision,
  SubmissionRevisionChange,
} from "./domain/types.js";
import { canTransitionCommunication, communicationContentHash, communicationEditable, stageForCommunicationKind } from "./communications.js";
import { MISSA_TAXONOMY } from "@missa/taxonomy";
import { createStore, type WorkspaceStore } from "./store/store.js";
import { sequentialWorkspaceIds, type WorkspaceIdGenerator } from "./ids.js";
import { normalizeRubricCriteria, validateCriterionScores, weightedRubricScore, type RubricCriterionInput } from "./rubric.js";
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
    store.communicationBatches,
    store.submitterQuestions,
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

  private normalizeTaxonomyAssignments(assignments: SubmissionPath['taxonomyAssignments'] | undefined): SubmissionPath['taxonomyAssignments'] | undefined {
    if (assignments === undefined) return undefined;
    if (!Array.isArray(assignments) || assignments.length > 128) throw new Error('A form may use no more than 128 taxonomy rules');
    const known = new Set(MISSA_TAXONOMY.terms.map((term) => term.id));
    const seen = new Set<string>();
    return assignments.map((assignment) => {
      if (!assignment || !known.has(assignment.termId)) throw new Error(`Unknown taxonomy term: ${assignment?.termId ?? ''}`);
      if (!['accepted', 'preferred', 'required', 'excluded'].includes(assignment.rule)) throw new Error('Invalid taxonomy rule');
      const key = `${assignment.termId}:${assignment.rule}`;
      if (seen.has(key)) throw new Error('A taxonomy rule may only appear once');
      seen.add(key);
      return { termId: assignment.termId, rule: assignment.rule, required: assignment.required ?? assignment.rule === 'required' };
    });
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
    taxonomyAssignments?: SubmissionPath['taxonomyAssignments'],
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
      taxonomyAssignments: this.normalizeTaxonomyAssignments(taxonomyAssignments),
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
      taxonomyAssignments?: SubmissionPath['taxonomyAssignments'];
    },
  ): SubmissionPath {
    const path = this.store.submissionPaths.get(submissionPathId);
    if (!path) throw new Error(`Unknown submission path: ${submissionPathId}`);
    path.categories = input.categories;
    path.feeCents = input.feeCents;
    if (input.taxonomyAssignments !== undefined) path.taxonomyAssignments = this.normalizeTaxonomyAssignments(input.taxonomyAssignments);
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

  /** Reconcile a provider payment event without changing the applicant's
   * submission status. Refunds and disputes are payment facts; the submission
   * remains visible to both sides with the payment state made explicit. */
  updateSubmissionPaymentStatus(
    submissionId: string,
    status: 'failed' | 'refunded' | 'disputed',
  ): Submission {
    const submission = this.store.submissions.get(submissionId);
    if (!submission) throw new Error(`Unknown submission: ${submissionId}`);
    submission.paymentStatus = status;
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
    if (assignment.recusedAt) throw new Error("This read was withdrawn and can no longer be scored");
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


  // --- Reader operations -------------------------------------------------------

  /**
   * Applies a planned multi-reader distribution for one round. Each pair is
   * validated like assignReviewer; a pair that already exists is skipped, not
   * duplicated. Submissions that receive their first reader move to
   * `in-review`, which is the status the inbox and the submitter tracker show.
   */
  applyDistribution(
    reviewRoundId: string,
    pairs: Array<{ submissionId: string; reviewerAccountId: string }>,
    actorAccountId?: string,
    options: { expiresAt?: string } = {},
  ): { created: ReviewAssignment[]; skipped: Array<{ submissionId: string; reviewerAccountId: string; reason: string }> } {
    const round = this.store.reviewRounds.get(reviewRoundId);
    if (!round) throw new Error(`Unknown review round: ${reviewRoundId}`);
    const created: ReviewAssignment[] = [];
    const skipped: Array<{ submissionId: string; reviewerAccountId: string; reason: string }> = [];
    for (const pair of pairs) {
      const duplicate = [...this.store.reviewAssignments.values()].some(
        (assignment) => assignment.reviewRoundId === reviewRoundId && assignment.submissionId === pair.submissionId && assignment.reviewerAccountId === pair.reviewerAccountId,
      );
      if (duplicate) {
        skipped.push({ ...pair, reason: "already assigned" });
        continue;
      }
      try {
        const assignment = this.assignReviewer(reviewRoundId, pair.submissionId, pair.reviewerAccountId);
        if (options.expiresAt) assignment.expiresAt = options.expiresAt;
        created.push(assignment);
        const submission = this.store.submissions.get(pair.submissionId);
        if (submission && submission.status === "submitted") submission.status = "in-review";
      } catch (error) {
        skipped.push({ ...pair, reason: error instanceof Error ? error.message : "could not assign" });
      }
    }
    if (created.length > 0) {
      this.store.auditLog.push({
        id: this.ids.next("audit"),
        at: this.now(),
        accountId: actorAccountId,
        action: "review-assignment.distributed",
        targetType: "review_round",
        targetId: reviewRoundId,
        detail: JSON.stringify({ created: created.length, skipped: skipped.length }),
      });
    }
    return { created, skipped };
  }


  // --- Round lifecycle -----------------------------------------------------------

  /** The due date most reads in a round carry, if any (withdrawn reads still record what was asked). */
  roundDueDate(reviewRoundId: string): string | undefined {
    const counts = new Map<string, number>();
    for (const assignment of this.store.reviewAssignments.values()) {
      if (assignment.reviewRoundId !== reviewRoundId || !assignment.expiresAt) continue;
      counts.set(assignment.expiresAt, (counts.get(assignment.expiresAt) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1] || right[0].localeCompare(left[0]))[0]?.[0];
  }

  /** Sets (or clears) the due date on every open read in the round. Completed reads keep theirs. */
  setRoundDueDate(organizationId: string, reviewRoundId: string, dueAt: string | undefined, actorAccountId?: string): number {
    if (!this.organizationScope(organizationId).reviewRound(reviewRoundId)) throw new Error("Review round is not part of this organization");
    if (dueAt !== undefined && Number.isNaN(Date.parse(dueAt))) throw new Error("Due date must be a valid date");
    let changed = 0;
    for (const assignment of this.store.reviewAssignments.values()) {
      if (assignment.reviewRoundId !== reviewRoundId || assignment.completedAt || assignment.recusedAt) continue;
      assignment.expiresAt = dueAt;
      changed += 1;
    }
    this.store.auditLog.push({ id: this.ids.next("audit"), at: this.now(), accountId: actorAccountId, action: "review-round.due_date_set", targetType: "review_round", targetId: reviewRoundId, detail: JSON.stringify({ dueAt: dueAt ?? null, assignments: changed }) });
    return changed;
  }

  /**
   * A reader declares a conflict on their own open read. The read leaves
   * their queue and the submission becomes eligible for another reader; the
   * reason stays private to the organization.
   */
  declareReviewConflict(reviewAssignmentId: string, reviewerAccountId: string, reason: string): ReviewAssignment {
    const assignment = this.store.reviewAssignments.get(reviewAssignmentId);
    if (!assignment || assignment.reviewerAccountId !== reviewerAccountId) throw new Error("Unknown review assignment");
    if (assignment.recusedAt) return assignment;
    if (assignment.completedAt) throw new Error("A completed read cannot be withdrawn; ask the organization to correct it");
    const trimmed = reason.trim();
    if (!trimmed) throw new Error("Say briefly why you have a conflict");
    assignment.recusedAt = this.now();
    assignment.recusalReason = trimmed.slice(0, 500);
    this.store.auditLog.push({ id: this.ids.next("audit"), at: assignment.recusedAt, accountId: reviewerAccountId, action: "review-assignment.conflict_declared", targetType: "review_assignment", targetId: assignment.id });
    return assignment;
  }

  /** Records that a reader read the round brief as it stood at `briefUpdatedAt`. */
  acknowledgeRoundBrief(reviewRoundId: string, reviewerAccountId: string): void {
    if (!this.store.reviewRounds.has(reviewRoundId)) throw new Error(`Unknown review round: ${reviewRoundId}`);
    this.store.auditLog.push({ id: this.ids.next("audit"), at: this.now(), accountId: reviewerAccountId, action: "review-round.brief_acknowledged", targetType: "review_round", targetId: reviewRoundId });
  }

  /** True when the reader acknowledged the brief after its last change. */
  hasAcknowledgedRoundBrief(reviewRoundId: string, reviewerAccountId: string, briefUpdatedAt: string): boolean {
    const since = Date.parse(briefUpdatedAt);
    return this.store.auditLog.some((entry) => entry.action === "review-round.brief_acknowledged" && entry.targetId === reviewRoundId && entry.accountId === reviewerAccountId && Date.parse(entry.at) >= since);
  }

  /** The organization withdraws a reader's open reads in a round, for example before reassigning them. */
  withdrawOpenReads(organizationId: string, reviewRoundId: string, reviewerAccountId: string, reason: string, actorAccountId?: string): ReviewAssignment[] {
    if (!this.organizationScope(organizationId).reviewRound(reviewRoundId)) throw new Error("Review round is not part of this organization");
    const withdrawn: ReviewAssignment[] = [];
    for (const assignment of this.store.reviewAssignments.values()) {
      if (assignment.reviewRoundId !== reviewRoundId || assignment.reviewerAccountId !== reviewerAccountId || assignment.completedAt || assignment.recusedAt) continue;
      assignment.recusedAt = this.now();
      assignment.recusalReason = reason.slice(0, 500);
      withdrawn.push(assignment);
    }
    if (withdrawn.length) this.store.auditLog.push({ id: this.ids.next("audit"), at: this.now(), accountId: actorAccountId, action: "review-assignment.withdrawn", targetType: "review_round", targetId: reviewRoundId, detail: JSON.stringify({ reviewerAccountId, withdrawn: withdrawn.length }) });
    return withdrawn;
  }

  // --- Rubrics -----------------------------------------------------------------------

  /** Adds a new rubric version for a round. An empty list returns the round to the single score. */
  setRoundRubric(organizationId: string, reviewRoundId: string, criteria: RubricCriterionInput[], actorAccountId: string): RoundRubric {
    if (!this.organizationScope(organizationId).reviewRound(reviewRoundId)) throw new Error("Review round is not part of this organization");
    const normalized = normalizeRubricCriteria(criteria);
    const current = this.rubricVersionsForRound(reviewRoundId).at(-1);
    if (!current && !normalized.length) throw new Error("Add at least one criterion");
    if (current && JSON.stringify(current.criteria) === JSON.stringify(normalized)) return current;
    const rubric: RoundRubric = { id: this.ids.next("rubric"), organizationId, reviewRoundId, version: (current?.version ?? 0) + 1, criteria: normalized, createdAt: this.now(), createdByAccountId: actorAccountId };
    this.store.roundRubrics.set(rubric.id, rubric);
    this.store.auditLog.push({ id: this.ids.next("audit"), at: rubric.createdAt, accountId: actorAccountId, action: "review-round.rubric_set", targetType: "review_round", targetId: reviewRoundId, detail: JSON.stringify({ version: rubric.version, criteria: normalized.length }) });
    return rubric;
  }

  rubricVersionsForRound(reviewRoundId: string): RoundRubric[] {
    return [...this.store.roundRubrics.values()].filter((rubric) => rubric.reviewRoundId === reviewRoundId).sort((left, right) => left.version - right.version);
  }

  /** The rubric readers score against now, or undefined when the round uses the single score. */
  rubricForRound(reviewRoundId: string): RoundRubric | undefined {
    const latest = this.rubricVersionsForRound(reviewRoundId).at(-1);
    return latest && latest.criteria.length ? latest : undefined;
  }

  /** Records a rubric read: each criterion scored, the weighted 0-100 result stored as the recommendation score. */
  recordRubricReview(reviewAssignmentId: string, scores: Record<string, unknown>, notes?: string): { recommendation: ReviewRecommendation; criterionScores: CriterionScores } {
    const assignment = this.store.reviewAssignments.get(reviewAssignmentId);
    if (!assignment) throw new Error(`Unknown review assignment: ${reviewAssignmentId}`);
    const rubric = this.rubricForRound(assignment.reviewRoundId);
    if (!rubric) throw new Error("This round has no rubric; record a single score instead");
    const clean = validateCriterionScores(rubric.criteria, scores);
    const recommendation = this.recordReview(reviewAssignmentId, weightedRubricScore(rubric.criteria, clean), notes);
    const criterionScores: CriterionScores = { reviewAssignmentId, organizationId: rubric.organizationId, rubricId: rubric.id, rubricVersion: rubric.version, scores: clean, recordedAt: recommendation.recordedAt };
    this.store.criterionScores.set(reviewAssignmentId, criterionScores);
    return { recommendation, criterionScores };
  }

  criterionScoresForAssignment(reviewAssignmentId: string): CriterionScores | undefined {
    return this.store.criterionScores.get(reviewAssignmentId);
  }

  // --- Submission revisions ------------------------------------------------------------

  private organizationIdForSubmission(submission: Submission): string | undefined {
    const path = this.store.submissionPaths.get(submission.submissionPathId);
    const call = path ? this.store.openCalls.get(path.openCallId) : undefined;
    const program = call ? this.store.programs.get(call.programId) : undefined;
    return program ? this.store.entities.get(program.entityId)?.organizationId : undefined;
  }

  /**
   * Whether the submitter can still change this submission: the call is open,
   * the submission is unread and undecided, and the organization allows it.
   */
  submissionEditability(submissionId: string, submitterAccountId: string, options: { allowedByOrganization?: boolean } = {}): { editable: boolean; reason?: string } {
    const submission = this.store.submissions.get(submissionId);
    if (!submission || submission.submitterAccountId !== submitterAccountId) return { editable: false, reason: "Submission not found" };
    if (options.allowedByOrganization === false) return { editable: false, reason: "This organization does not take changes after submission" };
    if (submission.status !== "submitted") return { editable: false, reason: submission.status === "withdrawn" ? "This submission was withdrawn" : "Reading has started, so this submission is locked" };
    const path = this.store.submissionPaths.get(submission.submissionPathId);
    const call = path ? this.store.openCalls.get(path.openCallId) : undefined;
    if (call?.status !== "published") return { editable: false, reason: "This call has closed, so this submission is locked" };
    if (this.reviewAssignmentsForSubmission(submissionId).some((assignment) => !assignment.recusedAt)) return { editable: false, reason: "Reading has started, so this submission is locked" };
    if ([...this.store.decisions.values()].some((decision) => this.store.works.get(decision.workId)?.submissionId === submissionId)) return { editable: false, reason: "A decision has been recorded, so this submission is locked" };
    return { editable: true };
  }

  /**
   * Applies a submitter's own changes to Work titles, Work files and text or
   * file answers, and records exactly what changed. File ownership and form
   * rules are checked by the caller; this enforces scope and lock rules.
   */
  editSubmission(
    submissionId: string,
    submitterAccountId: string,
    edit: { works?: Array<{ workId: string; title?: string; fileUrls?: string[] }>; answers?: Record<string, string | string[] | null> },
    options: { allowedByOrganization?: boolean } = {},
  ): SubmissionRevision {
    const editability = this.submissionEditability(submissionId, submitterAccountId, options);
    if (!editability.editable) throw new Error(editability.reason ?? "This submission cannot be changed");
    const submission = this.store.submissions.get(submissionId)!;
    const organizationId = this.organizationIdForSubmission(submission);
    if (!organizationId) throw new Error("Submission not found");
    const changes: SubmissionRevisionChange[] = [];
    const filesOf = (work: Work) => [...new Set([...(work.fileUrl ? [work.fileUrl] : []), ...(work.fileUrls ?? [])])];
    for (const item of edit.works ?? []) {
      const work = this.store.works.get(item.workId);
      if (!work || work.submissionId !== submissionId) throw new Error("That Work is not part of this submission");
      if (item.title !== undefined) {
        const title = item.title.trim();
        if (!title) throw new Error("Each Work needs a title");
        if (title.length > 300) throw new Error("Keep Work titles under 300 characters");
        if (title !== work.title) { changes.push({ kind: "work-title", workId: work.id, before: work.title, after: title }); work.title = title; }
      }
      if (item.fileUrls !== undefined) {
        const before = filesOf(work);
        const after = [...new Set(item.fileUrls.filter((url) => typeof url === "string" && url.trim()))];
        if (after.length > 10) throw new Error("A Work can have at most 10 files");
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          changes.push({ kind: "work-files", workId: work.id, before, after });
          if (after[0]) work.fileUrl = after[0]; else delete work.fileUrl;
          if (after.length > 1) work.fileUrls = after.slice(1); else delete work.fileUrls;
        }
      }
    }
    for (const [fieldId, value] of Object.entries(edit.answers ?? {})) {
      const answers = { ...(submission.answers ?? {}) };
      const before = answers[fieldId];
      const after = value === null || (Array.isArray(value) ? value.length === 0 : !value.trim()) ? undefined : Array.isArray(value) ? value : value.trim();
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      changes.push({ kind: "answer", fieldId, ...(before !== undefined ? { before } : {}), ...(after !== undefined ? { after } : {}) });
      if (after === undefined) delete answers[fieldId]; else answers[fieldId] = after;
      submission.answers = answers;
    }
    if (!changes.length) throw new Error("Nothing changed");
    const revision: SubmissionRevision = { id: this.ids.next("revision"), organizationId, submissionId, submitterAccountId, at: this.now(), changes };
    this.store.submissionRevisions.set(revision.id, revision);
    this.store.auditLog.push({ id: this.ids.next("audit"), at: revision.at, accountId: submitterAccountId, action: "submission.revised", targetType: "submission", targetId: submissionId, detail: JSON.stringify({ changes: changes.length }) });
    return revision;
  }

  revisionsForSubmission(submissionId: string): SubmissionRevision[] {
    return [...this.store.submissionRevisions.values()].filter((revision) => revision.submissionId === submissionId).sort((left, right) => left.at.localeCompare(right.at));
  }

  // --- Submitter questions ---------------------------------------------------------

  /** A submitter asks about their own submission. At most three open questions per submission. */
  askSubmitterQuestion(submissionId: string, submitterAccountId: string, body: string): SubmitterQuestion {
    const submission = this.store.submissions.get(submissionId);
    if (!submission || submission.submitterAccountId !== submitterAccountId) throw new Error("Submission not found");
    const path = this.store.submissionPaths.get(submission.submissionPathId);
    const call = path ? this.store.openCalls.get(path.openCallId) : undefined;
    const program = call ? this.store.programs.get(call.programId) : undefined;
    const team = program ? this.store.entities.get(program.entityId) : undefined;
    if (!team) throw new Error("Submission not found");
    const text = body.trim();
    if (text.length < 5) throw new Error("Write your question in a sentence or two");
    if (text.length > 2_000) throw new Error("Keep your question under 2,000 characters");
    const open = [...this.store.submitterQuestions.values()].filter((question) => question.submissionId === submissionId && question.status === "open").length;
    if (open >= 3) throw new Error("You already have three open questions on this submission; the organization will answer them first");
    const question: SubmitterQuestion = { id: this.ids.next("question"), organizationId: team.organizationId, submissionId, submitterAccountId, body: text, askedAt: this.now(), status: "open" };
    this.store.submitterQuestions.set(question.id, question);
    this.store.auditLog.push({ id: this.ids.next("audit"), at: question.askedAt, accountId: submitterAccountId, action: "submitter-question.asked", targetType: "submission", targetId: submissionId });
    return question;
  }

  answerSubmitterQuestion(organizationId: string, questionId: string, answer: string, actorAccountId: string): SubmitterQuestion {
    const question = this.store.submitterQuestions.get(questionId);
    if (!question || question.organizationId !== organizationId) throw new Error("Question is not part of this organization");
    const text = answer.trim();
    if (!text) throw new Error("Write an answer");
    if (text.length > 5_000) throw new Error("Keep the answer under 5,000 characters");
    question.answer = text;
    question.answeredAt = this.now();
    question.answeredByAccountId = actorAccountId;
    question.status = "answered";
    this.store.auditLog.push({ id: this.ids.next("audit"), at: question.answeredAt, accountId: actorAccountId, action: "submitter-question.answered", targetType: "submission", targetId: question.submissionId });
    return question;
  }

  closeSubmitterQuestion(organizationId: string, questionId: string, actorAccountId: string): SubmitterQuestion {
    const question = this.store.submitterQuestions.get(questionId);
    if (!question || question.organizationId !== organizationId) throw new Error("Question is not part of this organization");
    question.status = "closed";
    this.store.auditLog.push({ id: this.ids.next("audit"), at: this.now(), accountId: actorAccountId, action: "submitter-question.closed", targetType: "submission", targetId: question.submissionId });
    return question;
  }

  submitterQuestionsForOrganization(organizationId: string): SubmitterQuestion[] {
    return [...this.store.submitterQuestions.values()].filter((question) => question.organizationId === organizationId).sort((left, right) => (left.status === "open" ? 0 : 1) - (right.status === "open" ? 0 : 1) || right.askedAt.localeCompare(left.askedAt));
  }

  submitterQuestionsForSubmission(submissionId: string): SubmitterQuestion[] {
    return [...this.store.submitterQuestions.values()].filter((question) => question.submissionId === submissionId).sort((left, right) => left.askedAt.localeCompare(right.askedAt));
  }

  // --- Communications ------------------------------------------------------------

  createCommunicationBatch(
    organizationId: string,
    input: {
      openCallId: string;
      kind: CommunicationKind;
      subject: string;
      body: string;
      recipients: Array<{ submissionId: string; submitterAccountId: string; workIds: string[] }>;
      createdByAccountId: string;
    },
  ): CommunicationBatch {
    const scope = this.organizationScope(organizationId);
    if (!scope.openCall(input.openCallId)) throw new Error("Opportunity is not part of this organization");
    if (!input.subject.trim()) throw new Error("A subject is required");
    if (!input.body.trim()) throw new Error("A body is required");
    const seen = new Set<string>();
    const recipients: CommunicationRecipient[] = [];
    for (const recipient of input.recipients) {
      const submission = scope.submission(recipient.submissionId);
      if (!submission) throw new Error(`Submission is not part of this organization: ${recipient.submissionId}`);
      const path = this.store.submissionPaths.get(submission.submissionPathId);
      if (path?.openCallId !== input.openCallId) throw new Error(`Submission ${recipient.submissionId} belongs to a different opportunity`);
      if (seen.has(submission.id)) continue;
      seen.add(submission.id);
      const workIds = new Set(this.worksForSubmission(submission.id).map((work) => work.id));
      recipients.push({
        submissionId: submission.id,
        submitterAccountId: submission.submitterAccountId,
        workIds: recipient.workIds.filter((workId) => workIds.has(workId)),
        status: "pending",
      });
    }
    const now = this.now();
    const batch: CommunicationBatch = {
      id: this.ids.next("communication"),
      organizationId,
      openCallId: input.openCallId,
      kind: input.kind,
      stage: stageForCommunicationKind(input.kind),
      subject: input.subject.trim(),
      body: input.body.trim(),
      status: "draft",
      recipients,
      createdByAccountId: input.createdByAccountId,
      createdAt: now,
      updatedAt: now,
    };
    this.store.communicationBatches.set(batch.id, batch);
    this.recordCommunicationAudit(batch, "communication.created", input.createdByAccountId);
    return batch;
  }

  communicationBatch(organizationId: string, batchId: string): CommunicationBatch | undefined {
    const batch = this.store.communicationBatches.get(batchId);
    return batch?.organizationId === organizationId ? batch : undefined;
  }

  communicationBatchesForOrganization(organizationId: string): CommunicationBatch[] {
    return [...this.store.communicationBatches.values()]
      .filter((batch) => batch.organizationId === organizationId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  /** Edits wording or recipients while the batch is still a draft or awaiting approval. An edit sends it back to draft. */
  updateCommunicationBatch(
    organizationId: string,
    batchId: string,
    patch: { subject?: string; body?: string; recipients?: Array<{ submissionId: string; submitterAccountId: string; workIds: string[] }> },
    actorAccountId: string,
  ): CommunicationBatch {
    const batch = this.requireCommunicationBatch(organizationId, batchId);
    if (!communicationEditable(batch.status)) throw new Error("This letter can no longer be edited");
    if (patch.subject !== undefined) {
      if (!patch.subject.trim()) throw new Error("A subject is required");
      batch.subject = patch.subject.trim();
    }
    if (patch.body !== undefined) {
      if (!patch.body.trim()) throw new Error("A body is required");
      batch.body = patch.body.trim();
    }
    if (patch.recipients) {
      const scope = this.organizationScope(organizationId);
      const seen = new Set<string>();
      batch.recipients = patch.recipients.flatMap((recipient) => {
        const submission = scope.submission(recipient.submissionId);
        if (!submission || seen.has(submission.id)) return [];
        const path = this.store.submissionPaths.get(submission.submissionPathId);
        if (path?.openCallId !== batch.openCallId) return [];
        seen.add(submission.id);
        const workIds = new Set(this.worksForSubmission(submission.id).map((work) => work.id));
        return [{ submissionId: submission.id, submitterAccountId: submission.submitterAccountId, workIds: recipient.workIds.filter((workId) => workIds.has(workId)), status: "pending" as const }];
      });
    }
    if (batch.status === "awaiting-approval") batch.status = "draft";
    batch.approvalRequestedAt = undefined;
    batch.updatedAt = this.now();
    this.recordCommunicationAudit(batch, "communication.updated", actorAccountId);
    return batch;
  }

  requestCommunicationApproval(organizationId: string, batchId: string, actorAccountId: string): CommunicationBatch {
    const batch = this.requireCommunicationBatch(organizationId, batchId);
    this.transitionCommunication(batch, "awaiting-approval");
    if (batch.recipients.length === 0) throw new Error("Add at least one recipient before requesting approval");
    batch.approvalRequestedAt = this.now();
    batch.updatedAt = batch.approvalRequestedAt;
    this.recordCommunicationAudit(batch, "communication.approval_requested", actorAccountId);
    return batch;
  }

  /**
   * The approval gate. When the organization requires a second approver, the
   * person approving must differ from the person who drafted the letter.
   */
  approveCommunicationBatch(
    organizationId: string,
    batchId: string,
    approverAccountId: string,
    options: { secondApproverRequired?: boolean } = {},
  ): CommunicationBatch {
    const batch = this.requireCommunicationBatch(organizationId, batchId);
    if (batch.status === "draft") this.transitionCommunication(batch, "awaiting-approval");
    this.transitionCommunication(batch, "approved");
    if (options.secondApproverRequired && approverAccountId === batch.createdByAccountId) {
      batch.status = "awaiting-approval";
      throw new Error("This organization requires a different admin to approve a letter before it is sent");
    }
    if (batch.recipients.length === 0) {
      batch.status = "awaiting-approval";
      throw new Error("Add at least one recipient before approving");
    }
    batch.approvedByAccountId = approverAccountId;
    batch.approvedAt = this.now();
    batch.approvedContentHash = communicationContentHash(batch.subject, batch.body);
    batch.updatedAt = batch.approvedAt;
    this.recordCommunicationAudit(batch, "communication.approved", approverAccountId);
    return batch;
  }

  /**
   * Schedules (or unschedules) an approved letter. Scheduling never bypasses
   * the gate: only an approved batch can be scheduled, and an edit after
   * approval still invalidates the send.
   */
  scheduleCommunicationBatch(organizationId: string, batchId: string, scheduledFor: string | undefined, actorAccountId: string): CommunicationBatch {
    const batch = this.requireCommunicationBatch(organizationId, batchId);
    if (batch.status !== "approved") throw new Error("Only an approved letter can be scheduled");
    if (scheduledFor !== undefined) {
      const at = Date.parse(scheduledFor);
      if (Number.isNaN(at)) throw new Error("Choose a valid send time");
      if (at <= Date.parse(this.now())) throw new Error("Choose a send time in the future");
      batch.scheduledFor = new Date(at).toISOString();
    } else {
      batch.scheduledFor = undefined;
    }
    batch.updatedAt = this.now();
    this.recordCommunicationAudit(batch, scheduledFor ? "communication.scheduled" : "communication.unscheduled", actorAccountId);
    return batch;
  }

  /** Approved batches whose scheduled time has arrived, oldest first. */
  dueScheduledCommunicationBatches(now: string = this.now()): CommunicationBatch[] {
    const at = Date.parse(now);
    return [...this.store.communicationBatches.values()]
      .filter((batch) => batch.status === "approved" && batch.scheduledFor && Date.parse(batch.scheduledFor) <= at)
      .sort((left, right) => left.scheduledFor!.localeCompare(right.scheduledFor!));
  }

  cancelCommunicationBatch(organizationId: string, batchId: string, actorAccountId: string): CommunicationBatch {
    const batch = this.requireCommunicationBatch(organizationId, batchId);
    this.transitionCommunication(batch, "cancelled");
    batch.scheduledFor = undefined;
    batch.cancelledAt = this.now();
    batch.cancelledByAccountId = actorAccountId;
    batch.updatedAt = batch.cancelledAt;
    this.recordCommunicationAudit(batch, "communication.cancelled", actorAccountId);
    return batch;
  }

  /** Locks the batch for sending. Fails if the approved wording changed or the batch is not approved. */
  beginCommunicationSend(organizationId: string, batchId: string, actorAccountId: string): CommunicationBatch {
    const batch = this.requireCommunicationBatch(organizationId, batchId);
    if (batch.status !== "approved" && batch.status !== "partially-sent" && batch.status !== "failed") {
      throw new Error("Only an approved letter can be sent");
    }
    if (batch.approvedContentHash !== communicationContentHash(batch.subject, batch.body)) {
      throw new Error("The wording changed after approval; approve it again before sending");
    }
    this.transitionCommunication(batch, "sending");
    batch.scheduledFor = undefined;
    batch.sendStartedAt = this.now();
    batch.updatedAt = batch.sendStartedAt;
    this.recordCommunicationAudit(batch, "communication.send_started", actorAccountId);
    return batch;
  }

  recordCommunicationRecipientResult(
    organizationId: string,
    batchId: string,
    submissionId: string,
    result: { status: Exclude<CommunicationRecipientStatus, "pending">; effectId?: string; reason?: string },
  ): CommunicationRecipient {
    const batch = this.requireCommunicationBatch(organizationId, batchId);
    const recipient = batch.recipients.find((item) => item.submissionId === submissionId);
    if (!recipient) throw new Error("Recipient is not part of this letter");
    recipient.status = result.status;
    recipient.effectId = result.effectId;
    recipient.reason = result.reason;
    recipient.sentAt = result.status === "sent" ? this.now() : recipient.sentAt;
    batch.updatedAt = this.now();
    return recipient;
  }

  /** Derives the batch outcome from its recipients once a send pass finishes. */
  finishCommunicationSend(organizationId: string, batchId: string, actorAccountId: string): CommunicationBatch {
    const batch = this.requireCommunicationBatch(organizationId, batchId);
    if (batch.status !== "sending") throw new Error("This letter is not being sent");
    const sent = batch.recipients.filter((item) => item.status === "sent").length;
    const unresolved = batch.recipients.filter((item) => item.status === "pending" || item.status === "failed").length;
    const next = sent > 0 && unresolved === 0 ? "sent" : sent > 0 ? "partially-sent" : batch.recipients.every((item) => item.status === "skipped" || item.status === "suppressed") && batch.recipients.length > 0 ? "sent" : "failed";
    this.transitionCommunication(batch, next);
    batch.updatedAt = this.now();
    if (next === "sent") batch.sentAt = batch.updatedAt;
    this.recordCommunicationAudit(batch, `communication.${next}`, actorAccountId);
    return batch;
  }

  /** Stage announcements actually delivered to a submission, for the submitter tracker. */
  stageEventsForSubmission(submissionId: string): Array<{ stage: SubmissionStage; at: string; batchId: string }> {
    const events: Array<{ stage: SubmissionStage; at: string; batchId: string }> = [];
    for (const batch of this.store.communicationBatches.values()) {
      if (!batch.stage) continue;
      const recipient = batch.recipients.find((item) => item.submissionId === submissionId && item.status === "sent");
      if (recipient) events.push({ stage: batch.stage, at: recipient.sentAt ?? batch.sentAt ?? batch.updatedAt, batchId: batch.id });
    }
    return events.sort((left, right) => left.at.localeCompare(right.at));
  }

  private requireCommunicationBatch(organizationId: string, batchId: string): CommunicationBatch {
    const batch = this.communicationBatch(organizationId, batchId);
    if (!batch) throw new Error("Letter is not part of this organization");
    return batch;
  }

  private transitionCommunication(batch: CommunicationBatch, to: CommunicationBatch["status"]): void {
    if (!canTransitionCommunication(batch.status, to)) throw new Error(`A ${batch.status} letter cannot move to ${to}`);
    batch.status = to;
  }

  private recordCommunicationAudit(batch: CommunicationBatch, action: string, accountId?: string): void {
    this.store.auditLog.push({
      id: this.ids.next("audit"),
      at: this.now(),
      accountId,
      action,
      targetType: "communication_batch",
      targetId: batch.id,
      detail: JSON.stringify({ kind: batch.kind, status: batch.status, recipients: batch.recipients.length }),
    });
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
