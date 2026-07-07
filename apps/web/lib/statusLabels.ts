import type { MyStatus } from '@missa/radar-engine';

/**
 * Same slug list and display-label mapping as the fix already applied to
 * packages/radar-engine/src/server/ui.ts (Drafting/Ready/etc., not raw
 * slugs) -- kept in sync deliberately rather than re-deriving.
 */
export const STATUSES: MyStatus[] = [
  'interested', 'saved', 'preparing', 'draft-started', 'ready-to-submit', 'submitted',
  'received', 'in-review', 'longlisted', 'shortlisted', 'finalist', 'accepted', 'declined',
  'waitlisted', 'revision-requested', 'withdrawn', 'partially-withdrawn', 'delivered', 'archived',
];

export const STATUS_LABELS: Record<MyStatus, string> = {
  interested: 'Interested', saved: 'Saved', preparing: 'Preparing',
  'draft-started': 'Drafting', 'ready-to-submit': 'Ready', submitted: 'Submitted',
  received: 'Received', 'in-review': 'In Review', longlisted: 'Longlisted',
  shortlisted: 'Shortlisted', finalist: 'Finalist', accepted: 'Accepted',
  declined: 'Declined', waitlisted: 'Waitlisted', 'revision-requested': 'Revision Requested',
  withdrawn: 'Withdrawn', 'partially-withdrawn': 'Partially Withdrawn',
  delivered: 'Delivered', archived: 'Archived',
};
