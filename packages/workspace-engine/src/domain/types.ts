/**
 * Missa Workspace domain model — the submission-management side of Missa
 * (Entity/Team → Program → Open Call → Submission Path → Submission → Work →
 * Review → Decision → Delivery), as scoped in
 * _bmad-output/planning-artifacts/prd/functional-requirements.md (FR40-49)
 * and _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md.
 *
 * This is the domain-types-only piece of Story 1.3 — no Drizzle schema here.
 * Each capability epic (6, 7, 8) adds the Drizzle table(s) it actually needs
 * to db/schema.ts when it's built, per the "don't create all tables in story
 * 1" principle the implementation-readiness check enforced on this story.
 *
 * Dependency direction: this package may import from @missa/radar-engine
 * (Organization, Account, Opportunity). radar-engine must never import from
 * this package — enforced by scripts/check-package-boundaries.sh in CI.
 */

import type { IsoDate, IsoDateTime } from '@missa/radar-engine';

/**
 * ADR: Decision and DeliveryTask attach to a Work, not only to a Submission.
 *
 * Why: docs/missa-strategy.md repeatedly calls out that a Submission can be a
 * multi-item packet (e.g. five poems sent as one Submission) where one item
 * is accepted and the others are declined. If Decision/DeliveryTask only
 * existed at the Submission level, that item-level outcome would be
 * unrepresentable, and Epic 8's per-Work decision/delivery stories would need
 * a breaking schema migration to retrofit it once organizations have live
 * data. Deciding this now, before any Review/Decision/Delivery code exists,
 * is the specific risk the architecture doc flagged as a "Critical" decision
 * (see architecture/core-architectural-decisions.md).
 */

// --- Team / Program -------------------------------------------------------

/** User-facing name: "Team". Named `Entity` in schema/code per
 * docs/missa-naming-decisions.md ("entity" stays internal-only). */
export interface Entity {
  id: string;
  organizationId: string; // FK to radar-engine's Organization
  name: string;
  /** Per-institution relabeling (Departments/Imprints/Chapters) — Growth/Enterprise, reserved not enforced yet. */
  label?: string;
  createdAt: IsoDateTime;
}

export interface Program {
  id: string;
  entityId: string;
  name: string;
  createdAt: IsoDateTime;
}

// --- Open Call / Submission Path ------------------------------------------

export type OpenCallStatus = 'draft' | 'published' | 'closed';

export interface OpenCall {
  id: string;
  programId: string;
  title: string;
  status: OpenCallStatus;
  /** Optional link to a claimed Radar Opportunity (radar-engine's Opportunity.id).
   * An Open Call can exist standalone with no Radar linkage — see Story 6.2. */
  radarOpportunityId?: string;
  createdAt: IsoDateTime;
  publishedAt?: IsoDateTime;
}

export type SubmissionFieldType = 'text' | 'file-upload' | 'category-select' | 'fee-toggle';

export interface SubmissionField {
  id: string;
  type: SubmissionFieldType;
  label: string;
  required: boolean;
  order: number;
}

/** User-facing: "form" + "categories" — never rendered as "Submission Path"
 * per docs/missa-naming-decisions.md ("submission_path" stays internal-only). */
export interface SubmissionPath {
  id: string;
  openCallId: string;
  categories: string[];
  fields: SubmissionField[];
  feeCents?: number;
  createdAt: IsoDateTime;
}

// --- Submission / Work ------------------------------------------------------

export type SubmissionStatus =
  | 'submitted'
  | 'in-review'
  | 'decided' // summary status once every Work under it has a Decision — derived, not hand-set
  | 'withdrawn';

export interface Submission {
  id: string;
  submissionPathId: string;
  submitterAccountId: string; // FK to radar-engine's Account
  status: SubmissionStatus;
  submittedAt: IsoDateTime;
}

export interface Work {
  id: string;
  submissionId: string;
  title: string;
  fileUrl?: string;
  order: number;
}

// --- Review -----------------------------------------------------------------

export interface ReviewRound {
  id: string;
  openCallId: string;
  name: string;
  createdAt: IsoDateTime;
}

export interface ReviewAssignment {
  id: string;
  reviewRoundId: string;
  submissionId: string;
  reviewerAccountId: string;
  completedAt?: IsoDateTime;
}

/** Fixed small rubric per MVP scope (not a rubric builder — see Story 7.3). */
export interface ReviewRecommendation {
  reviewAssignmentId: string;
  score?: number;
  notes?: string;
  recordedAt: IsoDateTime;
}

// --- Decision / Delivery -----------------------------------------------------

export type DecisionOutcome = 'accepted' | 'declined' | 'waitlisted';

/** Attaches to a Work, per the ADR above — never only to a Submission. */
export interface Decision {
  id: string;
  workId: string;
  outcome: DecisionOutcome;
  decidedByAccountId: string;
  decidedAt: IsoDateTime;
}

export type DeliveryTaskStatus = 'pending' | 'complete';

/** Relabeled per vertical in UI (Awards/Publication/Selections) — see
 * docs/missa-naming-decisions.md; the type name and status stay generic. */
export interface DeliveryTask {
  id: string;
  workId: string; // one DeliveryTask per accepted Work, per the ADR above
  status: DeliveryTaskStatus;
  dueDate?: IsoDate;
  completedAt?: IsoDateTime;
}
