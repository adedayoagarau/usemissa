export type OrganizationMessageState = 'Accepted' | 'Delivered' | 'Needs attention' | 'In progress';

export function organizationMessageState(status: string): OrganizationMessageState {
  if (status === 'delivered') return 'Delivered';
  if (status === 'accepted') return 'Accepted';
  if (['failed', 'bounced', 'suppressed', 'unknown'].includes(status)) return 'Needs attention';
  return 'In progress';
}

export function recipientReferenceLabel(recipientAccountId: string | null | undefined): string {
  return recipientAccountId ? 'Recipient reference retained' : 'Recipient reference unavailable';
}

export function reconcileRequestedWorkIds(requested: readonly string[], sent: readonly string[], failed: readonly string[]): string[] {
  const accounted = new Set([...sent, ...failed]);
  return requested.filter((workId) => !accounted.has(workId));
}
