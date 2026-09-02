export type OfficeReadiness =
  | 'draft'
  | 'compiling'
  | 'blocked'
  | 'ready_for_review'
  | 'changes_requested'
  | 'approved_for_handoff';

export type OfficeApprovalStatus =
  | 'not_requested'
  | 'pending'
  | 'approved'
  | 'changes_requested'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export type OfficeExternalAction =
  | 'not_started'
  | 'in_flight'
  | 'outcome_unknown'
  | 'confirmed'
  | 'failed'
  | 'cancelled';

export type OfficeOutcome =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
  | 'unknown';

export interface OfficeApplicationState {
  id: string;
  accountId: string;
  trackerOpportunityId: string;
  opportunityId: string;
  opportunityVersionId: string;
  compilerVersion: string;
  playbookVersion?: string;
  eligibilityPolicyVersion?: string;
  readiness: OfficeReadiness;
  approvalStatus: OfficeApprovalStatus;
  approvalRequestId?: string;
  externalAction: OfficeExternalAction;
  sideEffectIdempotencyKey?: string;
  providerReference?: string;
  outcome: OfficeOutcome;
  workSnapshotIds: string[];
  applicationRevision: number;
  eventRevision: number;
  createdAt: string;
  updatedAt: string;
}

interface OfficeEventBase {
  eventId: string;
  occurredAt: string;
  expectedEventRevision?: number;
  idempotencyKey?: string;
}

export interface OfficeApplicationCreatedEvent extends OfficeEventBase {
  type: 'application.created';
  application: Omit<
    OfficeApplicationState,
    | 'readiness'
    | 'approvalStatus'
    | 'externalAction'
    | 'outcome'
    | 'workSnapshotIds'
    | 'applicationRevision'
    | 'eventRevision'
    | 'createdAt'
    | 'updatedAt'
  >;
}

export interface OfficeCompilationStartedEvent extends OfficeEventBase {
  type: 'compilation.started';
}

export interface OfficeCompilationCompletedEvent extends OfficeEventBase {
  type: 'compilation.completed';
  blocked: boolean;
}

export interface OfficeWorkSnapshotSelectedEvent extends OfficeEventBase {
  type: 'work.snapshot_selected';
  workSnapshotId: string;
}

export interface OfficeApprovalRequestedEvent extends OfficeEventBase {
  type: 'approval.requested';
  approvalRequestId: string;
}

export interface OfficeApprovalDecidedEvent extends OfficeEventBase {
  type: 'approval.decided';
  approvalRequestId: string;
  decision: 'approved' | 'changes_requested' | 'rejected';
}

export interface OfficeHandoffStartedEvent extends OfficeEventBase {
  type: 'handoff.started';
  sideEffectIdempotencyKey: string;
}

export interface OfficeHandoffOutcomeUnknownEvent extends OfficeEventBase {
  type: 'handoff.outcome_unknown';
}

export interface OfficeHandoffReconciledEvent extends OfficeEventBase {
  type: 'handoff.reconciled';
  result: 'confirmed' | 'retryable';
  providerReference?: string;
}

export interface OfficeHandoffRetryStartedEvent extends OfficeEventBase {
  type: 'handoff.retry_started';
  sideEffectIdempotencyKey: string;
}

export interface OfficeReceiptConfirmedEvent extends OfficeEventBase {
  type: 'receipt.confirmed';
  providerReference: string;
}

export interface OfficeHandoffFailedEvent extends OfficeEventBase {
  type: 'handoff.failed';
}

export interface OfficeApplicationWithdrawnEvent extends OfficeEventBase {
  type: 'application.withdrawn';
}

export type OfficeApplicationEvent =
  | OfficeApplicationCreatedEvent
  | OfficeCompilationStartedEvent
  | OfficeCompilationCompletedEvent
  | OfficeWorkSnapshotSelectedEvent
  | OfficeApprovalRequestedEvent
  | OfficeApprovalDecidedEvent
  | OfficeHandoffStartedEvent
  | OfficeHandoffOutcomeUnknownEvent
  | OfficeHandoffReconciledEvent
  | OfficeHandoffRetryStartedEvent
  | OfficeReceiptConfirmedEvent
  | OfficeHandoffFailedEvent
  | OfficeApplicationWithdrawnEvent;

export interface OfficeApplicationHistory {
  state?: OfficeApplicationState;
  events: OfficeApplicationEvent[];
}

