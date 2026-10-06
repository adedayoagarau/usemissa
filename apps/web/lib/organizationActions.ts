import type { OrgRole } from '@missa/radar-engine';

/**
 * Pure rules shared by the Organization product's action controls. They only
 * decide what a control offers and explains; every route re-checks the same
 * facts on the server.
 */

export type WorkOutcome = 'accepted' | 'declined' | 'waitlisted';

export const WORK_OUTCOME_LABELS: Record<WorkOutcome, string> = { accepted: 'Accepted', declined: 'Declined', waitlisted: 'Waitlisted' };

/** What a recorded Work decision does outside Missa's Organization record. */
export const WORK_OUTCOME_CONSEQUENCE =
  'The submitter sees this outcome in their Missa Tracker and gets an in-app notice. No email is sent; send decision emails separately from Decisions.';

/**
 * Publication readiness for the compatibility workspace, where an Opportunity
 * has no configuration version. Applicants can only apply through a saved
 * submission form, so publishing without one would advertise a dead end.
 */
export function compatibilityPublishReadiness(input: { status: 'draft' | 'published' | 'closed'; form?: { fieldCount: number } }): string[] {
  if (input.status !== 'draft') return [];
  if (!input.form) return ['Save the submission form so applicants have somewhere to apply.'];
  if (input.form.fieldCount < 1) return ['Add at least one field to the submission form.'];
  return [];
}

/** True when the same reviewer already holds an assignment for this Submission in this round. */
export function reviewerAlreadyAssigned(
  assignments: ReadonlyArray<{ reviewRoundId?: string; reviewerAccountId?: string; recusedAt?: string }>,
  input: { reviewRoundId: string; reviewerAccountId: string },
): boolean {
  return assignments.some((assignment) => !assignment.recusedAt && assignment.reviewRoundId === input.reviewRoundId && assignment.reviewerAccountId === input.reviewerAccountId);
}

const GRANTABLE_ROLE_ORDER: readonly OrgRole[] = ['admin', 'team-admin', 'program-manager', 'reviewer', 'finance', 'legal', 'viewer', 'guest'];

/**
 * Roles a person may grant from the People page. Only an Owner can grant
 * Owner access (the server enforces the same rule). The legacy `member` role is
 * never offered for new grants, but stays selectable for someone who holds it.
 */
export function grantableRoles(actorRole: OrgRole, currentRole?: OrgRole): OrgRole[] {
  const roles: OrgRole[] = actorRole === 'owner' ? ['owner', ...GRANTABLE_ROLE_ORDER] : [...GRANTABLE_ROLE_ORDER];
  if (currentRole && !roles.includes(currentRole)) roles.push(currentRole);
  return roles;
}

/** The standard decision-letter wording. The send route treats this exact text as "no editorial note". */
export const DEFAULT_DECISION_EMAIL_SUBJECT = 'Your Missa submission update';
export const DEFAULT_DECISION_EMAIL_BODY = 'Hello,\n\n{{workTitle}} was {{outcome}}.\n\nThank you.';

/** Decision emails send at most this many Works per request. */
export const DECISION_EMAIL_BATCH_LIMIT = 100;

export function decisionEmailRequest(input: { workIds: readonly string[]; subject: string; note: string; sendDespiteLetterCheck?: boolean }) {
  const subject = input.subject.trim() || DEFAULT_DECISION_EMAIL_SUBJECT;
  const note = input.note.trim();
  return {
    workIds: [...new Set(input.workIds)].slice(0, DECISION_EMAIL_BATCH_LIMIT),
    subject,
    body: note || DEFAULT_DECISION_EMAIL_BODY,
    ...(input.sendDespiteLetterCheck ? { sendDespiteLetterCheck: true } : {}),
  };
}
