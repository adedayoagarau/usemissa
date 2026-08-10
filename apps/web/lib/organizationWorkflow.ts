import type { DecisionOutcome, SubmissionStatus } from '@missa/workspace-engine';

export type ReceiptLane = 'Received' | 'Needs attention' | 'Withdrawn';
export type ReviewLane = 'Not started' | 'In review' | 'Review complete';
export type DecisionSummary = 'No decisions' | 'Partially decided' | 'Partially accepted' | 'Mixed' | 'Accepted' | 'Declined' | 'Waitlisted';
export type PaymentLane = 'Not required' | 'Pending' | 'Paid' | 'Failed' | 'Disputed' | 'Refunded' | 'Unknown';

export function receiptLane(status: SubmissionStatus, paymentStatus?: string): ReceiptLane {
  if (status === 'withdrawn') return 'Withdrawn';
  if (paymentStatus === 'failed' || paymentStatus === 'disputed') return 'Needs attention';
  return 'Received';
}

export function reviewLane(assignments: Array<{ completedAt?: string }>): ReviewLane {
  if (assignments.length === 0) return 'Not started';
  return assignments.every((assignment) => Boolean(assignment.completedAt)) ? 'Review complete' : 'In review';
}

export function decisionSummary(works: Array<{ id: string }>, decisions: Array<{ workId: string; outcome: DecisionOutcome }>): DecisionSummary {
  if (works.length === 0) return 'No decisions';
  const outcomeByWork = new Map(decisions.map((decision) => [decision.workId, decision.outcome]));
  const outcomes = works.flatMap((work) => { const outcome = outcomeByWork.get(work.id); return outcome ? [outcome] : []; });
  if (outcomes.length === 0) return 'No decisions';
  const complete = outcomes.length === works.length;
  const unique = new Set(outcomes);
  if (complete && unique.size === 1) {
    const outcome = outcomes[0]!;
    return outcome === 'accepted' ? 'Accepted' : outcome === 'declined' ? 'Declined' : 'Waitlisted';
  }
  if (unique.has('accepted')) return 'Partially accepted';
  return complete ? 'Mixed' : 'Partially decided';
}

export function paymentLane(paymentStatus?: string): PaymentLane {
  if (paymentStatus === 'not-required') return 'Not required';
  if (paymentStatus === 'paid') return 'Paid';
  if (paymentStatus === 'failed') return 'Failed';
  if (paymentStatus === 'disputed') return 'Disputed';
  if (paymentStatus === 'refunded') return 'Refunded';
  if (paymentStatus === 'pending') return 'Pending';
  return 'Unknown';
}

export function submissionNextAction(input: { receipt: ReceiptLane; review: ReviewLane; decision: DecisionSummary }): string {
  if (input.receipt === 'Withdrawn') return 'No active action';
  if (input.receipt === 'Needs attention') return 'Resolve receipt issue';
  if (input.review === 'Not started') return 'Prepare review';
  if (input.review === 'In review') return 'Complete review';
  if (input.decision === 'No decisions' || input.decision === 'Partially decided' || input.decision === 'Partially accepted') return 'Review Work decisions';
  return 'Review communication';
}