export interface CreateOfficeApplicationInput {
  eventId: string;
  occurredAt: string;
  id: string;
  accountId: string;
  trackerOpportunityId: string;
  opportunityId: string;
  opportunityVersionId: string;
  compilerVersion: string;
  playbookVersion?: string;
  eligibilityPolicyVersion?: string;
  idempotencyKey?: string;
}

export class OfficeApplicationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfficeApplicationConflictError';
  }
}

export class OfficeApplicationTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfficeApplicationTransitionError';
  }
}

export function createOfficeApplicationEvent(
  input: CreateOfficeApplicationInput,
): OfficeApplicationCreatedEvent {
  return {
    type: 'application.created',
    eventId: input.eventId,
    occurredAt: input.occurredAt,
    idempotencyKey: input.idempotencyKey,
    application: {
      id: input.id,
      accountId: input.accountId,
      trackerOpportunityId: input.trackerOpportunityId,
      opportunityId: input.opportunityId,
      opportunityVersionId: input.opportunityVersionId,
      compilerVersion: input.compilerVersion,
      playbookVersion: input.playbookVersion,
      eligibilityPolicyVersion: input.eligibilityPolicyVersion,
    },
  };
}

export function appendOfficeApplicationEvent(
  history: OfficeApplicationHistory,
  event: OfficeApplicationEvent,
): OfficeApplicationHistory {
  if (history.events.some((item) => item.eventId === event.eventId)) {
    return history;
  }

  if (
    event.idempotencyKey &&
    history.events.some((item) => item.idempotencyKey === event.idempotencyKey)
  ) {
    return history;
  }

  if (!history.state && event.type !== 'application.created') {
    throw new OfficeApplicationTransitionError(
      'The application must be created before another event is appended.',
    );
  }

  if (
    history.state &&
    event.expectedEventRevision !== undefined &&
    event.expectedEventRevision !== history.state.eventRevision
  ) {
    throw new OfficeApplicationConflictError(
      `Expected application event revision ${event.expectedEventRevision}, received ${history.state.eventRevision}.`,
    );
  }

  const nextState = applyOfficeApplicationEvent(history.state, event);
  return {
    state: nextState
      ? { ...nextState, eventRevision: nextState.eventRevision + 1 }
      : undefined,
    events: [...history.events, event],
  };
}

export function reduceOfficeApplication(
  events: readonly OfficeApplicationEvent[],
): OfficeApplicationState {
  const history = events.reduce<OfficeApplicationHistory>(
    (current, event) => appendOfficeApplicationEvent(current, event),
    { events: [] },
  );

  if (!history.state) {
    throw new OfficeApplicationTransitionError(
      'An application event stream must contain application.created.',
    );
  }

  return history.state;
}

