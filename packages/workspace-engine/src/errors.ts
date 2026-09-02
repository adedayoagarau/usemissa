export type WorkspaceResourceType =
  | 'entity' | 'program' | 'open_call' | 'submission_path' | 'submission'
  | 'work' | 'review_round' | 'review_assignment' | 'decision' | 'delivery_task';

export class WorkspaceConflictError extends Error {
  constructor(
    readonly resourceType: WorkspaceResourceType,
    readonly resourceId: string,
    readonly expectedRevision: number,
    readonly currentRevision: number | null,
  ) {
    super(`The ${resourceType} changed; refresh and retry`);
    this.name = 'WorkspaceConflictError';
  }
}

export class WorkspaceIdempotencyReuseError extends Error {
  constructor() {
    super('The idempotency key was already used for a different request');
    this.name = 'WorkspaceIdempotencyReuseError';
  }
}

export class WorkspaceNotFoundError extends Error {
  constructor() {
    super('Workspace resource not found');
    this.name = 'WorkspaceNotFoundError';
  }
}
