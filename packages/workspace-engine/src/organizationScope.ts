import type {
  Entity,
  OpenCall,
  Program,
  ReviewAssignment,
  ReviewRound,
  Submission,
  SubmissionPath,
  Work,
  Decision,
} from "./domain/types.js";
import type { WorkspaceStore } from "./store/store.js";

/**
 * Resolves Workspace resources through Organization -> Team -> Program ->
 * Opportunity. Returning undefined for a foreign resource prevents callers
 * from learning whether an ID exists in another organization.
 */
export class OrganizationScope {
  constructor(
    private readonly store: WorkspaceStore,
    readonly organizationId: string,
  ) {}

  entity(entityId: string): Entity | undefined {
    const entity = this.store.entities.get(entityId);
    return entity?.organizationId === this.organizationId ? entity : undefined;
  }

  program(programId: string): Program | undefined {
    const program = this.store.programs.get(programId);
    return program && this.entity(program.entityId) ? program : undefined;
  }

  openCall(openCallId: string): OpenCall | undefined {
    const openCall = this.store.openCalls.get(openCallId);
    return openCall && this.program(openCall.programId) ? openCall : undefined;
  }

  submissionPath(submissionPathId: string): SubmissionPath | undefined {
    const path = this.store.submissionPaths.get(submissionPathId);
    return path && this.openCall(path.openCallId) ? path : undefined;
  }

  submission(submissionId: string): Submission | undefined {
    const submission = this.store.submissions.get(submissionId);
    return submission && this.submissionPath(submission.submissionPathId) ? submission : undefined;
  }

  work(workId: string): Work | undefined {
    const work = this.store.works.get(workId);
    return work && this.submission(work.submissionId) ? work : undefined;
  }

  decision(decisionId: string): Decision | undefined {
    const decision = this.store.decisions.get(decisionId);
    return decision && this.work(decision.workId) ? decision : undefined;
  }

  reviewRound(reviewRoundId: string): ReviewRound | undefined {
    const round = this.store.reviewRounds.get(reviewRoundId);
    return round && this.openCall(round.openCallId) ? round : undefined;
  }

  reviewAssignment(reviewAssignmentId: string): ReviewAssignment | undefined {
    const assignment = this.store.reviewAssignments.get(reviewAssignmentId);
    return assignment && this.reviewRound(assignment.reviewRoundId) && this.submission(assignment.submissionId)
      ? assignment
      : undefined;
  }
}

export function organizationScope(store: WorkspaceStore, organizationId: string): OrganizationScope {
  return new OrganizationScope(store, organizationId);
}