function applyOfficeApplicationEvent(
  state: OfficeApplicationState | undefined,
  event: OfficeApplicationEvent,
): OfficeApplicationState | undefined {
  if (event.type === 'application.created') {
    if (state) {
      throw new OfficeApplicationTransitionError(
        'An application can only be created once.',
      );
    }

    return {
      ...event.application,
      readiness: 'draft',
      approvalStatus: 'not_requested',
      externalAction: 'not_started',
      outcome: 'pending',
      workSnapshotIds: [],
      applicationRevision: 0,
      eventRevision: 0,
      createdAt: event.occurredAt,
      updatedAt: event.occurredAt,
    };
  }

  if (!state) {
    throw new OfficeApplicationTransitionError(
      'An application must be created before this event can be applied.',
    );
  }

  const updatedAt = event.occurredAt;

  switch (event.type) {
    case 'compilation.started':
      ensure(
        state.externalAction === 'not_started',
        'Compilation cannot restart after an external action has started.',
      );
      ensure(
        state.approvalStatus !== 'pending' &&
          state.approvalStatus !== 'approved',
        'Compilation cannot invalidate a pending or approved approval.',
      );
      return { ...state, readiness: 'compiling', updatedAt };

    case 'compilation.completed':
      ensure(
        state.readiness === 'compiling',
        'Compilation must start before it can complete.',
      );
      return {
        ...state,
        readiness: event.blocked ? 'blocked' : 'ready_for_review',
        approvalStatus: 'not_requested',
        applicationRevision: state.applicationRevision + 1,
        updatedAt,
      };

    case 'work.snapshot_selected':
      ensure(
        state.externalAction === 'not_started',
        'Work cannot change after an external action has started.',
      );
      ensure(
        Boolean(event.workSnapshotId.trim()),
        'A Work snapshot id is required.',
      );
      return {
        ...state,
        workSnapshotIds: state.workSnapshotIds.includes(event.workSnapshotId)
          ? state.workSnapshotIds
          : [...state.workSnapshotIds, event.workSnapshotId],
        applicationRevision: state.applicationRevision + 1,
        updatedAt,
      };

    case 'approval.requested':
      ensure(
        state.readiness === 'ready_for_review' ||
          state.readiness === 'changes_requested',
        'Approval requires a compiled application ready for review.',
      );
      ensure(
        state.approvalStatus !== 'pending',
        'An approval request is already pending.',
      );
      return {
        ...state,
        approvalRequestId: event.approvalRequestId,
        approvalStatus: 'pending',
        updatedAt,
      };

    case 'approval.decided':
      ensure(
        state.approvalStatus === 'pending',
        'Only a pending approval request can receive a decision.',
      );
      ensure(
        state.approvalRequestId === event.approvalRequestId,
        'The approval decision does not match the active request.',
      );
      return {
        ...state,
        approvalStatus: event.decision,
        readiness:
          event.decision === 'approved'
            ? 'approved_for_handoff'
            : event.decision === 'changes_requested'
              ? 'changes_requested'
              : 'ready_for_review',
        updatedAt,
      };

    case 'handoff.started':
      ensure(
        state.readiness === 'approved_for_handoff' &&
          state.approvalStatus === 'approved',
        'Handoff requires creator approval for the current application.',
      );
      ensure(
        state.externalAction === 'not_started' ||
          state.externalAction === 'failed',
        'Handoff can only start from a new or failed external action.',
      );
      ensure(
        Boolean(event.sideEffectIdempotencyKey.trim()),
        'Handoff requires a stable side-effect idempotency key.',
      );
      if (state.externalAction === 'failed' && state.sideEffectIdempotencyKey) {
        ensure(
          state.sideEffectIdempotencyKey === event.sideEffectIdempotencyKey,
          'A retry after failure must reuse the original side-effect idempotency key.',
        );
      }
      return {
        ...state,
        externalAction: 'in_flight',
        sideEffectIdempotencyKey: event.sideEffectIdempotencyKey,
        updatedAt,
      };

    case 'handoff.outcome_unknown':
      ensure(
        state.externalAction === 'in_flight',
        'Only an in-flight handoff can become outcome-unknown.',
      );
      return { ...state, externalAction: 'outcome_unknown', updatedAt };

    case 'handoff.reconciled':
      ensure(
        state.externalAction === 'outcome_unknown',
        'Only an ambiguous handoff can be reconciled.',
      );
      if (event.result === 'confirmed') {
        ensure(
          Boolean(event.providerReference?.trim()),
          'A confirmed reconciliation requires a provider reference.',
        );
      }
      return {
        ...state,
        externalAction:
          event.result === 'confirmed' ? 'confirmed' : 'outcome_unknown',
        providerReference: event.providerReference ?? state.providerReference,
        updatedAt,
      };

    case 'handoff.retry_started':
      ensure(
        state.externalAction === 'outcome_unknown',
        'A retry requires explicit reconciliation of an ambiguous handoff.',
      );
      ensure(
        state.sideEffectIdempotencyKey === event.sideEffectIdempotencyKey,
        'A retry must reuse the original side-effect idempotency key.',
      );
      return { ...state, externalAction: 'in_flight', updatedAt };

    case 'receipt.confirmed':
      ensure(
        state.externalAction === 'in_flight' ||
          state.externalAction === 'outcome_unknown',
        'A receipt can only confirm an attempted or ambiguous handoff.',
      );
      ensure(
        Boolean(event.providerReference.trim()),
        'A provider reference is required to confirm a receipt.',
      );
      return {
        ...state,
        externalAction: 'confirmed',
        providerReference: event.providerReference,
        updatedAt,
      };

    case 'handoff.failed':
      ensure(
        state.externalAction === 'in_flight' ||
          state.externalAction === 'outcome_unknown',
        'Only an attempted or ambiguous handoff can fail.',
      );
      return { ...state, externalAction: 'failed', updatedAt };

    case 'application.withdrawn':
      ensure(
        state.externalAction !== 'confirmed',
        'A confirmed external action cannot be withdrawn as a preparation state.',
      );
      return { ...state, outcome: 'withdrawn', updatedAt };
  }
}

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new OfficeApplicationTransitionError(message);
  }
}
